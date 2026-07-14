"use client";
/* eslint-disable @next/next/no-img-element -- treasure images are runtime data */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TreasureToken } from "@/lib/treasure/protocol";

interface RecordItem { id: string; body: string; authorLabel?: string | null; kind: "DISCOVERY" | "STORY"; createdAt: string; trueCount: number; falseCount: number }
interface Detail {
  treasure: { id: string; name: string; ownerName: string; ownerNodeId: string; subjectName: string; subjectGroup: string; recorderName?: string | null; searchHashHex: string; ownerFeatureHex: string; matchScore: number; searchAttempt: number; searchTimestampMs: string; exactPrompt: string; collectedAt?: string | null; tokens: TreasureToken[] };
  descriptions: RecordItem[];
  images: Array<{ id: string; imageUrl?: string | null; thumbnailUrl?: string | null; provider: string; providerModel?: string | null; width?: number | null; height?: number | null }>;
}

function TreasureRecord({ item, onVote }: { item: RecordItem; onVote: (id: string, isTrue: boolean) => void }) {
  const disputed = item.falseCount > item.trueCount;
  const content = <><div className="flex items-center justify-between"><span className="rounded-full border border-emerald-300/20 px-2 py-1 text-[10px] text-emerald-200">{item.kind === "DISCOVERY" ? "收录" : "记述"}</span><span className="text-[10px] text-slate-600">不可修改 · 不可删除</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{item.body}</p><p className="mt-2 text-xs text-slate-500">{item.authorLabel || "匿名记录者"} · {new Date(item.createdAt).toLocaleString()}</p><div className="mt-3 flex gap-2 text-xs"><button type="button" onClick={() => onVote(item.id, true)} className="min-h-9 rounded-lg border border-emerald-400/20 px-3 text-emerald-300">真实 · {item.trueCount}</button><button type="button" onClick={() => onVote(item.id, false)} className="min-h-9 rounded-lg border border-red-400/20 px-3 text-red-300">虚假 · {item.falseCount}</button></div></>;
  return disputed ? <details className="rounded-xl border border-slate-600/30 bg-slate-950/40 p-3"><summary className="cursor-pointer text-xs text-slate-400">该记述因“虚假”评价更多而折叠 · 展开查看</summary><div className="mt-3 border-t border-white/5 pt-3">{content}</div></details> : <article className="rounded-xl border border-white/10 p-3">{content}</article>;
}

export function TreasureDetailPanel({ treasureId }: { treasureId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [body, setBody] = useState("");
  const [authorLabel, setAuthorLabel] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/treasures/${treasureId}`, { cache: "no-store" });
    const result = await response.json() as Detail & { error?: { message?: string } };
    if (!response.ok) setMessage(result.error?.message ?? "无法载入宝物"); else setDetail(result);
  }, [treasureId]);
  useEffect(() => { void load(); }, [load]);

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
  return <main className="min-h-screen px-3 pb-12 pt-[76px] sm:px-5"><article className="glass mx-auto max-w-4xl rounded-2xl p-4 sm:rounded-3xl sm:p-7">
    <div><p className="text-xs uppercase tracking-[.18em] text-emerald-300">{treasure.subjectGroup}</p><h1 className="mt-1 font-serif text-2xl text-white sm:text-4xl">{treasure.name}</h1><p className="mt-2 text-sm text-slate-500">持有存在 · <Link href={`/nodes/${treasure.ownerNodeId}`} className="font-semibold text-cyan-300">{treasure.ownerName}</Link> · 记述人 {treasure.recorderName ?? "匿名"}</p></div>
    {primaryImage && <figure className="mt-6"><img src={primaryImage.thumbnailUrl ?? primaryImage.imageUrl ?? ""} alt={treasure.name} width={512} height={320} className="mx-auto h-auto max-h-[70vh] max-w-full rounded-2xl border border-white/10 bg-black object-contain"/><figcaption className="mt-2 text-center text-[10px] text-slate-500">{primaryImage.providerModel ?? primaryImage.provider} · {primaryImage.width && primaryImage.height ? `${primaryImage.width}×${primaryImage.height}` : "原始尺寸"}{primaryImage.imageUrl && <a href={primaryImage.imageUrl} target="_blank" rel="noreferrer" className="ml-2 text-cyan-300">查看原图</a>}</figcaption></figure>}
    <section className="mt-7 rounded-2xl border border-white/10 bg-black/10 p-4"><h2 className="font-semibold">记述 · {detail.descriptions.length}</h2><p className="mt-1 text-xs text-slate-500">宝物故事的追加记录；一经提交，不可修改或删除。</p><form onSubmit={addDescription} className="mt-4 space-y-2"><textarea required maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} placeholder="为这件宝物追加纯文本记述" aria-label="宝物记述" className="h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><input maxLength={64} value={authorLabel} onChange={(event) => setAuthorLabel(event.target.value)} placeholder="可选署名" aria-label="署名" className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"/><button className="min-h-11 w-full rounded-xl bg-white px-4 text-sm font-medium text-slate-950 sm:w-auto">追加记述</button></form>{message && <p className="mt-3 text-xs text-cyan-300">{message}</p>}<div className="mt-4 space-y-2">{detail.descriptions.map((item) => <TreasureRecord key={item.id} item={item} onVote={vote}/>)}</div></section>
    <section className="mt-7"><h2 className="font-semibold">确定性宝物特征</h2><p className="hash mt-3 break-all rounded-xl bg-black/25 p-3 text-xs text-slate-500">128-bit · {treasure.searchHashHex}</p><p className="mt-2 text-xs text-slate-500">第 {treasure.searchAttempt} 次匹配 · 与 {treasure.ownerName} 共同为 1 的 bit：{treasure.matchScore}</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{treasure.tokens.map((token) => <article key={token.position} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between text-[10px] text-slate-600"><span>#{token.position} · {token.familyZh}</span><code>{token.tokenHex}</code></div><p className="mt-2 text-sm text-slate-200">{token.phraseZh}</p><p className="mt-1 text-xs text-slate-500">{token.phrase}</p></article>)}</div></section>
    <details className="mt-7 rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer text-sm text-emerald-200">展开图片生成 Prompt</summary><pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-500">{treasure.exactPrompt}</pre></details>
  </article></main>;
}
