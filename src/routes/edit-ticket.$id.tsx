import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, ChevronDown } from "lucide-react";
import { signIn, useUser } from "@/lib/auth";
import { updateCustomTicket, useAllTickets } from "@/lib/ticket-store";
import { consumeTokenFn } from "@/admin/functions";
import { toast } from "sonner";
import type { Ticket, SeatedTicketEntry, StandardTicketEntry } from "@/lib/tickets";

export const Route = createFileRoute("/edit-ticket/$id")({
  head: () => ({ meta: [{ title: "Edit Ticket — TicketHub" }] }),
  component: EditTicketPage,
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

function makeSeatedEntry(overrides?: Partial<SeatedTicketEntry>): SeatedTicketEntry {
  return {
    id: `seated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    section: "",
    row: "",
    ticketType: "Verified Fan Onsale",
    entryInfo: "",
    seats: ["1"],
    ...overrides,
  };
}

function makeStandardEntry(overrides?: Partial<StandardTicketEntry>): StandardTicketEntry {
  return {
    id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    section: "GA1",
    ticketType: "General Admission",
    presaleLabel: "General Sale",
    ...overrides,
  };
}

function EditTicketPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const all = useAllTickets();
  const ticket = all.find((t) => t.id === id);

  const [form, setForm] = useState<FormFields | null>(null);
  const [seatedEntries, setSeatedEntries] = useState<SeatedTicketEntry[]>([]);
  const [standardEntries, setStandardEntries] = useState<StandardTicketEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  // Populate form state when ticket is loaded
  useEffect(() => {
    if (ticket) {
      setForm({
        title: ticket.title || "",
        category: ticket.category || "Event",
        venue: ticket.venue || "",
        city: ticket.city || "",
        date: ticket.date || "",
        time: ticket.time || "",
        priceFrom: ticket.priceFrom ? String(ticket.priceFrom) : "",
        currency: "USD",
        description: ticket.description || "",
        image: ticket.image || "",
      });

      // Populate seated entries
      if (ticket.seatedTickets !== undefined) {
        setSeatedEntries(ticket.seatedTickets);
      } else if (
        ticket.standardTickets &&
        ticket.standardTickets.length > 0 &&
        (!ticket.seats || ticket.seats.length === 0) &&
        !ticket.section
      ) {
        setSeatedEntries([]);
      } else {
        // Migrate from legacy flat fields
        let seats: string[] = [];
        if (ticket.seats && ticket.seats.length > 0) {
          seats = ticket.seats;
        } else {
          const m = ticket.description?.match(
            /Sec\s+([^\s·]+)(?:\s+·\s+Row\s+([^\s·]+))?(?:\s+·\s+Seat\s+([^\s·\n]+))?/i
          );
          seats = m && m[3] ? [m[3]] : ["1"];
        }
        setSeatedEntries([
          makeSeatedEntry({
            section: ticket.section || "",
            row: ticket.row || "",
            ticketType: ticket.ticketType || "Verified Fan Onsale",
            entryInfo: ticket.entryInfo || "",
            seats,
          }),
        ]);
      }

      // Populate standard entries
      if (ticket.standardTickets && ticket.standardTickets.length > 0) {
        setStandardEntries(ticket.standardTickets);
      }
    }
  }, [ticket]);

  if (!ready || !user) return null;

  if (!ticket) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive font-semibold">Event not found</p>
          <Link to="/favorites" className="text-primary underline mt-3 inline-block">
            Back to Favorites
          </Link>
        </div>
      </main>
    );
  }

  if (!form) return null;

  const setField = <K extends keyof FormFields>(k: K, v: FormFields[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));

  // ─── Seated entry helpers ─────────────────────────────────────
  const addSeatedEntry = () => setSeatedEntries((prev) => [...prev, makeSeatedEntry()]);
  const removeSeatedEntry = (entryId: string) =>
    setSeatedEntries((prev) => prev.filter((e) => e.id !== entryId));
  const updateSeatedEntry = <K extends keyof SeatedTicketEntry>(
    entryId: string, key: K, value: SeatedTicketEntry[K]
  ) => setSeatedEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, [key]: value } : e)));
  const addSeatToEntry = (entryId: string) => {
    setSeatedEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId || e.seats.length >= 8) return e;
        const last = Number(e.seats[e.seats.length - 1]);
        const next = isNaN(last) ? "1" : String(last + 1);
        return { ...e, seats: [...e.seats, next] };
      })
    );
  };
  const removeSeatFromEntry = (entryId: string, idx: number) => {
    setSeatedEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId || e.seats.length <= 1) return e;
        return { ...e, seats: e.seats.filter((_, i) => i !== idx) };
      })
    );
  };
  const updateSeatInEntry = (entryId: string, idx: number, val: string) => {
    setSeatedEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const seats = [...e.seats];
        seats[idx] = val;
        return { ...e, seats };
      })
    );
  };

  // ─── Standard entry helpers ───────────────────────────────────
  const addStandardEntry = () => setStandardEntries((prev) => [...prev, makeStandardEntry()]);
  const removeStandardEntry = (entryId: string) =>
    setStandardEntries((prev) => prev.filter((e) => e.id !== entryId));
  const updateStandardEntry = <K extends keyof StandardTicketEntry>(
    entryId: string, key: K, value: StandardTicketEntry[K]
  ) => setStandardEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, [key]: value } : e)));

  // Save changes
  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Please specify an event title");
      return;
    }

    if (seatedEntries.length === 0 && standardEntries.length === 0) {
      toast.error("Please add at least one seated ticket or standard ticket.");
      setError("Please add at least one seated ticket or standard ticket.");
      return;
    }

    const isTokenUser = user?.userType === "token";
    if (isTokenUser) {
      if ((user?.tokensCount ?? 0) < 1) {
        toast.error("Insufficient tokens. You need at least 1 token to edit a ticket.");
        setError("Insufficient tokens (1 token required to edit). Please contact the administrator.");
        return;
      }
    }

    const firstSeated = seatedEntries[0];
    const allSeats = seatedEntries.flatMap((e) => e.seats.map((s) => s.trim()).filter(Boolean));

    const updated: Ticket = {
      ...ticket,
      title: form.title.trim(),
      category: form.category.trim(),
      venue: form.venue.trim() || "TBA",
      city: form.city.trim() || "TBA",
      date: form.date.trim() || "TBA",
      time: form.time.trim() || "TBA",
      priceFrom: Number(form.priceFrom) || 0,
      image: form.image.trim(),
      description: form.description.trim() || "No description provided.",
      // Backwards-compat flat fields from first seated entry
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

    if (user && user.sessionId && isTokenUser) {
      try {
        const res = await consumeTokenFn({
          data: { email: user.email, sessionId: user.sessionId, amount: 1, action: "edit a ticket" },
        });
        signIn({ ...user, tokensCount: res.tokensCount });
      } catch (err: any) {
        toast.error(err.message || "Failed to deduct token for editing.");
        setError(err.message || "Failed to update token balance.");
        return;
      }
    }

    updateCustomTicket(updated);
    setSaved(true);
    toast.success(isTokenUser ? "Changes saved! (1 token consumed)" : "Changes saved!");
    setMessage("Changes saved! Redirecting...");
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
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
          <h1 className="text-base font-semibold">Edit Event</h1>
        </div>

        {/* Token Balance Banner (For Token Users) */}
        {user?.userType === "token" && (
          <div className="mx-5 mt-4 p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Tokens Remaining</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">{user?.tokensCount ?? 0} tokens</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
                1 Token / Edit
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-tight">
              Note: Saving edits to this ticket consumes 1 token from your balance.
            </p>
          </div>
        )}

        <div className="p-5 space-y-5">
          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
          {message && <p className="text-xs text-green-600 font-bold">{message}</p>}

          {/* Event Details */}
          <div className="space-y-4">
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
                  rows={3}
                  className="mt-1 w-full rounded-[4px] border border-foreground/20 px-3 py-2 text-[16px] md:text-sm outline-none focus:border-primary bg-background text-black"
                />
              </div>
            </div>
          </div>

          {/* ── Ticket Type Panels ── */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Tickets
            </h3>

            {/* ── Seated Tickets Panel ── */}
            <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
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
              <p className="text-xs text-zinc-500 font-medium px-4 pt-2 pb-1">
                {seatedEntries.reduce((n, e) => n + e.seats.length, 0)} in this cart · section, row &amp; seat
              </p>

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
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Section</label>
                          <input
                            type="text"
                            placeholder="Floor A"
                            value={entry.section}
                            onChange={(e) => updateSeatedEntry(entry.id, "section", e.target.value)}
                            className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Row</label>
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
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Ticket Type</label>
                        <input
                          type="text"
                          placeholder="Verified Fan Onsale"
                          value={entry.ticketType}
                          onChange={(e) => updateSeatedEntry(entry.id, "ticketType", e.target.value)}
                          className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Entry Info</label>
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
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Seat Numbers</label>
                          <span className="text-[10px] text-zinc-400 font-semibold">{entry.seats.length} of 8</span>
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
              <p className="text-xs text-zinc-500 font-medium px-4 pt-2 pb-1">
                {standardEntries.length} in this cart · GA1, GA2, etc.
              </p>

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
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Section</label>
                        <input
                          type="text"
                          placeholder="GA1"
                          value={entry.section}
                          onChange={(e) => updateStandardEntry(entry.id, "section", e.target.value)}
                          className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-[16px] md:text-sm outline-none focus:border-primary bg-white text-black"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Ticket Type</label>
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
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Presale / Sale Label</label>
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

          {user?.userType === "token" && (user?.tokensCount ?? 0) < 1 && (
            <p className="text-xs text-destructive font-semibold text-center mb-2">
              Insufficient tokens. You need at least 1 token to edit a ticket (Current balance:{" "}
              {user?.tokensCount ?? 0}).
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saved || (user?.userType === "token" && (user?.tokensCount ?? 0) < 1)}
            className="w-full rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold py-3.5 hover:bg-primary/95 disabled:opacity-60 transition-colors"
          >
            {saved ? "Saving changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
