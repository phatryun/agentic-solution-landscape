"use client";

import type { VaultDocument, SolutionFrontMatter } from "@/lib/s3/vault";
import { ExternalLink } from "lucide-react";
import { SolutionLogo } from "./solution-logo";

interface Props {
  solution: VaultDocument<SolutionFrontMatter>;
  onClick: () => void;
}

export function SolutionCard({ solution, onClick }: Props) {
  const { name, website, status, description_short, logo } = solution.frontMatter;

  return (
    <button
      onClick={onClick}
      title={description_short ?? name}
      className={`
        group relative flex flex-col items-center gap-1.5 rounded-lg glass glow-hover
        p-3 text-center
        hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        ${status === "deprecated" ? "opacity-50" : ""}
      `}
    >
      {/* Logo */}
      <SolutionLogo name={name} logo={logo} size={32} />

      <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
        {name}
      </span>

      {/* External link on hover */}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-1 top-1 hidden text-muted-foreground hover:text-primary group-hover:block"
          aria-label={`Open ${name} website`}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </button>
  );
}
