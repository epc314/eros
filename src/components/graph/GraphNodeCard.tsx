"use client";
/* eslint-disable @next/next/no-img-element -- graph cards use pre-generated R2 thumbnails */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { prefetchExistenceDetail } from "../node/NodeDetailPanel";

const RADIAL_HANDLES = [
  { side: "top", position: Position.Top },
  { side: "right", position: Position.Right },
  { side: "bottom", position: Position.Bottom },
  { side: "left", position: Position.Left },
] as const;

function radialHandleStyle(side: typeof RADIAL_HANDLES[number]["side"], lane: "a" | "b") {
  const offset = lane === "a" ? "40%" : "60%";
  return side === "top" || side === "bottom" ? { left: offset } : { top: offset };
}

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
  isRadialCenter?: boolean;
}

export function GraphNodeCard({ data, selected }: NodeProps) {
  const item = data as ErosNodeData;
  return <div aria-label={`${item.name} · ${item.primaryEntityZh}`} onPointerEnter={() => prefetchExistenceDetail(item.id)} onPointerDown={() => prefetchExistenceDetail(item.id)} className="group relative h-[210px] w-[210px]">
    {RADIAL_HANDLES.flatMap(({ side, position }) => (["a", "b"] as const).flatMap((lane) => [
      <Handle key={`target-${side}-${lane}`} id={`target-${side}-${lane}`} type="target" position={position} style={radialHandleStyle(side, lane)} className="!h-1.5 !w-1.5 !border-0 !bg-transparent !opacity-0" />,
      <Handle key={`source-${side}-${lane}`} id={`source-${side}-${lane}`} type="source" position={position} style={radialHandleStyle(side, lane)} className="!h-1.5 !w-1.5 !border-0 !bg-transparent !opacity-0" />,
    ]))}
    <article className={`absolute inset-0 origin-center overflow-hidden rounded-full border-2 bg-slate-950 shadow-2xl transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform group-hover:scale-[1.333] group-focus-within:scale-[1.333] ${item.isDead ? "border-slate-500/35 grayscale" : "border-white/15"} ${item.isRadialCenter ? "ring-4 ring-cyan-300/10 shadow-[0_0_70px_rgba(34,211,238,.2)]" : ""} ${selected ? "!border-cyan-300 ring-4 ring-cyan-400/15 shadow-[0_0_70px_rgba(34,211,238,.3)]" : ""}`}>
      {item.image ? <img src={item.image} alt={`${item.name} 的视觉解释`} width={420} height={420} loading="lazy" decoding="async" fetchPriority="low" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#164e63,#111827_56%,#020617)]" />}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,.02)_28%,rgba(2,6,23,.36)_55%,rgba(2,6,23,.96)_86%,#020617)]" />
      {item.selectedAs && <span className="absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-fuchsia-500 text-[10px] font-bold shadow-lg">{item.selectedAs}</span>}
      <div className="absolute inset-x-5 bottom-4 text-center">
        <h3 className="truncate text-xl font-semibold tracking-tight text-white drop-shadow-lg">{item.name}</h3>
        <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[9px]"><span className="max-w-[82px] truncate font-medium text-cyan-100">{item.primaryEntityZh}</span><span className="text-slate-300">{item.imageCount} 图 · {item.descriptionCount} 记述</span></div>
        <div className="mt-1.5"><code className="hash text-[8px] tracking-[.16em] text-slate-500">{item.genomeHex.slice(0, 8)}</code></div>
      </div>
    </article>
  </div>;
}
