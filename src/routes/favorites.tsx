import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Heart, Ticket as TicketIcon, User as UserIcon } from "lucide-react";
import { signOut, useUser } from "@/lib/auth";
import {
  addCustomTicket,
  deleteCustomTicket,
  useCustomTickets,
} from "@/lib/ticket-store";
import type { Ticket } from "@/lib/tickets";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Manager — TicketHub" }] }),
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
  dark: "USD",
  transferBtn: "Show",
  mapView: "Yes",
  orderBtn: "Show",
  barcode: "Show",
  ticketBar: "Show",
  sellBtn: "Fade",
  sellTab: "hide",
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

function FavoritesPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const custom = useCustomTickets();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleUpdate = () => {
    setMsg("Settings updated");
    window.setTimeout(() => setMsg(null), 1500);
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
        <div className="bg-primary text-primary-foreground py-5 text-center">
          <h1 className="text-lg font-medium">Manager</h1>
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
            <Field label="Currency" value={form.currency} onChange={(v) => set("currency", v)} />
          </Row>

          <Row cols={3}>
            <Field label="GA Design" value={form.gaDesign} onChange={(v) => set("gaDesign", v)} />
            <Field label="Mail Design" value={form.mailDesign} onChange={(v) => set("mailDesign", v)} />
            <Field label="Dark" value={form.dark} onChange={(v) => set("dark", v)} />
          </Row>

          <Row cols={3}>
            <Field label="Transfer BTN" value={form.transferBtn} onChange={(v) => set("transferBtn", v)} options={SHOW_OPTS} />
            <Field label="MAP View" value={form.mapView} onChange={(v) => set("mapView", v)} options={YESNO_OPTS} />
            <Field label="Order BTN" value={form.orderBtn} onChange={(v) => set("orderBtn", v)} options={SHOW_OPTS} />
          </Row>

          <Row cols={3}>
            <Field label="Barcode" value={form.barcode} onChange={(v) => set("barcode", v)} options={SHOW_OPTS} />
            <Field label="Ticket Bar" value={form.ticketBar} onChange={(v) => set("ticketBar", v)} options={SHOW_OPTS} />
            <Field label="Sell BTN" value={form.sellBtn} onChange={(v) => set("sellBtn", v)} options={SHOW_OPTS} />
          </Row>

          <div className="grid grid-cols-3 gap-3 items-end">
            <Field label="Sell Tab" value={form.sellTab} onChange={(v) => set("sellTab", v)} options={SHOW_OPTS} />
            <Field label="TT" value={form.tt} onChange={(v) => set("tt", v)} options={YESNO_OPTS} />
            <button
              onClick={handleUpdate}
              className="h-10 rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              Update
            </button>
          </div>

          <button
            onClick={() => navigate({ to: "/create-ticket" })}
            className="rounded-[4px] bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5"
          >
            New events
          </button>

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
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-40">
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
    <div className="rounded-[4px] overflow-hidden border border-foreground/10">
      <div className={`px-4 py-3 ${hidden ? "bg-foreground/30" : "bg-[#1a4a6e]"}`}>
        <p className="text-sm font-semibold text-white leading-snug">
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