import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Ticket as TicketIcon,
  MapPin,
  Calendar,
  Search,
  ChevronDown,
  Heart,
  User as UserIcon,
} from "lucide-react";
import { signOut, useUser } from "@/lib/auth";
import { featuredTickets } from "@/lib/tickets";
import { useAllTickets } from "@/lib/ticket-store";
import { searchTMEvents, type TMEventSummary } from "@/lib/ticketmaster.functions";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [{ title: "Discover — Ticketmaster" }],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const all = useAllTickets();
  const [tmResults, setTmResults] = useState<TMEventSummary[]>([]);
  const [tmLoading, setTmLoading] = useState(false);
  const [tmError, setTmError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % featuredTickets.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setTmResults([]);
      setTmError(null);
      setTmLoading(false);
      return;
    }
    let cancelled = false;
    setTmLoading(true);
    setTmError(null);
    const handle = window.setTimeout(() => {
      searchTMEvents({ data: { keyword: q } })
        .then((r) => {
          if (!cancelled) setTmResults(r);
        })
        .catch((err) => {
          if (!cancelled) setTmError(err?.message ?? "Search failed");
        })
        .finally(() => {
          if (!cancelled) setTmLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  if (!ready || !user) return null;

  if (loading) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="max-w-md mx-auto">
          {/* Logo bar placeholder */}
          <div className="px-5 pt-[calc(16px+env(safe-area-inset-top,24px))] pb-4 flex items-center justify-center">
            <div className="h-[17px] w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Location + Dates placeholder */}
          <div className="px-5 grid grid-cols-2 gap-3 mb-6">
            <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Search Input placeholder */}
          <div className="px-5 mb-6">
            <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
          </div>

          {/* Hero event placeholder */}
          <div className="px-5 mb-8">
            <div className="aspect-[16/10] w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="mt-4 h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="mt-2 h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>

          {/* Categories/Events Section headers */}
          <div className="px-5 mb-4 flex justify-between items-center">
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Event cards placeholders */}
          <div className="px-5 space-y-4">
            <div className="flex gap-4 items-center">
              <div className="h-16 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="h-16 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom tab bar placeholder */}
        <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-40 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-md mx-auto grid grid-cols-4 py-2.5">
            <div className="flex flex-col items-center gap-1.5"><div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" /><div className="h-2 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /></div>
            <div className="flex flex-col items-center gap-1.5"><div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" /><div className="h-2 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /></div>
            <div className="flex flex-col items-center gap-1.5"><div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" /><div className="h-2 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /></div>
            <div className="flex flex-col items-center gap-1.5"><div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" /><div className="h-2 w-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /></div>
          </div>
        </nav>
      </main>
    );
  }

  const featured = featuredTickets[featuredIndex];
  const list = all.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase()) ||
      t.city.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Logo bar */}
        <div className="px-5 pt-[calc(16px+env(safe-area-inset-top,24px))] pb-4 flex items-center justify-center">
          <Link to="/discover" className="flex items-center justify-center">
            <img src="/ticketmaster-logo.png" alt="Ticketmaster" className="h-[17px] w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
        </div>

        {/* Location + Dates */}
        <div className="px-5 grid grid-cols-2 gap-3">
          <button className="flex items-start gap-2 text-left">
            <MapPin className="h-6 w-6 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                Location
              </p>
              <p className="text-sm font-semibold truncate">Texas</p>
            </div>
            <ChevronDown className="h-4 w-4 text-foreground/60 mt-1" />
          </button>
          <button className="flex items-start gap-2 text-left">
            <Calendar className="h-6 w-6 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                Dates
              </p>
              <p className="text-sm font-semibold truncate">All Dates</p>
            </div>
            <ChevronDown className="h-4 w-4 text-foreground/60 mt-1" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 mt-4">
          <div className="border border-foreground/20 rounded-[4px] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider">Search</p>
            <div className="flex items-center gap-2 mt-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Artist, Event, or Venue"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-foreground/40"
              />
              <Search className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Featured hero */}
        <section className="mt-5">
          <div className="relative aspect-[16/10] overflow-hidden">
            {featuredTickets.map((f, i) => (
              <img
                key={f.id}
                src={f.image}
                alt={f.title}
                width={1024}
                height={640}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  i === featuredIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <h2 className="text-2xl font-bold leading-tight">
                {featured.title.split(/[:—|]/)[0].trim()}
                <span className="font-normal text-white/80">
                  {" | "}
                  {featured.category}
                </span>
              </h2>
              <Link
                to="/create-ticket"
                search={{ eventId: featured.id }}
                className="mt-3 inline-flex items-center justify-center rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Find tickets
              </Link>
            </div>
            <div className="absolute top-3 right-3 flex gap-1">
              {featuredTickets.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFeaturedIndex(i)}
                  aria-label={`Featured ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === featuredIndex ? "w-6 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Event list */}
        <section className="px-5 mt-6 space-y-6">
          {query.trim() && (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                Ticketmaster results
              </p>
              {tmLoading && (
                <p className="text-sm text-muted-foreground">Searching…</p>
              )}
              {tmError && (
                <p className="text-sm text-destructive">{tmError}</p>
              )}
              {!tmLoading && !tmError && tmResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No live events found.
                </p>
              )}
              {tmResults.map((e) => (
                <Link
                  key={e.id}
                  to="/create-ticket"
                  search={{ eventId: e.id }}
                  className="block"
                >
                  {e.image && (
                    <div className="aspect-[16/10] overflow-hidden rounded-sm">
                      <img
                        src={e.image}
                        alt={e.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-foreground/60 uppercase tracking-wide">
                    {e.category} · {e.city}
                  </p>
                  <h3 className="font-bold text-base leading-tight">{e.name}</h3>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    {e.date}
                    {e.time ? ` · ${e.time}` : ""}
                    {e.priceFrom ? ` · from $${e.priceFrom}` : ""}
                  </p>
                </Link>
              ))}
              <div className="border-t border-foreground/10 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                  Your library
                </p>
              </div>
            </div>
          )}
          {list.map((t) => (
            <Link
              key={t.id}
              to="/create-ticket"
              search={{ eventId: t.id }}
              className="block"
            >
              <div className="aspect-[16/10] overflow-hidden rounded-sm">
                <img
                  src={t.image}
                  alt={t.title}
                  loading="lazy"
                  width={1024}
                  height={640}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 text-xs text-foreground/60 uppercase tracking-wide">
                {t.category}
              </p>
              <h3 className="font-bold text-base leading-tight">{t.title}</h3>
            </Link>
          ))}
          {list.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No events match your search.
            </p>
          )}
        </section>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-4">
          <TabItem active icon={<Search className="h-5 w-5" />} label="Discover" />
          <TabItem
            icon={<Heart className="h-5 w-5" />}
            label="Favorites"
            onClick={() => navigate({ to: "/favorites" })}
          />
          <TabItem
            icon={<TicketIcon className="h-5 w-5" />}
            label="My Tickets"
            onClick={() => navigate({ to: "/my-tickets" })}
          />
          <TabItem
            icon={<UserIcon className="h-5 w-5" />}
            label="My Account"
            onClick={() => navigate({ to: "/my-account" })}
          />
        </div>
      </nav>
    </main>
  );
}

function TabItem({
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
      <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{label}</span>
    </button>
  );
}