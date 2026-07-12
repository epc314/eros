"use client";

import { useEffect, useMemo, useState } from "react";
import type { GraphNodeRecord } from "../graph/types";

interface Preview {
  result: {
    parentLowId: string; parentHighId: string; lowChoice: number; highChoice: number;
    selectionBits: number; segmentSwapMode: 0 | 1 | 2 | 3;
    chromosome0ParentId: string; chromosome1ParentId: string;
    baseGenomeHex: string; childGenomeHex: string; mutationMaskHex: string;
    flippedBitPositions: number[]; mutationBitCount: number; requestedMutationBits: number;
    similarity: { sameBitCount: number; hammingDistance: number; similarityRatio: number };
  };
  mutationStats: { changedTokenCount: number; beforeAfterTokens: Array<{ position: number; beforeTokenId: number; afterTokenId: number }> };
}

function ParentPicker({ slot, nodes, value, excludeId, onChange }: {
  slot: "A" | "B"; nodes: GraphNodeRecord[]; value: string; excludeId?: string; onChange: (id: string) => void;
}) {
  const selected = nodes.find((node) => node.id === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (selected) setQuery(selected.name);
    else if (!value && !open) setQuery("");
  }, [open, selected, value]);
  const options = useMemo(() => {
    const prefix = query.normalize("NFKC").trim().toLowerCase();
    return nodes.filter((node) => node.id !== excludeId && (!prefix || node.name.normalize("NFKC").toLowerCase().startsWith(prefix) || node.genomeHex.startsWith(prefix))).slice(0, 8);
  }, [excludeId, nodes, query]);
  function choose(node: GraphNodeRecord) { onChange(node.id); setQuery(node.name); setOpen(false); }
  return <label className="relative block text-sm text-slate-300">存在 {slot}
    <input aria-label={`存在 ${slot}`} role="combobox" aria-expanded={open} aria-controls={`parent-${slot}-options`} autoComplete="off" value={query} placeholder="选择" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 100)} onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter" && open && options[0]) { event.preventDefault(); choose(options[0]); } else if (event.key === "Escape") setOpen(false); }} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 pr-10 outline-none focus:border-cyan-400" />
    {value && <button type="button" aria-label={`清除存在 ${slot}`} onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2 top-7 grid h-9 w-9 place-items-center text-slate-500 hover:text-white">×</button>}
    <span className="mt-1 block text-[10px] text-slate-600">输入名称或 Hash 前缀搜索</span>
    {open && <div id={`parent-${slot}-options`} role="listbox" className="absolute inset-x-0 top-[4.6rem] z-20 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-1 shadow-2xl">{options.length ? options.map((node) => <button key={node.id} type="button" role="option" aria-selected={node.id === value} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(node)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10"><span className="truncate text-sm text-slate-200">{node.name}</span><span className="hash shrink-0 text-[10px] text-slate-600">{node.genomeHex.slice(0, 12)}</span></button>) : <p className="px-3 py-2 text-xs text-slate-500">没有匹配的存在</p>}</div>}
  </label>;
}

export function ReproductionPanel({ nodes, parentIds, setParentIds, onCreated, mobileOpen = false, onMobileClose }: {
  nodes: GraphNodeRecord[];
  parentIds: [string, string];
  setParentIds: (value: [string, string]) => void;
  onCreated: (id: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [mode, setMode] = useState<"descendant" | "genesis">("descendant");
  const [name, setName] = useState("");
  const [genesisName, setGenesisName] = useState("");
  const [birthDescription, setBirthDescription] = useState("");
  const [genesisDescription, setGenesisDescription] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPreview(null); setError("");
    if (!parentIds[0] || !parentIds[1] || parentIds[0] === parentIds[1] || !name.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/reproduce/preview", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentAId: parentIds[0], parentBId: parentIds[1], name }), signal: controller.signal });
      const body = await response.json() as Preview & { error?: { message?: string } };
      if (response.ok) setPreview(body); else setError(body.error?.message ?? "无法预览");
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [parentIds, name]);

  function resetDescendantForm() {
    setParentIds(["", ""]); setName(""); setBirthDescription("");
    setPreview(null); setError("");
  }

  function resetGenesisForm() {
    setGenesisName(""); setGenesisDescription(""); setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/reproduce", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentAId: parentIds[0], parentBId: parentIds[1], name, description: birthDescription }) });
      const body = await response.json() as { node: { id: string }; result: Preview["result"]; mutationStats: Preview["mutationStats"]; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "创建失败");
      resetDescendantForm();
      onCreated(body.node.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败"); }
    finally { setBusy(false); }
  }

  async function submitGenesis(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/nodes/genesis", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: genesisName, description: genesisDescription }) });
      const body = await response.json() as { node: { id: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "创世存在创建失败");
      resetGenesisForm();
      onCreated(body.node.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创世存在创建失败"); }
    finally { setBusy(false); }
  }

  const short = (id: string) => nodes.find((node) => node.id === id)?.genomeHex.slice(0, 10) ?? "—";
  const nodeName = (id: string) => nodes.find((node) => node.id === id)?.name ?? `${id.slice(0, 6)}…`;
  const shown = preview;
  const liveNodes = nodes.filter((node) => !node.isDead);
  const segmentModeLabels = ["保持原状", "c11′ ↔ c01", "c11′ ↔ c11", "c01 ↔ c01′"] as const;
  return <aside className={`${mobileOpen ? "flex" : "hidden"} glass fixed inset-x-2 bottom-[max(.5rem,env(safe-area-inset-bottom))] top-16 z-30 min-h-0 flex-col overflow-hidden rounded-3xl shadow-2xl md:static md:flex md:max-h-[calc(100vh-5rem)] md:w-[390px] md:shrink-0 md:shadow-none`}>
    <div className="border-b border-white/10 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.2em] text-fuchsia-300 sm:tracking-[.24em]">{mode === "descendant" ? "Create a descendant" : "Create a genesis root"}</p><h2 className="mt-1 text-xl font-semibold">{mode === "descendant" ? "繁衍新存在" : "创建创世存在"}</h2></div>{onMobileClose && <button type="button" onClick={onMobileClose} aria-label="关闭创建面板" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-xl md:hidden">×</button>}</div>
      <div className="mt-4 grid grid-cols-2 rounded-xl bg-black/25 p-1 text-sm"><button type="button" onClick={() => { setMode("descendant"); setError(""); }} className={`rounded-lg px-3 py-2 ${mode === "descendant" ? "bg-white/10 text-white" : "text-slate-500"}`}>繁衍</button><button type="button" onClick={() => { setMode("genesis"); setError(""); }} className={`rounded-lg px-3 py-2 ${mode === "genesis" ? "bg-white/10 text-cyan-200" : "text-slate-500"}`}>创世</button></div>
    </div>
    <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
      {mode === "genesis" ? <form onSubmit={submitGenesis} className="space-y-4">
        <p className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs leading-5 text-slate-400">创建一个没有亲本的 Generation 0 根存在。其 Hash 使用这个世界永久保存的创世时间戳计算；不会替换或改写已有七个初始存在。</p>
        <label className="block text-sm text-slate-300">创世存在名称
          <input aria-label="创世存在名称" value={genesisName} onChange={(event) => setGenesisName(event.target.value)} maxLength={128} required placeholder="输入不可修改的名称" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-cyan-400" />
        </label>
        <label className="block text-sm text-slate-300">诞生记述 <span className="text-xs text-slate-600">· 可留空</span>
          <textarea aria-label="创世诞生记述" value={genesisDescription} onChange={(event) => setGenesisDescription(event.target.value)} maxLength={500} placeholder="留空时自动记录" className="mt-1 h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm outline-none focus:border-cyan-400" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy || !genesisName.trim()} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? "正在创建…" : "创建创世存在"}</button>
      </form> : <>
      <form onSubmit={submit} className="space-y-4">
        <ParentPicker slot="A" nodes={liveNodes} value={parentIds[0]} excludeId={parentIds[1]} onChange={(id) => setParentIds([id, parentIds[1]])} />
        <button type="button" onClick={() => setParentIds([parentIds[1], parentIds[0]])} className="w-full text-xs text-slate-400 hover:text-white">⇅ 交换视觉选择顺序（结果不变）</button>
        <ParentPicker slot="B" nodes={liveNodes} value={parentIds[1]} excludeId={parentIds[0]} onChange={(id) => setParentIds([parentIds[0], id])} />
        <label className="block text-sm text-slate-300">新存在名称
          <input aria-label="新存在名称" value={name} onChange={(event) => setName(event.target.value)} maxLength={128} required placeholder="输入不可修改的名称" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-cyan-400" />
        </label>
        <label className="block text-sm text-slate-300">诞生记述 <span className="text-xs text-slate-600">· 可留空</span>
          <textarea aria-label="繁衍诞生记述" value={birthDescription} onChange={(event) => setBirthDescription(event.target.value)} maxLength={500} placeholder="留空时自动记录" className="mt-1 h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm outline-none focus:border-fuchsia-400" />
        </label>
        {parentIds[0] && parentIds[1] && <div className="grid grid-cols-2 gap-2 text-xs text-slate-500"><span className="hash">A {short(parentIds[0])}</span><span className="hash">B {short(parentIds[1])}</span></div>}
        {preview && <div data-testid="similarity-preview" className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm">
          <div className="flex justify-between"><span>Hamming 相似度</span><b>{(preview.result.similarity.similarityRatio * 100).toFixed(2)}%</b></div>
          <div className="mt-2 flex justify-between"><span>预计 bit 翻转</span><b>{preview.result.mutationBitCount}</b></div>
        </div>}
        <p className="text-xs leading-5 text-slate-500">亲缘不稳定度是一种艺术化数字演化机制，并非现实遗传学模型。</p>
        {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy || !preview} className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? "正在创建…" : "创建不可变存在"}</button>
      </form>
      {shown && <section className="mt-6 space-y-3 border-t border-white/10 pt-5 text-xs">
        <h3 className="text-base font-semibold">确定性预览</h3>
        <dl className="grid grid-cols-2 gap-2 text-slate-400"><dt>规范化亲本</dt><dd className="text-right">{shown.result.parentLowId.slice(0, 6)}… / {shown.result.parentHighId.slice(0, 6)}…</dd><dt>主体段来源</dt><dd className="text-right text-cyan-300">{nodeName(shown.result.chromosome0ParentId)} · c00</dd><dt>C1 前段来源</dt><dd className="text-right text-fuchsia-300">{nodeName(shown.result.chromosome1ParentId)} · c10′</dd><dt>Hash 最后三位</dt><dd className="hash text-right">{shown.result.selectionBits.toString(2).padStart(3, "0")}</dd><dt>片段交换</dt><dd className="text-right">{shown.result.segmentSwapMode.toString(2).padStart(2, "0")} · {segmentModeLabels[shown.result.segmentSwapMode]}</dd><dt>相同 bit</dt><dd className="text-right">{shown.result.similarity.sameBitCount}</dd><dt>Hamming 距离</dt><dd className="text-right">{shown.result.similarity.hammingDistance}</dd><dt>突变预算</dt><dd className="text-right">{shown.result.requestedMutationBits} / {shown.result.mutationBitCount}</dd><dt>改变 Token</dt><dd className="text-right">{shown.mutationStats.changedTokenCount}</dd></dl>
        <details><summary className="cursor-pointer text-cyan-300">查看完整遗传计算</summary><div className="mt-3 space-y-3 text-slate-400"><p>基础基因组</p><p className="hash">{shown.result.baseGenomeHex}</p><p>翻转位置</p><p className="hash">{shown.result.flippedBitPositions.join(", ")}</p><p>突变掩码</p><p className="hash">{shown.result.mutationMaskHex}</p><p>最终 Hash</p><p className="hash text-white">{shown.result.childGenomeHex}</p>{shown.mutationStats.beforeAfterTokens.map((change) => <p key={change.position}>Token {change.position}: {change.beforeTokenId} → {change.afterTokenId}</p>)}</div></details>
      </section>}
      </>}
    </div>
  </aside>;
}
