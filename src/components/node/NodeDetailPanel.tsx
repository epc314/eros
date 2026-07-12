"use client";
/* eslint-disable @next/next/no-img-element -- local provider images are runtime data URLs */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface DetailToken {
  position: number;
  tokenHex: string;
  kind: "entity-anchor" | "entity-form" | "entity-descriptor";
  role?: "primary" | "auxiliary";
  entity?: string;
  entityZh?: string;
  baseEntity?: string;
  baseEntityZh?: string;
  speciesId?: number;
  speciesGroup?: "natural-life" | "natural-nonliving" | "fantasy";
  speciesGroupLabel?: string;
  speciesGroupLabelZh?: string;
  form?: string;
  formZh?: string;
  bearing?: string;
  bearingZh?: string;
  scale?: string;
  scaleZh?: string;
  regalia?: string;
  regaliaZh?: string;
  family?: string;
  familyZh?: string;
  descriptorA?: string;
  descriptorAZh?: string;
  descriptorB?: string;
  descriptorBZh?: string;
  phrase: string;
  phraseZh: string;
  mutated: boolean;
}

type RecordKind = "BIRTH" | "STORY" | "DEATH" | "REVIVAL";

interface Detail {
  node: { id: string; name: string; genomeHex: string; chromosome0Hex: string; chromosome1Hex: string; protocolVersion: string; promptVersion: string; type: string; generation: number; isDead: boolean; recordsLocked: boolean; createdAt: string };
  parents: Array<{ id: string; name: string }>;
  children: Array<{ id: string; name: string }>;
  reproduction?: { sameBitCount: number; hammingDistance: number; similarityRatio: number; mutationBitCount: number; segmentSwapMode: number; flippedBitPositionsJson: string } | null;
  tokens: DetailToken[];
  prompt: string;
  images: Array<{ id: string; imageDataUrl?: string; imageUrl?: string; thumbnailUrl?: string; status: string; provider: string; providerModel?: string; variationId?: string; width?: number; height?: number; createdAt: string }>;
  descriptions: Array<{ id: string; body: string; authorLabel?: string; kind: RecordKind; createdAt: string; trueCount: number; falseCount: number }>;
}

interface InitialExistence {
  id: string; name: string; type: string; generation: number; isDead: boolean;
  images: Array<{ imageUrl?: string | null; thumbnailUrl?: string | null }>;
}

const detailCache = new Map<string, Detail>();
const detailRequests = new Map<string, Promise<Detail>>();

function requestDetail(nodeId: string, force = false): Promise<Detail> {
  if (!force && detailCache.has(nodeId)) return Promise.resolve(detailCache.get(nodeId)!);
  if (!force && detailRequests.has(nodeId)) return detailRequests.get(nodeId)!;
  const request = fetch(`/api/nodes/${nodeId}`).then((response) => response.json() as Promise<Detail>).then((loaded) => {
    if (loaded.node) detailCache.set(nodeId, loaded);
    detailRequests.delete(nodeId);
    return loaded;
  }).catch((error) => { detailRequests.delete(nodeId); throw error; });
  detailRequests.set(nodeId, request);
  return request;
}

export function prefetchExistenceDetail(nodeId: string): void { void requestDetail(nodeId); }

const recordLabels: Record<RecordKind, string> = { BIRTH: "诞生", STORY: "记述", DEATH: "死亡", REVIVAL: "复活" };
const recordColors: Record<RecordKind, string> = {
  BIRTH: "border-cyan-400/30 text-cyan-200", STORY: "border-white/15 text-slate-300",
  DEATH: "border-red-400/30 text-red-300", REVIVAL: "border-emerald-400/30 text-emerald-300",
};

function DescriptionRecord({ item, onVote }: { item: Detail["descriptions"][number]; onVote: (id: string, isTrue: boolean) => void }) {
  const disputed = item.falseCount > item.trueCount;
  const content = <>
    <div className="flex items-center justify-between gap-3"><span className={`rounded-full border px-2 py-1 text-[10px] ${recordColors[item.kind]}`}>{recordLabels[item.kind]}</span><span className="text-[10px] text-slate-600">不可修改 · 不可删除</span></div>
    <p className="mt-3 whitespace-pre-wrap leading-6">{item.body}</p>
    <p className="mt-2 text-xs text-slate-500">{item.authorLabel || "匿名记录者"} · {new Date(item.createdAt).toLocaleString()}</p>
    <div className="mt-3 flex gap-2 text-xs"><button type="button" onClick={() => onVote(item.id, true)} className="min-h-9 rounded-lg border border-emerald-400/20 px-3 text-emerald-300">真实 · {item.trueCount}</button><button type="button" onClick={() => onVote(item.id, false)} className="min-h-9 rounded-lg border border-red-400/20 px-3 text-red-300">虚假 · {item.falseCount}</button></div>
  </>;
  if (disputed) return <details className="rounded-xl border border-slate-600/30 bg-slate-950/40 p-3 text-sm"><summary className="cursor-pointer text-xs text-slate-400">该记述因“虚假”评价更多而折叠 · 展开查看</summary><div className="mt-3 border-t border-white/5 pt-3">{content}</div></details>;
  return <article className="rounded-xl border border-white/10 p-3 text-sm">{content}</article>;
}

function EntityTokenCard({ token }: { token: DetailToken }) {
  const primary = token.role === "primary";
  return <article data-token-role={token.role} className={`rounded-2xl border p-4 ${primary ? "border-cyan-400/50 bg-cyan-400/5" : "border-fuchsia-400/40 bg-fuchsia-400/5"}`}>
    <div className="flex justify-between text-xs text-slate-500"><span>#{token.position} · {primary ? "主体实体" : "辅助实体"}</span><span className="hash">{token.tokenHex}</span></div>
    <div className="mt-3"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">{primary ? "Primary entity" : "Auxiliary entity"}</p><p className="mt-1 text-lg font-semibold text-slate-100">{token.entityZh}</p><p className="text-xs text-slate-500">{token.entity}</p></div>
    {(token.form || token.bearing) && <div className="mt-3 rounded-xl bg-black/20 p-3 text-xs">{primary && token.speciesId !== undefined ? <><p className="text-slate-300">{token.speciesGroupLabelZh ?? "明确实体"} · 编号 #{token.speciesId}</p><p className="mt-1 text-slate-600">{token.speciesGroupLabel ?? "8-bit explicit entity"}</p></> : <><p className="text-slate-300">基础 {token.baseEntityZh} · {primary ? "形态" : "显现"} {token.formZh}</p><p className="mt-1 text-slate-600">{token.baseEntity} · {token.form}</p></>}<p className="mt-2 leading-5 text-slate-400">{primary ? "气质" : "律动"} {token.bearingZh} · {primary ? "尺度" : "范围"} {token.scaleZh} · {primary ? "装束" : "性质"} {token.regaliaZh}</p></div>}
    <div className="mt-4 border-t border-white/10 pt-3"><p className="text-[10px] uppercase tracking-[.16em] text-slate-500">锚点附带特征 · Anchor traits</p><p className="mt-2 text-sm text-slate-300">{token.familyZh} <span className="text-xs text-slate-600">/ {token.family}</span></p><p className="mt-1 text-xs text-slate-400">{token.descriptorAZh} / {token.descriptorBZh}</p><p className="mt-1 text-[11px] text-slate-600">{token.descriptorA} / {token.descriptorB}</p></div>
  </article>;
}

function DescriptorTokenCard({ token }: { token: DetailToken }) {
  return <article className={`rounded-xl border p-3 text-xs ${token.mutated ? "border-amber-400/50 bg-amber-400/5" : "border-white/10"}`}>
    <div className="flex justify-between text-slate-500"><span>#{token.position} · 特征</span><span className="hash">{token.tokenHex}</span></div>
    <p className="mt-2 text-sm leading-5 text-slate-200">{token.phraseZh}</p><p className="mt-1 leading-5 text-slate-500">{token.phrase}</p>
  </article>;
}

export function NodeDetailPanel({ nodeId, initialNode, onClose, onSelectParent, onNodeChanged, standalone = false }: {
  nodeId: string; initialNode?: InitialExistence; onClose?: () => void; onSelectParent?: (id: string) => void; onNodeChanged?: () => void; standalone?: boolean;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [body, setBody] = useState("");
  const [authorLabel, setAuthorLabel] = useState("");
  const [lifeBody, setLifeBody] = useState("");
  const [lifeBusy, setLifeBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async (force = false) => setDetail(await requestDetail(nodeId, force)), [nodeId]);
  useEffect(() => { setDetail(detailCache.get(nodeId) ?? null); void load(); }, [load, nodeId]);

  async function addDescription(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`/api/nodes/${nodeId}/descriptions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, ...(authorLabel ? { authorLabel } : {}) }) });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) return setMessage(result.error?.message ?? "提交失败");
    setBody(""); setAuthorLabel(""); setMessage("记述已追加且永久保存，不会改变该存在的基因与图片 Prompt。"); void load(true); onNodeChanged?.();
  }

  async function changeLifeStatus(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setLifeBusy(true); setMessage("");
    const action = detail.node.isDead ? "revive" : "die";
    const response = await fetch(`/api/nodes/${nodeId}/life`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, description: lifeBody }) });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) setMessage(result.error?.message ?? "状态更新失败");
    else { setLifeBody(""); setMessage(action === "die" ? "死亡已确认，该存在不能再参与繁衍。" : "复活已确认，该存在可以再次参与繁衍。"); await load(true); onNodeChanged?.(); }
    setLifeBusy(false);
  }

  async function vote(descriptionId: string, isTrue: boolean) {
    let voterKey = window.localStorage.getItem("eros-anonymous-voter");
    if (!voterKey) { voterKey = crypto.randomUUID(); window.localStorage.setItem("eros-anonymous-voter", voterKey); }
    const response = await fetch(`/api/descriptions/${descriptionId}/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ voterKey, isTrue }) });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) setMessage(result.error?.message ?? "评价提交失败");
    else await load(true);
  }

  async function addImage() {
    setMessage("正在用 FLUX.2 Klein 9B Preview 生成新的视觉解释…");
    const response = await fetch(`/api/nodes/${nodeId}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const result = await response.json() as { error?: { message?: string } };
    setMessage(response.ok ? "新的视觉解释已生成，存在 Hash 保持不变。" : result.error?.message ?? "图片生成失败");
    if (response.ok) void load(true);
  }

  if (!detail?.node) return <aside className={`${standalone ? "rounded-2xl sm:rounded-3xl" : "fixed inset-x-0 bottom-0 top-14 z-40 w-full border-t md:inset-y-16 md:left-auto md:right-0 md:max-w-xl md:border-l md:border-t-0"} glass overflow-y-auto p-4 shadow-2xl sm:p-6`}>
    {initialNode ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-cyan-300">{initialNode.type === "GENESIS" ? "Genesis root" : `Generation ${initialNode.generation}`}</p><h1 className="mt-1 text-2xl font-semibold">{initialNode.name}</h1></div>{onClose && <button onClick={onClose} aria-label="关闭" className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-xl">×</button>}</div>{(initialNode.images[0]?.thumbnailUrl || initialNode.images[0]?.imageUrl) && <img src={initialNode.images[0].thumbnailUrl ?? initialNode.images[0].imageUrl ?? ""} alt={`${initialNode.name} 的视觉解释`} width={512} height={320} decoding="async" className={`mt-6 w-full rounded-2xl border border-white/10 bg-black object-contain ${initialNode.isDead ? "grayscale" : ""}`} />}<p className="mt-5 animate-pulse text-center text-sm text-slate-500">正在载入记述与详细信息…</p></> : <div className="grid min-h-72 place-items-center text-slate-400">正在载入存在…</div>}
  </aside>;
  const { node } = detail;
  const entityTokens = detail.tokens.filter((token) => token.kind === "entity-anchor");
  const pairedEntities = detail.tokens.some((token) => token.kind === "entity-form");
  const descriptorTokens = detail.tokens.filter((token) => token.kind === "entity-descriptor");
  const seenDescriptorFamilies = new Set<string>();
  const visibleDescriptorTokens = descriptorTokens.filter((token) => {
    if (!token.family || seenDescriptorFamilies.has(token.family)) return false;
    seenDescriptorFamilies.add(token.family);
    return true;
  });
  const completedImages = detail.images.filter((image) => image.status === "COMPLETED");
  const primaryImage = completedImages[0];
  const recordSection = <section className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4 sm:mt-7">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">记述 · {detail.descriptions.length}</h2><p className="mt-1 text-xs text-slate-500">用户对存在故事的追加记录；一经提交，不可修改或删除。</p></div><span className={`rounded-full border px-3 py-1 text-xs ${node.isDead ? "border-slate-500/40 text-slate-300" : "border-emerald-400/30 text-emerald-300"}`}>{node.isDead ? "死亡" : "存活"}</span></div>
    {node.recordsLocked ? <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">该存在的故事已永久封存：不能追加记述、复活或参与繁衍。</p> : <>
      <form onSubmit={addDescription} className="mt-4 space-y-2"><textarea aria-label="记述" required maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} placeholder="为这个实体追加纯文本记述" className="h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><input aria-label="署名" maxLength={64} value={authorLabel} onChange={(event) => setAuthorLabel(event.target.value)} placeholder="可选署名" className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><button className="min-h-11 w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 sm:w-auto">追加记述</button></form>
      <form onSubmit={changeLifeStatus} className={`mt-4 rounded-xl border p-3 ${node.isDead ? "border-white/15 bg-white/[.03]" : "border-red-400/20 bg-red-400/5"}`}><label className="text-xs text-slate-400">{node.isDead ? "复活记述（必填）" : "死亡记述（必填）"}<textarea aria-label={node.isDead ? "复活记述" : "死亡记述"} required maxLength={500} value={lifeBody} onChange={(event) => setLifeBody(event.target.value)} placeholder={node.isDead ? "记录该存在如何重新回到世界" : "记录该存在如何离开世界"} className="mt-2 h-20 w-full resize-none rounded-lg border border-white/10 bg-slate-950 p-3 text-sm" /></label><button disabled={lifeBusy || !lifeBody.trim()} className={`mt-2 min-h-11 w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 ${node.isDead ? "bg-white text-slate-950" : "bg-red-600 text-white"}`}>{lifeBusy ? "正在确认…" : node.isDead ? "确认复活" : "确认死亡"}</button></form>
    </>}
    {message && <p className="mt-3 text-xs leading-5 text-cyan-300">{message}</p>}
    <div className="mt-4 space-y-2">{detail.descriptions.map((item) => <DescriptionRecord key={item.id} item={item} onVote={vote} />)}</div>
  </section>;
  return <aside className={`${standalone ? "rounded-2xl sm:rounded-3xl" : "fixed inset-x-0 bottom-0 top-14 z-40 w-full border-t md:inset-y-16 md:left-auto md:right-0 md:max-w-xl md:border-l md:border-t-0"} glass overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:p-6`} data-testid="node-detail">
    <div className="flex items-start justify-between gap-3 sm:gap-4"><div className="min-w-0"><p className="text-[11px] uppercase tracking-[.16em] text-cyan-300 sm:text-xs sm:tracking-[.22em]">{node.type === "GENESIS" ? "Genesis root" : `Generation ${node.generation}`} · {node.protocolVersion}</p><h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">{node.name}</h1><p className="mt-1 text-xs text-slate-500">名称与身份不可修改 · {new Date(node.createdAt).toLocaleString()}</p></div>{onClose && <button onClick={onClose} aria-label="关闭" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-xl">×</button>}</div>
    {node.type === "DESCENDANT" && node.protocolVersion === "eros-v1" && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">旧版 eros-v1 存在：染色体可能在子代中换位，因此主体槽可能由亲本辅助槽重新解释。该历史记录保持不可变；新繁衍使用分段重组的 eros-v3。</p>}
    <div className="mt-5 flex flex-wrap gap-2">{onSelectParent && <button disabled={node.isDead} onClick={() => onSelectParent(node.id)} className="min-h-11 flex-1 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-medium disabled:bg-slate-700 disabled:text-slate-400 sm:flex-none">{node.isDead ? "死亡存在不可作为亲本" : "选择为亲本"}</button>} {!standalone && <Link href={`/nodes/${node.id}`} className="grid min-h-11 flex-1 place-items-center rounded-xl border border-white/10 px-4 py-2 text-center text-sm sm:flex-none">打开完整页面</Link>}</div>
    {primaryImage && <figure className="mt-6"><img src={primaryImage.thumbnailUrl ?? primaryImage.imageDataUrl ?? primaryImage.imageUrl} alt={`${node.name} 的视觉解释`} width={512} height={320} decoding="async" className={`mx-auto h-auto max-h-[70vh] max-w-full rounded-2xl border border-white/10 bg-black object-contain ${node.isDead ? "grayscale" : ""}`}/><figcaption className="mt-2 text-center text-[10px] text-slate-500">{primaryImage.providerModel ?? primaryImage.provider} · {primaryImage.width && primaryImage.height ? `${primaryImage.width}×${primaryImage.height}` : "原始尺寸"}{primaryImage.imageUrl && <a href={primaryImage.imageUrl} target="_blank" rel="noreferrer" className="ml-2 text-cyan-300">查看原图</a>}</figcaption></figure>}
    {recordSection}
    <section className="mt-7"><h2 className="font-semibold">不可变身份</h2><p className="mt-3 text-xs text-slate-500">512-bit Hash</p><p data-testid="full-hash" className="hash mt-1 rounded-xl bg-black/25 p-3 text-xs">{node.genomeHex}</p><details className="mt-3"><summary className="cursor-pointer text-sm text-cyan-300">两条 256-bit 染色体</summary><p className="hash mt-2 text-xs text-slate-400">0 · {node.chromosome0Hex}</p><p className="hash mt-2 text-xs text-slate-400">1 · {node.chromosome1Hex}</p></details></section>
    <section className="mt-7 grid grid-cols-2 gap-4"><div><h2 className="font-semibold">亲本</h2>{detail.parents.length ? detail.parents.map((item) => <Link className="mt-2 block text-sm text-cyan-300" key={item.id} href={`/nodes/${item.id}`}>{item.name}</Link>) : <p className="mt-2 text-sm text-slate-500">创世存在无入边</p>}</div><div><h2 className="font-semibold">子代</h2>{detail.children.map((item) => <Link className="mt-2 block text-sm text-fuchsia-300" key={item.id} href={`/nodes/${item.id}`}>{item.name}</Link>)}{!detail.children.length && <p className="mt-2 text-sm text-slate-500">尚无</p>}</div></section>
    {detail.reproduction && <section className="mt-7 rounded-2xl border border-white/10 p-4"><h2 className="font-semibold">亲缘不稳定度</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-400">{node.protocolVersion === "eros-v3" && <><dt>片段交换模式</dt><dd>{detail.reproduction.segmentSwapMode.toString(2).padStart(2, "0")}</dd></>}<dt>相似度</dt><dd>{(detail.reproduction.similarityRatio * 100).toFixed(2)}%</dd><dt>相同 bit</dt><dd>{detail.reproduction.sameBitCount}</dd><dt>Hamming 距离</dt><dd>{detail.reproduction.hammingDistance}</dd><dt>实际翻转</dt><dd>{detail.reproduction.mutationBitCount}</dd></dl><details className="mt-3"><summary className="cursor-pointer text-xs text-cyan-300">bit 翻转位置</summary><p data-testid="flipped-positions" className="hash mt-2 text-xs text-slate-400">{JSON.parse(detail.reproduction.flippedBitPositionsJson).join(", ")}</p></details></section>}
    <section className="mt-7"><div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold">实体设定 · 4 组{pairedEntities ? "双 Token" : "锚点"}</h2><span className="text-xs text-slate-500">{pairedEntities ? "主体 0+1 · 辅助 8+9 / 16+17 / 24+25" : "主体 0 · 辅助 8 / 16 / 24"}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{pairedEntities ? (node.promptVersion === "eros-entity-prompt-v8" ? "主体的 8-bit 编号按区间直接索引：0–63 现实自然生物、64–127 自然非生物、128–255 幻想种族；辅助实体使用基础元素与显现方式组合。伴随 Token 的其余 12 bit 定义气质、尺度和装束。" : node.promptVersion === "eros-entity-prompt-v7" ? "主体由两个最高 nibble 组成 8-bit 编号，直接索引 256 种明确物种；辅助实体使用基础元素与显现方式组合。伴随 Token 的其余 12 bit 定义气质、尺度和装束。" : "每组第一个 Token 定义基础实体与锚点特征，第二个 Token 定义形态或显现方式、气质、尺度与装束。") : "实体名称由每个锚点的最高 4 bit 决定；其余 12 bit 作为锚点附带特征单独展示。"}</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{entityTokens.map((token) => <EntityTokenCard key={token.position} token={token} />)}</div></section>
    <details className="mt-7 rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer list-none"><div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold">内在特征 · 去重视图</h2><span className="text-xs text-slate-500">展开查看 · {visibleDescriptorTokens.length} 个独立 Family</span></div></summary><p className="mt-3 text-xs leading-5 text-slate-500">按 genome 原始顺序扫描，同一 family 只优先展示 Token 序号最前的一条。</p><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{visibleDescriptorTokens.map((token) => <DescriptorTokenCard key={token.position} token={token} />)}</div><details className="mt-4 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-xs text-cyan-300">查看全部 {descriptorTokens.length} 个原始内在 Token</summary><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{descriptorTokens.map((token) => <DescriptorTokenCard key={token.position} token={token} />)}</div></details></details>
    <details className="mt-7 rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer list-none"><div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold">Token 派生的确定性 Prompt</h2><span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] text-cyan-300">展开查看 · 仅服务端使用</span></div></summary><p className="mt-3 text-xs leading-5 text-slate-500">主体与三个辅助实体始终完整保留。仅对 {descriptorTokens.length} 个内在特征的 family 键去重，例如 contour、repetition；同一键只保留 Token 序号最小的整条特征。</p><pre data-testid="entity-prompt" className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/25 p-4 text-xs leading-5 text-slate-400">{detail.prompt}</pre></details>
    <section className="mt-7"><div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">视觉解释 · {completedImages.length}</h2><p className="mt-1 text-[10px] text-slate-500">FLUX.2 Klein 9B Preview · 保留模型原始尺寸</p></div><button onClick={addImage} className="min-h-11 w-full rounded-xl border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 sm:w-auto">生成新解释</button></div><div className="mt-3 grid grid-cols-2 gap-2">{completedImages.map((image) => <figure key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-black"><a href={image.imageUrl} target="_blank" rel="noreferrer"><img src={image.thumbnailUrl ?? image.imageDataUrl ?? image.imageUrl} alt="视觉解释" width={512} height={320} loading="lazy" decoding="async" className="h-auto w-full object-contain"/></a><figcaption className="px-2 py-1 text-center text-[9px] text-slate-600">{image.width && image.height ? `${image.width}×${image.height}` : "原始尺寸"}</figcaption></figure>)}</div></section>
    <div className="h-12" />
  </aside>;
}
