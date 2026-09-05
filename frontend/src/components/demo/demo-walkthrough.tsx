"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowDown, Clock3, Gauge, GitBranch, Play, RotateCcw, Sparkles, Volume2 } from "lucide-react";

import { apiRequest } from "@/lib/api-client";
import { fallbackDemoScenario, type DemoScenario } from "@/lib/demo-data";
import { ExplanationPanel } from "@/components/demo/explanation-panel";

const stages = ["Before you checked", "Market changed", "Here's what changed", "Here's the historical pattern", "Here's what happened after"];

export function DemoWalkthrough() {
  const [scenario, setScenario] = useState<DemoScenario>(fallbackDemoScenario);
  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void apiRequest<DemoScenario>("/api/demo/scenario").then((data) => {
      if (active) setScenario(data);
    }).catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setStage((current) => {
        if (current >= stages.length - 1) {
          setRunning(false);
          return current;
        }
        return current + 1;
      });
    }, 1450);
    return () => window.clearInterval(timer);
  }, [running]);

  function runDemo() {
    setStage((current) => current >= stages.length - 1 ? 1 : current + 1);
    setRunning(true);
  }

  function resetDemo() {
    setStage(0);
    setRunning(false);
  }

  if (loading) return <div className="min-h-screen bg-[var(--background)] p-6 sm:p-10"><div className="mx-auto max-w-6xl space-y-5"><div className="h-8 w-32 animate-pulse bg-[#1e2a33]" /><div className="h-24 w-3/4 animate-pulse bg-[#1e2a33]" /><div className="grid gap-5 md:grid-cols-2"><div className="h-56 animate-pulse bg-[#111820]" /><div className="h-56 animate-pulse bg-[#111820]" /></div></div></div>;

  return <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"><header className="border-b border-[var(--line)] bg-[#0d1319]"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-10"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[var(--accent)] text-[#0b0f14]"><Sparkles size={18} /></div><div><p className="text-sm font-semibold">Market</p><p className="text-sm text-[var(--accent)]">Doppelganger</p></div></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 border border-[var(--accent)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]"><span className="size-1.5 rounded-full bg-[var(--accent)]" />{scenario.mode}</span><button onClick={resetDemo} title="Reset demo" className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:text-white"><RotateCcw size={14} />Reset</button></div></div></header><div className="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12"><section className="reveal border-b border-[var(--line)] pb-10"><p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">A 60-second guided scenario</p><h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">{scenario.title.toUpperCase()}</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)]">Watch a controlled market situation unfold. Every value is deterministic demo data, clearly separated from live market information.</p><div className="mt-7 flex flex-wrap items-center gap-3"><button onClick={runDemo} className="inline-flex items-center gap-2 bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#0b0f14] hover:bg-[#f0c976]"><Play size={16} />{running ? "Demo running..." : stage >= stages.length - 1 ? "Replay demo" : "Run demo"}</button><span className="text-xs text-[var(--muted)]">No external APIs required</span></div></section><div className="mt-8 grid gap-2 sm:grid-cols-5">{stages.map((label, index) => <div key={label} className={`border-t-2 pt-3 text-xs leading-5 transition-colors ${index <= stage ? "border-[var(--accent)] text-[var(--foreground)]" : "border-[var(--line)] text-[var(--muted)]"}`}><span className="mr-2 font-mono text-[var(--accent)]">0{index + 1}</span>{label}</div>)}</div><section className="mt-8 grid gap-5 md:grid-cols-2"><ScenarioPanel title="Before you checked" visible={stage >= 0} muted={stage > 0}><div className="space-y-3">{scenario.before_quotes.map((quote) => <Quote key={quote.symbol} {...quote} />)}</div><Correlation value={scenario.correlation.before} label="Correlation" /></ScenarioPanel><ScenarioPanel title="Market changed" visible={stage >= 1} muted={stage < 1}><div className="space-y-3">{scenario.after_quotes.map((quote) => <Quote key={quote.symbol} {...quote} changed />)}</div><Correlation value={scenario.correlation.after} label="Correlation" after /></ScenarioPanel></section>{stage >= 2 && <section className="reveal mt-5 border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"><StepHeading icon={<Activity size={16} />} label="Here's what changed" /><div className="mt-6 grid gap-3 md:grid-cols-3">{scenario.signals.map((signal) => <div key={signal.kind} className="border border-[var(--line)] bg-[#0d1319] p-5"><div className="flex items-center justify-between"><span className={`size-2 rounded-full ${signal.tone === "red" ? "bg-red-400" : "bg-[var(--accent)]"}`} /><span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Detected</span></div><p className="mt-5 font-medium">{signal.title}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{signal.detail}</p></div>)}</div></section>}{stage >= 2 && <ExplanationPanel scenario={scenario} visible={stage >= 2} />}{stage >= 3 && <section className="reveal mt-5 border border-[var(--accent)]/50 bg-[#101923] p-6 sm:p-8"><StepHeading icon={<GitBranch size={16} />} label="Here's the historical pattern" /><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]"><div><p className="text-3xl font-semibold">{Math.round(scenario.historical_pattern.similarity * 100)}% similar</p><p className="mt-2 text-sm text-[var(--muted)]">Historical event - {scenario.historical_pattern.event_date}</p><div className="mt-5 flex flex-wrap gap-2 text-xs text-[var(--muted)]"><span className="border border-[var(--line)] px-3 py-2">Price + volume context</span><span className="border border-[var(--line)] px-3 py-2">Relationship shift</span></div></div><div className="flex items-center gap-3 text-[var(--accent)]"><ArrowDown size={17} /><span className="text-xs uppercase tracking-[0.16em]">Context, not prediction</span></div></div></section>}{stage >= 4 && <section className="reveal mt-5 border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"><StepHeading icon={<Gauge size={16} />} label="Here's what happened in similar situations" /><div className="mt-6 grid gap-3 sm:grid-cols-4">{Object.entries(scenario.historical_outcomes).map(([label, value]) => <div key={label} className="border border-[var(--line)] p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold">{label.includes("frequency") ? `${Math.round(value * 100)}%` : formatReturn(value)}</p></div>)}</div><div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-2"><Clock3 size={14} />Sample size: {scenario.sample_size}</span><span>Historical outcomes are descriptive and do not predict future returns.</span></div></section>}<footer className="mt-8 flex flex-col gap-3 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between"><span>DEMO MODE · Deterministic scenario · Not live market data</span><span className="inline-flex items-center gap-2"><Volume2 size={13} />Designed for a fast judge walkthrough</span></footer></div></main>;
}

function ScenarioPanel({ title, visible, muted, children }: { title: string; visible: boolean; muted: boolean; children: React.ReactNode }) { return <div className={`border border-[var(--line)] bg-[var(--surface)] p-6 transition-all duration-500 sm:p-8 ${visible ? "opacity-100" : "opacity-35"} ${muted ? "" : "ring-1 ring-[var(--accent)]/30"}`}><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{title}</p>{!visible && <span className="text-xs text-[var(--muted)]">Next</span>}</div><div className="mt-7">{children}</div></div>; }
function Quote({ symbol, price_change, volume, changed }: { symbol: string; price_change: string; volume: string; changed?: boolean }) { return <div className="flex items-center justify-between border-b border-[var(--line)] pb-4"><div><p className="font-medium">{symbol}</p><p className="mt-1 text-xs text-[var(--muted)]">{volume}</p></div><p className={`text-xl font-semibold ${changed ? "text-emerald-300" : "text-[var(--muted)]"}`}>{price_change}</p></div>; }
function Correlation({ value, label, after }: { value: number; label: string; after?: boolean }) { return <div className="mt-7 flex items-center justify-between border-t border-[var(--line)] pt-5"><span className="text-sm text-[var(--muted)]">{label}</span><span className={`text-2xl font-semibold ${after ? "text-[var(--accent)]" : ""}`}>{value.toFixed(2)}</span></div>; }
function StepHeading({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">{icon}{label}</div>; }
function formatReturn(value: number) { return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`; }
