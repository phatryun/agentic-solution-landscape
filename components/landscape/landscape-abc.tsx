"use client";

import { useMemo } from "react";
import type { VaultDocument, SolutionFrontMatter, CategoryFrontMatter } from "@/lib/s3/vault";
import { SolutionLogo } from "./solution-logo";

interface Props {
  categories: VaultDocument<CategoryFrontMatter>[];
  solutions: VaultDocument<SolutionFrontMatter>[];
  onSelect: (solution: VaultDocument<SolutionFrontMatter>) => void;
}

const DEFAULT_COLOR = "#3b82f6";

/** First letter for grouping — digits/symbols collapse under "#". */
function initialOf(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

export function LandscapeAbc({ categories, solutions, onSelect }: Props) {
  const categoryColor = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.slug, c.frontMatter.color ?? DEFAULT_COLOR));
    return map;
  }, [categories]);

  // Sort A→Z across all categories, then group by initial letter.
  const groups = useMemo(() => {
    const sorted = [...solutions].sort((a, b) =>
      a.frontMatter.name.localeCompare(b.frontMatter.name, undefined, { sensitivity: "base" })
    );
    const map = new Map<string, VaultDocument<SolutionFrontMatter>[]>();
    for (const s of sorted) {
      const key = initialOf(s.frontMatter.name);
      (map.get(key) ?? map.set(key, []).get(key)!).push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [solutions]);

  const letters = groups.map(([letter]) => letter);

  return (
    <div>
      {/* Jump-to-letter index */}
      <nav
        aria-label="Jump to letter"
        className="sticky top-14 z-10 mb-6 flex flex-wrap justify-center gap-1 rounded-lg glass p-2"
      >
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#abc-${letter}`}
            className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-gradient-neon hover:text-background"
          >
            {letter}
          </a>
        ))}
      </nav>

      {/* Letter sections */}
      {groups.map(([letter, items]) => (
        <section key={letter} id={`abc-${letter}`} className="mb-8 scroll-mt-28">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-mono text-2xl font-bold text-gradient">{letter}</h2>
            <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {items.map((sol) => {
              const fm = sol.frontMatter;
              const color = categoryColor.get(fm.category) ?? DEFAULT_COLOR;
              return (
                <button
                  key={sol.slug}
                  onClick={() => onSelect(sol)}
                  title={fm.description_short ?? fm.name}
                  className={`group relative flex flex-col items-center gap-2 rounded-lg glass glow-hover p-3 text-center hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    fm.status === "deprecated" ? "opacity-50" : ""
                  }`}
                >
                  {/* Category color dot */}
                  <span
                    className="absolute left-2 top-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                    aria-hidden="true"
                  />
                  <SolutionLogo
                    name={fm.name}
                    logo={fm.logo}
                    size={40}
                  />
                  <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                    {fm.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
