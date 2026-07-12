import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Heart,
  Ticket as TicketIcon,
  User as UserIcon,
  Mail,
  SquarePen,
  Navigation,
  CreditCard,
  AppWindow,
  HelpCircle,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { signOut, useUser, signIn } from "@/lib/auth";

export const Route = createFileRoute("/my-account")({
  head: () => ({ meta: [{ title: "My Account — TicketHub" }] }),
  component: MyAccountPage,
});

type Prefs = {
  notifications: boolean;
  country: string;
  city: string;
};

const PREF_KEY = "tm_account_prefs";

function loadPrefs(): Prefs {
  if (typeof window === "undefined")
    return { notifications: true, country: "United States", city: "Texas" };
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (raw) return { notifications: true, country: "United States", city: "Texas", ...JSON.parse(raw) };
  } catch {}
  return { notifications: true, country: "United States", city: "Texas" };
}

function savePrefs(p: Prefs) {
  window.localStorage.setItem(PREF_KEY, JSON.stringify(p));
}

function MyAccountPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [editing, setEditing] = useState<"country" | "city" | "name" | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  if (!ready || !user) return null;

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const updateName = (n: string) => {
    if (!n.trim()) return;
    signIn({ email: user.email, name: n.trim() });
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Blue header */}
        <header className="bg-primary text-primary-foreground px-5 pt-6 pb-6">
          <h1 className="text-center text-base font-medium">My Account</h1>
          <div className="mt-6">
            {editing === "name" ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                  updateName(nameDraft);
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateName(nameDraft);
                    setEditing(null);
                  }
                }}
                className="w-full bg-transparent text-2xl font-bold outline-none border-b border-white/40"
              />
            ) : (
              <button
                onClick={() => {
                  setNameDraft(user.name);
                  setEditing("name");
                }}
                className="text-left"
              >
                <h2 className="text-2xl font-bold leading-tight">{user.name}</h2>
              </button>
            )}
            <p className="text-sm mt-1 opacity-90">{user.email}</p>
          </div>
        </header>

        {/* Notifications */}
        <Section title="Notifications">
          <Row
            icon={<Mail className="h-5 w-5" />}
            label={user.name}
            onClick={() => {
              setNameDraft(user.name);
              setEditing("name");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            right={<ChevronRight className="h-5 w-5 text-foreground/50" />}
          />
          <Row
            icon={<SquarePen className="h-5 w-5" />}
            label="Receive Notifications"
            right={
              <Toggle
                on={prefs.notifications}
                onChange={(v) => update({ notifications: v })}
              />
            }
          />
        </Section>

        {/* Location Settings */}
        <Section title="Location Settings">
          <EditableRow
            icon={<span className="text-base">🇺🇸</span>}
            label="My Country"
            value={prefs.country}
            editing={editing === "country"}
            onEdit={() => setEditing("country")}
            onDone={(v) => {
              update({ country: v });
              setEditing(null);
            }}
          />
          <EditableRow
            icon={<Navigation className="h-5 w-5" />}
            label="My City"
            value={prefs.city}
            editing={editing === "city"}
            onEdit={() => setEditing("city")}
            onDone={(v) => {
              update({ city: v });
              setEditing(null);
            }}
          />
        </Section>

        {/* General Settings */}
        <Section title="General Settings">
          <Row
            icon={<Heart className="h-5 w-5" />}
            label="My Favorites"
            onClick={() => navigate({ to: "/favorites" })}
            right={<ChevronRight className="h-5 w-5 text-foreground/50" />}
          />
          <Row
            icon={<CreditCard className="h-5 w-5" />}
            label="Saved Payment Methods"
            onClick={() => alert("No saved payment methods yet.")}
            right={<ChevronRight className="h-5 w-5 text-foreground/50" />}
          />
          <Row
            icon={<AppWindow className="h-5 w-5" />}
            label="Change App Icon"
            onClick={() => alert("App icon customization coming soon.")}
          />
        </Section>

        {/* Help */}
        <Section title="Help & Guidance">
          <Row
            icon={<HelpCircle className="h-5 w-5" />}
            label="Need Help"
            onClick={() =>
              window.open("mailto:support@tickethub.app", "_blank")
            }
            right={<ChevronRight className="h-5 w-5 text-foreground/50" />}
          />
          <Row
            icon={<LogOut className="h-5 w-5" />}
            label="Sign out"
            onClick={() => {
              signOut();
              navigate({ to: "/", replace: true });
            }}
          />
        </Section>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background z-40">
        <div className="max-w-md mx-auto grid grid-cols-4">
          <TabItem
            icon={<Search className="h-5 w-5" />}
            label="Discover"
            onClick={() => navigate({ to: "/discover" })}
          />
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
            active
            icon={<UserIcon className="h-5 w-5" fill="currentColor" />}
            label="My Account"
          />
        </div>
      </nav>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-5 pt-6">
      <h3 className="text-base font-bold mb-2">{title}</h3>
      <div className="divide-y divide-foreground/5">{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-3 py-3.5">
      <span className="w-6 flex justify-center text-foreground/80">{icon}</span>
      <span className="flex-1 text-[15px]">{label}</span>
      {right}
    </div>
  );
  return onClick ? (
    <button onClick={onClick} className="w-full text-left">
      {inner}
    </button>
  ) : (
    <div>{inner}</div>
  );
}

function EditableRow({
  icon,
  label,
  value,
  editing,
  onEdit,
  onDone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  onDone: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (editing) setDraft(value);
  }, [editing, value]);
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="w-6 flex justify-center text-foreground/80">{icon}</span>
      <span className="flex-1 text-[15px]">{label}</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onDone(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onDone(draft);
          }}
          className="text-[15px] text-right bg-transparent outline-none border-b border-foreground/30 max-w-[45%]"
        />
      ) : (
        <button
          onClick={onEdit}
          className="flex items-center gap-2 text-[15px]"
        >
          {value}
          <SquarePen className="h-4 w-4 text-foreground/70" />
        </button>
      )}
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-foreground/25"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
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
      <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>
        {label}
      </span>
    </button>
  );
}