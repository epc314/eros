import { TreasureDetailPanel } from "@/components/treasure/TreasureDetailPanel";

export default async function TreasurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreasureDetailPanel treasureId={id} />;
}
