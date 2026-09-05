"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ScanSearch } from "lucide-react";

import { checkInWatchlist, getLatestVisit, type MeaningfulChange, type VisitStatusResponse } from "@/lib/api-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SinceLastCheck({ watchlistId }: { watchlistId: string }) {
  const [status, setStatus] = useState<VisitStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await createBrowserSupabaseClient().auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
      setStatus(await getLatestVisit(watchlistId, session.access_token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your last check-in.");
    } finally {
      setLoading(false);
    }
  }, [watchlistId]);

  useEffect(() => {
    if (!watchlistId) {
      return;
    }
    const timer = window.setTimeout(() => void loadStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus, watchlistId]);

  async function runCheckIn() {
    if (!watchlistId) {
      setError("Create or select a watchlist before checking in.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const { data: { session } } = await createBrowserSupabaseClient().auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
      setStatus(await checkInWatchlist(watchlistId, session.access_token));
    } catch (checkInError) {
      setError(checkInError instanceof Error ? checkInError.message : "Could not complete your check-in.");
    } finally {
      setChecking(false);
    }
  }

  return <section className="border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]"><ScanSearch size={15} />Since your last check</div><h3 className="mt-3 text-2xl font-semibold">{!watchlistId ? "Select a watchlist" : status?.has_baseline ? "Your watchlist changed shape" : "First check-in"}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{!watchlistId ? "Create a watchlist to establish your first market baseline." : status?.has_baseline ? status.meaningful_changes.length ? `${status.meaningful_changes.length} meaningful change${status.meaningful_changes.length === 1 ? "" : "s"} detected since ${formatDate(status.last_checked_at)}.` : "No major changes since your last check." : "Your current market state will become the baseline for your next visit."}</p></div><button onClick={() => void runCheckIn()} disabled={checking || loading || !watchlistId} className="inline-flex shrink-0 items-center justify-center gap-2 bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#0b0f14] disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw size={16} className={checking ? "animate-spin" : ""} />{checking ? "Checking..." : status?.has_baseline ? "Check again" : "Set baseline"}</button></div>{error && <div className="mt-5 flex items-center gap-2 border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-200"><AlertTriangle size={15} />{error}</div>}{loading && watchlistId ? <div className="mt-7 space-y-3"><div className="h-4 w-40 animate-pulse bg-[#26343d]" /><div className="h-4 w-3/4 animate-pulse bg-[#1e2a33]" /></div> : status?.meaningful_changes.length ? <div className="mt-7 space-y-3">{status.meaningful_changes.map((change) => <ChangeCard key={`${change.symbol}-${change.detected_at}`} change={change} />)}</div> : status?.has_baseline ? <div className="mt-7 flex items-center gap-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--muted)]"><CheckCircle2 size={17} className="text-emerald-300" />No major changes since your last check.</div> : <div className="mt-7 flex items-center gap-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--muted)]"><Clock3 size={17} />The next check-in will compare against this baseline.</div>}</section>;
}

function ChangeCard({ change }: { change: MeaningfulChange }) { const normalized = change.signals.normalized_signals as Record<string, number> | undefined; const deltas = change.signals.feature_deltas as Record<string, number> | undefined; return <article className="border border-[var(--line)] bg-[#0d1319] p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[var(--accent)]" /><h4 className="font-semibold">{change.symbol}</h4><span className="text-xs uppercase tracking-[0.12em] text-[var(--accent)]">{change.change_type}</span></div><p className="mt-3 text-sm leading-6">{change.explanation}</p></div><span className="text-sm text-[var(--muted)]">Score {Math.round(change.score * 100)}%</span></div><div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-3"><Evidence label="Price movement" value={deltas?.price_return} normalized={normalized?.price_return} /><Evidence label="Volume anomaly" value={deltas?.volume_anomaly} normalized={normalized?.volume_anomaly} /><Evidence label="Context shift" value={deltas?.sector_relative_strength} normalized={normalized?.sector_relative_strength} /></div><p className="mt-4 text-xs text-[var(--muted)]">Evidence is deterministic and compares this state with the previous visit baseline. Confidence: {Math.round(change.confidence * 100)}%.</p></article>; }
function Evidence({ label, value, normalized }: { label: string; value?: number; normalized?: number }) { return <div><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-sm">{value === undefined ? "No prior value" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pts`}<span className="ml-2 text-xs text-[var(--muted)]">{normalized === undefined ? "" : `${Math.round(normalized * 100)} signal`}</span></p></div>; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString() : "your previous visit"; }
