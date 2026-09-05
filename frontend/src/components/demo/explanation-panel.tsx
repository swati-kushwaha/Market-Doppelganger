"use client";

import { useEffect, useState } from "react";
import { FileText, History, MessageCircle } from "lucide-react";

import { apiRequest } from "@/lib/api-client";
import type { DemoScenario } from "@/lib/demo-data";

type Explanation = {
  observed_facts: string;
  historical_context: string;
  interpretation: string;
  source: string;
  is_fallback: boolean;
};

function localFallback(scenario: DemoScenario): Explanation {
  return {
    observed_facts: `RELIANCE moved +5.8% while trading volume was 2.4x the recent baseline. The sector moved +2.1%, and the observed relationship correlation changed by +0.47.`,
    historical_context: `${scenario.sample_size} historical situations with similar characteristics were identified at a 94% similarity level.`,
    interpretation: "The supplied price, volume, sector, and relationship facts describe a combination that is worth reviewing in context. This deterministic fallback is not a prediction.",
    source: "deterministic template",
    is_fallback: true,
  };
}

export function ExplanationPanel({ scenario, visible }: { scenario: DemoScenario; visible: boolean }) {
  const [explanation, setExplanation] = useState<Explanation | null>(null);

  useEffect(() => {
    if (!visible) return;
    const facts = {
      symbol: "RELIANCE",
      price_change: 5.8,
      volume_multiple: 2.4,
      sector_change: 2.1,
      correlation_change: Number((scenario.correlation.after - scenario.correlation.before).toFixed(2)),
      historical_similarity: scenario.historical_pattern.similarity,
      historical_sample_size: scenario.sample_size,
    };
    void apiRequest<Explanation>("/api/explanation", { method: "POST", body: JSON.stringify(facts) })
      .then(setExplanation)
      .catch(() => setExplanation(localFallback(scenario)));
  }, [scenario, visible]);

  if (!visible) return null;
  if (!explanation) return <section className="reveal mt-5 border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"><div className="h-4 w-40 animate-pulse bg-[#26343d]" /><div className="mt-5 h-4 w-full animate-pulse bg-[#1e2a33]" /><div className="mt-3 h-4 w-4/5 animate-pulse bg-[#1e2a33]" /></section>;

  const sections = [
    { title: "Observed facts", icon: FileText, text: explanation.observed_facts },
    { title: "Historical context", icon: History, text: explanation.historical_context },
    { title: "Interpretation", icon: MessageCircle, text: explanation.interpretation },
  ];

  return <section className="reveal mt-5 border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">Explanation layer</p><h2 className="mt-2 text-xl font-semibold">Facts first. Language second.</h2></div><span className="border border-[var(--line)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{explanation.is_fallback ? "Deterministic fallback" : "Optional LLM"}</span></div><div className="mt-6 grid gap-3 lg:grid-cols-3">{sections.map(({ title, icon: Icon, text }) => <div key={title} className="border border-[var(--line)] bg-[#0d1319] p-5"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]"><Icon size={14} />{title}</div><p className="mt-4 text-sm leading-6 text-[var(--foreground)]">{text}</p></div>)}</div><p className="mt-5 text-xs leading-5 text-[var(--muted)]">The explanation layer does not calculate metrics, decide significance, add causes, make predictions, or provide investment recommendations.</p></section>;
}
