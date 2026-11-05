"use client";

import { useState } from "react";
import type { VaultDocument, SolutionFrontMatter, CategoryFrontMatter } from "@/lib/s3/vault";
import { SolutionCard } from "./solution-card";
import { SolutionModal } from "./solution-modal";
import { LandscapePoster } from "./landscape-poster";
import { LandscapeGraph } from "./landscape-graph";
import { LandscapeAbc } from "./landscape-abc";
import { Navbar } from "@/components/layout/navbar";
import { LayoutGrid, LayoutPanelTop, Share2, ArrowDownAZ } from "lucide-react";

interface Props {
  categories: VaultDocument<CategoryFrontMatter>[];
  solutions: VaultDocument<SolutionFrontMatter>[];
}

type ViewMode = "grid" | "abc" | "poster" | "graph";

const MODES: { id: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "abc", label: "A-Z", icon: ArrowDownAZ },
  { id: "poster", label: "Poster", icon: LayoutPanelTop },
  { id: "graph", label: "Graph", icon: Share2 },
];

export function LandscapeView({ categories, solutions }: Props) {
  const [selected, setSelected] = useState<VaultDocument<SolutionFrontMatter> | null>(null);
  const [mode, setMode] = useState<ViewMode>("grid");

  const sortedCategories = [...categories].sort(
    (a, b) => (a.frontMatter.order ?? 0) - (b.frontMatter.order ?? 0)
  );

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-screen-2xl px-4 py-8">
        <header className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 glass px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))] animate-glow-pulse" />
            curated by AI · updated daily
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-gradient">GenAI &amp; Agentic Landscape</span>
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            <span className="text-foreground">{solutions.length}</span> tools
            <span className="mx-2 text-border">/</span>
            <span className="text-foreground">{categories.length}</span> categories
          </p>
        </header>

        {/* Mode switcher */}
        <div className="mb-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Visualization mode"
            className="inline-flex items-center gap-1 rounded-lg glass p-1"
          >
            {MODES.map(({ id, label, icon: Icon }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-gradient-neon text-background shadow-[0_0_20px_-4px_hsl(var(--primary)/0.7)]"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mode: Grid (original) ─────────────────────────────── */}
        {mode === "grid" &&
          sortedCategories.map((cat) => {
            const catSolutions = solutions.filter(
              (s) => s.frontMatter.category === cat.slug
            );
            if (catSolutions.length === 0) return null;

            return (
              <section key={cat.slug} className="mb-10">
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
                  style={{
                    color: cat.frontMatter.color ?? "#a855f7",
                    borderColor: `${cat.frontMatter.color ?? "#a855f7"}66`,
                    backgroundColor: `${cat.frontMatter.color ?? "#a855f7"}1a`,
                    boxShadow: `0 0 24px -8px ${cat.frontMatter.color ?? "#a855f7"}`,
                  }}
                >
                  {cat.frontMatter.name}
                  <span className="rounded-full bg-background/40 px-2 py-0.5 font-mono text-xs">
                    {catSolutions.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                  {catSolutions.map((sol) => (
                    <SolutionCard
                      key={sol.slug}
                      solution={sol}
                      onClick={() => setSelected(sol)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

        {/* ── Mode: A-Z (alphabetical) ──────────────────────────── */}
        {mode === "abc" && (
          <LandscapeAbc
            categories={categories}
            solutions={solutions}
            onSelect={setSelected}
          />
        )}

        {/* ── Mode: Poster ──────────────────────────────────────── */}
        {mode === "poster" && (
          <LandscapePoster
            categories={categories}
            solutions={solutions}
            onSelect={setSelected}
          />
        )}

        {/* ── Mode: Graph ───────────────────────────────────────── */}
        {mode === "graph" && (
          <LandscapeGraph
            categories={categories}
            solutions={solutions}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Solution detail modal (shared across modes) */}
      {selected && (
        <SolutionModal solution={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
