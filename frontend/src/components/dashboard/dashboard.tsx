"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3, GitBranch, LayoutDashboard, LogOut, Plus, RefreshCw, Settings, Sparkles, Trash2, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { MarketDNA } from "@/components/dashboard/market-dna";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Watchlist } from "@/types/watchlists";

const navigation = [
  { label: "Pulse", icon: LayoutDashboard },
  { label: "Watchlists", icon: WalletCards },
  { label: "Patterns", icon: Activity },
  { label: "Market Memory", icon: GitBranch },
  { label: "Settings", icon: Settings },
];

export function Dashboard({ email }: { email: string }) {
  const router = useRouter();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [stockSymbol, setStockSymbol] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function loadWatchlists() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: fetchError } = await supabase.from("watchlists").select("*, watchlist_stocks(*)").order("created_at", { ascending: true });
      if (fetchError) throw fetchError;
      const next = (data ?? []) as Watchlist[];
      setWatchlists(next);
      setActiveId((current) => current && next.some((watchlist) => watchlist.id === current) ? current : next[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load watchlists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWatchlists(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createWatchlist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Please sign in again.");
      const { error: insertError } = await supabase.from("watchlists").insert({ user_id: user.id, name: newName.trim(), is_default: watchlists.length === 0 });
      if (insertError) throw insertError;
      setNewName(""); setShowCreate(false); setNotice("Watchlist created."); await loadWatchlists();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create watchlist.");
    } finally { setSaving(false); }
  }

  async function renameWatchlist(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!editingName.trim()) return;
    setSaving(true); setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.from("watchlists").update({ name: editingName.trim(), updated_at: new Date().toISOString() }).eq("id", id);
      if (updateError) throw updateError;
      setEditingId(null); setNotice("Watchlist renamed."); await loadWatchlists();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Could not rename watchlist.");
    } finally { setSaving(false); }
  }

  async function deleteWatchlist(id: string) {
    if (!window.confirm("Delete this watchlist and its stocks?")) return;
    setSaving(true); setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: deleteError } = await supabase.from("watchlists").delete().eq("id", id);
      if (deleteError) throw deleteError;
      setNotice("Watchlist deleted."); await loadWatchlists();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete watchlist.");
    } finally { setSaving(false); }
  }

  async function addStock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeId || !stockSymbol.trim()) return;
    setSaving(true); setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: insertError } = await supabase.from("watchlist_stocks").insert({ watchlist_id: activeId, symbol: stockSymbol.trim().toUpperCase(), exchange: "NSE" });
      if (insertError) throw insertError;
      setStockSymbol(""); setNotice("Stock added."); await loadWatchlists();
    } catch (stockError) {
      setError(stockError instanceof Error ? stockError.message : "Could not add stock.");
    } finally { setSaving(false); }
  }

  async function removeStock(id: string) {
    setSaving(true); setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: deleteError } = await supabase.from("watchlist_stocks").delete().eq("id", id);
      if (deleteError) throw deleteError;
      setNotice("Stock removed."); await loadWatchlists();
    } catch (stockError) {
      setError(stockError instanceof Error ? stockError.message : "Could not remove stock.");
    } finally { setSaving(false); }
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  const activeWatchlist = watchlists.find((watchlist) => watchlist.id === activeId);
  const stocks = activeWatchlist?.watchlist_stocks ?? [];
  const stockCount = stocks.length;

  return <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[var(--line)] bg-[#0d1319] px-6 py-7 lg:block"><div className="mb-14 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[var(--accent)] text-[#0b0f14]"><Sparkles size={18} /></div><div><p className="text-sm font-semibold tracking-tight">Market</p><p className="text-sm text-[var(--accent)]">Doppelganger</p></div></div><nav className="space-y-2">{navigation.map(({ label, icon: Icon }, index) => <a key={label} href={index === 0 ? "#pulse" : `#${label.toLowerCase().replace(" ", "-")}`} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${index === 0 ? "bg-[#1a252d] text-white" : "text-[var(--muted)] hover:bg-[#151e26] hover:text-white"}`}><Icon size={17} />{label}</a>)}</nav><div className="absolute bottom-7 left-6 right-6 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">Prototype pulse<br /><span className="mt-2 inline-block text-[var(--accent)]">Demo data available</span></div></aside>
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[#0d1319] px-4 py-3 lg:hidden">{navigation.slice(0, 4).map(({ label, icon: Icon }, index) => <a key={label} href={index === 0 ? "#pulse" : `#${label.toLowerCase().replace(" ", "-")}`} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs ${index === 0 ? "bg-[#1a252d] text-white" : "text-[var(--muted)]"}`}><Icon size={15} />{label}</a>)}</nav>
    <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5 lg:ml-64 sm:px-10"><div><p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Market intelligence</p><h1 className="mt-2 text-xl font-semibold tracking-tight">Pulse dashboard</h1></div><div className="flex items-center gap-4"><span className="hidden text-xs text-[var(--muted)] sm:inline">{email}</span><button onClick={signOut} title="Sign out" className="text-[var(--muted)] hover:text-white"><LogOut size={17} /></button></div></header>
    <div className="lg:ml-64"><div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-10 sm:py-10">
      {error && <Notice message={error} tone="error" onClose={() => setError(null)} />}
      {notice && <Notice message={notice} tone="success" onClose={() => setNotice(null)} />}
      <section id="pulse" className="reveal relative overflow-hidden border-b border-[var(--line)] pb-12"><div className="absolute -right-20 -top-32 size-96 rounded-full border border-[var(--accent)]/10" /><div className="absolute right-20 top-16 size-48 rounded-full bg-[#d79f3f]/10 blur-3xl" /><div className="relative max-w-4xl"><div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-[var(--accent)]"><span className="size-2 rounded-full bg-[var(--accent)] shadow-[0_0_14px_var(--accent)]" />Portfolio pulse</div><h2 className="mt-5 text-[clamp(2.5rem,6vw,6.5rem)] font-semibold leading-[0.94] tracking-tight">YOUR WATCHLIST<br /><span className="text-[var(--accent)]">CHANGED SHAPE.</span></h2><p className="mt-7 max-w-2xl text-base leading-7 text-[var(--muted)]">A quieter view of what moved, what connected, and what deserves a closer look. {stockCount ? `${stockCount} stock${stockCount === 1 ? "" : "s"} are in focus.` : "Add a watchlist to start seeing your market in context."}</p></div></section>
      <section className="reveal reveal-delay-1 grid border-b border-[var(--line)] sm:grid-cols-3"><StatusCell label="Market status" value="Provider-aware" detail="Demo fallback ready" accent /><StatusCell label="Freshness" value="Ready to refresh" detail="Every response is timestamped" /><StatusCell label="Watchlist scope" value={watchlists.length ? `${watchlists.length} active list${watchlists.length === 1 ? "" : "s"}` : "No active list"} detail={stockCount ? `${stockCount} stocks in focus` : "Awaiting your first list"} /></section>
      <section id="patterns" className="reveal reveal-delay-2 grid gap-5 border-b border-[var(--line)] py-8 lg:grid-cols-[1.4fr_0.6fr]"><div className="min-h-48 border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"><SectionLabel>Since your last check</SectionLabel><div className="mt-5 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-3xl font-semibold">{stockCount ? "No check-in recorded" : "Your first check is ahead"}</p><p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">{stockCount ? "Return after the next market refresh to compare meaningful changes against this baseline." : "Once you have a watchlist, the pulse will compare each visit and reduce the noise to meaningful patterns."}</p></div><span className="whitespace-nowrap text-xs uppercase tracking-[0.14em] text-[var(--muted)]">0 patterns detected</span></div></div><div className="border border-[var(--line)] p-6 sm:p-8"><SectionLabel>Data posture</SectionLabel><div className="mt-7 flex items-center gap-3"><span className="size-2 rounded-full bg-[var(--accent)]" /><span className="text-sm">Context is available</span></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Every signal will carry its source, timestamp, and freshness.</p></div></section>
      <section className="grid gap-5 border-b border-[var(--line)] pb-8 lg:grid-cols-2"><div className="border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"><SectionLabel>Meaningful changes</SectionLabel><div className="mt-7 flex gap-4"><div className="mt-1 size-2 shrink-0 rounded-full bg-[var(--muted)]" /><div><p className="font-medium">No meaningful change yet</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">The dashboard will surface price, volume, relationship, and cluster anomalies here after a check-in.</p></div></div></div><div className="border border-[var(--line)] p-6 sm:p-8"><SectionLabel>Market clusters</SectionLabel><div className="mt-7 flex items-end gap-2 opacity-70"><span className="h-8 w-8 bg-[#27343d]" /><span className="h-14 w-8 bg-[#33434d]" /><span className="h-11 w-8 bg-[#2b3943]" /><span className="h-20 w-8 bg-[#e6b85c]/60" /><span className="h-12 w-8 bg-[#2b3943]" /></div><p className="mt-5 text-sm leading-6 text-[var(--muted)]">Clusters will appear when several watched stocks begin moving together.</p></div></section>
      <section id="watchlists" className="py-8"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionLabel>Watchlist control room</SectionLabel><h3 className="mt-2 text-2xl font-semibold">Your stocks, in context.</h3></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#0b0f14] hover:bg-[#f0c976]"><Plus size={16} />Create watchlist</button></div>{showCreate && <form onSubmit={createWatchlist} className="mb-6 flex flex-col gap-3 border border-[var(--line)] bg-[var(--surface)] p-5 sm:flex-row"><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Watchlist name" className="min-w-0 flex-1 border border-[var(--line)] bg-[#0b0f14] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" /><button disabled={saving} className="bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#0b0f14] disabled:opacity-60">{saving ? "Creating..." : "Create watchlist"}</button><button type="button" onClick={() => setShowCreate(false)} className="px-4 py-3 text-sm text-[var(--muted)]">Cancel</button></form>}{loading ? <LoadingState /> : watchlists.length === 0 ? <EmptyState onCreate={() => setShowCreate(true)} /> : <div className="grid gap-5 lg:grid-cols-[260px_1fr]"><section className="space-y-2">{watchlists.map((watchlist) => <div key={watchlist.id} className={`border p-4 transition-colors ${activeId === watchlist.id ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--line)]"}`}><button onClick={() => setActiveId(watchlist.id)} className="w-full text-left"><p className="font-medium">{watchlist.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{watchlist.watchlist_stocks.length} stocks</p></button><div className="mt-4 flex gap-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]"><button onClick={() => { setEditingId(watchlist.id); setEditingName(watchlist.name); }} className="hover:text-white">Rename</button><button onClick={() => void deleteWatchlist(watchlist.id)} className="hover:text-red-300">Delete</button></div></div>)}<button onClick={() => setShowCreate(true)} className="flex w-full items-center justify-center gap-2 border border-dashed border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-white"><Plus size={16} />New watchlist</button></section><section className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-8">{editingId && <form onSubmit={(event) => void renameWatchlist(event, editingId)} className="mb-7 flex gap-3 border-b border-[var(--line)] pb-6"><input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} className="min-w-0 flex-1 border border-[var(--line)] bg-[#0b0f14] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" /><button disabled={saving} className="bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0b0f14]">Save</button><button type="button" onClick={() => setEditingId(null)} className="px-2 text-sm text-[var(--muted)]">Cancel</button></form>}{activeWatchlist && <><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active watchlist</p><h4 className="mt-2 text-2xl font-semibold">{activeWatchlist.name}</h4></div><button onClick={() => void loadWatchlists()} title="Refresh watchlists" className="text-[var(--muted)] hover:text-white"><RefreshCw size={17} /></button></div><form onSubmit={addStock} className="mt-7 flex gap-3 border-y border-[var(--line)] py-5"><input value={stockSymbol} onChange={(event) => setStockSymbol(event.target.value)} placeholder="Add symbol, e.g. RELIANCE" className="min-w-0 flex-1 border border-[var(--line)] bg-[#0b0f14] px-3 py-3 text-sm uppercase outline-none focus:border-[var(--accent)]" /><button disabled={saving} className="inline-flex items-center gap-2 bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#0b0f14] disabled:opacity-60"><Plus size={16} />Add stock</button></form>{stocks.length === 0 ? <p className="py-10 text-center text-sm text-[var(--muted)]">No stocks yet. Add one to start the pulse.</p> : <ul className="divide-y divide-[var(--line)]">{stocks.map((stock) => <li key={stock.id} className="flex items-center justify-between py-4"><div><p className="font-medium">{stock.symbol}</p><p className="mt-1 text-xs text-[var(--muted)]">{stock.exchange} · awaiting next check</p></div><button onClick={() => void removeStock(stock.id)} title={`Remove ${stock.symbol}`} className="text-[var(--muted)] hover:text-red-300"><Trash2 size={16} /></button></li>)}</ul>}{stocks[0] && <MarketDNA symbol={stocks[0].symbol} />}</>}</section></div>}</section>
      <section className="grid gap-5 border-t border-[var(--line)] pt-8 lg:grid-cols-2"><div><SectionLabel>Stocks with no significant change</SectionLabel><div className="mt-5 border border-[var(--line)] p-6"><div className="flex items-center gap-3"><BarChart3 size={17} className="text-[var(--muted)]" /><p className="text-sm font-medium">Waiting for the first comparison</p></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Quiet stocks will be listed here so attention stays on meaningful movement.</p></div></div><div><SectionLabel>Relationship anomalies</SectionLabel><div className="mt-5 border border-[var(--line)] p-6"><div className="flex items-center gap-3"><GitBranch size={17} className="text-[var(--muted)]" /><p className="text-sm font-medium">Select a stock to inspect its map</p></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">The relationship graph below explains how watched and related stocks are moving together.</p></div></div></section>
    </div></div>
  </main>;
}

function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{children}</p>; }
function StatusCell({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) { return <div className="border-b border-[var(--line)] px-0 py-5 sm:border-b-0 sm:px-5 sm:py-6 sm:first:pl-0"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]"><span className={`size-1.5 rounded-full ${accent ? "bg-[var(--accent)]" : "bg-[#52616d]"}`} />{label}</div><p className="mt-3 text-sm font-medium">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div>; }
function Notice({ message, tone, onClose }: { message: string; tone: "error" | "success"; onClose: () => void }) { return <div className={`mb-5 flex items-center justify-between border px-4 py-3 text-sm ${tone === "error" ? "border-red-900 bg-red-950/30 text-red-200" : "border-emerald-900 bg-emerald-950/20 text-emerald-200"}`}><span>{message}</span><button onClick={onClose} title="Dismiss message"><X size={16} /></button></div>; }
function LoadingState() { return <div className="border border-[var(--line)] bg-[var(--surface)] p-6"><div className="h-4 w-32 animate-pulse bg-[#26343d]" /><div className="mt-4 h-4 w-56 animate-pulse bg-[#1e2a33]" /><div className="mt-8 h-10 w-full animate-pulse bg-[#1e2a33]" /></div>; }
function EmptyState({ onCreate }: { onCreate: () => void }) { return <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center sm:p-14"><p className="text-2xl font-semibold">Your watchlist is a blank canvas.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">Start with a small set of stocks. The pulse dashboard will build context around them as you return.</p><button onClick={onCreate} className="mt-7 inline-flex items-center gap-2 bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#0b0f14]"><Plus size={17} />Create your first watchlist</button></div>; }
