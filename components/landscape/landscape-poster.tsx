"use client";

import { useRef, useState } from "react";
import type { VaultDocument, SolutionFrontMatter, CategoryFrontMatter } from "@/lib/s3/vault";
import { Download, Loader2 } from "lucide-react";
import { SolutionLogo } from "./solution-logo";

interface Props {
  categories: VaultDocument<CategoryFrontMatter>[];
  solutions: VaultDocument<SolutionFrontMatter>[];
  onSelect: (solution: VaultDocument<SolutionFrontMatter>) => void;
}

const POSTER_BG = "#0a0a0f";
const DEFAULT_COLOR = "#3b82f6";

/** Pick readable text color (black/white) for a given hex background. */
function readableText(hex: string): string {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0a0f" : "#ffffff";
}

export function LandscapePoster({ categories, solutions, onSelect }: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const sortedCategories = [...categories].sort(
    (a, b) => (a.frontMatter.order ?? 0) - (b.frontMatter.order ?? 0)
  );

  async function exportPng() {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: POSTER_BG,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `genai-landscape-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* Export control (outside the captured poster) */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={exportPng}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export PNG
        </button>
      </div>

      {/* Captured poster */}
      <div
        ref={posterRef}
        className="overflow-hidden rounded-xl"
        style={{ backgroundColor: POSTER_BG }}
      >
        {/* Poster title bar */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #1f2430" }}
        >
          <h2
            className="text-xl font-bold tracking-tight text-white"
            style={{ fontStretch: "condensed", letterSpacing: "-0.01em" }}
          >
            <span style={{ color: "#f97316" }}>██</span> GenAI &amp; Agentic Landscape {new Date().getFullYear()}
          </h2>
          <span className="text-xs font-medium uppercase tracking-widest text-white/40">
            {solutions.length} tools · {sortedCategories.length} categories
          </span>
        </div>

        {/* Category bands */}
        <div className="flex flex-col gap-px">
          {sortedCategories.map((cat) => {
            const catSolutions = solutions
              .filter((s) => s.frontMatter.category === cat.slug)
              .sort((a, b) => a.frontMatter.name.localeCompare(b.frontMatter.name));
            if (catSolutions.length === 0) return null;

            const color = cat.frontMatter.color ?? DEFAULT_COLOR;
            const textOnColor = readableText(color);

            return (
              <section key={cat.slug} className="flex items-stretch">
                {/* Category header strip (vertical label block) */}
                <div
                  className="flex w-44 shrink-0 flex-col justify-center px-4 py-2"
                  style={{ backgroundColor: color }}
                >
                  <span
                    className="text-sm font-bold uppercase leading-tight"
                    style={{ color: textOnColor, fontStretch: "condensed", letterSpacing: "0.02em" }}
                  >
                    {cat.frontMatter.name}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: textOnColor, opacity: 0.7 }}>
                    {catSolutions.length} tools
                  </span>
                </div>

                {/* Solution tiles */}
                <div
                  className="flex flex-1 flex-wrap content-start gap-1 p-1.5"
                  style={{ backgroundColor: "#111218" }}
                >
                  {catSolutions.map((sol) => {
                    const deprecated = sol.frontMatter.status === "deprecated";
                    return (
                      <button
                        key={sol.slug}
                        onClick={() => onSelect(sol)}
                        title={sol.frontMatter.description_short ?? sol.frontMatter.name}
                        className="flex items-center gap-1.5 rounded border px-2 py-1 text-left transition-colors hover:border-white/40"
                        style={{
                          borderColor: "#262a35",
                          backgroundColor: "#1a1c24",
                          opacity: deprecated ? 0.45 : 1,
                        }}
                      >
                        <SolutionLogo
                          name={sol.frontMatter.name}
                          logo={sol.frontMatter.logo}
                          size={16}
                          fallbackBg={color}
                          fallbackColor={textOnColor}
                          className="rounded-sm"
                        />
                        <span
                          className="whitespace-nowrap text-xs font-medium text-white"
                          style={{ fontStretch: "condensed" }}
                        >
                          {sol.frontMatter.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 text-center text-[10px] uppercase tracking-widest text-white/30"
          style={{ borderTop: "1px solid #1f2430" }}
        >
          Updated daily by AI · genai-landscape
        </div>
      </div>
    </div>
  );
}
