"use client";
/* eslint-disable @next/next/no-img-element -- graph cards use pre-generated R2 thumbnails */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { prefetchExistenceDetail } from "../node/NodeDetailPanel";

export interface ErosNodeData extends Record<string, unknown> {
  name: string;
  id: string;
  genomeHex: string;
  type: "GENESIS" | "DESCENDANT";
  generation: number;
  isDead: boolean;
  descriptionCount: number;
  imageCount: number;
  image?: string;
  instability?: number;
  primaryEntity: string;
  primaryEntityZh: string;
  auxiliaryEntities: string[];
  auxiliaryEntitiesZh: string[];
  selectedAs?: "A" | "B";
}

export function GraphNodeCard({ data, selected }: NodeProps) {
  const item = data as ErosNodeData;
  return <article aria-label={`${item.name} · ${item.primaryEntityZh}`} onPointerEnter={() => prefetchExistenceDetail(item.id)} onPointerDown={() => prefetchExistenceDetail(item.id)} className={`w-[268px] overflow-hidden rounded-2xl border shadow-2xl transition ${item.isDead ? "border-slate-500/30 bg-[#20242c] grayscale" : "bg-[#111827]"} ${selected ? "border-cyan-400 shadow-cyan-500/20" : "border-white/10"}`}>
    <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-cyan-400" />
    <div className="relative h-[188px] overflow-hidden bg-slate-950">
      {item.image ? <img src={item.image} alt={`${item.name} 的视觉解释`} width={512} height={320} loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-contain" /> : <div className="h-full bg-[radial-gradient(circle_at_50%_45%,#164e63,#111827_55%,#020617)]" />}
      {item.selectedAs && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-fuchsia-500 text-xs font-bold">{item.selectedAs}</span>}
    </div>
    <div className="px-4 py-3">
      <h3 className="truncate text-xl font-semibold tracking-tight text-white">{item.name}</h3>
      <div className="mt-2 flex items-center justify-between gap-3"><span className="truncate text-xs font-medium text-cyan-100">{item.primaryEntityZh}</span><span className="shrink-0 text-[11px] text-slate-400">{item.imageCount} 图 · {item.descriptionCount} 记述</span></div>
      <div className="mt-2 border-t border-white/[.06] pt-2 text-right"><code className="hash text-[10px] tracking-[.12em] text-slate-600">{item.genomeHex.slice(0, 8)}</code></div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-fuchsia-400" />
  </article>;
}
