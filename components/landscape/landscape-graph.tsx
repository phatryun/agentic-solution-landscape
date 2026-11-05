"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { VaultDocument, SolutionFrontMatter, CategoryFrontMatter } from "@/lib/s3/vault";

// react-force-graph-2d touches `window`/`canvas` — load client-side only.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface Props {
  categories: VaultDocument<CategoryFrontMatter>[];
  solutions: VaultDocument<SolutionFrontMatter>[];
  onSelect: (solution: VaultDocument<SolutionFrontMatter>) => void;
}

type GraphNode = {
  id: string;
  label: string;
  kind: "category" | "solution";
  color: string;
  val: number; // relative size
  slug: string;
  description?: string;
};

type GraphLink = {
  source: string;
  target: string;
  kind: "membership" | "related";
};

const DEFAULT_COLOR = "#3b82f6";

export function LandscapeGraph({ categories, solutions, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);

  // Map category slug -> color for quick lookup.
  const categoryColor = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.slug, c.frontMatter.color ?? DEFAULT_COLOR));
    return map;
  }, [categories]);

  // Build nodes + links from the vault data.
  const graphData = useMemo(() => {
    const solutionSlugs = new Set(solutions.map((s) => s.slug));

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Category hub nodes.
    categories.forEach((c) => {
      const members = solutions.filter((s) => s.frontMatter.category === c.slug);
      if (members.length === 0) return;
      nodes.push({
        id: `cat:${c.slug}`,
        label: c.frontMatter.name,
        kind: "category",
        color: c.frontMatter.color ?? DEFAULT_COLOR,
        val: Math.max(8, members.length * 1.5),
        slug: c.slug,
        description: c.frontMatter.description,
      });
    });

    // Solution nodes + membership links to their category hub.
    solutions.forEach((s) => {
      const relatedCount = (s.frontMatter.related ?? []).filter((r) => solutionSlugs.has(r)).length;
      nodes.push({
        id: s.slug,
        label: s.frontMatter.name,
        kind: "solution",
        color: categoryColor.get(s.frontMatter.category) ?? DEFAULT_COLOR,
        val: 2 + relatedCount * 1.5,
        slug: s.slug,
        description: s.frontMatter.description_short,
      });

      const catId = `cat:${s.frontMatter.category}`;
      if (nodes.some((n) => n.id === catId)) {
        links.push({ source: catId, target: s.slug, kind: "membership" });
      }
    });

    // Related links between solutions (dedup, undirected).
    const seen = new Set<string>();
    solutions.forEach((s) => {
      (s.frontMatter.related ?? []).forEach((r) => {
        if (!solutionSlugs.has(r)) return;
        const key = [s.slug, r].sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        links.push({ source: s.slug, target: r, kind: "related" });
      });
    });

    return { nodes, links };
  }, [categories, solutions, categoryColor]);

  // Keep the canvas sized to its container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setDims({ width: el.clientWidth, height: Math.max(520, el.clientHeight) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[75vh] w-full overflow-hidden rounded-xl border"
      style={{ borderColor: "#1f2430", backgroundColor: "#0a0a0f" }}
    >
      <ForceGraph2D
        ref={graphRef}
        width={dims.width}
        height={dims.height}
        graphData={graphData}
        backgroundColor="#0a0a0f"
        cooldownTicks={120}
        onEngineStop={() => graphRef.current?.zoomToFit?.(400, 40)}
        nodeRelSize={4}
        nodeVal={(n: any) => (n as GraphNode).val}
        nodeLabel={() => ""}
        linkColor={(l: any) =>
          (l as GraphLink).kind === "related" ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.12)"
        }
        linkWidth={(l: any) => ((l as GraphLink).kind === "related" ? 1 : 0.5)}
        onNodeHover={(n: any) => setHoverNode((n as GraphNode) ?? null)}
        onNodeClick={(n: any) => {
          const node = n as GraphNode;
          if (node.kind !== "solution") {
            // Clicking a category hub focuses it instead of opening a modal.
            graphRef.current?.centerAt?.(n.x, n.y, 600);
            graphRef.current?.zoom?.(2.5, 600);
            return;
          }
          const sol = solutions.find((s) => s.slug === node.slug);
          if (sol) onSelect(sol);
        }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const n = node as GraphNode;
          const radius = Math.sqrt(Math.max(n.val, 1)) * 2;

          // Node circle.
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = n.color;
          ctx.globalAlpha = n.kind === "category" ? 0.95 : 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;

          if (n.kind === "category") {
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
          }

          // Labels: always for categories, for solutions only when zoomed in enough.
          const showLabel = n.kind === "category" || globalScale > 1.6;
          if (showLabel) {
            const fontSize = (n.kind === "category" ? 12 : 9) / globalScale;
            ctx.font = `${n.kind === "category" ? "700" : "500"} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = n.kind === "category" ? "#ffffff" : "#cbd5e1";
            ctx.fillText(n.label, node.x, node.y + radius + 1 / globalScale);
          }
        }}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const n = node as GraphNode;
          const radius = Math.sqrt(Math.max(n.val, 1)) * 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
      />

      {/* Hover tooltip */}
      {hoverNode && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg border border-white/10 bg-black/80 p-3 text-xs text-white shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: hoverNode.color }}
            />
            <span className="font-semibold">{hoverNode.label}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
              {hoverNode.kind}
            </span>
          </div>
          {hoverNode.description && (
            <p className="mt-1.5 leading-snug text-white/70">{hoverNode.description}</p>
          )}
          {hoverNode.kind === "solution" && (
            <p className="mt-1.5 text-[10px] text-white/40">Click to open details</p>
          )}
        </div>
      )}

      {/* Legend / controls */}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-[10px] text-white/60 backdrop-blur-sm">
        Scroll to zoom · drag to pan · node size ∝ related links
      </div>
    </div>
  );
}
