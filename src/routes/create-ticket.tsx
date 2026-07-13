import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, Plus, Trash2, Ticket as TicketIcon } from "lucide-react";
import { useUser } from "@/lib/auth";
import { searchTMEvents, getTMEvent, type TMEventSummary } from "@/lib/ticketmaster.functions";
import { addCustomTicket } from "@/lib/ticket-store";
import type { Ticket } from "@/lib/tickets";

export const Route = createFileRoute("/create-ticket")({
  head: () => ({ meta: [{ title: "New Event — TicketHub" }] }),
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
  // Resell details
  ticketType: string;
  section: string;
  row: string;
  entryInfo: string;
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
  ticketType: "Verified Fan Onsale",
  section: "",
  row: "",
  entryInfo: "",
};

function CreateTicketSearchPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected event form fields
  const [form, setForm] = useState<FormFields>(DEFAULT_FIELDS);
  const [seats, setSeats] = useState<string[]>(["1"]); // starts with 1 seat
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        ticketType: "Verified Fan Onsale",
        section: "",
        row: "",
        entryInfo: "",
      });
      setSearchResults([]);
      setQuery("");
      setMessage("Event details loaded!");
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const setField = <K extends keyof FormFields>(k: K, v: FormFields[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Seats manipulation
  const handleAddSeat = () => {
    if (seats.length >= 8) return;
    // Guess next seat number sequence
    const lastSeatNum = Number(seats[seats.length - 1]);
    const nextSeat = isNaN(lastSeatNum) ? "1" : String(lastSeatNum + 1);
    setSeats((prev) => [...prev, nextSeat]);
  };

  const handleRemoveSeat = (index: number) => {
    if (seats.length <= 1) return;
    setSeats((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSeatChange = (index: number, val: string) => {
    setSeats((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  // Save reseller ticket to Ticket store
  const handleSave = () => {
    if (!form.title.trim()) {
      setError("Please select or specify an event title");
      return;
    }

    const ticket: Ticket = {
      id: `custom-tm-${Date.now()}`,
      title: form.title.trim(),
      category: form.category.trim(),
      venue: form.venue.trim() || "TBA",
      city: form.city.trim() || "TBA",
      date: form.date.trim() || "TBA",
      time: form.time.trim() || "TBA",
      priceFrom: Number(form.priceFrom) || 0,
      image: form.image.trim() || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1024&h=640&fit=crop",
      description: form.description.trim() || "No description provided.",
      ticketType: form.ticketType.trim(),
      section: form.section.trim(),
      row: form.row.trim(),
      entryInfo: form.entryInfo.trim(),
      seats: seats.map((s) => s.trim()).filter(Boolean),
    };

    addCustomTicket(ticket);
    setSaved(true);
    setMessage("Ticket created successfully! Redirecting...");
    setTimeout(() => {
      navigate({ to: "/my-tickets" });
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-primary text-primary-foreground py-4 px-4 flex items-center gap-3">
          <Link
            to="/favorites"
            className="inline-flex items-center gap-1 text-primary-foreground/90 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-base font-semibold">New event</h1>
        </div>

        <div className="p-5 space-y-5">
          {/* Search bar */}
          <div className="border border-foreground/20 rounded-[4px] p-4 bg-card shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">
              Search Event from Ticketmaster
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 flex items-center gap-2 border border-zinc-300 rounded-[4px] px-3.5 h-[46px] bg-white">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by artist, team, or show..."
                  className="flex-1 bg-transparent outline-none text-[16px] placeholder-zinc-400 text-black font-medium"
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
                className="h-[46px] px-5 bg-primary hover:opacity-90 text-white font-bold rounded-[4px] flex items-center justify-center uppercase tracking-wide text-xs shrink-0 cursor-pointer shadow-sm transition-opacity"
              >
                Search
              </button>
            </div>
          </div>

          {/* Search Results List */}
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

          {/* Editable inputs carrying event details */}
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

          {/* Resell Ticket Details inputs */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Create Resell Ticket details
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Section (e.g. Floor A)</label>
                <input
                  type="text"
                  placeholder="Floor A"
                  value={form.section}
                  onChange={(e) => setField("section", e.target.value)}
                  className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">Row (e.g. 12)</label>
                <input
                  type="text"
                  placeholder="12"
                  value={form.row}
                  onChange={(e) => setField("row", e.target.value)}
                  className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Ticket Type</label>
                <input
                  type="text"
                  placeholder="Verified OnSale"
                  value={form.ticketType}
                  onChange={(e) => setField("ticketType", e.target.value)}
                  className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">Entry Info (e.g. Gate 1)</label>
                <input
                  type="text"
                  placeholder="Gate 1, Verizon Gate"
                  value={form.entryInfo}
                  onChange={(e) => setField("entryInfo", e.target.value)}
                  className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>
            </div>

            {/* Dynamic Seats selection section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700">Seat Numbers</label>
                <span className="text-[11px] text-zinc-500 font-semibold">{seats.length} of 8 seats</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {seats.map((seatVal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Seat ${idx + 1}`}
                      value={seatVal}
                      onChange={(e) => handleSeatChange(idx, e.target.value)}
                      className="flex-1 h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                    />
                    {seats.length > 1 && (
                      <button
                        onClick={() => handleRemoveSeat(idx)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                        aria-label="Remove seat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {seats.length < 8 && (
                <button
                  type="button"
                  onClick={handleAddSeat}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:opacity-85"
                >
                  <Plus className="w-4 h-4" /> Add more seats
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saved}
            className="w-full rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold py-3.5 hover:bg-primary/95 disabled:opacity-60 transition-colors"
          >
            {saved ? "Saving ticket..." : "Save to My Tickets"}
          </button>
        </div>
      </div>
    </main>
  );
}
