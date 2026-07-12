import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/lib/auth";
import { getTMEvent, type TMEventDetail } from "@/lib/ticketmaster.functions";
import { addCustomTicket } from "@/lib/ticket-store";
import type { Ticket } from "@/lib/tickets";

export const Route = createFileRoute("/create-ticket/$tmId")({
  head: () => ({ meta: [{ title: "Create Ticket — TicketHub" }] }),
  component: CreateTicketPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-destructive font-semibold">{error.message}</p>
        <Link to="/discover" className="text-primary underline mt-3 inline-block">
          Back to Discover
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Link to="/discover" className="text-primary underline">Back to Discover</Link>
    </div>
  ),
});

type FormFields = {
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  section: string;
  row: string;
  seat: string;
  priceFrom: string;
  currency: string;
  description: string;
  image: string;
};

function toForm(e: TMEventDetail): FormFields {
  return {
    title: e.name,
    category: e.category,
    venue: e.venue,
    city: e.city,
    date: e.date,
    time: e.time,
    section: e.section,
    row: e.row,
    seat: e.seat,
    priceFrom: e.priceFrom ? String(e.priceFrom) : "",
    currency: e.currency,
    description: e.description,
    image: e.image,
  };
}

function CreateTicketPage() {
  const { tmId } = Route.useParams();
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [form, setForm] = useState<FormFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTMEvent({ data: { id: tmId } })
      .then((e) => {
        if (!cancelled) setForm(toForm(e));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load event");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmId]);

  if (!ready || !user) return null;

  const set = <K extends keyof FormFields>(k: K, v: FormFields[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleSave = () => {
    if (!form) return;
    const seatBits = [
      form.section && `Sec ${form.section}`,
      form.row && `Row ${form.row}`,
      form.seat && `Seat ${form.seat}`,
    ]
      .filter(Boolean)
      .join(" · ");
    const desc = seatBits
      ? `${seatBits}\n\n${form.description}`
      : form.description;
    const ticket: Ticket = {
      id: `tm-${tmId}-${Date.now()}`,
      title: form.title.trim() || "Untitled event",
      category: form.category.trim() || "Event",
      venue: form.venue.trim() || "TBA",
      city: form.city.trim() || "TBA",
      date: form.date.trim() || "TBA",
      time: form.time.trim() || "TBA",
      priceFrom: Number(form.priceFrom) || 0,
      image: form.image.trim() || "",
      description: desc,
    };
    addCustomTicket(ticket);
    setSaved(true);
    window.setTimeout(() => navigate({ to: "/favorites" }), 700);
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        <div className="bg-primary text-primary-foreground py-4 px-4 flex items-center gap-3">
          <Link
            to="/discover"
            className="inline-flex items-center gap-1 text-primary-foreground/90 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-base font-medium">Create Ticket</h1>
        </div>

        {loading && (
          <p className="p-6 text-sm text-muted-foreground">Loading event…</p>
        )}
        {error && <p className="p-6 text-sm text-destructive">{error}</p>}

        {form && (
          <div className="p-5 space-y-4">
            {form.image && (
              <div className="aspect-[16/10] overflow-hidden rounded-[4px]">
                <img
                  src={form.image}
                  alt={form.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <Field label="Event Title" value={form.title} onChange={(v) => set("title", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category" value={form.category} onChange={(v) => set("category", v)} />
              <Field label="Price" value={form.priceFrom} onChange={(v) => set("priceFrom", v)} placeholder="0" />
            </div>
            <Field label="Venue" value={form.venue} onChange={(v) => set("venue", v)} />
            <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" value={form.date} onChange={(v) => set("date", v)} />
              <Field label="Time" value={form.time} onChange={(v) => set("time", v)} />
            </div>

            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">
                Your seat
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Section" value={form.section} onChange={(v) => set("section", v)} placeholder="A1" />
                <Field label="Row" value={form.row} onChange={(v) => set("row", v)} placeholder="12" />
                <Field label="Seat" value={form.seat} onChange={(v) => set("seat", v)} placeholder="7" />
              </div>
            </div>

            <Field label="Image URL" value={form.image} onChange={(v) => set("image", v)} />

            <div>
              <label className="text-xs font-semibold">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-[4px] border border-foreground/20 px-3 py-2 text-sm outline-none focus:border-primary bg-background"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saved}
              className="w-full rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold py-3 disabled:opacity-60"
            >
              {saved ? "Saved! Redirecting…" : "Save to My Tickets"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-sm outline-none focus:border-primary bg-background"
      />
    </div>
  );
}