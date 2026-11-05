"use client";

import { useEffect } from "react";
import type { VaultDocument, SolutionFrontMatter } from "@/lib/s3/vault";
import { X, ExternalLink, Github, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { SolutionLogo } from "./solution-logo";

interface Props {
  solution: VaultDocument<SolutionFrontMatter>;
  onClose: () => void;
}

export function SolutionModal({ solution, onClose }: Props) {
  const fm = solution.frontMatter;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="solution-modal-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl glass p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <SolutionLogo name={fm.name} logo={fm.logo} size={48} className="rounded-lg" />
          <div>
            <h2 id="solution-modal-title" className="text-xl font-semibold text-foreground">
              {fm.name}
            </h2>
            <span className="rounded-full border border-border/80 bg-secondary/60 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-secondary-foreground">
              {fm.category}
            </span>
          </div>
        </div>

        {/* Short description */}
        {fm.description_short && (
          <p className="mb-4 text-sm text-muted-foreground">{fm.description_short}</p>
        )}

        {/* Markdown body — rendered properly with sanitization */}
        {solution.content && (
          <MarkdownBody content={solution.content} />
        )}

        {/* Tags */}
        {fm.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {fm.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Links */}
        <div className="flex gap-3">
          {fm.website && (
            <a
              href={fm.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> Website
            </a>
          )}
          {fm.github && (
            <a
              href={fm.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
          )}
        </div>

        {/* Related */}
        {fm.related && fm.related.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Related
            </p>
            <div className="flex flex-wrap gap-1.5">
              {fm.related.map((slug) => (
                <span
                  key={slug}
                  className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground"
                >
                  {slug}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          Added: {fm.added} · Last updated: {fm.last_updated}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="mb-4 max-h-48 overflow-y-auto rounded-md bg-muted p-3 text-sm text-foreground prose prose-sm prose-neutral dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content.trim()}
      </ReactMarkdown>
    </div>
  );
}
