import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, Plus, Trash2, ChevronDown } from "lucide-react";
import { useUser, signIn } from "@/lib/auth";
import { searchTMEvents, getTMEvent, type TMEventSummary } from "@/lib/ticketmaster.functions";
import { addCustomTicket, useAllTickets } from "@/lib/ticket-store";
import { featuredTickets } from "@/lib/tickets";
import { toast } from "sonner";
import { incrementTicketsCreatedFn, consumeTokenFn } from "../admin/functions";
import type { Ticket, SeatedTicketEntry, StandardTicketEntry } from "@/lib/tickets";

export const Route = createFileRoute("/create-ticket")({
  head: () => ({ meta: [{ title: "New Event — TicketHub" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    eventId: search.eventId ? String(search.eventId) : undefined,
  }),
  component: CreateTicketSearchPage,
});

type FormFields = {
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  priceFrom: string;
  currency: string;
  description: string;
  image: string;
};

const DEFAULT_FIELDS: FormFields = {
  title: "",
  category: "Event",
  venue: "",
  city: "",
  date: "",
  time: "",
  priceFrom: "",
  currency: "USD",
  description: "",
  image: "",
};

const TICKET_TYPE_OPTIONS = [
  "General Admission",
  "VIP",
  "Floor",
  "Standing Room",
  "Lawn",
  "Reserved",
  "Balcony",
  "Pit",
];

const PRESALE_LABEL_OPTIONS = [
  "General Sale",
  "Presale",
  "Verified Fan Onsale",
  "Platinum",
  "Fan Club Presale",
  "American Express Presale",
  "Artist Presale",
];

function makeSeatedEntry(): SeatedTicketEntry {
  return {
    id: `seated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    section: "",
    row: "",
    ticketType: "Verified Fan Onsale",
    entryInfo: "",
    seats: ["1"],
  };
}

function makeStandardEntry(): StandardTicketEntry {
  return {
    id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    section: "GA1",
    ticketType: "General Admission",
    presaleLabel: "General Sale",
  };
}

function CreateTicketSearchPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const { eventId } = Route.useSearch();
  const all = useAllTickets();

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected event form fields
  const [form, setForm] = useState<FormFields>(DEFAULT_FIELDS);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Dual ticket type state
  const [seatedEntries, setSeatedEntries] = useState<SeatedTicketEntry[]>([]);
  const [standardEntries, setStandardEntries] = useState<StandardTicketEntry[]>([]);

  // Whether event details have been loaded (controls showing the ticket panels)
  const [eventLoaded, setEventLoaded] = useState(false);

  // Sync passed eventId template details on mount
  useEffect(() => {
    if (eventId) {
      const found = all.find((t) => t.id === eventId) || featuredTickets.find((t) => t.id === eventId);
      if (found) {
        setForm({
          title: found.title || "",
          category: found.category || "Event",
          venue: found.venue || "",
          city: found.city || "",
          date: found.date || "",
          time: found.time || "",
          priceFrom: found.priceFrom ? String(found.priceFrom) : "",
          currency: "USD",
          description: found.description || "",
          image: found.image || "",
        });
        // Populate seated entries from legacy flat fields
        if (found.seatedTickets && found.seatedTickets.length > 0) {
          setSeatedEntries(found.seatedTickets);
        } else if (found.section || (found.seats && found.seats.length > 0)) {
          setSeatedEntries([{
            id: `seated-init`,
            section: found.section || "",
            row: found.row || "",
            ticketType: found.ticketType || "Verified Fan Onsale",
            entryInfo: found.entryInfo || "",
            seats: found.seats && found.seats.length > 0 ? found.seats : ["1"],
          }]);
        }
        if (found.standardTickets && found.standardTickets.length > 0) {
          setStandardEntries(found.standardTickets);
        }
        setEventLoaded(true);
      } else {
        setLoading(true);
        setError(null);
        getTMEvent({ data: { id: eventId } })
          .then((detail) => {
            setForm({
              title: detail.name || "",
              category: detail.category || "Event",
              venue: detail.venue || "",
              city: detail.city || "",
              date: detail.date || "",
              time: detail.time || "",
              priceFrom: detail.priceFrom ? String(detail.priceFrom) : "",
              currency: detail.currency || "USD",
              description: detail.description || "",
              image: detail.image || "",
            });
            setEventLoaded(true);
            setMessage("Event details loaded from TicketHub!");
            setTimeout(() => setMessage(null), 2000);
          })
          .catch(() => {
            setError("Failed to fetch event from TicketHub API");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [eventId, all]);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  // Search Ticketmaster API
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const delayDebounce = setTimeout(() => {
      searchTMEvents({ data: { keyword: q } })
        .then((res) => {
          if (!cancelled) setSearchResults(res);
        })
        .catch((err) => {
          if (!cancelled) setError(err?.message ?? "Failed to search events");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounce);
    };
  }, [query]);

  if (!ready || !user) return null;

  // Load details of selected event from API
  const handleSelectEvent = async (tmId: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getTMEvent({ data: { id: tmId } });
      setForm({
        title: detail.name || "",
        category: detail.category || "Event",
        venue: detail.venue || "",
        city: detail.city || "",
        date: detail.date || "",
        time: detail.time || "",
        priceFrom: detail.priceFrom ? String(detail.priceFrom) : "",
        currency: detail.currency || "USD",
        description: detail.description || "",
        image: detail.image || "",
      });
      setSearchResults([]);
      setQuery("");
      setEventLoaded(true);
      setMessage("Event details loaded! Add your tickets below.");
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const setField = <K extends keyof FormFields>(k: K, v: FormFields[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // ─── Seated entry helpers ─────────────────────────────────────
  const addSeatedEntry = () => {
    setSeatedEntries((prev) => [...prev, makeSeatedEntry()]);
  };

  const removeSeatedEntry = (id: string) => {
    setSeatedEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateSeatedEntry = <K extends keyof SeatedTicketEntry>(
    id: string,
    key: K,
    value: SeatedTicketEntry[K]
  ) => {
    setSeatedEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [key]: value } : e))
    );
  };

  const addSeatToEntry = (id: string) => {
    setSeatedEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || e.seats.length >= 8) return e;
        const last = Number(e.seats[e.seats.length - 1]);
        const next = isNaN(last) ? "1" : String(last + 1);
        return { ...e, seats: [...e.seats, next] };
      })
    );
  };

  const removeSeatFromEntry = (id: string, idx: number) => {
    setSeatedEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || e.seats.length <= 1) return e;
        return { ...e, seats: e.seats.filter((_, i) => i !== idx) };
      })
    );
  };

  const updateSeatInEntry = (id: string, idx: number, val: string) => {
    setSeatedEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const seats = [...e.seats];
        seats[idx] = val;
        return { ...e, seats };
      })
    );
  };

  // ─── Standard entry helpers ───────────────────────────────────
  const addStandardEntry = () => {
    setStandardEntries((prev) => [...prev, makeStandardEntry()]);
  };

  const removeStandardEntry = (id: string) => {
    setStandardEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateStandardEntry = <K extends keyof StandardTicketEntry>(
    id: string,
    key: K,
    value: StandardTicketEntry[K]
  ) => {
    setStandardEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [key]: value } : e))
    );
  };

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Please select or specify an event title");
      return;
    }

    if (seatedEntries.length === 0 && standardEntries.length === 0) {
      toast.error("Please add at least one seated ticket or standard ticket.");
      setError("Please add at least one seated ticket or standard ticket.");
      return;
    }

    const isTokenUser = user?.userType === "token";

    if (isTokenUser) {
      if ((user?.tokensCount ?? 0) < 2) {
        toast.error("Insufficient tokens. You need at least 2 tokens to create a ticket.");
        setError("Insufficient tokens (2 tokens required). Please contact the administrator.");
        return;
      }
    } else {
      const currentSlots = user?.ticketSlots ?? 20;
      const currentCreated = user?.ticketsCreatedCount ?? 0;
      if (currentCreated >= currentSlots) {
        toast.error("You have run out of ticket slots. Please contact the administrator.");
        setError("You have run out of ticket slots. Please contact the administrator.");
        return;
      }
    }

    // Build backwards-compatible flat fields from first seated entry
    const firstSeated = seatedEntries[0];

    // Flat seat list across all seated entries (for barcode modal compatibility)
    const allSeats = seatedEntries.flatMap((e) =>
      e.seats.map((s) => s.trim()).filter(Boolean)
    );

    const ticket: Ticket = {
      id: `custom-tm-${Date.now()}`,
      title: form.title.trim(),
      category: form.category.trim(),
      venue: form.venue.trim() || "TBA",
      city: form.city.trim() || "TBA",
      date: form.date.trim() || "TBA",
      time: form.time.trim() || "TBA",
      priceFrom: Number(form.priceFrom) || 0,
      image:
        form.image.trim() ||
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1024&h=640&fit=crop",
      description: form.description.trim() || "No description provided.",
      // Backwards-compat flat fields
      ticketType: firstSeated?.ticketType?.trim() || "",
      section: firstSeated?.section?.trim() || "",
      row: firstSeated?.row?.trim() || "",
      entryInfo: firstSeated?.entryInfo?.trim() || "",
      seats: allSeats,
      // New structured arrays
      seatedTickets: seatedEntries.map((e) => ({
        ...e,
        seats: e.seats.map((s) => s.trim()).filter(Boolean),
      })),
      standardTickets: standardEntries,
    };

    if (user && user.sessionId) {
      try {
        if (isTokenUser) {
          const res = await consumeTokenFn({
            data: { email: user.email, sessionId: user.sessionId, amount: 2, action: "create a ticket" },
          });
          signIn({ ...user, tokensCount: res.tokensCount, ticketsCreatedCount: res.ticketsCreatedCount });
        } else {
          const res = await incrementTicketsCreatedFn({
            data: { email: user.email, sessionId: user.sessionId },
          });
          signIn({ ...user, ticketsCreatedCount: res.ticketsCreatedCount, ticketSlots: res.ticketSlots });
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update your token balance. Please try again.");
        setError(err.message || "Failed to update token balance.");
        return;
      }
    }

    addCustomTicket(ticket);
    setSaved(true);
    setMessage("Ticket created successfully! Redirecting...");
    setTimeout(() => {
      navigate({ to: "/my-tickets" });
    }, 1500);
  };

  const totalTicketCount = seatedEntries.reduce((n, e) => n + e.seats.length, 0) + standardEntries.length;

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-primary text-primary-foreground pt-[calc(16px+env(safe-area-inset-top,24px))] pb-4 px-4 flex items-center gap-3">
          <Link
            to="/favorites"
            className="inline-flex items-center gap-1 text-primary-foreground/90 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-base font-semibold">New event</h1>
        </div>

        {/* Slot / Token Balance Banner */}
        <div className="mx-5 mt-4 p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                {user?.userType === "token" ? "Tokens Remaining" : "Ticket Slots Remaining"}
              </p>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {user?.userType === "token"
                  ? `${user?.tokensCount ?? 0} tokens`
                  : `${Math.max(0, (user?.ticketSlots ?? 20) - (user?.ticketsCreatedCount ?? 0))} of ${user?.ticketSlots ?? 20} slots left`}
              </p>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
              {user?.userType === "token" ? "2 Tokens / Ticket" : "1 Slot / Ticket"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-tight">
            {user?.userType === "token"
              ? "Note: Creating a ticket consumes 2 tokens from your balance."
              : "Note: Once a ticket is created, 1 ticket slot is permanently consumed (deleting tickets does not restore slots)."}
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* Search bar */}
          <div className="border border-foreground/20 rounded-[4px] p-4 bg-card shadow-sm max-w-full overflow-hidden">
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">
              Search Event from TicketHub
            </p>
            <div className="w-full flex flex-row items-center gap-2 mt-2">
              <div className="flex-1 min-w-0 flex items-center gap-2 border border-zinc-300 rounded-[4px] px-3.5 h-[46px] bg-white">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by artist, team, or show..."
                  className="w-full bg-transparent outline-none text-[16px] placeholder-zinc-400 text-black font-medium min-w-0 flex-1"
                />
                <Search className="h-5 w-5 text-zinc-400 shrink-0" />
              </div>
              <button
                type="button"
                onClick={() => {
                  const q = query.trim();
                  if (q) {
                    setLoading(true);
                    setError(null);
                    searchTMEvents({ data: { keyword: q } })
                      .then((res) => setSearchResults(res))
                      .catch((err) => setError(err?.message ?? "Failed to search events"))
                      .finally(() => setLoading(false));
                  }
                }}
                disabled={loading || !query.trim()}
                className="h-[46px] px-5 bg-primary hover:opacity-90 text-white font-bold rounded-[4px] flex items-center justify-center uppercase tracking-wide text-xs shrink-0 cursor-pointer shadow-sm transition-opacity"
              >
                Search
              </button>
            </div>
          </div>

          {/* Search Results */}
          {loading && <p className="text-xs text-zinc-500 animate-pulse">Searching API...</p>}
          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
          {message && <p className="text-xs text-green-600 font-bold">{message}</p>}

          {searchResults.length > 0 && (
            <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white max-h-60 overflow-y-auto divide-y divide-zinc-100 shadow-lg">
              {searchResults.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev.id)}
                  className="w-full text-left p-3 hover:bg-zinc-50 transition-colors flex items-center gap-3"
                >
                  {ev.image && (
                    <img src={ev.image} className="w-12 h-8 object-cover rounded shrink-0 bg-zinc-100" alt="" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-black truncate">{ev.name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {ev.date} • {ev.venue} • {ev.city}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Event Details */}
          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Event Details
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Event Title</label>
                <input
                  type="text"
                  placeholder="World Cup Round of 16..."
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Category</label>
                  <input
                    type="text"
                    placeholder="Soccer"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Price (USD)</label>
                  <input
                    type="text"
                    placeholder="49"
                    value={form.priceFrom}
                    onChange={(e) => setField("priceFrom", e.target.value)}
                    className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Venue</label>
                  <input
                    type="text"
                    placeholder="Lincoln Financial Field"
                    value={form.venue}
                    onChange={(e) => setField("venue", e.target.value)}
                    className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">City</label>
                  <input
                    type="text"
                    placeholder="Philadelphia, PA"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Date</label>
                  <input
                    type="text"
                    placeholder="Sat, Jul 4, 2026"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                    className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Time</label>
                  <input
                    type="text"
                    placeholder="5:00 PM"
                    value={form.time}
                    onChange={(e) => setField("time", e.target.value)}
                    className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={form.image}
                  onChange={(e) => setField("image", e.target.value)}
                  className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-[4px] border border-foreground/20 px-3 py-2 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>
            </div>
          </div>

          {/* ── Ticket Type Panels (shown once event details are filled) ── */}
          {(eventLoaded || form.title.trim()) && (
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                Tickets{totalTicketCount > 0 ? ` · ${totalTicketCount} total` : ""}
              </h3>

              {/* ── Seated Tickets Panel ── */}
              <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🪑</span>
                    <span className="font-bold text-[15px] text-zinc-900">Seated tickets</span>
                  </div>
                  <button
                    type="button"
                    onClick={addSeatedEntry}
                    className="text-primary text-sm font-bold hover:opacity-75 transition-opacity"
                  >
                    Add seated ticket
                  </button>
                </div>
                {/* Subtitle */}
                <p className="text-xs text-zinc-500 font-medium px-4 pt-2 pb-1">
                  {seatedEntries.reduce((n, e) => n + e.seats.length, 0)} in this cart · section, row &amp; seat
                </p>

                {/* Entries */}
                {seatedEntries.length === 0 ? (
                  <div className="mx-4 my-3 border border-dashed border-zinc-300 rounded-lg py-5 flex items-center justify-center">
                    <p className="text-sm text-zinc-400 font-medium">No seated tickets yet.</p>
                  </div>
                ) : (
                  <div className="px-4 pb-4 space-y-4 mt-2">
                    {seatedEntries.map((entry, entryIdx) => (
                      <div key={entry.id} className="border border-zinc-200 rounded-lg p-4 space-y-3 bg-zinc-50/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-zinc-800">
                            Seated ticket {entryIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSeatedEntry(entry.id)}
                            className="text-sm font-bold text-red-500 hover:opacity-75 transition-opacity"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                              Section
                            </label>
                            <input
                              type="text"
                              placeholder="Floor A"
                              value={entry.section}
                              onChange={(e) => updateSeatedEntry(entry.id, "section", e.target.value)}
                              className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                              Row
                            </label>
                            <input
                              type="text"
                              placeholder="12"
                              value={entry.row}
                              onChange={(e) => updateSeatedEntry(entry.id, "row", e.target.value)}
                              className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                            Ticket Type
                          </label>
                          <input
                            type="text"
                            placeholder="Verified Fan Onsale"
                            value={entry.ticketType}
                            onChange={(e) => updateSeatedEntry(entry.id, "ticketType", e.target.value)}
                            className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                            Entry Info
                          </label>
                          <input
                            type="text"
                            placeholder="Gate 1, Verizon Gate"
                            value={entry.entryInfo}
                            onChange={(e) => updateSeatedEntry(entry.id, "entryInfo", e.target.value)}
                            className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                          />
                        </div>

                        {/* Seats */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                              Seat Numbers
                            </label>
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              {entry.seats.length} of 8
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {entry.seats.map((seatVal, seatIdx) => (
                              <div key={seatIdx} className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder={`Seat ${seatIdx + 1}`}
                                  value={seatVal}
                                  onChange={(e) => updateSeatInEntry(entry.id, seatIdx, e.target.value)}
                                  className="flex-1 h-9 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                                />
                                {entry.seats.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeSeatFromEntry(entry.id, seatIdx)}
                                    className="text-zinc-400 hover:text-red-500 transition-colors p-1 shrink-0"
                                    aria-label="Remove seat"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {entry.seats.length < 8 && (
                            <button
                              type="button"
                              onClick={() => addSeatToEntry(entry.id)}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add seat
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Standard Tickets Panel ── */}
              <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚶</span>
                    <span className="font-bold text-[15px] text-zinc-900">Standard tickets</span>
                  </div>
                  <button
                    type="button"
                    onClick={addStandardEntry}
                    className="text-primary text-sm font-bold hover:opacity-75 transition-opacity"
                  >
                    Add standard ticket
                  </button>
                </div>
                {/* Subtitle */}
                <p className="text-xs text-zinc-500 font-medium px-4 pt-2 pb-1">
                  {standardEntries.length} in this cart · GA1, GA2, etc.
                </p>

                {/* Entries */}
                {standardEntries.length === 0 ? (
                  <div className="mx-4 my-3 border border-dashed border-zinc-300 rounded-lg py-5 flex items-center justify-center">
                    <p className="text-sm text-zinc-400 font-medium">No standard tickets yet.</p>
                  </div>
                ) : (
                  <div className="px-4 pb-4 space-y-4 mt-2">
                    {standardEntries.map((entry, entryIdx) => (
                      <div key={entry.id} className="border border-zinc-200 rounded-lg p-4 space-y-3 bg-zinc-50/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-zinc-800">
                            Standard ticket {entryIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeStandardEntry(entry.id)}
                            className="text-sm font-bold text-red-500 hover:opacity-75 transition-opacity"
                          >
                            Remove
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                            Section
                          </label>
                          <input
                            type="text"
                            placeholder="GA1"
                            value={entry.section}
                            onChange={(e) => updateStandardEntry(entry.id, "section", e.target.value)}
                            className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                            Ticket Type
                          </label>
                          <div className="relative mt-1">
                            <select
                              value={entry.ticketType}
                              onChange={(e) => updateStandardEntry(entry.id, "ticketType", e.target.value)}
                              className="w-full h-10 rounded-[4px] border border-foreground/20 pl-3 pr-8 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black appearance-none"
                            >
                              {TICKET_TYPE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                            Presale / Sale Label
                          </label>
                          <div className="relative mt-1">
                            <select
                              value={entry.presaleLabel}
                              onChange={(e) => updateStandardEntry(entry.id, "presaleLabel", e.target.value)}
                              className="w-full h-10 rounded-[4px] border border-foreground/20 pl-3 pr-8 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black appearance-none"
                            >
                              {PRESALE_LABEL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {user?.userType !== "token" &&
            (user?.ticketsCreatedCount ?? 0) >= (user?.ticketSlots ?? 20) && (
              <p className="text-xs text-destructive font-semibold text-center mb-2">
                You have run out of ticket slots ({user?.ticketSlots ?? 20} slots used). Please contact the administrator.
              </p>
            )}

          {user?.userType === "token" && (user?.tokensCount ?? 0) < 2 && (
            <p className="text-xs text-destructive font-semibold text-center mb-2">
              Insufficient tokens. You need at least 2 tokens to create a ticket (Current balance:{" "}
              {user?.tokensCount ?? 0}).
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={
              saved ||
              (user?.userType === "token"
                ? (user?.tokensCount ?? 0) < 2
                : (user?.ticketsCreatedCount ?? 0) >= (user?.ticketSlots ?? 20))
            }
            className="w-full rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold py-3.5 hover:bg-primary/95 disabled:opacity-60 transition-colors"
          >
            {saved ? "Saving ticket..." : "Save to My Tickets"}
          </button>
        </div>
      </div>
    </main>
  );
}
