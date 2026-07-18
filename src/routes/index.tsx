import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { signIn, useUser } from "@/lib/auth";
import { loginUserFn } from "../admin/functions";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
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
      const result = await loginUserFn({
        data: {
          email,
          password,
        },
      });
      signIn({
        email: result.email,
        name: result.name,
        sessionId: result.sessionId,
        loginMode: result.loginMode,
      });
      navigate({ to: "/discover", replace: true });
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background ambient glow matching the pink/blue ticket theme */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-blue-100 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-pink-100/60 blur-[80px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <h1 className="text-slate-900 text-2xl font-black uppercase tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Sign in to see what's happening near you.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[46px] border border-slate-300 bg-white rounded-[4px] px-3.5 text-[16px] text-slate-900 mt-[6px] placeholder-slate-400 focus:border-[#1A56DB] outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[46px] border border-slate-300 bg-white rounded-[4px] px-3.5 text-[16px] text-slate-900 mt-[6px] placeholder-slate-400 focus:border-[#1A56DB] outline-none transition-all"
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
            className="w-full bg-[#1A56DB] hover:bg-[#1e40af] disabled:bg-[#4b76e1] text-white font-bold text-[14px] tracking-wide py-[14px] rounded-[4px] uppercase transition-colors mt-6 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
