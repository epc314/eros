import type { Metadata } from "next";
import Link from "next/link";
import { PROTOCOL_VERSION } from "@/lib/protocol/constants";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eros — deterministic digital evolution",
  description: "A public world of immutable 512-bit entities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#080b12]/85 px-5 backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 font-black text-white">E</span><span><b>Eros</b><small className="ml-2 text-slate-500">{PROTOCOL_VERSION}</small></span></Link>
      <nav className="flex gap-4 text-sm text-slate-400"><Link className="hover:text-white" href="/">图谱</Link><Link className="hover:text-white" href="/protocol">协议</Link></nav>
    </header>
    {children}
  </body></html>;
}
