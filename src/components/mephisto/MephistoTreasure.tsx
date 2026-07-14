"use client";
/* eslint-disable @next/next/no-img-element -- treasure images are served dynamically */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MEPHISTO_GREETING, type TreasureToken } from "@/lib/treasure/protocol";

interface Match { id: string; name: string; score: number; featureHex: string }
interface SearchAttempt { attempt: number; hashHex: string; closest: Match | null; matches: Match[] }
interface SearchResult { timestampMs: string; attempts: SearchAttempt[]; success: boolean; finalHashHex: string; matches: Match[] }
interface TreasureImage { id: string; imageUrl?: string | null; thumbnailUrl?: string | null; width?: number | null; height?: number | null }
interface TreasureCandidate {
  id: string; name: string; ownerName: string; ownerNodeId: string; subjectName: string; subjectGroup: string;
  searchHashHex: string; matchScore: number; status: "PENDING" | "COLLECTED"; tokens: TreasureToken[];
  recorderName?: string | null;
}

export function MephistoTreasure() {
  const [open, setOpen] = useState(false);
  const [spell, setSpell] = useState("");
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [candidate, setCandidate] = useState<TreasureCandidate | null>(null);
  const [images, setImages] = useState<TreasureImage[]>([]);
  const [recorderName, setRecorderName] = useState("");
  const [phase, setPhase] = useState<"idle" | "searching" | "choosing" | "generating" | "candidate" | "collected">("idle");
  const [error, setError] = useState("");
  const scrollEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) scrollEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [open, phase, candidate, error]);
  useEffect(() => {
    const closeForOtherWindow = (event: Event) => {
      if ((event as CustomEvent<{ window?: string }>).detail?.window !== "mephisto") setOpen(false);
    };
    window.addEventListener("eros-floating-window-open", closeForOtherWindow);
    return () => window.removeEventListener("eros-floating-window-open", closeForOtherWindow);
  }, []);

  function reset() {
    setSpell(""); setSearch(null); setCandidate(null); setImages([]); setRecorderName(""); setPhase("idle"); setError("");
  }

  async function generate(owner: Match, currentSearch: SearchResult, currentSpell: string) {
    setPhase("generating"); setError("");
    try {
      const response = await fetch("/api/treasures/generate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ spell: currentSpell, timestampMs: currentSearch.timestampMs, ownerNodeId: owner.id }),
      });
      const body = await response.json() as { alreadyCollected?: boolean; treasure?: TreasureCandidate; images?: TreasureImage[]; error?: { message?: string } };
      if (!response.ok || !body.treasure) { setError(body.error?.message ?? "梅菲斯特的戏法暂时失效了。"); setPhase("choosing"); return; }
      setCandidate(body.treasure); setImages(body.images ?? []); setPhase(body.alreadyCollected ? "collected" : "candidate");
    } catch { setError("无法完成宝物生成，请检查网络后再试。"); setPhase("choosing"); }
  }

  async function cast(event: React.FormEvent) {
    event.preventDefault();
    const currentSpell = spell.trim();
    if (!currentSpell || phase === "searching" || phase === "generating") return;
    setSearch(null); setCandidate(null); setImages([]); setError(""); setPhase("searching");
    try {
      const response = await fetch("/api/treasures/search", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spell: currentSpell }),
      });
      const body = await response.json() as SearchResult & { error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "咒语没有抵达梅菲斯特。"); setPhase("idle"); return; }
      setSearch(body);
      if (!body.success) { setPhase("choosing"); return; }
      if (body.matches.length === 1) await generate(body.matches[0], body, currentSpell);
      else setPhase("choosing");
    } catch { setError("无法抵达梅菲斯特，请检查网络后再试。"); setPhase("idle"); }
  }

  async function collect() {
    if (!candidate || phase !== "candidate") return;
    setError("");
    try {
      const response = await fetch(`/api/treasures/${candidate.id}/collect`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recorderName }),
      });
      const body = await response.json() as { treasure?: TreasureCandidate; images?: TreasureImage[]; error?: { message?: string } };
      if (!response.ok || !body.treasure) { setError(body.error?.message ?? "宝物收录失败。"); return; }
      setCandidate(body.treasure); setImages(body.images ?? images); setPhase("collected");
      window.dispatchEvent(new CustomEvent("eros-treasure-collected", { detail: { id: candidate.id, ownerNodeId: candidate.ownerNodeId } }));
    } catch { setError("宝物收录失败，请检查网络后再试。"); }
  }

  if (!open) return <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent("eros-floating-window-open", { detail: { window: "mephisto" } })); setOpen(true); }} aria-label="展开梅菲斯特宝物搜索"
    className="fixed left-2 top-[55%] z-[69] flex min-h-12 items-center gap-2 rounded-r-full border border-l-0 border-emerald-200/20 bg-[#0d1712]/95 py-2 pl-2 pr-4 text-sm text-emerald-100 shadow-2xl backdrop-blur-xl sm:left-0">
    <span className="grid h-8 w-8 place-items-center rounded-full border border-emerald-200/30 bg-emerald-100/10 font-serif text-lg">M</span><span>梅菲斯特</span>
  </button>;

  const working = phase === "searching" || phase === "generating";
  return <aside className="fixed bottom-2 left-2 right-2 top-16 z-[69] flex flex-col overflow-hidden rounded-2xl border border-emerald-100/15 bg-[#0b120f]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl md:bottom-3 md:left-3 md:right-auto md:top-20 md:w-[410px]" aria-label="梅菲斯特宝物窗口">
    <header className="flex shrink-0 items-center gap-3 border-b border-emerald-100/10 px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-200/25 bg-emerald-100/10 font-serif text-xl text-emerald-100">M</span>
      <div className="min-w-0 flex-1"><h2 className="font-serif text-lg text-emerald-50">梅菲斯特</h2><p className="text-[11px] tracking-[.12em] text-emerald-100/45">万千宝物的搜罗者</p></div>
      <button type="button" onClick={reset} disabled={working} className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-slate-400 disabled:opacity-30">重置</button>
      <button type="button" onClick={() => setOpen(false)} aria-label="收起梅菲斯特" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-xl text-slate-400">‹</button>
    </header>

    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
      <p className="rounded-2xl rounded-br-md border border-emerald-100/10 bg-white/[.045] p-3 text-sm leading-6 text-slate-200">{MEPHISTO_GREETING}</p>

      {!!search?.attempts.length && <section className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-xs font-semibold text-emerald-100">命运匹配</h3>
        <div className="mt-2 space-y-2">{search.attempts.map((attempt) => <div key={attempt.attempt} className="text-xs leading-5 text-slate-400">
          <div className="flex items-center justify-between"><span>第 {attempt.attempt} 次</span><code className="text-[10px] text-slate-600">{attempt.hashHex.slice(0, 12)}…</code></div>
          {attempt.matches.length ? <p className="text-emerald-300">匹配成功 · {attempt.matches.length} 个存在越过 40 bit</p> : <p>未越过阈值 · 最近的是 <Link className="text-cyan-300" href={`/nodes/${attempt.closest?.id}`}>{attempt.closest?.name ?? "无"}</Link>{attempt.closest ? `（${attempt.closest.score} bit）` : ""}</p>}
        </div>)}</div>
      </section>}

      {phase === "searching" && <p className="animate-pulse rounded-xl border border-emerald-100/10 p-3 text-sm text-emerald-100/60">正在把咒语和时间投入命运的骰盅……</p>}
      {phase === "generating" && <p className="animate-pulse rounded-xl border border-emerald-100/10 p-3 text-sm leading-6 text-emerald-100/60">匹配已完成，正在调用 FLUX.2 Klein 9B Preview 显现宝物。这可能需要一两分钟……</p>}

      {phase === "choosing" && search?.success && <section>
        <h3 className="text-sm font-semibold text-emerald-50">选择一条与咒语相合的命运</h3>
        <div className="mt-2 space-y-2">{search.matches.map((match) => <button type="button" key={match.id} onClick={() => void generate(match, search, spell.trim())} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-emerald-200/15 bg-emerald-100/5 px-3 text-left text-sm hover:bg-emerald-100/10"><span>{match.name}</span><span className="text-xs text-emerald-300">{match.score} bit</span></button>)}</div>
      </section>}
      {phase === "choosing" && search && !search.success && <p className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-sm leading-6 text-amber-100">三次戏法都未能越过 40 bit。换一句咒语，或让时间流逝片刻再试。</p>}

      {candidate && (phase === "candidate" || phase === "collected") && <section className="overflow-hidden rounded-2xl border border-emerald-100/15 bg-black/25">
        {(images[0]?.thumbnailUrl || images[0]?.imageUrl) && <img src={images[0].thumbnailUrl ?? images[0].imageUrl ?? ""} alt={candidate.name} width={512} height={320} className="h-auto w-full bg-black object-contain" />}
        <div className="p-4"><p className="text-xs text-emerald-300">{candidate.subjectGroup}</p><h3 className="mt-1 font-serif text-xl text-emerald-50">{candidate.name}</h3>
          <p className="mt-2 text-xs text-slate-500">持有存在 · <Link className="text-cyan-300" href={`/nodes/${candidate.ownerNodeId}`}>{candidate.ownerName}</Link> · 相合 {candidate.matchScore} bit</p>
          <details className="mt-3 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-xs text-emerald-200">查看 128-bit 与确定性特征</summary><p className="hash mt-2 break-all text-[10px] text-slate-600">{candidate.searchHashHex}</p><dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">{candidate.tokens.map((token) => <div key={token.position} className="contents"><dt className="text-slate-500">{token.familyZh}</dt><dd className="text-slate-300">{token.phraseZh}</dd></div>)}</dl></details>
          {phase === "candidate" ? <div className="mt-4"><input value={recorderName} onChange={(event) => setRecorderName(event.target.value)} maxLength={64} placeholder="记述人的名字（留空为匿名）" aria-label="记述人的名字" className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm outline-none focus:border-emerald-200/30"/><button type="button" onClick={() => void collect()} className="mt-2 min-h-11 w-full rounded-xl bg-emerald-100 px-4 text-sm font-semibold text-[#0b120f]">收录</button></div>
            : <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-200">已收入宝物图鉴 · <Link className="underline" href={`/treasures/${candidate.id}`}>打开详细记录</Link></div>}
        </div>
      </section>}
      {error && <p className="rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs leading-5 text-red-200">{error}</p>}
      <div ref={scrollEnd} />
    </div>

    <form onSubmit={cast} className="shrink-0 border-t border-emerald-100/10 bg-black/20 p-3">
      <textarea value={spell} onChange={(event) => setSpell(event.target.value)} maxLength={1000} rows={2} disabled={working} placeholder="告诉梅菲斯特你的咒语……" aria-label="宝物搜索咒语" className="max-h-28 min-h-16 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-slate-600 focus:border-emerald-200/30 disabled:opacity-50" />
      <button disabled={working || !spell.trim()} className="mt-2 min-h-11 w-full rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 text-sm font-semibold text-[#07110d] disabled:opacity-30">{working ? "戏法进行中……" : "搜罗宝物"}</button>
    </form>
  </aside>;
}
