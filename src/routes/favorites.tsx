import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Heart, Ticket as TicketIcon, User as UserIcon, RefreshCw, Plus } from "lucide-react";
import { signOut, useUser, signIn } from "@/lib/auth";
import {
  addCustomTicket,
  deleteCustomTicket,
  useCustomTickets,
} from "@/lib/ticket-store";
import type { Ticket } from "@/lib/tickets";
import { useSettings, getSettings } from "@/lib/settings-store";
import { updateUserProfileFn, checkSessionFn } from "../admin/functions";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Manager — Ticketmaster" }] }),
  component: FavoritesPage,
});

type FormState = {
  name: string;
  virtualMail: string;
  cityState: string;
  country: string;
  currency: string;
  gaDesign: string;
  mailDesign: string;
  dark: string;
  transferBtn: string;
  mapView: string;
  orderBtn: string;
  barcode: string;
  ticketBar: string;
  sellBtn: string;
  sellTab: string;
  tt: string;
  eventTitle: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  priceFrom: string;
  description: string;
  image: string;
};

const DEFAULTS: FormState = {
  name: "Miller Broome",
  virtualMail: "Weirdrexx@gmail.com",
  cityState: "Texas",
  country: "US",
  currency: "USD",
  gaDesign: "D1 (US)",
  mailDesign: "US",
  dark: "No",
  transferBtn: "Show",
  mapView: "Yes",
  orderBtn: "Show",
  barcode: "Show",
  ticketBar: "Show",
  sellBtn: "Fade",
  sellTab: "Hide",
  tt: "Yes",
  eventTitle: "",
  category: "",
  venue: "",
  city: "",
  date: "",
  time: "",
  priceFrom: "",
  description: "",
  image: "",
};

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1024&h=640&fit=crop";

const SHOW_OPTS = ["Show", "Hide", "Fade"];
const YESNO_OPTS = ["Yes", "No"];
const CURRENCY_OPTS = ["USD", "CAD", "GBP", "EUR", "AUD"];
const DARK_OPTS = ["Yes", "No"];

const playSoftSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // Slide up to A5
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) {
    console.warn("Failed to play sound:", err);
  }
};

function FavoritesPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULTS,
    ...getSettings(),
    eventTitle: "",
    category: "",
    venue: "",
    city: "",
    date: "",
    time: "",
    priceFrom: "",
    description: "",
    image: "",
  }));
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [localTransfers, setLocalTransfers] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const custom = useCustomTickets();

  const handleRefreshTransfers = async () => {
    if (!user || !user.sessionId) return;
    setRefreshing(true);
    try {
      const res = await checkSessionFn({
        data: {
          email: user.email,
          sessionId: user.sessionId,
        }
      });
      if (!res.valid) {
        signOut();
        navigate({ to: "/", replace: true });
      } else if (typeof res.transfersCount === 'number') {
        const latestUser = { ...user, transfersCount: res.transfersCount };
        signIn(latestUser);
        setLocalTransfers(res.transfersCount);
        setMsg("Transfers updated!");
        window.setTimeout(() => setMsg(null), 1500);
      }
    } catch (err) {
      console.error("Failed to refresh user transfers:", err);
      setMsg("Failed to refresh");
      window.setTimeout(() => setMsg(null), 1500);
    } finally {
      setRefreshing(false);
    }
  };

  // Sync transfers count in background on mount / user change
  useEffect(() => {
    if (user && user.sessionId) {
      checkSessionFn({
        data: {
          email: user.email,
          sessionId: user.sessionId,
        }
      })
        .then((res: any) => {
          if (res.valid && typeof res.transfersCount === 'number') {
            const latestUser = { ...user, transfersCount: res.transfersCount };
            window.localStorage.setItem("tm_user", JSON.stringify(latestUser));
            setLocalTransfers(res.transfersCount);
          }
        })
        .catch(err => console.error("Initial load transfers sync failed:", err));
    }
  }, [user?.email, user?.sessionId]);

  // Keep localTransfers in sync with user changes
  useEffect(() => {
    if (user && typeof user.transfersCount === 'number') {
      setLocalTransfers(user.transfersCount);
    }
  }, [user?.transfersCount]);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      ...settings,
    }));
  }, [settings]);

  if (!ready || !user) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleUpdate = async () => {
    setIsUpdating(true);
    playSoftSound();

    // 1. Save settings locally
    updateSettings({
      name: form.name,
      virtualMail: form.virtualMail,
      cityState: form.cityState,
      country: form.country,
      currency: form.currency,
      gaDesign: form.gaDesign,
      mailDesign: form.mailDesign,
      dark: form.dark,
      transferBtn: form.transferBtn,
      mapView: form.mapView,
      orderBtn: form.orderBtn,
      barcode: form.barcode,
      ticketBar: form.ticketBar,
      sellBtn: form.sellBtn,
      sellTab: form.sellTab,
      tt: form.tt,
    });

    // 2. Sync to active user session
    if (user) {
      signIn({
        ...user,
        name: form.name,
      });

      // 3. Sync profile name changes to Supabase database
      try {
        await updateUserProfileFn({
          data: {
            email: user.email,
            name: form.name,
          },
        });
      } catch (err) {
        console.error("Failed to sync profile update to Supabase:", err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsUpdating(false);
    setMsg("Settings updated");
    window.setTimeout(() => setMsg(null), 2000);
  };

  const handleCreate = () => {
    if (!form.eventTitle.trim()) {
      setMsg("Event title is required");
      window.setTimeout(() => setMsg(null), 1500);
      return;
    }
    const ticket: Ticket = {
      id: `evt-${Date.now()}`,
      title: form.eventTitle.trim(),
      category: form.category.trim() || "Event",
      venue: form.venue.trim() || "TBA",
      city: form.city.trim() || form.cityState,
      date: form.date.trim() || "TBA",
      time: form.time.trim() || "TBA",
      priceFrom: Number(form.priceFrom) || 0,
      image: form.image.trim() || PLACEHOLDER_IMG,
      description:
        form.description.trim() ||
        "A new event created from the Manager panel.",
    };
    addCustomTicket(ticket);
    setForm((f) => ({
      ...f,
      eventTitle: "",
      category: "",
      venue: "",
      city: "",
      date: "",
      time: "",
      priceFrom: "",
      description: "",
      image: "",
    }));
    setShowNew(false);
    setMsg("Event created");
    window.setTimeout(() => setMsg(null), 1500);
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-primary text-primary-foreground pt-[calc(16px+env(safe-area-inset-top,20px))] pb-5 text-center">
          <h1 className="text-lg font-medium">Manager</h1>
        </div>

        {/* Transfers Left Banner */}
        <div className="mx-5 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-blue-955 select-none">
          <div className="flex items-center gap-3">
            <TicketIcon className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Ticket Transfers Left</p>
              <p className="text-sm font-bold mt-0.5">{localTransfers !== null ? localTransfers : (user?.transfersCount ?? 0)} remaining</p>
            </div>
          </div>
          <button
            onClick={handleRefreshTransfers}
            disabled={refreshing}
            className="text-[10px] font-black uppercase bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 transition-colors cursor-pointer disabled:opacity-60 focus:outline-none"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Row>
            <Field label="Name" value={form.name} onChange={(v) => set("name", v)} />
            <Field
              label="Virtual Mail"
              value={form.virtualMail}
              onChange={(v) => set("virtualMail", v)}
            />
          </Row>

          <Row cols={3}>
            <Field label="City & State" value={form.cityState} onChange={(v) => set("cityState", v)} />
            <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
            <Field label="Currency" value={form.currency} onChange={(v) => set("currency", v)} options={CURRENCY_OPTS} />
          </Row>

          <Row cols={3}>
            <Field label="Dark" value={form.dark} onChange={(v) => set("dark", v)} options={DARK_OPTS} />
            <Field label="Transfer BTN" value={form.transferBtn} onChange={(v) => set("transferBtn", v)} options={SHOW_OPTS} />
            <Field label="MAP View" value={form.mapView} onChange={(v) => set("mapView", v)} options={YESNO_OPTS} />
          </Row>

          <Row cols={3}>
            <Field label="Barcode" value={form.barcode} onChange={(v) => set("barcode", v)} options={SHOW_OPTS} />
            <Field label="Ticket Bar" value={form.ticketBar} onChange={(v) => set("ticketBar", v)} options={SHOW_OPTS} />
            <Field label="Sell Tab" value={form.sellTab} onChange={(v) => set("sellTab", v)} options={SHOW_OPTS} />
          </Row>

          <div className="pt-1">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className={`h-11 rounded-[4px] text-sm font-semibold w-full cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-85 ${
                msg === "Settings updated"
                  ? "bg-emerald-600 text-white"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : msg === "Settings updated" ? (
                "✓ Settings updated!"
              ) : (
                "Update"
              )}
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate({ to: "/create-ticket" })}
              className="w-full rounded-md bg-[#0e5c3c] hover:bg-[#0b4d32] text-white text-sm font-bold py-3.5 px-5 shadow-md shadow-emerald-800/10 hover:shadow-emerald-800/20 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border-0"
            >
              <Plus className="h-4.5 w-4.5 text-white stroke-[2.5]" />
              New Events
            </button>
          </div>

          {msg && (
            <p className="text-center text-sm text-primary font-medium">{msg}</p>
          )}

          {/* Existing custom events */}
          {custom.length > 0 && (
            <div className="space-y-3 pt-4">
              {custom.map((t) => (
                <EventRow
                  key={t.id}
                  ticket={t}
                  onEdit={() => navigate({ to: "/edit-ticket/$id", params: { id: t.id } })}
                  onDelete={() => deleteCustomTicket(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-4">
          <TabItem
            icon={<Search className="h-5 w-5" />}
            label="Discover"
            onClick={() => navigate({ to: "/discover" })}
          />
          <TabItem active icon={<Heart className="h-5 w-5" fill="currentColor" />} label="Favorites" />
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

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options?: string[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {options ? (
        <div className="relative mt-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 appearance-none rounded-[4px] border border-foreground/20 pl-3 pr-8 text-sm outline-none focus:border-primary bg-background cursor-pointer"
          >
            {!options.includes(value) && <option value={value}>{value}</option>}
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full h-10 rounded-[4px] border border-foreground/20 px-3 text-sm outline-none focus:border-primary bg-background"
        />
      )}
    </div>
  );
}

function EventRow({
  ticket,
  onEdit,
  onDelete,
}: {
  ticket: Ticket;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  return (
    <div className="rounded-[4px] overflow-hidden border border-foreground/10 shadow-sm">
      <div className={`px-4 py-3.5 ${hidden ? "bg-foreground/20" : "bg-gradient-to-r from-indigo-600 to-violet-700"} flex items-center justify-between`}>
        <p className="text-sm font-bold text-white leading-snug tracking-tight">
          {ticket.title}
        </p>
        {!hidden && (
          <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded border border-white/20 shrink-0 ml-2 select-none">
            Custom Event
          </span>
        )}
      </div>
      <div className="flex gap-2 px-3 py-2 border-t border-foreground/10 bg-background">
        <button
          onClick={onEdit}
          className="flex-1 rounded-[4px] bg-primary text-primary-foreground text-xs font-semibold py-1.5"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 rounded-[4px] bg-destructive text-destructive-foreground text-xs font-semibold py-1.5"
        >
          Delete
        </button>
        <button
          onClick={() => setHidden((h) => !h)}
          className="flex-1 rounded-[4px] border border-primary text-primary text-xs font-semibold py-1.5"
        >
          {hidden ? "Show" : "Hide"}
        </button>
      </div>
    </div>
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