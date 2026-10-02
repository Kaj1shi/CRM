/**
 * Login, forgot-password, and reset-password pages (public; no Shell).
 * Password visibility toggle is login-only. Forgot always shows a generic message.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { messages } from "../messages";
import { ApiError, api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try { await auth.login(email, password); navigate("/"); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md">
        <p className="text-xs tracking-[0.16em] text-slate-500 uppercase">Kampala industrial area</p>
        <h1 className="mt-3 text-5xl font-medium tracking-tight">{messages.appName}</h1>
        <p className="mt-3 max-w-sm text-sm text-slate-600">Sign in to record a purchase or a supply.</p>
        <label className="mt-8 block text-sm font-medium" htmlFor="email">{messages.email}</label>
        <input id="email" type="email" required autoComplete="username" className="mt-1 w-full rounded-md border border-slate-300 bg-[#fffcf8] px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">{messages.password}</label>
        <div className="relative mt-1">
          <input id="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete="current-password" className="w-full rounded-md border border-slate-300 bg-[#fffcf8] px-3 py-2 pr-10" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
        <button className="mt-8 w-full rounded-md bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-60" disabled={busy}>{busy ? messages.saving : messages.login}</button>
        <Link className="mt-4 inline-block text-sm text-emerald-700 underline-offset-4 hover:underline" to="/forgot-password">{messages.forgot}</Link>
      </form>
    </main>
  );
}

export function ForgotPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    setMessage(result.message ?? "If an account exists for that email, password reset instructions have been recorded.");
  }
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md">
        <h1 className="text-4xl font-medium tracking-tight">Reset password</h1>
        <label className="mt-4 block text-sm" htmlFor="reset-email">Email</label>
        <input id="reset-email" type="email" required className="mt-1 w-full rounded-md border border-slate-300 bg-[#fffcf8] px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
        {message && <p className="mt-3 text-sm">{message}</p>}
        <button className="mt-6 rounded-md bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700">Send reset link</button>
      </form>
    </main>
  );
}

export function ResetPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      setMessage(result.message ?? "Password updated. Please sign in.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reset the password.");
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md">
        <h1 className="text-4xl font-medium tracking-tight">Choose a new password</h1>
        <label className="mt-4 block text-sm" htmlFor="new-password">New password</label>
        <input id="new-password" type="password" required minLength={8} className="mt-1 w-full rounded-md border border-slate-300 bg-[#fffcf8] px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} />
        {message && <p className="mt-3 text-sm" role="status">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
        <button className="mt-6 rounded-md bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700">Update password</button>
        <Link className="mt-4 block text-sm text-emerald-700 underline-offset-4 hover:underline" to="/login">Back to sign in</Link>
      </form>
    </main>
  );
}
