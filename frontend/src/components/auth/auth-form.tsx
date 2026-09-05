"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const result = mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
      if (result.error) throw result.error;
      if (mode === "sign-up" && !result.data.session) {
        setStatus({ type: "success", message: "Account created. Check your email to confirm your address." });
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Authentication failed." });
    } finally {
      setLoading(false);
    }
  }

  if (!isSupabaseConfigured()) return <div className="border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">Authentication is not configured yet. Add Supabase credentials to <span className="text-[var(--accent)]">frontend/.env.local</span>.</div>;

  return <form onSubmit={submit} className="space-y-5">
    {mode === "sign-up" && <Field label="Display name" value={displayName} onChange={setDisplayName} type="text" autoComplete="name" />}
    <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" required />
    <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={6} />
    {status && <p className={`border px-3 py-3 text-sm ${status.type === "error" ? "border-red-900 text-red-300" : "border-emerald-900 text-emerald-300"}`}>{status.message}</p>}
    <button disabled={loading} className="w-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#0b0f14] disabled:cursor-wait disabled:opacity-60">{loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}</button>
    <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setStatus(null); }} className="w-full text-sm text-[var(--muted)] hover:text-white">{mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>
  </form>;
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) { return <label className="block space-y-2 text-sm"><span className="text-[var(--muted)]">{label}</span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="w-full border border-[var(--line)] bg-[#0b0f14] px-3 py-3 text-white outline-none focus:border-[var(--accent)]" /></label>; }
