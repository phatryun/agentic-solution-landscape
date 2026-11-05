"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

interface SearchResult {
  slug: string;
  score: number;
  metadata: {
    name: string;
    category: string;
    tags: string[];
    description_short?: string;
  };
}

interface AgentAnswer {
  answer: string;
  sessionId: string;
}

export function SearchView() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"semantic" | "agent">("semantic");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [agentAnswer, setAgentAnswer] = useState<AgentAnswer | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setAgentAnswer(null);

    try {
      if (mode === "semantic") {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, topK: 10 }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Search failed");
        }
        const data = await res.json();
        setResults(data.results);
      } else {
        const res = await fetch("/api/agent/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, sessionId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Agent error");
        }
        const data = await res.json();
        setAgentAnswer(data);
        setSessionId(data.sessionId); // keep session for follow-up questions
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("semantic")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "semantic"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Vector search
        </button>
        <button
          onClick={() => setMode("agent")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "agent"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Ask AI
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "semantic"
              ? "e.g. evaluation framework for RAG pipelines"
              : "e.g. Which tools can run evaluations on golden datasets?"
          }
          className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={500}
          aria-label="Search query"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Vector search results */}
      {results && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} results</p>
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">No results found. Try a different query.</p>
          )}
          {results.map((r) => (
            <div
              key={r.slug}
              className="rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{r.metadata.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.metadata.category}</p>
                  {r.metadata.description_short && (
                    <p className="mt-1.5 text-sm text-foreground">{r.metadata.description_short}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.metadata.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {(r.score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent answer */}
      {agentAnswer && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI Answer
            </p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{agentAnswer.answer}</p>
          </div>

          {/* Follow-up input */}
          <p className="text-xs text-muted-foreground">
            You can ask a follow-up question — the AI remembers your conversation.
          </p>
        </div>
      )}
    </div>
  );
}
