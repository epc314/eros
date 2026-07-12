"use client";
/* eslint-disable @next/next/no-img-element -- graph cards use pre-generated R2 thumbnails */

import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface ErosNodeData extends Record<string, unknown> {
  name: string;
  genomeHex: string;
  type: "GENESIS" | "DESCENDANT";
  generation: number;
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
  const tokenHex = item.genomeHex.match(/.{4}/g)?.slice(0, 8) ?? [];
  return <article className={`w-[220px] overflow-hidden rounded-2xl border bg-[#111827] shadow-2xl transition ${selected ? "border-cyan-400 shadow-cyan-500/20" : "border-white/10"}`}>
    <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-cyan-400" />
    <div className="relative h-32 overflow-hidden bg-slate-950">
      {item.image ? <img src={item.image} alt={`${item.name} 的视觉解释`} width={384} height={224} loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_45%,#164e63,#111827_55%,#020617)]"><div className="hash grid grid-cols-4 gap-1 text-center text-[8px] text-cyan-200/60">{tokenHex.slice(0, 4).map((token, index) => <span key={index} className="rounded bg-cyan-300/5 px-1 py-1">{token}</span>)}</div></div>}
      <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] uppercase tracking-widest text-cyan-200">{item.type === "GENESIS" ? "Root · 创世" : `Gen ${item.generation}`}</span>
      {item.selectedAs && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-fuchsia-500 text-xs font-bold">{item.selectedAs}</span>}
    </div>
    <div className="space-y-2 p-3">
      <h3 className="truncate text-base font-semibold">{item.name}</h3>
      <p className="truncate text-xs font-medium text-cyan-100"><span className="mr-1 text-[9px] font-normal text-cyan-500">主体</span>{item.primaryEntityZh} <span className="text-[9px] font-normal text-slate-500">{item.primaryEntity}</span></p>
      <p className="truncate text-[10px] text-fuchsia-200"><span className="mr-1 text-slate-500">辅助</span>{item.auxiliaryEntitiesZh.join(" · ")}</p>
      <p className="hash truncate text-[11px] text-slate-500">{item.genomeHex.slice(0, 18)}…</p>
      <div className="flex justify-between text-[10px] text-slate-400"><span>不稳定度 {item.instability ?? 0} bit</span><span>{item.imageCount} 图 · {item.descriptionCount} 记述</span></div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-fuchsia-400" />
  </article>;
}
