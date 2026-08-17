import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { signIn, useUser } from "@/lib/auth";
import { updateCustomTicket, useAllTickets } from "@/lib/ticket-store";
import { consumeTokenFn } from "@/admin/functions";
import { toast } from "sonner";
import type { Ticket } from "@/lib/tickets";

export const Route = createFileRoute("/edit-ticket/$id")({
  head: () => ({ meta: [{ title: "Edit Ticket — Ticketmaster" }] }),
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
  // Resell details
  ticketType: string;
  section: string;
  row: string;
  entryInfo: string;
};

function EditTicketPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const all = useAllTickets();
  const ticket = all.find((t) => t.id === id);

  const [form, setForm] = useState<FormFields | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
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
        ticketType: ticket.ticketType || "Verified Fan Onsale",
        section: ticket.section || "",
        row: ticket.row || "",
        entryInfo: ticket.entryInfo || "",
      });

      // Parse seats
      if (ticket.seats && ticket.seats.length > 0) {
        setSeats(ticket.seats);
      } else {
        // Fallback: parse seats from description or use default
        const m = ticket.description?.match(
          /Sec\s+([^\s·]+)(?:\s+·\s+Row\s+([^\s·]+))?(?:\s+·\s+Seat\s+([^\s·\n]+))?/i
        );
        if (m && m[3]) {
          setSeats([m[3]]);
        } else {
          setSeats(["1"]);
        }
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

  // Seats manipulation
  const handleAddSeat = () => {
    if (seats.length >= 8) return;
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

  // Save changes
  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Please specify an event title");
      return;
    }

    const isTokenUser = user?.userType === 'token';
    if (isTokenUser) {
      if ((user?.tokensCount ?? 0) < 1) {
        toast.error("Insufficient tokens. You need at least 1 token to edit a ticket.");
        setError("Insufficient tokens (1 token required to edit). Please contact the administrator.");
        return;
      }
    }

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
      ticketType: form.ticketType.trim(),
      section: form.section.trim(),
      row: form.row.trim(),
      entryInfo: form.entryInfo.trim(),
      seats: seats.map((s) => s.trim()).filter(Boolean),
    };

    if (user && user.sessionId && isTokenUser) {
      try {
        const res = await consumeTokenFn({
          data: {
            email: user.email,
            sessionId: user.sessionId,
            amount: 1,
            action: 'edit a ticket',
          }
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
        {user?.userType === 'token' && (
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

          {/* Resell Ticket Details */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Resell Ticket details
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

            {/* Dynamic Seats */}
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

          {user?.userType === 'token' && (user?.tokensCount ?? 0) < 1 && (
            <p className="text-xs text-destructive font-semibold text-center mb-2">
              Insufficient tokens. You need at least 1 token to edit a ticket (Current balance: {user?.tokensCount ?? 0}).
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saved || (user?.userType === 'token' && (user?.tokensCount ?? 0) < 1)}
            className="w-full rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold py-3.5 hover:bg-primary/95 disabled:opacity-60 transition-colors"
          >
            {saved ? "Saving changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
