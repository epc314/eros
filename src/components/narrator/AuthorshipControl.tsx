"use client";

import { useEffect, useState } from "react";
import type { AuthorshipMode } from "@/lib/narrator/types";
import { NarratorIdentity } from "./NarratorIdentity";
import { useNarrator } from "./NarratorProvider";

export function useAuthorship() {
  const { narrator } = useNarrator();
  const [mode, setMode] = useState<AuthorshipMode>("custom");
  const [customLabel, setCustomLabel] = useState("");
  useEffect(() => { setMode(narrator ? "narrator" : "custom"); }, [narrator]);
  return { narrator, mode, setMode, customLabel, setCustomLabel };
}

export function AuthorshipControl({ mode, setMode, customLabel, setCustomLabel, label = "记述署名" }: {
  mode: AuthorshipMode;
  setMode: (mode: AuthorshipMode) => void;
  customLabel: string;
  setCustomLabel: (value: string) => void;
  label?: string;
}) {
  const { narrator } = useNarrator();
  return <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.025] p-2.5">
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-200/70">{label}</p>
    {narrator && <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/25 p-1 text-xs">
      <button type="button" onClick={() => setMode("narrator")} className={`min-h-10 rounded-md px-2 font-semibold ${mode === "narrator" ? "bg-cyan-200 text-slate-950" : "text-slate-400"}`}>记述者</button>
      <button type="button" onClick={() => setMode("custom")} className={`min-h-10 rounded-md px-2 font-semibold ${mode === "custom" ? "bg-white text-slate-950" : "text-slate-400"}`}>自定义署名</button>
    </div>}
    {narrator && mode === "narrator" ? <div className="mt-2 rounded-lg border border-white/5 bg-black/15 px-3 py-2 text-xs text-slate-400">将以 <NarratorIdentity narrator={narrator} className="ml-1" /> 的账户身份署名</div>
      : <input aria-label="自定义署名" maxLength={64} value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="自定义署名（留空即为匿名）" className={`${narrator ? "mt-2" : ""} min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-300/30`} />}
  </div>;
}
