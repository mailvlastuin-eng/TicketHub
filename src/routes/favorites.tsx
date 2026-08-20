import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Heart, Ticket as TicketIcon, User as UserIcon, RefreshCw, Plus } from "lucide-react";
import { signOut, useUser, signIn } from "@/lib/auth";
import {
  addCustomTicket,
  deleteCustomTicket,
  useCustomTickets,
  getCustomTickets,
} from "@/lib/ticket-store";
import type { Ticket } from "@/lib/tickets";
import { useSettings, getSettings } from "@/lib/settings-store";
import { updateUserProfileFn, checkSessionFn, incrementTicketsCreatedFn, consumeTokenFn, changePasswordUserFn } from "../admin/functions";
import { toast } from "sonner";

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
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const custom = useCustomTickets();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.sessionId) return;
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await changePasswordUserFn({
        data: {
          email: user.email,
          sessionId: user.sessionId,
          currentPassword,
          newPassword,
        },
      });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordCard(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRefreshTransfers = async () => {
    if (!user || !user.sessionId) {
      window.location.reload();
      return;
    }
    setRefreshing(true);
    try {
      const res = await checkSessionFn({
        data: {
          email: user.email,
          sessionId: user.sessionId,
          ticketsCount: getCustomTickets().length,
        }
      });
      if (!res.valid) {
        signOut();
        navigate({ to: "/", replace: true });
      } else {
        const latestUser = { 
          ...user, 
          transfersCount: typeof res.transfersCount === 'number' ? res.transfersCount : user.transfersCount,
          ticketSlots: typeof res.ticketSlots === 'number' ? res.ticketSlots : user.ticketSlots,
          ticketsCreatedCount: typeof res.ticketsCreatedCount === 'number' ? res.ticketsCreatedCount : user.ticketsCreatedCount,
          tokensCount: typeof res.tokensCount === 'number' ? res.tokensCount : user.tokensCount,
          acceptedTransfers: res.acceptedTransfers || user.acceptedTransfers || [],
          userType: res.userType || user.userType,
        };
        window.localStorage.setItem("tm_user", JSON.stringify(latestUser));
        signIn(latestUser);
        if (typeof res.transfersCount === 'number') {
          setLocalTransfers(res.transfersCount);
        }
        setMsg("Refreshed! Reloading platform...");
        window.setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (err) {
      console.error("Failed to refresh user details:", err);
      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  };

  // Sync transfers count and ticket slots in background on mount / user change
  useEffect(() => {
    if (user && user.sessionId) {
      checkSessionFn({
        data: {
          email: user.email,
          sessionId: user.sessionId,
          ticketsCount: getCustomTickets().length,
        }
      })
        .then((res: any) => {
          if (res.valid) {
            const latestUser = { 
              ...user, 
              transfersCount: typeof res.transfersCount === 'number' ? res.transfersCount : user.transfersCount,
              ticketSlots: typeof res.ticketSlots === 'number' ? res.ticketSlots : user.ticketSlots,
              ticketsCreatedCount: typeof res.ticketsCreatedCount === 'number' ? res.ticketsCreatedCount : user.ticketsCreatedCount,
            };
            window.localStorage.setItem("tm_user", JSON.stringify(latestUser));
            if (typeof res.transfersCount === 'number') {
              setLocalTransfers(res.transfersCount);
            }
            window.dispatchEvent(new Event("tm-auth"));
          }
        })
        .catch(err => console.error("Initial load sync failed:", err));
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

    const isTokenUser = user?.userType === 'token';

    if (isTokenUser) {
      if ((user?.tokensCount ?? 0) < 2) {
        setMsg("Insufficient tokens (2 tokens required)");
        toast.error("You need at least 2 tokens to create a ticket.");
        window.setTimeout(() => setMsg(null), 1500);
        return;
      }
    } else {
      const currentSlots = user?.ticketSlots ?? 20;
      const currentCreated = user?.ticketsCreatedCount ?? 0;
      if (currentCreated >= currentSlots) {
        setMsg("No ticket slots remaining. Please contact the admin.");
        toast.error("You have run out of ticket slots.");
        window.setTimeout(() => setMsg(null), 1500);
        return;
      }
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

    const resetForm = () => {
      setForm((f) => ({ ...f, eventTitle: "", category: "", venue: "", city: "", date: "", time: "", priceFrom: "", description: "" }));
      setShowNew(false);
      setMsg("Event created successfully");
      window.setTimeout(() => setMsg(null), 1500);
    };

    if (user && user.sessionId) {
      const fn = isTokenUser
        ? consumeTokenFn({ data: { email: user.email, sessionId: user.sessionId, amount: 2, action: 'create a ticket' } }).then((res) => {
            signIn({ ...user, tokensCount: res.tokensCount, ticketsCreatedCount: res.ticketsCreatedCount });
          })
        : incrementTicketsCreatedFn({ data: { email: user.email, sessionId: user.sessionId } }).then((res) => {
            signIn({ ...user, ticketsCreatedCount: res.ticketsCreatedCount, ticketSlots: res.ticketSlots });
          });

      fn.then(() => {
        addCustomTicket(ticket);
        resetForm();
      }).catch((err: any) => {
        toast.error(err.message || "Failed to create event. Please try again.");
        setMsg("Failed to create event");
        window.setTimeout(() => setMsg(null), 1500);
      });
    } else {
      addCustomTicket(ticket);
      resetForm();
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-primary text-primary-foreground pt-[calc(16px+env(safe-area-inset-top,20px))] pb-5 text-center">
          <h1 className="text-lg font-medium">Manager</h1>
        </div>

        {/* Transfers / Tokens Banner */}
        <div className="mx-5 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-blue-955 select-none">
          <div className="flex items-center gap-3">
            <TicketIcon className="h-5 w-5 text-blue-600" />
            {user?.userType === 'token' ? (
              // Token User: show single token balance
              <div>
                <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Tokens</p>
                <p className="text-xs font-bold mt-0.5">{user.tokensCount ?? 0} remaining</p>
              </div>
            ) : (
              // Payment User: show Transfers + Ticket Slots
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Transfers</p>
                  <p className="text-xs font-bold mt-0.5">{localTransfers !== null ? localTransfers : (typeof user?.transfersCount === 'number' ? user.transfersCount : 4)} remaining</p>
                </div>
                <div className="border-l border-blue-200 pl-4">
                  <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Ticket Slots</p>
                  <p className="text-xs font-bold mt-0.5">
                    {user?.ticketsCreatedCount !== undefined && user?.ticketSlots !== undefined 
                      ? `${Math.max(0, user.ticketSlots - user.ticketsCreatedCount)} remaining` 
                      : `${user?.ticketSlots ?? 20} remaining`}
                  </p>
                </div>
              </div>
            )}
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

          {/* Change Password Collapsible Card */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowPasswordCard(!showPasswordCard)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>Change Account Password</span>
              <span className="text-slate-400 font-extrabold">{showPasswordCard ? "▲" : "▼"}</span>
            </button>

            {showPasswordCard && (
              <form onSubmit={handleChangePassword} className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide block">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-9 border border-slate-300 bg-white rounded px-3 text-xs text-slate-900 mt-1 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide block">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full h-9 border border-slate-300 bg-white rounded px-3 text-xs text-slate-900 mt-1 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide block">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full h-9 border border-slate-300 bg-white rounded px-3 text-xs text-slate-900 mt-1 outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-extrabold uppercase rounded transition-colors cursor-pointer"
                >
                  {changingPassword ? "Updating Password..." : "Save New Password"}
                </button>
              </form>
            )}
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
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Created Events</span>
                <span className="text-[10px] text-slate-400 font-medium">Slots are not restored upon deletion</span>
              </div>
              {custom.map((t) => (
                <EventRow
                  key={t.id}
                  ticket={t}
                  onEdit={() => navigate({ to: "/edit-ticket/$id", params: { id: t.id } })}
                  onDelete={() => {
                    if (confirm(`Delete event "${t.title}"? (Note: Used ticket slots are not restored)`)) {
                      deleteCustomTicket(t.id);
                      toast.success("Event deleted");
                    }
                  }}
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
      <div className={`px-4 py-3.5 ${hidden ? "bg-foreground/20" : "bg-black"} flex items-center justify-between`}>
        <p className="text-sm font-bold text-white leading-snug tracking-tight">
          {ticket.title}
        </p>
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