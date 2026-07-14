import Link from "next/link";
import { NodeDetailPanel } from "@/components/node/NodeDetailPanel";

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="min-h-screen px-3 pb-12 pt-[76px] sm:px-5"><div className="mx-auto max-w-5xl">
    <Link href="/" className="mb-3 inline-flex min-h-10 items-center rounded-full border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-300 backdrop-blur-xl hover:border-cyan-300/25 hover:text-cyan-200">← 返回图谱</Link>
    <NodeDetailPanel nodeId={id} standalone />
  </div>
  </main>;
}
