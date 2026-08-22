import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Heart,
  Ticket as TicketIcon,
  User as UserIcon,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  Settings2,
  ChevronDown,
  Edit3,
  Trash2,
  MessageCircle,
  Users,
  Lock,
} from "lucide-react";
import { signOut, useUser, signIn } from "@/lib/auth";
import {
  addCustomTicket,
  deleteCustomTicket,
  useCustomTickets,
  getCustomTickets,
  toggleHideTicket,
  useHiddenTicketIds,
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
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
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

// ─────────────────────────────────────────────────────────────────────────────
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
  // showNew/handleCreate intentionally unused — creation is via /create-ticket route
  const [msg, setMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [localTransfers, setLocalTransfers] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showManageTickets, setShowManageTickets] = useState(false);
  const custom = useCustomTickets();

  // ── Password change ────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.sessionId) return;
    if (!currentPassword.trim()) { toast.error("Please enter your current password."); return; }
    if (!newPassword || newPassword.length < 6) { toast.error("New password must be at least 6 characters."); return; }
    if (newPassword === currentPassword) { toast.error("New password cannot be the same as current."); return; }
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match."); return; }
    setChangingPassword(true);
    try {
      await changePasswordUserFn({ data: { email: user.email, sessionId: user.sessionId, currentPassword, newPassword } });
      toast.success("Password updated successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowPasswordCard(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password");
    } finally { setChangingPassword(false); }
  };

  // ── Refresh session ────────────────────────────────────────────────────────
  const handleRefreshTransfers = async () => {
    if (!user || !user.sessionId) { window.location.reload(); return; }
    setRefreshing(true);
    try {
      const res = await checkSessionFn({
        data: { email: user.email, sessionId: user.sessionId, ticketsCount: getCustomTickets().length }
      });
      if (!res.valid) { signOut(); navigate({ to: "/", replace: true }); }
      else {
        const latestUser = {
          ...user,
          transfersCount: typeof res.transfersCount === "number" ? res.transfersCount : user.transfersCount,
          ticketSlots: typeof res.ticketSlots === "number" ? res.ticketSlots : user.ticketSlots,
          ticketsCreatedCount: typeof res.ticketsCreatedCount === "number" ? res.ticketsCreatedCount : user.ticketsCreatedCount,
          tokensCount: typeof res.tokensCount === "number" ? res.tokensCount : user.tokensCount,
          acceptedTransfers: res.acceptedTransfers || user.acceptedTransfers || [],
          userType: res.userType || user.userType,
        };
        window.localStorage.setItem("tm_user", JSON.stringify(latestUser));
        signIn(latestUser);
        if (typeof res.transfersCount === "number") setLocalTransfers(res.transfersCount);
        setMsg("Refreshed! Reloading...");
        window.setTimeout(() => window.location.reload(), 300);
      }
    } catch { window.location.reload(); }
    finally { setRefreshing(false); }
  };

  // ── Background session sync ────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.sessionId) {
      checkSessionFn({ data: { email: user.email, sessionId: user.sessionId, ticketsCount: getCustomTickets().length } })
        .then((res: any) => {
          if (res.valid) {
            const latestUser = {
              ...user,
              transfersCount: typeof res.transfersCount === "number" ? res.transfersCount : user.transfersCount,
              ticketSlots: typeof res.ticketSlots === "number" ? res.ticketSlots : user.ticketSlots,
              ticketsCreatedCount: typeof res.ticketsCreatedCount === "number" ? res.ticketsCreatedCount : user.ticketsCreatedCount,
            };
            window.localStorage.setItem("tm_user", JSON.stringify(latestUser));
            if (typeof res.transfersCount === "number") setLocalTransfers(res.transfersCount);
            window.dispatchEvent(new Event("tm-auth"));
          }
        })
        .catch((err: any) => console.error("Session sync failed:", err));
    }
  }, [user?.email, user?.sessionId]);

  useEffect(() => {
    if (user && typeof user.transfersCount === "number") setLocalTransfers(user.transfersCount);
  }, [user?.transfersCount]);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    setForm((f) => ({ ...f, ...settings }));
  }, [settings]);

  if (!ready || !user) return null;

  // ── Derived values ─────────────────────────────────────────────────────────
  const isTokenUser = user?.userType === "token";
  const tokensCount = user?.tokensCount ?? 0;
  const transfersCount = localTransfers !== null ? localTransfers : (typeof user?.transfersCount === "number" ? user.transfersCount : 4);
  const ticketsCreated = user?.ticketsCreatedCount ?? 0;
  const ticketSlots = user?.ticketSlots ?? 20;
  const slotsRemaining = Math.max(0, ticketSlots - ticketsCreated);
  const isBouncing = isTokenUser && tokensCount === 0;

  const getInitials = (s: string) => s.split(" ").map(w => w[0]?.toUpperCase() ?? "").slice(0, 2).join("") || "?";
  const avatarPalette = ["from-violet-500 to-purple-600", "from-blue-500 to-cyan-500", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-500"];
  const avatarColor = avatarPalette[(user.name || user.email).charCodeAt(0) % avatarPalette.length];

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // ── Save settings ──────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    setIsUpdating(true);
    playSoftSound();
    updateSettings({ name: form.name, virtualMail: form.virtualMail, cityState: form.cityState, country: form.country, currency: form.currency, gaDesign: form.gaDesign, mailDesign: form.mailDesign, dark: form.dark, transferBtn: form.transferBtn, mapView: form.mapView, orderBtn: form.orderBtn, barcode: form.barcode, ticketBar: form.ticketBar, sellBtn: form.sellBtn, sellTab: form.sellTab, tt: form.tt });
    if (user) {
      signIn({ ...user, name: form.name });
      try { await updateUserProfileFn({ data: { email: user.email, name: form.name } }); }
      catch (err) { console.error("Profile sync failed:", err); }
    }
    await new Promise((r) => setTimeout(r, 800));
    setIsUpdating(false);
    setMsg("Settings updated");
    window.setTimeout(() => setMsg(null), 2000);
  };

  // ── Create ticket ──────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!form.eventTitle.trim()) { setMsg("Event title is required"); window.setTimeout(() => setMsg(null), 1500); return; }
    if (isTokenUser) {
      if (tokensCount < 2) { toast.error("You need at least 2 tokens to create a ticket."); return; }
    } else {
      if (ticketsCreated >= ticketSlots) { toast.error("You have run out of ticket slots."); return; }
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
      description: form.description.trim() || "A new event created from the Manager panel.",
    };
    const resetForm = () => {
      setForm((f) => ({ ...f, eventTitle: "", category: "", venue: "", city: "", date: "", time: "", priceFrom: "", description: "" }));
    };
    if (user && user.sessionId) {
      const fn = isTokenUser
        ? consumeTokenFn({ data: { email: user.email, sessionId: user.sessionId, amount: 2, action: "create a ticket" } }).then((res) => { signIn({ ...user, tokensCount: res.tokensCount, ticketsCreatedCount: res.ticketsCreatedCount }); })
        : incrementTicketsCreatedFn({ data: { email: user.email, sessionId: user.sessionId } }).then((res) => { signIn({ ...user, ticketsCreatedCount: res.ticketsCreatedCount, ticketSlots: res.ticketSlots }); });
      fn.then(() => { addCustomTicket(ticket); resetForm(); toast.success("Event created!"); })
        .catch((err: any) => toast.error(err.message || "Failed to create event."));
    } else {
      addCustomTicket(ticket);
      resetForm();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="bg-primary text-primary-foreground pt-[calc(16px+env(safe-area-inset-top,20px))] pb-5 text-center">
          <h1 className="text-lg font-medium">Manager</h1>
        </div>

        <div className="p-4 space-y-3">

          {/* ── User Info Card (no gradient bar, simplified) ─────────────── */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <div className="p-4">
              <div className="flex items-center gap-3.5">
                {/* Avatar */}
                <div
                  style={{ width: 50, height: 50, fontSize: 19 }}
                  className={`rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold flex-shrink-0 select-none shadow`}
                >
                  {getInitials(user.name || user.email)}
                </div>

                {/* Identity — token: username only | non-token: email only */}
                <div className="flex-1 min-w-0">
                  {isTokenUser ? (
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {user.name || user.email.split("@")[0]}
                    </p>
                  ) : (
                    <p className="text-[12px] font-semibold text-slate-600 truncate">{user.email}</p>
                  )}
                </div>

                {/* Balance */}
                <div className="flex-shrink-0 text-right">
                  {isTokenUser ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-violet-600">Tokens</span>
                      <div className="flex items-center justify-center mt-0.5">
                        <span className={`text-lg font-black ${tokensCount === 0 ? "text-red-500 animate-bounce inline-block" : "text-slate-900"}`}>
                          {tokensCount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 block">Transfers</span>
                          <span className="text-base font-black text-slate-900">{transfersCount}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-right">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 block">Slots</span>
                          <span className="text-base font-black text-slate-900">{slotsRemaining}</span>
                        </div>
                      </div>
                      <button
                        onClick={handleRefreshTransfers}
                        disabled={refreshing}
                        className="text-[9px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {refreshing ? "..." : "↻ Refresh"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Buy Token / Buy Transfer ─────────────────────────────────── */}
          <a
            href="https://t.me/Greywolf_Classic"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-2.5 px-4 rounded-md text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isTokenUser
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            {isTokenUser ? "Buy Token" : "Buy Transfer"}
          </a>

          {/* ── Create Event ─────────────────────────────────────────────── */}
          <button
            onClick={() => navigate({ to: "/create-ticket" as any })}
            className="w-full rounded-md bg-[#0e5c3c] hover:bg-[#0b4d32] text-white text-sm font-bold py-3.5 px-5 shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border-0"
          >
            <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
            Create Event
          </button>

          {/* ── Manage / Edit Tickets ────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowManageTickets((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-sm bg-slate-100 flex items-center justify-center text-slate-600">
                  <TicketIcon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Manage / Edit Tickets</span>
                {custom.length > 0 && (
                  <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-sm bg-blue-600">{custom.length}</span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showManageTickets ? "rotate-180" : ""}`} />
            </button>

            {showManageTickets && (
              <div className="px-4 pb-4 border-t border-slate-100">
                {custom.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <TicketIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No tickets created yet</p>
                    <p className="mt-0.5 opacity-70">Tap "Create Event" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-3">
                    {custom.map((t) => (
                      <EventRow
                        key={t.id}
                        ticket={t}
                        onEdit={() => navigate({ to: "/edit-ticket/$id", params: { id: t.id } })}
                        onDelete={() => {
                          if (confirm(`Delete "${t.title}"?\n\nNote: ticket slots are permanent and will NOT be restored.`)) {
                            deleteCustomTicket(t.id);
                            toast.success("Event deleted");
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── App Settings ─────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowAppSettings((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-sm bg-slate-100 flex items-center justify-center text-slate-600">
                  <Settings2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">App Settings</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showAppSettings ? "rotate-180" : ""}`} />
            </button>

            {showAppSettings && (
              <div className="px-4 pb-4 border-t border-slate-100 space-y-4 pt-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Account</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name" value={form.name} onChange={(v) => set("name", v)} />
                    <Field label="Virtual Mail" value={form.virtualMail} onChange={(v) => set("virtualMail", v)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <Field label="City & State" value={form.cityState} onChange={(v) => set("cityState", v)} />
                    <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
                    <Field label="Currency" value={form.currency} onChange={(v) => set("currency", v)} options={CURRENCY_OPTS} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Display</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Dark" value={form.dark} onChange={(v) => set("dark", v)} options={DARK_OPTS} />
                    <Field label="Transfer BTN" value={form.transferBtn} onChange={(v) => set("transferBtn", v)} options={SHOW_OPTS} />
                    <Field label="MAP View" value={form.mapView} onChange={(v) => set("mapView", v)} options={YESNO_OPTS} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <Field label="Barcode" value={form.barcode} onChange={(v) => set("barcode", v)} options={SHOW_OPTS} />
                    <Field label="Ticket Bar" value={form.ticketBar} onChange={(v) => set("ticketBar", v)} options={SHOW_OPTS} />
                    <Field label="Sell Tab" value={form.sellTab} onChange={(v) => set("sellTab", v)} options={SHOW_OPTS} />
                  </div>
                </div>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className={`h-11 rounded-md text-sm font-semibold w-full cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-85 ${
                    msg === "Settings updated" ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  {isUpdating ? (<><RefreshCw className="h-4 w-4 animate-spin" />Updating...</>) : msg === "Settings updated" ? "✓ Settings updated!" : "Save App Settings"}
                </button>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              DOUBLE SPACING — Telegram + Account at the bottom
          ════════════════════════════════════════════════════════════════ */}
          <div className="pt-5 space-y-6">

            {/* ── Telegram ───────────────────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">Telegram</p>
              <div className="bg-white border border-slate-200 rounded-md overflow-hidden divide-y divide-slate-100">
                <a
                  href="https://t.me/Greywolf_Classic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-sm bg-[#0088cc]/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-4 w-4 text-[#0088cc]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Contact Support</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Get help from our team</p>
                  </div>
                  <ChevronDown className="-rotate-90 h-4 w-4 text-slate-300" />
                </a>
                <a
                  href="https://t.me/+nbQdCuw0xIIxMmZh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-sm bg-[#0088cc]/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-[#0088cc]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Join Telegram Group</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Connect with other members</p>
                  </div>
                  <ChevronDown className="-rotate-90 h-4 w-4 text-slate-300" />
                </a>
              </div>
            </div>

            {/* ── Account (last section) ──────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">Account</p>

              {/* Change Password */}
              <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPasswordCard(!showPasswordCard)}
                  className="w-full py-3 px-4 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-sm bg-slate-100 flex items-center justify-center">
                      <Lock className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <span>Change Account Password</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showPasswordCard ? "rotate-180" : ""}`} />
                </button>

                {showPasswordCard && (
                  <form onSubmit={handleChangePassword} className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide block mb-1">Current Password</label>
                      <div className="relative">
                        <input type={showCurrentPassword ? "text" : "password"} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="w-full h-9 border border-slate-300 bg-white rounded-sm px-3 pr-9 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">New Password</label>
                        <span className="text-[10px] text-slate-400 font-semibold">Min. 6 chars</span>
                      </div>
                      <div className="relative">
                        <input type={showNewPassword ? "text" : "password"} required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="w-full h-9 border border-slate-300 bg-white rounded-sm px-3 pr-9 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide block mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input type={showConfirmPassword ? "text" : "password"} required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full h-9 border border-slate-300 bg-white rounded-sm px-3 pr-9 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={changingPassword} className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-extrabold uppercase rounded-sm transition-colors cursor-pointer">
                      {changingPassword ? "Updating Password..." : "Save New Password"}
                    </button>
                  </form>
                )}
              </div>

              {/* Sign Out */}
              <button
                onClick={() => { signOut(); navigate({ to: "/", replace: true }); }}
                className="w-full py-3 px-4 bg-white border border-slate-200 rounded-md text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-sm bg-red-50 flex items-center justify-center">
                  <UserIcon className="h-3.5 w-3.5 text-red-500" />
                </div>
                Sign Out
              </button>
            </div>

            {/* ── Software Version Section ───────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">System & Updates</p>
              <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-sm bg-slate-100 flex items-center justify-center">
                      <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Software Version</p>
                      <p className="text-[10px] text-slate-500 font-medium">v2.4.0 (Latest Release)</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Up to date</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toast.info("Updating software and refreshing assets...");
                    setTimeout(() => {
                      window.location.reload();
                    }, 600);
                  }}
                  className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold uppercase rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update Software
                </button>
              </div>
            </div>

          </div>
          {/* end double-spaced bottom section */}

        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-4">
          <TabItem icon={<Search className="h-5 w-5" />} label="Discover" onClick={() => navigate({ to: "/discover" })} />
          <TabItem active icon={<Heart className="h-5 w-5" fill="currentColor" />} label="Favorites" />
          <TabItem icon={<TicketIcon className="h-5 w-5" />} label="My Tickets" onClick={() => navigate({ to: "/my-tickets" })} />
          <TabItem icon={<UserIcon className="h-5 w-5" />} label="My Account" onClick={() => navigate({ to: "/my-account" })} />
        </div>
      </nav>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, options }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; options?: string[];
}) {
  return (
    <div>
      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">{label}</label>
      {options ? (
        <div className="relative mt-1">
          <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 appearance-none rounded-sm border border-slate-200 pl-2.5 pr-7 text-xs outline-none focus:border-blue-500 bg-background cursor-pointer text-slate-900">
            {!options.includes(value) && <option value={value}>{value}</option>}
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full h-9 rounded-sm border border-slate-200 px-2.5 text-xs outline-none focus:border-blue-500 bg-background text-slate-900" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function EventRow({ ticket, onEdit, onDelete }: { ticket: Ticket; onEdit: () => void; onDelete: () => void }) {
  const hiddenIds = useHiddenTicketIds();
  const hidden = hiddenIds.includes(ticket.id);

  const handleToggleHide = () => {
    const isNowHidden = toggleHideTicket(ticket.id);
    toast.success(isNowHidden ? "Ticket hidden from My Tickets" : "Ticket restored to My Tickets");
  };

  return (
    <div className={`rounded-sm border overflow-hidden transition-opacity ${hidden ? "opacity-50 border-slate-200" : "border-slate-200"}`}>
      {/* ~20% taller header: py-3.5 vs the old py-2.5 */}
      <div className={`px-3.5 py-3.5 flex items-center justify-between ${hidden ? "bg-slate-100" : "bg-blue-600"}`}>
        <p className={`text-xs font-bold leading-snug tracking-tight truncate ${hidden ? "text-slate-500" : "text-white"}`}>{ticket.title}</p>
        {hidden && <span className="text-[9px] font-black uppercase text-slate-400 ml-2 flex-shrink-0">Hidden</span>}
      </div>
      <div className="flex divide-x divide-slate-100 bg-white">
        <button onClick={onEdit} className="flex-1 py-2.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 cursor-pointer">
          <Edit3 className="h-3 w-3" />Edit
        </button>
        <button onClick={onDelete} className="flex-1 py-2.5 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1 cursor-pointer">
          <Trash2 className="h-3 w-3" />Delete
        </button>
        <button onClick={handleToggleHide} className="flex-1 py-2.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 cursor-pointer">
          {hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {hidden ? "Show" : "Hide"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function TabItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 py-2.5 ${active ? "text-primary" : "text-foreground/60"}`}>
      {icon}
      <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{label}</span>
    </button>
  );
}