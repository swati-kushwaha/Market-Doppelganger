import { Sparkles } from "lucide-react";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export default function AuthPage() {
  return <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6 py-12"><div className="w-full max-w-md"><div className="mb-10 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-[var(--accent)] text-[#0b0f14]"><Sparkles size={19} /></div><div><p className="text-sm font-semibold">Market</p><p className="text-sm text-[var(--accent)]">Doppelganger</p></div></div><div className="mb-7"><p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Private market context</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Your market, in context.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sign in to build and revisit your personal watchlists.</p></div><AuthForm /><Link href="/demo" className="mt-6 flex items-center justify-center gap-2 border border-[var(--accent)]/50 px-4 py-3 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10">View the deterministic demo</Link></div></main>;
}
