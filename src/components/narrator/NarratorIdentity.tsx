"use client";

import type { PublicNarrator } from "@/lib/narrator/types";
import { useNarrator } from "./NarratorProvider";

export function NarratorIdentity({ narrator, className = "" }: { narrator: PublicNarrator; className?: string }) {
  const { openProfile } = useNarrator();
  return <span className={`inline-flex max-w-full flex-col align-middle ${className}`}>
    <button type="button" onClick={() => openProfile(narrator)} className="max-w-full truncate text-left font-bold text-cyan-200 underline decoration-cyan-300/20 underline-offset-2 hover:text-cyan-100">{narrator.name}</button>
    {narrator.titles.length > 0 && <span className="max-w-full truncate text-[10px] italic leading-4 text-cyan-100/50">{narrator.titles.join(" | ")}</span>}
  </span>;
}
