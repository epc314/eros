import type { Metadata } from "next";
import Link from "next/link";
import { FaustChat } from "@/components/faust/FaustChat";
import { PROTOCOL_VERSION } from "@/lib/protocol/constants";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eros — deterministic digital evolution",
  description: "A public world of immutable 512-bit entities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-[#080b12]/85 px-3 backdrop-blur-xl sm:h-16 sm:px-5">
      <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 font-black text-white">E</span><span className="truncate"><b>Eros</b><small className="ml-2 hidden text-slate-500 sm:inline">{PROTOCOL_VERSION}</small></span></Link>
      <nav className="flex gap-3 text-sm text-slate-400 sm:gap-4"><Link className="rounded-lg px-2 py-2 hover:text-white" href="/">图谱</Link><Link className="rounded-lg px-2 py-2 hover:text-white" href="/protocol">协议</Link></nav>
    </header>
    {children}
    <FaustChat />
  </body></html>;
}
