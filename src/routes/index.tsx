import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, useUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (ready && user) navigate({ to: "/discover", replace: true });
  }, [ready, user, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const name = email.split("@")[0] || "Guest";
    signIn({ email, name: name.charAt(0).toUpperCase() + name.slice(1) });
    navigate({ to: "/discover", replace: true });
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      <section className="hidden lg:flex relative items-end p-12 text-white overflow-hidden"
        style={{ background: "var(--gradient-primary)" }}>
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <TicketIcon className="h-7 w-7" />
            <span className="text-2xl font-bold tracking-tight">TicketHub</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Live music. Big games. Unforgettable nights.
          </h1>
          <p className="mt-4 text-white/80">
            Discover events near you and grab tickets in seconds.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2 lg:hidden">
            <TicketIcon className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">TicketHub</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to see what's happening near you.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg">Sign in</Button>
          <p className="text-xs text-center text-muted-foreground">
            Demo app — any email and password works.
          </p>
        </form>
      </section>
    </main>
  );
}
