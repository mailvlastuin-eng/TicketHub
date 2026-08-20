import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { signIn, useUser } from "@/lib/auth";
import { loginUserFn, registerUserFn } from "../admin/functions";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/discover", replace: true });
  }, [ready, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const result = await loginUserFn({
          data: {
            email,
            password,
          },
        });
        signIn({
          email: result.email,
          name: result.name,
          username: (result as any).username,
          sessionId: result.sessionId,
          loginMode: result.loginMode,
          userType: result.userType ?? 'payment',
          transfersCount: result.transfersCount,
          acceptedTransfers: result.acceptedTransfers,
          ticketSlots: result.ticketSlots,
          ticketsCreatedCount: result.ticketsCreatedCount,
          tokensCount: result.tokensCount ?? 0,
        });
        navigate({ to: "/discover", replace: true });
      } else {
        const result = await registerUserFn({
          data: {
            username,
            email,
            password,
          },
        });
        signIn({
          email: result.email,
          name: result.name,
          username: result.username,
          sessionId: result.sessionId,
          loginMode: 'token',
          userType: 'token',
          transfersCount: 0,
          acceptedTransfers: [],
          ticketSlots: 0,
          ticketsCreatedCount: 0,
          tokensCount: 0,
        });
        navigate({ to: "/discover", replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background ambient glow matching the pink/blue ticket theme */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-blue-100 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-pink-100/60 blur-[80px] pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative z-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-left">
            <h1 className="text-slate-900 text-2xl font-black uppercase tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create Account"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {mode === "signin" 
                ? "Sign in to see what's happening near you." 
                : "Sign up to start creating & transferring tickets."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                mode === "signin" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                mode === "signup" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="e.g. john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-[44px] border border-slate-300 bg-white rounded-[4px] px-3.5 text-[15px] text-slate-900 mt-[4px] placeholder-slate-400 focus:border-[#1A56DB] outline-none transition-all"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                {mode === "signin" ? "Email or Username" : "Email Address"}
              </label>
              <input
                id="email"
                type={mode === "signup" ? "email" : "text"}
                required
                placeholder={mode === "signin" ? "you@example.com or username" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[44px] border border-slate-300 bg-white rounded-[4px] px-3.5 text-[15px] text-slate-900 mt-[4px] placeholder-slate-400 focus:border-[#1A56DB] outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[44px] border border-slate-300 bg-white rounded-[4px] px-3.5 text-[15px] text-slate-900 mt-[4px] placeholder-slate-400 focus:border-[#1A56DB] outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-xs font-semibold border border-red-200 text-left">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#1A56DB] hover:bg-[#1e40af] disabled:bg-[#4b76e1] text-white font-bold text-[14px] tracking-wide py-[13px] rounded-[4px] uppercase transition-colors mt-2 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (mode === "signin" ? "Signing in..." : "Creating Account...") : (mode === "signin" ? "Sign in" : "Create Account")}
          </button>
        </form>
      </div>
    </main>
  );
}
