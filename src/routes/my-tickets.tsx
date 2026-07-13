import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Heart, Ticket as TicketIcon, User as UserIcon } from "lucide-react";
import { signOut, useUser } from "@/lib/auth";
import { useCustomTickets } from "@/lib/ticket-store";
import type { Ticket } from "@/lib/tickets";

export const Route = createFileRoute("/my-tickets")({
  head: () => ({ meta: [{ title: "My Tickets — TicketHub" }] }),
  component: MyTicketsPage,
});

function parseTicketDate(t: Ticket): number {
  const raw = `${t.date} ${t.time}`.trim();
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
}

function formatHeaderDate(t: Ticket): string {
  const ts = parseTicketDate(t);
  if (!ts) return `${t.date}${t.time ? ` • ${t.time}` : ""}`.toUpperCase();
  const d = new Date(ts);
  const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} • ${month} ${d.getDate()}, ${d.getFullYear()} • ${time}`;
}

function MyTicketsPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const custom = useCustomTickets();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: Ticket[] = [];
    const pa: Ticket[] = [];
    for (const t of custom) {
      const ts = parseTicketDate(t);
      if (ts && ts < now) pa.push(t);
      else up.push(t);
    }
    return { upcoming: up, past: pa };
  }, [custom]);

  if (!ready || !user) return null;

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Top bar */}
        <div className="grid grid-cols-3 items-center px-5 pt-6 pb-4">
          <span />
          <h1 className="text-center text-base font-medium flex items-center justify-center gap-1.5">
            My Events <span aria-hidden>🇺🇸</span>
          </h1>
          <button className="justify-self-end text-sm text-foreground/80">
            Help
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-foreground/10">
          <TabHeader
            active={tab === "upcoming"}
            label="UPCOMING"
            count={upcoming.length}
            onClick={() => setTab("upcoming")}
          />
          <TabHeader
            active={tab === "past"}
            label="PAST"
            count={past.length}
            onClick={() => setTab("past")}
          />
        </div>

        {/* Ticket list */}
        <div className="p-4 space-y-5">
          {list.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <TicketIcon className="h-10 w-10 mx-auto text-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {tab === "upcoming"
                  ? "No upcoming tickets yet."
                  : "No past tickets."}
              </p>
              <Link
                to="/discover"
                className="inline-block rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold px-4 py-2"
              >
                Find events
              </Link>
            </div>
          )}

          {list.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-4">
          <NavItem
            icon={<Search className="h-5 w-5" />}
            label="Discover"
            onClick={() => navigate({ to: "/discover" })}
          />
          <NavItem
            icon={<Heart className="h-5 w-5" />}
            label="Favorites"
            onClick={() => navigate({ to: "/favorites" })}
          />
          <NavItem
            active
            icon={<TicketIcon className="h-5 w-5" fill="currentColor" />}
            label="My Tickets"
          />
          <NavItem
            icon={<UserIcon className="h-5 w-5" />}
            label="My Account"
            onClick={() => navigate({ to: "/my-account" })}
          />
        </div>
      </nav>
    </main>
  );
}

function TabHeader({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 text-xs font-semibold tracking-wider text-center relative ${
        active ? "text-primary" : "text-foreground/60"
      }`}
    >
      {label} ({count})
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary" />
      )}
    </button>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link
      to="/my-ticket/$id"
      params={{ id: ticket.id }}
      className="block overflow-hidden"
    >
      {ticket.image && (
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={ticket.image}
            alt={ticket.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="bg-black/85 text-white px-4 py-2 -mt-8 relative w-fit">
        <p className="text-[11px] font-semibold tracking-wide">
          {formatHeaderDate(ticket)}
        </p>
      </div>
      <div className="bg-[#111] text-white px-4 pt-4 pb-5">
        <h3 className="text-lg font-bold uppercase leading-tight">
          {ticket.title}
        </h3>
        <p className="mt-4 text-xs text-white/70">
          {ticket.venue}
          {ticket.city ? `, ${ticket.city}` : ""}
        </p>
      </div>
    </Link>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2.5 ${
        active ? "text-primary" : "text-foreground/60"
      }`}
    >
      {icon}
      <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>
        {label}
      </span>
    </button>
  );
}