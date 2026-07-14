"use client";

import { ViewportPortal } from "@xyflow/react";
import type { RadialRing } from "@/lib/graph/layout";

export function RadialGraphBackdrop({ rings, hasCenter }: { rings: RadialRing[]; hasCenter: boolean }) {
  return <ViewportPortal>
    <div aria-hidden className="pointer-events-none absolute z-[-1]">
      {rings.map((ring, index) => {
        const labelAngle = index % 2 === 0 ? -Math.PI * 3 / 8 : -Math.PI / 2;
        return <div
          key={ring.generation}
          className="absolute rounded-full border"
          style={{
            left: -ring.radius,
            top: -ring.radius,
            width: ring.radius * 2,
            height: ring.radius * 2,
            borderColor: index % 2 === 0 ? "rgba(103,232,249,.18)" : "rgba(232,121,249,.15)",
            borderStyle: index % 2 === 0 ? "solid" : "dashed",
            boxShadow: index === 0 ? "inset 0 0 90px rgba(34,211,238,.035), 0 0 50px rgba(34,211,238,.025)" : undefined,
          }}
        >
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950/90 px-4 py-1.5 text-[11px] font-semibold tracking-[.22em] text-slate-500 shadow-xl"
            style={{ left: ring.radius + Math.cos(labelAngle) * ring.radius, top: ring.radius + Math.sin(labelAngle) * ring.radius }}
          >
            GENERATION {ring.generation}
          </span>
        </div>;
      })}
      {hasCenter ? <div className="absolute -left-[170px] -top-[170px] h-[340px] w-[340px] rounded-full border border-cyan-200/10 bg-[radial-gradient(circle,rgba(34,211,238,.08),rgba(15,23,42,.22)_58%,transparent_72%)] shadow-[0_0_100px_rgba(34,211,238,.1)]" /> : <div className="absolute -left-14 -top-14 grid h-28 w-28 place-items-center rounded-full border border-cyan-300/15 bg-[radial-gradient(circle,rgba(34,211,238,.12),rgba(15,23,42,.52)_45%,rgba(2,6,23,.1)_72%)] shadow-[0_0_80px_rgba(34,211,238,.12)]">
        <span className="h-4 w-4 rotate-45 rounded-[4px] border border-cyan-200/55 bg-cyan-300/15 shadow-[0_0_24px_rgba(103,232,249,.5)]" />
      </div>}
    </div>
  </ViewportPortal>;
}
