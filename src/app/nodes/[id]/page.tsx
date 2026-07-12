import { NodeDetailPanel } from "@/components/node/NodeDetailPanel";

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="mx-auto max-w-5xl px-4 pb-12 pt-24"><NodeDetailPanel nodeId={id} standalone /></main>;
}
