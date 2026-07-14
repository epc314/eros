"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PedigreeJunctionData } from "@/lib/graph/layout";

export function GraphJunctionNode({ data }: NodeProps) {
  const item = data as PedigreeJunctionData;
  const label = item.parentNames.length ? `${item.parentNames.join(" 与 ")}的谱系汇合` : "谱系汇合";

  return <div aria-label={label} title={label} className="pointer-events-none relative grid h-5 w-5 place-items-center">
    <Handle id="parent-left" type="target" position={Position.Top} style={{ left: "28%" }} className="!h-1 !w-1 !border-0 !bg-slate-400" />
    <Handle id="parent-right" type="target" position={Position.Top} style={{ left: "72%" }} className="!h-1 !w-1 !border-0 !bg-slate-400" />
    <span className="grid h-3.5 w-3.5 rotate-45 place-items-center rounded-[4px] border border-cyan-300/55 bg-slate-950 shadow-[0_0_14px_rgba(34,211,238,.28)]">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
    </span>
    <Handle id="child" type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-cyan-300" />
  </div>;
}
