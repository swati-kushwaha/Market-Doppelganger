"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BrainCircuit, RefreshCw } from "lucide-react";

import { getMarketMemory, type MarketMemoryResponse } from "@/lib/api-client";

const featureNames: Record<string, string> = {
  price_return: "price return",
  momentum: "price momentum",
  volume_anomaly: "volume anomaly",
  volatility: "volatility",
  benchmark_relative_strength: "relative strength",
  sector_relative_strength: "sector relative strength",
  sector_momentum: "sector momentum",
  benchmark_momentum: "benchmark momentum",
};

const outcomeLabels: Record<string, string> = { "1d": "1D", "3d": "3D", "5d": "5D" };

export function MarketDoppelganger({ symbol }: { symbol: string }) {
  const [memory, setMemory] = useState<MarketMemoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMemory(await getMarketMemory(symbol));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load historical matches.");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMemory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMemory]);

  if (loading) return <div className="mt-6 border border-[var(--line)] bg-[#0d1319] p-6 text-sm text-[var(--muted)]">Searching market memory for {symbol}...</div>;
  if (error) return <div className="mt-6 flex items-center justify-between border border-red-900 bg-red-950/20 p-5 text-sm text-red-200"><span>{error}</span><button onClick={() => void loadMemory()} title="Retry market memory"><RefreshCw size={16} /></button></div>;
  if (!memory || memory.matches.length === 0) return null;

  return <section className="mt-6 overflow-hidden border border-[var(--accent)]/40 bg-[#101923]"><div className="border-b border-[var(--line)] px-6 py-6 sm:px-8"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]"><BrainCircuit size={15} />Market Doppelganger</div><h4 className="mt-3 text-2xl font-semibold">Historical context for {memory.symbol}</h4><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">The current fingerprint is compared with stored market situations. Similarity describes observed characteristics, not a forecast.</p></div><span className="shrink-0 border border-[var(--line)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{memory.is_demo_data ? "Demo history" : "Historical data"}</span></div><div className="mt-7 flex flex-wrap items-center gap-3 text-xs"><span className="border border-[var(--line)] px-3 py-2 text-[var(--muted)]">Current pattern</span><span className="text-[var(--accent)]">↓</span><span className="border border-[var(--accent)]/50 px-3 py-2 text-[var(--accent)]">Top match {Math.round(memory.matches[0].similarity * 100)}% similar</span><span className="text-[var(--accent)]">↓</span><span className="border border-[var(--line)] px-3 py-2 text-[var(--muted)]">What happened afterward?</span></div></div><div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]"><div className="border-b border-[var(--line)] p-6 lg:border-b-0 lg:border-r sm:p-8"><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Closest historical situations</p><div className="mt-5 space-y-3">{memory.matches.map((match, index) => <div key={`${match.event_date}-${index}`} className="border border-[var(--line)] bg-[#0d1319] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Historical event · {match.event_date}</p><p className="mt-1 text-xs text-[var(--muted)]">Similar because: {match.matching_features.map((feature) => featureNames[feature] ?? feature).join(", ")}</p></div><span className="text-lg font-semibold text-[var(--accent)]">{Math.round(match.similarity * 100)}%</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Outcome label="1D" value={match.future_return_1d} /><Outcome label="3D" value={match.future_return_3d} /><Outcome label="5D" value={match.future_return_5d} /></div></div>)}</div></div><div className="p-6 sm:p-8"><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">What happened afterward?</p><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Across the {memory.matches.length} closest historical events:</p><div className="mt-6 space-y-3">{Object.entries(memory.outcomes).map(([horizon, outcome]) => <div key={horizon} className="border-b border-[var(--line)] pb-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">{outcomeLabels[horizon] ?? horizon}</span><span className="text-sm text-[var(--muted)]">{Math.round(outcome.positive_frequency * 100)}% positive</span></div><div className="mt-2 flex items-baseline justify-between"><span className={`text-2xl font-semibold ${outcome.median_return >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatReturn(outcome.median_return)} median</span><span className="text-xs text-[var(--muted)]">mean {formatReturn(outcome.mean_return)}</span></div></div>)}</div><div className="mt-7 border border-[var(--line)] p-4 text-xs leading-5 text-[var(--muted)]">Historical context only. These outcomes describe prior events with similar characteristics and do not predict future returns or provide investment advice.</div></div></div></section>;
}

function Outcome({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between border-t border-[var(--line)] pt-2"><span className="text-[var(--muted)]">{label}</span><span className={value >= 0 ? "text-emerald-300" : "text-red-300"}>{formatReturn(value)}</span></div>; }
function formatReturn(value: number) { return <span className="inline-flex items-center gap-1">{value >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{(value * 100).toFixed(1)}%</span>; }
