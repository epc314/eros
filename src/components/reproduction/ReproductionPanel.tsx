"use client";

import { useEffect, useState } from "react";
import type { GraphNodeRecord } from "../graph/types";

interface Preview {
  result: {
    parentLowId: string; parentHighId: string; lowChoice: number; highChoice: number;
    chromosome0ParentId: string; chromosome1ParentId: string;
    baseGenomeHex: string; childGenomeHex: string; mutationMaskHex: string;
    flippedBitPositions: number[]; mutationBitCount: number; requestedMutationBits: number;
    similarity: { sameBitCount: number; hammingDistance: number; similarityRatio: number };
  };
  mutationStats: { changedTokenCount: number; beforeAfterTokens: Array<{ position: number; beforeTokenId: number; afterTokenId: number }> };
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
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Preview | null>(null);
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

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/reproduce", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentAId: parentIds[0], parentBId: parentIds[1], name }) });
      const body = await response.json() as { node: { id: string }; result: Preview["result"]; mutationStats: Preview["mutationStats"]; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "创建失败");
      setResult({ result: body.result, mutationStats: body.mutationStats });
      onCreated(body.node.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败"); }
    finally { setBusy(false); }
  }

  async function submitGenesis(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/nodes/genesis", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: genesisName }) });
      const body = await response.json() as { node: { id: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "创世节点创建失败");
      setGenesisName("");
      onCreated(body.node.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创世节点创建失败"); }
    finally { setBusy(false); }
  }

  const short = (id: string) => nodes.find((node) => node.id === id)?.genomeHex.slice(0, 10) ?? "—";
  const nodeName = (id: string) => nodes.find((node) => node.id === id)?.name ?? `${id.slice(0, 6)}…`;
  const shown = result ?? preview;
  return <aside className={`${mobileOpen ? "flex" : "hidden"} glass fixed inset-x-2 bottom-[max(.5rem,env(safe-area-inset-bottom))] top-16 z-30 min-h-0 flex-col overflow-hidden rounded-3xl shadow-2xl md:static md:flex md:max-h-[calc(100vh-5rem)] md:w-[390px] md:shrink-0 md:shadow-none`}>
    <div className="border-b border-white/10 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.2em] text-fuchsia-300 sm:tracking-[.24em]">{mode === "descendant" ? "Create a descendant" : "Create a genesis root"}</p><h2 className="mt-1 text-xl font-semibold">{mode === "descendant" ? "繁衍新节点" : "创建创世节点"}</h2></div>{onMobileClose && <button type="button" onClick={onMobileClose} aria-label="关闭创建面板" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-xl md:hidden">×</button>}</div>
      <div className="mt-4 grid grid-cols-2 rounded-xl bg-black/25 p-1 text-sm"><button type="button" onClick={() => { setMode("descendant"); setError(""); }} className={`rounded-lg px-3 py-2 ${mode === "descendant" ? "bg-white/10 text-white" : "text-slate-500"}`}>繁衍</button><button type="button" onClick={() => { setMode("genesis"); setError(""); }} className={`rounded-lg px-3 py-2 ${mode === "genesis" ? "bg-white/10 text-cyan-200" : "text-slate-500"}`}>创世</button></div>
    </div>
    <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
      {mode === "genesis" ? <form onSubmit={submitGenesis} className="space-y-4">
        <p className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs leading-5 text-slate-400">创建一个没有亲本的 Generation 0 根节点。其 Hash 使用这个世界永久保存的创世时间戳计算；不会替换或改写已有七个初始节点。</p>
        <label className="block text-sm text-slate-300">创世节点名称
          <input aria-label="创世节点名称" value={genesisName} onChange={(event) => setGenesisName(event.target.value)} maxLength={128} required placeholder="输入不可修改的名称" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-cyan-400" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy || !genesisName.trim()} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? "正在创建…" : "创建创世节点"}</button>
      </form> : <>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300">节点 A
          <select aria-label="节点 A" value={parentIds[0]} onChange={(event) => setParentIds([event.target.value, parentIds[1]])} required className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3">
            <option value="">选择节点</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.name} · {node.genomeHex.slice(0, 8)}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setParentIds([parentIds[1], parentIds[0]])} className="w-full text-xs text-slate-400 hover:text-white">⇅ 交换视觉选择顺序（结果不变）</button>
        <label className="block text-sm text-slate-300">节点 B
          <select aria-label="节点 B" value={parentIds[1]} onChange={(event) => setParentIds([parentIds[0], event.target.value])} required className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3">
            <option value="">选择节点</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.name} · {node.genomeHex.slice(0, 8)}</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-300">新节点名称
          <input aria-label="新节点名称" value={name} onChange={(event) => { setName(event.target.value); setResult(null); }} maxLength={128} required placeholder="输入不可修改的名称" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-cyan-400" />
        </label>
        {parentIds[0] && parentIds[1] && <div className="grid grid-cols-2 gap-2 text-xs text-slate-500"><span className="hash">A {short(parentIds[0])}</span><span className="hash">B {short(parentIds[1])}</span></div>}
        {preview && <div data-testid="similarity-preview" className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm">
          <div className="flex justify-between"><span>Hamming 相似度</span><b>{(preview.result.similarity.similarityRatio * 100).toFixed(2)}%</b></div>
          <div className="mt-2 flex justify-between"><span>预计 bit 翻转</span><b>{preview.result.mutationBitCount}</b></div>
        </div>}
        <p className="text-xs leading-5 text-slate-500">亲缘不稳定度是一种艺术化数字演化机制，并非现实遗传学模型。</p>
        {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy || !preview} className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? "正在创建…" : "创建不可变节点"}</button>
      </form>
      {shown && <section className="mt-6 space-y-3 border-t border-white/10 pt-5 text-xs">
        <h3 className="text-base font-semibold">{result ? "繁衍结果" : "确定性预览"}</h3>
        <dl className="grid grid-cols-2 gap-2 text-slate-400"><dt>规范化亲本</dt><dd className="text-right">{shown.result.parentLowId.slice(0, 6)}… / {shown.result.parentHighId.slice(0, 6)}…</dd><dt>Chromosome 0 来源</dt><dd className="text-right text-cyan-300">{nodeName(shown.result.chromosome0ParentId)} · C0</dd><dt>Chromosome 1 来源</dt><dd className="text-right text-fuchsia-300">{nodeName(shown.result.chromosome1ParentId)} · C1</dd><dt>亲本选择编号</dt><dd className="text-right">{shown.result.lowChoice} / {shown.result.highChoice}</dd><dt>相同 bit</dt><dd className="text-right">{shown.result.similarity.sameBitCount}</dd><dt>Hamming 距离</dt><dd className="text-right">{shown.result.similarity.hammingDistance}</dd><dt>突变预算</dt><dd className="text-right">{shown.result.requestedMutationBits} / {shown.result.mutationBitCount}</dd><dt>改变 Token</dt><dd className="text-right">{shown.mutationStats.changedTokenCount}</dd></dl>
        <details><summary className="cursor-pointer text-cyan-300">查看完整遗传计算</summary><div className="mt-3 space-y-3 text-slate-400"><p>基础基因组</p><p className="hash">{shown.result.baseGenomeHex}</p><p>翻转位置</p><p className="hash">{shown.result.flippedBitPositions.join(", ")}</p><p>突变掩码</p><p className="hash">{shown.result.mutationMaskHex}</p><p>最终 Hash</p><p className="hash text-white">{shown.result.childGenomeHex}</p>{shown.mutationStats.beforeAfterTokens.map((change) => <p key={change.position}>Token {change.position}: {change.beforeTokenId} → {change.afterTokenId}</p>)}</div></details>
      </section>}
      </>}
    </div>
  </aside>;
}
