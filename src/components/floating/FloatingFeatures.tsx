"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FaustChat } from "@/components/faust/FaustChat";
import { MephistoTreasure } from "@/components/mephisto/MephistoTreasure";
import { ProposalStone } from "@/components/proposal/ProposalStone";
import { EROS_PAGE_READY_EVENT, EROS_PAGE_READY_KEY } from "./page-ready";

export function FloatingFeatures() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    setReady(false);

    const reveal = () => {
      if (document.readyState !== "complete") return;
      if (pathname === "/" && document.documentElement.dataset[EROS_PAGE_READY_KEY] !== "true") return;
      void document.fonts.ready.catch(() => undefined).then(() => {
        if (cancelled) return;
        firstFrame = window.requestAnimationFrame(() => {
          secondFrame = window.requestAnimationFrame(() => { if (!cancelled) setReady(true); });
        });
      });
    };

    window.addEventListener("load", reveal);
    window.addEventListener(EROS_PAGE_READY_EVENT, reveal);
    reveal();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.removeEventListener("load", reveal);
      window.removeEventListener(EROS_PAGE_READY_EVENT, reveal);
    };
  }, [pathname]);

  if (!ready) return null;
  return <><FaustChat /><MephistoTreasure /><ProposalStone /></>;
}
