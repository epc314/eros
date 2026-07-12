"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from "@xyflow/react";
import { ancestorIds, descendantIds } from "@/lib/graph/traversal";
import { layoutGraph } from "@/lib/graph/layout";
import { decodeGenome } from "@/lib/protocol/token-decoder";
import { GraphNodeCard, type ErosNodeData } from "./GraphNodeCard";
import type { GraphPayload } from "./types";
import { NodeDetailPanel } from "../node/NodeDetailPanel";
import { ReproductionPanel } from "../reproduction/ReproductionPanel";

const nodeTypes = { eros: GraphNodeCard };

function GraphCanvas() {
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState("all");
  const [rootsOnly, setRootsOnly] = useState(false);
  const [focusMode, setFocusMode] = useState<"all" | "ancestors" | "descendants">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parentIds, setParentIds] = useState<[string, string]>(["", ""]);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { fitView } = useReactFlow();

  const load = useCallback(async () => {
    const response = await fetch("/api/graph", { cache: "no-store" });
    const body = await response.json() as GraphPayload & { error?: { message?: string } };
    if (!response.ok) { setFailure(body.error?.message ?? "无法载入世界"); return; }
    setPayload(body); setFailure("");
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const nodeById = useMemo(() => new Map(payload?.nodes.map((node) => [node.id, node]) ?? []), [payload]);
  useEffect(() => {
    setParentIds((current) => {
      const next = current.map((id) => id && nodeById.get(id)?.isDead ? "" : id) as [string, string];
      return next[0] === current[0] && next[1] === current[1] ? current : next;
    });
  }, [nodeById]);
  const entitySummaries = useMemo(() => {
    const summaries = new Map<string, { primaryEntity: string; primaryEntityZh: string; auxiliaryEntities: string[]; auxiliaryEntitiesZh: string[] }>();
    for (const node of payload?.nodes ?? []) {
      const anchors = decodeGenome(node.genomeHex, undefined, node.promptVersion).filter((token) => token.kind === "entity-anchor");
      const primary = anchors.find((token) => token.role === "primary")!;
      const auxiliaries = anchors.filter((token) => token.role === "auxiliary");
      summaries.set(node.id, { primaryEntity: primary.entity, primaryEntityZh: primary.entityZh,
        auxiliaryEntities: auxiliaries.map((token) => token.entity), auxiliaryEntitiesZh: auxiliaries.map((token) => token.entityZh) });
    }
    return summaries;
  }, [payload]);

  const graph = useMemo(() => {
    if (!payload) return { nodes: [] as Node<ErosNodeData>[], edges: [] as Edge[] };
    let allowed = new Set(payload.nodes.map(({ id }) => id));
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) allowed = new Set(payload.nodes.filter((node) => node.name.toLowerCase().includes(normalizedQuery) || node.genomeHex.includes(normalizedQuery) || node.id.includes(normalizedQuery)).map(({ id }) => id));
    if (generation !== "all") allowed = new Set([...allowed].filter((id) => nodeById.get(id)?.generation === Number(generation)));
    if (rootsOnly) allowed = new Set([...allowed].filter((id) => nodeById.get(id)?.type === "GENESIS"));
    if (selectedId && focusMode !== "all") {
      const edges = payload.edges.map((edge) => ({ parentNodeId: edge.parentNodeId, childNodeId: edge.childNodeId }));
      const connected = focusMode === "ancestors" ? ancestorIds(selectedId, edges) : descendantIds(selectedId, edges);
      allowed = new Set([...allowed].filter((id) => connected.has(id)));
    }
    const edges: Edge[] = payload.edges.filter((edge) => allowed.has(edge.parentNodeId) && allowed.has(edge.childNodeId)).map((edge) => ({
      id: edge.id, source: edge.parentNodeId, target: edge.childNodeId, label: "亲本", type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" }, style: { stroke: "#475569" },
    }));
    const nodes: Node<ErosNodeData>[] = payload.nodes.filter((node) => allowed.has(node.id)).map((node) => {
      const summary = entitySummaries.get(node.id)!;
      return { id: node.id, type: "eros", position: { x: 0, y: 0 }, data: {
        name: node.name, genomeHex: node.genomeHex, type: node.type, generation: node.generation,
        isDead: node.isDead,
        descriptionCount: node._count.descriptions, imageCount: node._count.images,
        image: node.images[0]?.thumbnailUrl ?? node.images[0]?.imageDataUrl ?? node.images[0]?.imageUrl ?? undefined,
        instability: node.reproduction?.mutationBitCount,
        ...summary,
        selectedAs: parentIds[0] === node.id ? "A" : parentIds[1] === node.id ? "B" : undefined,
      } };
    });
    return { nodes: layoutGraph(nodes, edges), edges };
  }, [payload, query, generation, rootsOnly, selectedId, focusMode, parentIds, nodeById, entitySummaries]);

  function selectAsParent(id: string) {
    if (nodeById.get(id)?.isDead) return;
    if (parentIds[0] === id || parentIds[1] === id) return;
    setParentIds(parentIds[0] ? [parentIds[0], id] : [id, parentIds[1]]);
    if (isMobile) setSelectedId(null);
  }

  if (failure) return <main className="grid min-h-screen place-items-center p-8"><div className="glass max-w-lg rounded-3xl p-8"><h1 className="text-2xl font-semibold">Eros 世界尚未初始化</h1><p className="mt-3 text-slate-400">{failure}</p><code className="mt-5 block rounded-xl bg-black/30 p-4 text-cyan-300">npm run db:seed</code></div></main>;
  if (!payload) return <main className="grid min-h-screen place-items-center text-slate-500">正在载入 Eros 世界…</main>;
  const generations = [...new Set(payload.nodes.map((node) => node.generation))].sort((a, b) => a - b);
  return <main className="flex h-[100dvh] gap-3 overflow-hidden px-2 pb-2 pt-16 sm:px-3 sm:pb-3 md:pt-[76px]">
    <section className="glass relative min-w-0 flex-1 overflow-hidden rounded-2xl sm:rounded-3xl">
      <div className="absolute left-2 right-2 top-2 z-10 sm:left-4 sm:right-4 sm:top-4 md:flex md:items-start md:gap-2">
        <div className="glass flex w-full items-center rounded-xl px-3 md:min-w-[240px] md:flex-1"><span className="text-slate-500">⌕</span><input aria-label="搜索名称或 Hash" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称 / Hash" className="min-w-0 w-full bg-transparent p-2 text-sm outline-none" /></div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:mt-0 md:flex-wrap md:overflow-visible">
          <select aria-label="代数过滤" value={generation} onChange={(event) => setGeneration(event.target.value)} className="glass min-h-11 shrink-0 rounded-xl px-3 text-sm"><option value="all">全部代数</option>{generations.map((item) => <option key={item} value={item}>Generation {item}</option>)}</select>
          <button onClick={() => setRootsOnly((value) => !value)} className={`glass min-h-11 shrink-0 rounded-xl px-3 text-sm ${rootsOnly ? "text-cyan-300" : "text-slate-400"}`}>只看创世</button>
          <select aria-label="关系过滤" value={focusMode} onChange={(event) => setFocusMode(event.target.value as typeof focusMode)} className="glass min-h-11 shrink-0 rounded-xl px-3 text-sm"><option value="all">完整图谱</option><option value="ancestors">所选存在祖先</option><option value="descendants">所选存在后代</option></select>
          <button onClick={() => fitView({ duration: 500, padding: isMobile ? .08 : .2, minZoom: isMobile ? .5 : .12 })} className="glass min-h-11 shrink-0 rounded-xl px-3 text-sm text-slate-300">适应画布</button>
        </div>
      </div>
      <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} onNodeClick={(_, node) => { setSelectedId(node.id); setMobilePanelOpen(false); }} fitView fitViewOptions={{ padding: isMobile ? .08 : .2, minZoom: isMobile ? .5 : .12 }} minZoom={isMobile ? .35 : .12} maxZoom={1.6} nodesDraggable={false} onlyRenderVisibleElements proOptions={{ hideAttribution: true }}>
        <Background color="#253044" gap={26} size={1} /><Controls position="bottom-left" showInteractive={false}/>{!isMobile && <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => (node.data.type === "GENESIS" ? "#22d3ee" : "#d946ef")} maskColor="rgba(8,11,18,.72)" />}
      </ReactFlow>
      <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs text-slate-400 sm:block">{graph.nodes.length} 存在 · {graph.edges.length} 亲本边 · 点击存在查看详情</div>
      <button type="button" onClick={() => { setSelectedId(null); setMobilePanelOpen(true); }} className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-20 min-h-12 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-5 text-sm font-semibold text-white shadow-xl shadow-fuchsia-950/40 md:hidden">繁衍 / 创世{parentIds.filter(Boolean).length ? ` · ${parentIds.filter(Boolean).length}/2` : ""}</button>
    </section>
    <ReproductionPanel nodes={payload.nodes} parentIds={parentIds} setParentIds={setParentIds} mobileOpen={mobilePanelOpen} onMobileClose={() => setMobilePanelOpen(false)} onCreated={(id) => { setSelectedId(id); setMobilePanelOpen(false); void load(); }} />
    {selectedId && <NodeDetailPanel key={selectedId} nodeId={selectedId} initialNode={nodeById.get(selectedId)} onClose={() => setSelectedId(null)} onSelectParent={selectAsParent} onNodeChanged={load} />}
  </main>;
}

export function ErosGraph() { return <ReactFlowProvider><GraphCanvas /></ReactFlowProvider>; }
