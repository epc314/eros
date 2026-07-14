"use client";
/* eslint-disable @next/next/no-img-element -- treasure images are runtime data */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { splitFaustExistenceNames, type FaustExistenceLink } from "@/lib/faust-markdown";
import type { TreasureToken } from "@/lib/treasure/protocol";

interface RecordItem { id: string; body: string; authorLabel?: string | null; kind: "DISCOVERY" | "STORY"; createdAt: string; trueCount: number; falseCount: number }
interface Detail {
  treasure: { id: string; name: string; title?: string | null; protocolVersion: string; ownerName: string; ownerNodeId: string; subjectName: string; subjectGroup: string; recorderName?: string | null; searchHashHex: string; ownerFeatureHex: string; matchScore: number; searchAttempt: number; searchTimestampMs: string; exactPrompt: string; collectedAt?: string | null; tokens: TreasureToken[] };
  descriptions: RecordItem[];
  images: Array<{ id: string; imageUrl?: string | null; thumbnailUrl?: string | null; provider: string; providerModel?: string | null; width?: number | null; height?: number | null }>;
}

function LinkedWorldText({ text, links }: { text: string; links: FaustExistenceLink[] }) {
  return <>{splitFaustExistenceNames(text, links).map((segment, index) => segment.existence
    ? <Link key={`${segment.existence.id}:${index}`} href={segment.existence.href ?? `/nodes/${encodeURIComponent(segment.existence.id)}`} className="font-semibold text-cyan-300 underline decoration-cyan-300/25 underline-offset-2 hover:text-cyan-200">{segment.text}</Link>
    : <span key={`text:${index}`}>{segment.text}</span>)}</>;
}

function TreasureRecord({ item, onVote, links }: { item: RecordItem; onVote: (id: string, isTrue: boolean) => void; links: FaustExistenceLink[] }) {
  const disputed = item.falseCount > item.trueCount;
  const content = <><div className="flex items-center justify-between"><span className="rounded-full border border-emerald-300/20 px-2 py-1 text-[10px] text-emerald-200">{item.kind === "DISCOVERY" ? "收录" : "记述"}</span><span className="text-[10px] text-slate-600">不可修改 · 不可删除</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200"><LinkedWorldText text={item.body} links={links} /></p><p className="mt-2 text-xs text-slate-500"><LinkedWorldText text={item.authorLabel || "匿名记录者"} links={links} /> · {new Date(item.createdAt).toLocaleString()}</p><div className="mt-3 flex gap-2 text-xs"><button type="button" onClick={() => onVote(item.id, true)} className="min-h-9 rounded-lg border border-emerald-400/20 px-3 text-emerald-300">真实 · {item.trueCount}</button><button type="button" onClick={() => onVote(item.id, false)} className="min-h-9 rounded-lg border border-red-400/20 px-3 text-red-300">虚假 · {item.falseCount}</button></div></>;
  return disputed ? <details className="rounded-xl border border-slate-600/30 bg-slate-950/40 p-3"><summary className="cursor-pointer text-xs text-slate-400">该记述因“虚假”评价更多而折叠 · 展开查看</summary><div className="mt-3 border-t border-white/5 pt-3">{content}</div></details> : <article className="rounded-xl border border-white/10 p-3">{content}</article>;
}

export function TreasureDetailPanel({ treasureId }: { treasureId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [recordLinks, setRecordLinks] = useState<FaustExistenceLink[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleBusy, setTitleBusy] = useState(false);
  const [titleMessage, setTitleMessage] = useState("");
  const [body, setBody] = useState("");
  const [authorLabel, setAuthorLabel] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/treasures/${treasureId}`, { cache: "no-store" });
    const result = await response.json() as Detail & { error?: { message?: string } };
    if (!response.ok) setMessage(result.error?.message ?? "无法载入宝物");
    else { setDetail(result); setTitleDraft(result.treasure.title ?? ""); }
  }, [treasureId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/graph", { cache: "no-store", signal: controller.signal }),
      fetch("/api/treasures", { cache: "no-store", signal: controller.signal }),
    ]).then(async ([graphResponse, treasureResponse]) => ({
      graphResponse,
      treasureResponse,
      graph: await graphResponse.json() as { nodes?: Array<{ id: string; name: string }> },
      atlas: await treasureResponse.json() as { treasures?: Array<{ id: string; name: string }> },
    })).then(({ graphResponse, treasureResponse, graph, atlas }) => {
      if (!graphResponse.ok || !treasureResponse.ok) return;
      setRecordLinks([
        ...(graph.nodes ?? []).map(({ id, name }) => ({ id, name, href: `/nodes/${encodeURIComponent(id)}`, kind: "existence" as const })),
        ...(atlas.treasures ?? []).map(({ id, name }) => ({ id, name, href: `/treasures/${encodeURIComponent(id)}`, kind: "treasure" as const })),
      ]);
    }).catch((cause: unknown) => {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setRecordLinks([]);
    });
    return () => controller.abort();
  }, []);

  async function saveTitle(event: React.FormEvent) {
    event.preventDefault(); setTitleBusy(true); setTitleMessage("");
    try {
      const response = await fetch(`/api/treasures/${treasureId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: titleDraft }) });
      const result = await response.json() as Detail & { error?: { message?: string } };
      if (!response.ok) setTitleMessage(result.error?.message ?? "称号保存失败");
      else { setDetail(result); setTitleDraft(result.treasure.title ?? ""); setEditingTitle(false); setTitleMessage(result.treasure.title ? "称号已更新。" : "称号已清空。"); }
    } catch { setTitleMessage("称号保存失败，请检查网络后重试。"); }
    finally { setTitleBusy(false); }
  }

  async function addDescription(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`/api/treasures/${treasureId}/descriptions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, ...(authorLabel ? { authorLabel } : {}) }) });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) setMessage(result.error?.message ?? "提交失败"); else { setBody(""); setAuthorLabel(""); setMessage("记述已永久追加。"); await load(); }
  }
  async function vote(descriptionId: string, isTrue: boolean) {
    let voterKey = window.localStorage.getItem("eros-anonymous-voter");
    if (!voterKey) { voterKey = crypto.randomUUID(); window.localStorage.setItem("eros-anonymous-voter", voterKey); }
    const response = await fetch(`/api/treasure-descriptions/${descriptionId}/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ voterKey, isTrue }) });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) setMessage(result.error?.message ?? "评价提交失败"); else await load();
  }

  if (!detail) return <main className="grid min-h-screen place-items-center px-4 pt-16 text-slate-500">{message || "正在载入宝物……"}</main>;
  const { treasure } = detail;
  const primaryImage = detail.images[0];
  const links: FaustExistenceLink[] = [
    { id: treasure.ownerNodeId, name: treasure.ownerName, href: `/nodes/${encodeURIComponent(treasure.ownerNodeId)}`, kind: "existence" },
    { id: treasure.id, name: treasure.name, href: `/treasures/${encodeURIComponent(treasure.id)}`, kind: "treasure" },
    ...recordLinks,
  ];
  return <main className="min-h-screen px-3 pb-12 pt-[76px] sm:px-5"><article className="glass mx-auto max-w-4xl rounded-2xl p-4 sm:rounded-3xl sm:p-7">
    <Link href="/treasures" className="mb-5 inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 hover:border-emerald-300/25 hover:text-emerald-200">← 返回宝物图鉴</Link>
    <div>
      <p className="text-xs uppercase tracking-[.18em] text-emerald-300">{treasure.subjectGroup}</p>
      <h1 className="mt-1 font-serif text-2xl text-white sm:text-4xl">{treasure.name}</h1>
      {editingTitle ? <form onSubmit={saveTitle} className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input autoFocus maxLength={64} value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} placeholder="输入称号；留空保存即可清除" aria-label="宝物称号" className="min-h-11 min-w-0 flex-1 rounded-xl border border-emerald-300/20 bg-black/25 px-3 text-sm italic outline-none focus:border-emerald-300/40" />
        <div className="flex gap-2"><button disabled={titleBusy} className="min-h-11 flex-1 rounded-xl bg-emerald-100 px-4 text-sm font-semibold text-[#0b120f] disabled:opacity-40 sm:flex-none">{titleBusy ? "保存中…" : "保存称号"}</button><button type="button" disabled={titleBusy} onClick={() => { setTitleDraft(treasure.title ?? ""); setEditingTitle(false); setTitleMessage(""); }} className="min-h-11 flex-1 rounded-xl border border-white/10 px-4 text-sm text-slate-400 sm:flex-none">取消</button></div>
      </form> : <div className="mt-2 flex min-h-7 items-center gap-3"><p className="min-w-0 flex-1 truncate text-sm italic text-emerald-100/60">{treasure.title ?? ""}</p><button type="button" onClick={() => { setEditingTitle(true); setTitleMessage(""); }} className="shrink-0 text-xs text-emerald-300 hover:text-emerald-200">{treasure.title ? "修改称号" : "设置称号"}</button></div>}
      {titleMessage && <p className="mt-1 text-xs text-cyan-300">{titleMessage}</p>}
      <p className="mt-2 text-sm text-slate-500">持有存在 · <Link href={`/nodes/${treasure.ownerNodeId}`} className="font-semibold text-cyan-300">{treasure.ownerName}</Link> · 记述人 <LinkedWorldText text={treasure.recorderName ?? "匿名"} links={links} /></p>
    </div>
    {primaryImage && <figure className="mt-6"><img src={primaryImage.thumbnailUrl ?? primaryImage.imageUrl ?? ""} alt={treasure.name} width={512} height={320} className="mx-auto h-auto max-h-[70vh] max-w-full rounded-2xl border border-white/10 bg-black object-contain"/><figcaption className="mt-2 text-center text-[10px] text-slate-500">{primaryImage.width && primaryImage.height ? `${primaryImage.width}×${primaryImage.height}` : "原始尺寸"}{primaryImage.imageUrl && <a href={primaryImage.imageUrl} target="_blank" rel="noreferrer" className="ml-2 text-cyan-300">查看原图</a>}</figcaption></figure>}
    <section className="mt-7 rounded-2xl border border-white/10 bg-black/10 p-4"><h2 className="font-semibold">记述 · {detail.descriptions.length}</h2><p className="mt-1 text-xs text-slate-500">宝物故事的追加记录；一经提交，不可修改或删除。</p><form onSubmit={addDescription} className="mt-4 space-y-2"><textarea required maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} placeholder="为这件宝物追加纯文本记述" aria-label="宝物记述" className="h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><input maxLength={64} value={authorLabel} onChange={(event) => setAuthorLabel(event.target.value)} placeholder="可选署名" aria-label="署名" className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><button className="min-h-11 w-full rounded-xl bg-white px-4 text-sm font-medium text-slate-950 sm:w-auto">追加记述</button></form>{message && <p className="mt-3 text-xs text-cyan-300">{message}</p>}<div className="mt-4 space-y-2">{detail.descriptions.map((item) => <TreasureRecord key={item.id} item={item} onVote={vote} links={links}/>)}</div></section>
    <section className="mt-7"><h2 className="font-semibold">确定性宝物特征</h2><p className="hash mt-3 break-all rounded-xl bg-black/25 p-3 text-xs text-slate-500">128-bit · {treasure.searchHashHex}</p><p className="mt-2 text-xs text-slate-500">第 {treasure.searchAttempt} 次匹配 · 与 <Link href={`/nodes/${treasure.ownerNodeId}`} className="font-semibold text-cyan-300">{treasure.ownerName}</Link> {treasure.protocolVersion === "eros-treasure-v1" ? `共同为 1 的 bit：${treasure.matchScore}` : `相同的 bit：${treasure.matchScore}/128`}</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{treasure.tokens.map((token) => <article key={token.position} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between text-[10px] text-slate-600"><span>#{token.position} · {token.familyZh}</span><code>{token.tokenHex}</code></div><p className="mt-2 text-sm text-slate-200">{token.phraseZh}</p><p className="mt-1 text-xs text-slate-500">{token.phrase}</p></article>)}</div></section>
    <details className="mt-7 rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer text-sm text-emerald-200">展开图片生成 Prompt</summary><pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-500">{treasure.exactPrompt}</pre></details>
  </article></main>;
}
