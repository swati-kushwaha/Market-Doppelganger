"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";

import { getFingerprint, type FingerprintResponse } from "@/lib/api-client";
import { MarketDoppelganger } from "@/components/dashboard/market-doppelganger";
import { RelationshipGraph } from "@/components/dashboard/relationship-graph";

const featureLabels: Array<[string, string]> = [
  ["momentum", "Price momentum"],
  ["volume_anomaly", "Volume anomaly"],
  ["volatility", "Volatility"],
  ["benchmark_relative_strength", "Relative strength"],
  ["sector_momentum", "Sector momentum"],
];

export function MarketDNA({ symbol }: { symbol: string }) {
  const [fingerprint, setFingerprint] = useState<FingerprintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFingerprint = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFingerprint(await getFingerprint(symbol));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load market fingerprint.");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFingerprint(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFingerprint]);

  if (loading) return <div className="mt-6 border border-[var(--line)] bg-[#0d1319] p-6 text-sm text-[var(--muted)]">Building Market DNA for {symbol}...</div>;
  if (error) return <div className="mt-6 flex items-center justify-between border border-red-900 bg-red-950/20 p-5 text-sm text-red-200"><span>{error}</span><button onClick={() => void loadFingerprint()} title="Retry fingerprint" className="text-red-200"><RefreshCw size={16} /></button></div>;
  if (!fingerprint) return null;

  return <><section className="mt-6 border border-[var(--line)] bg-[#0d1319] p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]"><Database size={14} />Market DNA</div><h4 className="mt-3 text-2xl font-semibold">{fingerprint.symbol}</h4><p className="mt-1 text-xs text-[var(--muted)]">Normalized contextual fingerprint</p></div><div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em]"><span className="border border-[var(--line)] px-2 py-1 text-[var(--muted)]">{fingerprint.is_demo_data ? "Demo market data" : `Source: ${fingerprint.data_source}`}</span>{fingerprint.is_stale && <span className="inline-flex items-center gap-1 border border-amber-800 px-2 py-1 text-amber-300"><AlertTriangle size={12} />Stale data</span>}</div></div><div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">{featureLabels.map(([key, label]) => <div key={key}><div className="mb-2 flex justify-between text-sm"><span className="text-[var(--muted)]">{label}</span><span>{Math.round((fingerprint.features[key] ?? 0) * 100)}%</span></div><div className="h-2 bg-[#24303a]"><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(fingerprint.features[key] ?? 0) * 100}%` }} /></div></div>)}</div><div className="mt-7 flex flex-col gap-1 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)] sm:flex-row sm:justify-between"><span>Observed {new Date(fingerprint.timestamp).toLocaleString()}</span><span>{fingerprint.persisted ? "Stored in market memory" : fingerprint.persistence_warning ?? "Persistence not configured"}</span></div></section><MarketDoppelganger symbol={symbol} /><RelationshipGraph symbol={symbol} /></>;
}
