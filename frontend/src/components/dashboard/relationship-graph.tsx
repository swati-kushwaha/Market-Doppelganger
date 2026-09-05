"use client";

import { useCallback, useEffect, useState } from "react";
import { GitBranch, RefreshCw } from "lucide-react";

import { getRelationships, type Relationship } from "@/lib/api-client";

const positions = [
  { left: "50%", top: "50%" },
  { left: "16%", top: "23%" },
  { left: "83%", top: "23%" },
  { left: "16%", top: "77%" },
  { left: "83%", top: "77%" },
];

export function RelationshipGraph({ symbol }: { symbol: string }) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selected, setSelected] = useState<Relationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRelationships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRelationships(symbol);
      setRelationships(response.relationships);
      setSelected(response.relationships[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load relationships.");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRelationships(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRelationships]);

  if (loading) return <div className="mt-6 border border-[var(--line)] bg-[#0d1319] p-6 text-sm text-[var(--muted)]">Mapping relationships around {symbol}...</div>;
  if (error) return <div className="mt-6 flex items-center justify-between border border-red-900 bg-red-950/20 p-5 text-sm text-red-200"><span>{error}</span><button onClick={() => void loadRelationships()} title="Retry relationships"><RefreshCw size={16} /></button></div>;
  if (!relationships.length) return null;

  return <section className="mt-6 border border-[var(--line)] bg-[#0d1319] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]"><GitBranch size={15} />Relationship map</div><h4 className="mt-3 text-2xl font-semibold">What is moving with {symbol}?</h4><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Edges show recent return correlation. Click a node to inspect the change against its historical baseline.</p></div><div className="flex flex-wrap justify-end gap-2"><span className="border border-[var(--line)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{relationships[0].is_demo_data ? "Demo relationships" : "Observed relationships"}</span>{relationships.some((relationship) => relationship.is_stale) && <span className="border border-amber-800 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-300">Stale inputs</span>}</div></div><div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="relative h-[360px] overflow-hidden border border-[var(--line)] bg-[#101923]"><svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">{relationships.map((relationship, index) => <line key={relationship.related_symbol} x1="50" y1="50" x2={index % 2 === 0 ? 16 : 84} y2={index < 2 ? 23 : 77} stroke={relationship.is_significant ? "#e6b85c" : "#52616d"} strokeOpacity={relationship.is_significant ? 0.8 : 0.45} strokeWidth={Math.max(0.6, Math.abs(relationship.correlation) * 2.5)} />)}</svg><div className="absolute inset-0">{[symbol, ...relationships.map((relationship) => relationship.related_symbol)].map((node, index) => <button key={node} onClick={() => index > 0 && setSelected(relationships[index - 1])} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${index === 0 ? "border-[var(--accent)] bg-[var(--accent)] text-[#0b0f14]" : selected?.related_symbol === node ? "border-[var(--accent)] bg-[#263641] text-white" : "border-[var(--line)] bg-[#17232d] text-[var(--muted)] hover:border-[var(--accent)] hover:text-white"}`} style={positions[index]}>{node}</button>)}</div></div><div className="border border-[var(--line)] p-5">{selected ? <><p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Selected relationship</p><h5 className="mt-3 text-xl font-semibold">{symbol} vs {selected.related_symbol}</h5><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{selected.explanation} This describes observed movement, not causation.</p><div className="mt-6 grid grid-cols-2 gap-4"><Stat label="Current correlation" value={selected.correlation.toFixed(2)} /><Stat label="Historical baseline" value={selected.historical_correlation.toFixed(2)} /><Stat label="Change" value={`${selected.correlation_change >= 0 ? "+" : ""}${selected.correlation_change.toFixed(2)}`} /><Stat label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} /></div><div className="mt-6 border-t border-[var(--line)] pt-4 text-xs uppercase tracking-[0.12em] text-[var(--accent)]">{selected.relationship_type}</div></> : <p className="text-sm text-[var(--muted)]">Select a node to inspect why the relationship was surfaced.</p>}</div></div></section>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }
