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

interface Detail {
  node: { id: string; name: string; genomeHex: string; chromosome0Hex: string; chromosome1Hex: string; protocolVersion: string; promptVersion: string; type: string; generation: number; createdAt: string };
  parents: Array<{ id: string; name: string }>;
  children: Array<{ id: string; name: string }>;
  reproduction?: { sameBitCount: number; hammingDistance: number; similarityRatio: number; mutationBitCount: number; flippedBitPositionsJson: string } | null;
  tokens: DetailToken[];
  prompt: string;
  images: Array<{ id: string; imageDataUrl?: string; imageUrl?: string; status: string; provider: string; providerModel?: string; variationId?: string; width?: number; height?: number; createdAt: string }>;
  descriptions: Array<{ id: string; body: string; authorLabel?: string; createdAt: string }>;
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

export function NodeDetailPanel({ nodeId, onClose, onSelectParent, standalone = false }: {
  nodeId: string; onClose?: () => void; onSelectParent?: (id: string) => void; standalone?: boolean;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [body, setBody] = useState("");
  const [authorLabel, setAuthorLabel] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => setDetail(await fetch(`/api/nodes/${nodeId}`).then((response) => response.json() as Promise<Detail>)), [nodeId]);
  useEffect(() => { void load(); }, [load]);

  async function addDescription(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`/api/nodes/${nodeId}/descriptions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, ...(authorLabel ? { authorLabel } : {}) }) });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) return setMessage(result.error?.message ?? "提交失败");
    setBody(""); setAuthorLabel(""); setMessage("记述已追加，不会改变该节点的基因与图片 Prompt。"); void load();
  }

  async function addImage() {
    setMessage("正在用 FLUX.2 Klein 9B Preview 生成新的视觉解释…");
    const response = await fetch(`/api/nodes/${nodeId}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const result = await response.json() as { error?: { message?: string } };
    setMessage(response.ok ? "新的视觉解释已生成，节点 Hash 保持不变。" : result.error?.message ?? "图片生成失败");
    if (response.ok) void load();
  }

  if (!detail?.node) return <div className={`${standalone ? "" : "fixed inset-x-0 bottom-0 top-14 z-40 w-full md:inset-y-16 md:left-auto md:right-0 md:max-w-xl"} glass grid place-items-center p-6 text-slate-400`}>载入节点…</div>;
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
  const recordSection = <section className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4 sm:mt-7"><h2 className="font-semibold">记述 · {detail.descriptions.length}</h2><p className="mt-1 text-xs text-slate-500">追加式公共记述，不参与遗传、Token 或图片生成。</p><form onSubmit={addDescription} className="mt-3 space-y-2"><textarea aria-label="记述" required maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} placeholder="为这个实体追加纯文本记述" className="h-24 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><input aria-label="署名" maxLength={64} value={authorLabel} onChange={(event) => setAuthorLabel(event.target.value)} placeholder="可选署名" className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><button className="min-h-11 w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 sm:w-auto">追加记述</button></form>{message && <p className="mt-3 text-xs leading-5 text-cyan-300">{message}</p>}<div className="mt-4 space-y-2">{detail.descriptions.map((item) => <article key={item.id} className="rounded-xl border border-white/10 p-3 text-sm"><p className="whitespace-pre-wrap">{item.body}</p><p className="mt-2 text-xs text-slate-500">{item.authorLabel || "匿名访问者"} · {new Date(item.createdAt).toLocaleString()}</p></article>)}</div></section>;
  return <aside className={`${standalone ? "rounded-2xl sm:rounded-3xl" : "fixed inset-x-0 bottom-0 top-14 z-40 w-full border-t md:inset-y-16 md:left-auto md:right-0 md:max-w-xl md:border-l md:border-t-0"} glass overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:p-6`} data-testid="node-detail">
    <div className="flex items-start justify-between gap-3 sm:gap-4"><div className="min-w-0"><p className="text-[11px] uppercase tracking-[.16em] text-cyan-300 sm:text-xs sm:tracking-[.22em]">{node.type === "GENESIS" ? "Genesis root" : `Generation ${node.generation}`} · {node.protocolVersion}</p><h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">{node.name}</h1><p className="mt-1 text-xs text-slate-500">名称与身份不可修改 · {new Date(node.createdAt).toLocaleString()}</p></div>{onClose && <button onClick={onClose} aria-label="关闭" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-xl">×</button>}</div>
    {node.type === "DESCENDANT" && node.protocolVersion === "eros-v1" && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">旧版 eros-v1 节点：染色体可能在子代中换位，因此主体槽可能由亲本辅助槽重新解释。该历史记录保持不可变；新繁衍使用保持顺序的 eros-v2。</p>}
    <div className="mt-5 flex flex-wrap gap-2">{onSelectParent && <button onClick={() => onSelectParent(node.id)} className="min-h-11 flex-1 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-medium sm:flex-none">选择为亲本</button>} {!standalone && <Link href={`/nodes/${node.id}`} className="grid min-h-11 flex-1 place-items-center rounded-xl border border-white/10 px-4 py-2 text-center text-sm sm:flex-none">打开完整页面</Link>}</div>
    {primaryImage && <figure className="mt-6"><img src={primaryImage.imageDataUrl ?? primaryImage.imageUrl} alt={`${node.name} 的视觉解释`} className="mx-auto h-auto max-h-[70vh] max-w-full rounded-2xl border border-white/10 bg-black object-contain"/><figcaption className="mt-2 text-center text-[10px] text-slate-500">{primaryImage.providerModel ?? primaryImage.provider} · {primaryImage.width && primaryImage.height ? `${primaryImage.width}×${primaryImage.height}` : "原始尺寸"}</figcaption></figure>}
    {recordSection}
    <section className="mt-7"><h2 className="font-semibold">不可变身份</h2><p className="mt-3 text-xs text-slate-500">512-bit Hash</p><p data-testid="full-hash" className="hash mt-1 rounded-xl bg-black/25 p-3 text-xs">{node.genomeHex}</p><details className="mt-3"><summary className="cursor-pointer text-sm text-cyan-300">两条 256-bit 染色体</summary><p className="hash mt-2 text-xs text-slate-400">0 · {node.chromosome0Hex}</p><p className="hash mt-2 text-xs text-slate-400">1 · {node.chromosome1Hex}</p></details></section>
    <section className="mt-7 grid grid-cols-2 gap-4"><div><h2 className="font-semibold">亲本</h2>{detail.parents.length ? detail.parents.map((item) => <Link className="mt-2 block text-sm text-cyan-300" key={item.id} href={`/nodes/${item.id}`}>{item.name}</Link>) : <p className="mt-2 text-sm text-slate-500">创世节点无入边</p>}</div><div><h2 className="font-semibold">子代</h2>{detail.children.map((item) => <Link className="mt-2 block text-sm text-fuchsia-300" key={item.id} href={`/nodes/${item.id}`}>{item.name}</Link>)}{!detail.children.length && <p className="mt-2 text-sm text-slate-500">尚无</p>}</div></section>
    {detail.reproduction && <section className="mt-7 rounded-2xl border border-white/10 p-4"><h2 className="font-semibold">亲缘不稳定度</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-400"><dt>相似度</dt><dd>{(detail.reproduction.similarityRatio * 100).toFixed(2)}%</dd><dt>相同 bit</dt><dd>{detail.reproduction.sameBitCount}</dd><dt>Hamming 距离</dt><dd>{detail.reproduction.hammingDistance}</dd><dt>实际翻转</dt><dd>{detail.reproduction.mutationBitCount}</dd></dl><details className="mt-3"><summary className="cursor-pointer text-xs text-cyan-300">bit 翻转位置</summary><p data-testid="flipped-positions" className="hash mt-2 text-xs text-slate-400">{JSON.parse(detail.reproduction.flippedBitPositionsJson).join(", ")}</p></details></section>}
    <section className="mt-7"><div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold">实体设定 · 4 组{pairedEntities ? "双 Token" : "锚点"}</h2><span className="text-xs text-slate-500">{pairedEntities ? "主体 0+1 · 辅助 8+9 / 16+17 / 24+25" : "主体 0 · 辅助 8 / 16 / 24"}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{pairedEntities ? (node.promptVersion === "eros-entity-prompt-v8" ? "主体的 8-bit 编号按区间直接索引：0–63 现实自然生物、64–127 自然非生物、128–255 幻想种族；辅助实体使用基础元素与显现方式组合。伴随 Token 的其余 12 bit 定义气质、尺度和装束。" : node.promptVersion === "eros-entity-prompt-v7" ? "主体由两个最高 nibble 组成 8-bit 编号，直接索引 256 种明确物种；辅助实体使用基础元素与显现方式组合。伴随 Token 的其余 12 bit 定义气质、尺度和装束。" : "每组第一个 Token 定义基础实体与锚点特征，第二个 Token 定义形态或显现方式、气质、尺度与装束。") : "实体名称由每个锚点的最高 4 bit 决定；其余 12 bit 作为锚点附带特征单独展示。"}</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{entityTokens.map((token) => <EntityTokenCard key={token.position} token={token} />)}</div></section>
    <details className="mt-7 rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer list-none"><div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold">内在特征 · 去重视图</h2><span className="text-xs text-slate-500">展开查看 · {visibleDescriptorTokens.length} 个独立 Family</span></div></summary><p className="mt-3 text-xs leading-5 text-slate-500">按 genome 原始顺序扫描，同一 family 只优先展示 Token 序号最前的一条。</p><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{visibleDescriptorTokens.map((token) => <DescriptorTokenCard key={token.position} token={token} />)}</div><details className="mt-4 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-xs text-cyan-300">查看全部 {descriptorTokens.length} 个原始内在 Token</summary><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{descriptorTokens.map((token) => <DescriptorTokenCard key={token.position} token={token} />)}</div></details></details>
    <details className="mt-7 rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer list-none"><div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold">Token 派生的确定性 Prompt</h2><span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] text-cyan-300">展开查看 · 仅服务端使用</span></div></summary><p className="mt-3 text-xs leading-5 text-slate-500">主体与三个辅助实体始终完整保留。仅对 {descriptorTokens.length} 个内在特征的 family 键去重，例如 contour、repetition；同一键只保留 Token 序号最小的整条特征。</p><pre data-testid="entity-prompt" className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/25 p-4 text-xs leading-5 text-slate-400">{detail.prompt}</pre></details>
    <section className="mt-7"><div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">视觉解释 · {completedImages.length}</h2><p className="mt-1 text-[10px] text-slate-500">FLUX.2 Klein 9B Preview · 保留模型原始尺寸</p></div><button onClick={addImage} className="min-h-11 w-full rounded-xl border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 sm:w-auto">生成新解释</button></div><div className="mt-3 grid grid-cols-2 gap-2">{completedImages.map((image) => <figure key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-black"><img src={image.imageDataUrl ?? image.imageUrl} alt="视觉解释" className="h-auto w-full object-contain"/><figcaption className="px-2 py-1 text-center text-[9px] text-slate-600">{image.width && image.height ? `${image.width}×${image.height}` : "原始尺寸"}</figcaption></figure>)}</div></section>
    <div className="h-12" />
  </aside>;
}
