import { NodeDetailPanel } from "@/components/node/NodeDetailPanel";

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="mx-auto max-w-5xl px-2 pb-8 pt-16 sm:px-4 sm:pb-12 sm:pt-24"><NodeDetailPanel nodeId={id} standalone /></main>;
}
