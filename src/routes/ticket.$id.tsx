import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllTickets } from "@/lib/ticket-store";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/ticket/$id")({
  head: () => ({
    meta: [{ title: "Ticket — TicketHub" }],
  }),
  component: TicketDetail,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Link to="/discover" className="text-primary underline mt-3 inline-block">
          Back to Discover
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
});

function TicketDetail() {
  const { id } = Route.useParams();
  const all = useAllTickets();
  const ticket = all.find((t) => t.id === id);
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [qty, setQty] = useState(1);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!ticket) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <Link to="/discover" className="text-primary underline mt-3 inline-block">
            Back to Discover
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="relative h-[320px] sm:h-[440px] overflow-hidden">
        <img
          src={ticket.image}
          alt={ticket.title}
          width={1024}
          height={1024}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <Link
          to="/discover"
          className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-[4px] bg-black/50 text-white px-3 py-1.5 text-sm backdrop-blur hover:bg-black/70"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 text-white max-w-6xl mx-auto">
          <span className="inline-block bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded">
            {ticket.category}
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold">{ticket.title}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <InfoTile icon={<Calendar className="h-5 w-5" />} label="Date" value={ticket.date} />
            <InfoTile icon={<Clock className="h-5 w-5" />} label="Doors" value={ticket.time} />
            <InfoTile icon={<MapPin className="h-5 w-5" />} label="Venue" value={`${ticket.venue}`} subvalue={ticket.city} />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">About this event</h2>
            <p className="text-muted-foreground leading-relaxed">{ticket.description}</p>
          </div>
        </div>

        <aside className="rounded-xl border p-6 bg-card h-fit lg:sticky lg:top-20 shadow-sm">
          <p className="text-sm text-muted-foreground">Starting from</p>
          <p className="text-3xl font-bold mt-1">${ticket.priceFrom}</p>

          <div className="mt-5">
            <label className="text-sm font-medium">Quantity</label>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</Button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.min(8, q + 1))}>+</Button>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold">${ticket.priceFrom * qty}</span>
          </div>

          <Button
            className="w-full mt-5"
            size="lg"
            onClick={() => setPurchased(true)}
            disabled={purchased}
          >
            <TicketIcon className="h-4 w-4 mr-2" />
            {purchased ? "Tickets reserved!" : "Get tickets"}
          </Button>
          {purchased && (
            <p className="text-xs text-center text-muted-foreground mt-3">
              This is a demo — no payment was processed.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

function InfoTile({
  icon,
  label,
  value,
  subvalue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">{label}</span></div>
      <p className="mt-1 font-semibold">{value}</p>
      {subvalue && <p className="text-sm text-muted-foreground">{subvalue}</p>}
    </div>
  );
}