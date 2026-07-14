"use client";
/* eslint-disable @next/next/no-img-element -- thumbnails are dynamic */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AtlasTreasure {
  id: string; name: string; ownerName: string; ownerNodeId: string; subjectName: string; subjectGroup: string;
  searchHashHex: string;
  title?: string | null; recorderName?: string | null; descriptions: number; imageCount: number; collectedAt?: string | null;
  images: Array<{ thumbnailUrl?: string | null; imageUrl?: string | null }>;
}

export function TreasureAtlas({ onBack }: { onBack?: () => void }) {
  const [treasures, setTreasures] = useState<AtlasTreasure[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/treasures", { cache: "no-store" });
      const body = await response.json() as { treasures?: AtlasTreasure[]; error?: { message?: string } };
      if (!response.ok) setError(body.error?.message ?? "无法载入宝物图鉴");
      else { setTreasures(body.treasures ?? []); setError(""); }
    } catch { setError("无法载入宝物图鉴"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); const refresh = () => void load(); window.addEventListener("eros-treasure-collected", refresh); return () => window.removeEventListener("eros-treasure-collected", refresh); }, [load]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return treasures;
    return treasures.filter((item) => item.name.toLowerCase().includes(normalized) || item.title?.toLowerCase().includes(normalized) || item.ownerName.toLowerCase().includes(normalized) || (item.searchHashHex ?? "").startsWith(normalized) || item.id.startsWith(normalized));
  }, [query, treasures]);

  return <main className="h-[100dvh] overflow-y-auto px-3 pb-24 pt-[76px] sm:px-5">
    <div className="mx-auto max-w-7xl">
      <div className="glass rounded-2xl p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div><p className="text-xs uppercase tracking-[.2em] text-emerald-300">Mephisto collection</p><h1 className="mt-1 font-serif text-2xl text-white sm:text-3xl">宝物图鉴</h1><p className="mt-1 text-xs text-slate-500">{treasures.length} 件已被寻得并收录的宝物</p></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索宝物、称号、持有存在或 Hash 前缀" aria-label="搜索宝物" className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-emerald-300/30 sm:mt-0 sm:max-w-md" />
      </div>
      {loading && <p className="py-20 text-center text-slate-500">正在翻阅宝物图鉴……</p>}
      {error && <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-red-200">{error}</p>}
      {!loading && !error && !visible.length && <div className="glass mt-5 rounded-3xl py-24 text-center"><p className="font-serif text-xl text-slate-300">图鉴仍等待第一件宝物</p><p className="mt-2 text-sm text-slate-500">向左侧的梅菲斯特说出一句咒语。</p></div>}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{visible.map((treasure) => {
        const image = treasure.images[0]?.thumbnailUrl ?? treasure.images[0]?.imageUrl;
        return <Link href={`/treasures/${treasure.id}`} key={treasure.id} className="glass group overflow-hidden rounded-2xl border border-white/10 transition hover:-translate-y-1 hover:border-emerald-300/30">
          <div className="aspect-[4/3] overflow-hidden bg-black">{image ? <img src={image} alt={treasure.name} width={512} height={320} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-3xl text-slate-700">◇</div>}</div>
          <div className="p-3"><p className="line-clamp-2 font-serif text-base leading-5 text-slate-100">{treasure.name}</p><p className="mt-1 min-h-4 truncate text-[11px] italic text-emerald-100/55">{treasure.title ?? ""}</p><p className="mt-2 truncate text-[11px] text-cyan-300">持有 · {treasure.ownerName}</p><p className="mt-1 text-[10px] text-slate-600">{treasure.imageCount} 图 · {treasure.descriptions} 记述</p><div className="mt-2 border-t border-white/[.06] pt-2 text-right"><code className="hash text-[10px] tracking-[.12em] text-slate-600">{(treasure.searchHashHex ?? "").slice(0, 8)}</code></div></div>
        </Link>;
      })}</div>
    </div>
    {onBack ? <button type="button" onClick={onBack} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-30 min-h-12 rounded-full border border-cyan-300/25 bg-slate-950/90 px-5 text-sm font-semibold text-cyan-200 shadow-2xl backdrop-blur-xl">返回图谱</button> : <Link href="/" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-30 grid min-h-12 place-items-center rounded-full border border-cyan-300/25 bg-slate-950/90 px-5 text-sm font-semibold text-cyan-200 shadow-2xl backdrop-blur-xl">返回图谱</Link>}
  </main>;
}
