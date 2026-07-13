import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
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
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background ambient glow matching the pink/blue ticket theme */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#1A56DB]/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-pink-500/10 blur-[80px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-sm bg-[#111] border border-zinc-800/80 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <h1 className="text-white text-2xl font-black uppercase tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-semibold">
              Sign in to see what's happening near you.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-extrabold text-zinc-300 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[46px] border border-zinc-700 bg-zinc-900/60 rounded-[4px] px-3.5 text-[16px] text-white mt-[6px] placeholder-zinc-500 focus:border-[#1A56DB] outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[12px] font-extrabold text-zinc-300 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[46px] border border-zinc-700 bg-zinc-900/60 rounded-[4px] px-3.5 text-[16px] text-white mt-[6px] placeholder-zinc-500 focus:border-[#1A56DB] outline-none transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#1A56DB] hover:bg-[#1e40af] text-white font-bold text-[14px] tracking-wide py-[14px] rounded-[4px] uppercase transition-colors mt-6 cursor-pointer"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
