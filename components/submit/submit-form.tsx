"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";

const CATEGORIES = [
  "orchestration", "evaluation", "memory", "sdk",
  "platform", "web-search", "data", "observability",
];

interface SubmitResult {
  verdict: "approve" | "reject" | "needs_review";
  reason: string;
  submissionId: string;
}

export function SubmitForm() {
  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
    categorySlug: "",
    tags: "",
    github: "",
    logo: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          website: form.website,
          description: form.description,
          categorySlug: form.categorySlug,
          tags: form.tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
          github: form.github || undefined,
          logo: form.logo || undefined,
        }),
      });

      if (res.status === 429) {
        throw new Error("Too many submissions. Please wait before submitting again.");
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submission failed");
      }

      const data = await res.json();
      setResult({
        verdict: data.evaluation.verdict,
        reason: data.evaluation.reason,
        submissionId: data.submission.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        {result.verdict === "approve" ? (
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
        ) : result.verdict === "reject" ? (
          <XCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
        ) : (
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <span className="text-2xl">🔍</span>
          </div>
        )}

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {result.verdict === "approve"
            ? "Added to the landscape!"
            : result.verdict === "reject"
            ? "Not added"
            : "Under review"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">{result.reason}</p>

        <Button variant="outline" onClick={() => { setResult(null); setForm({ name: "", website: "", description: "", categorySlug: "", tags: "", github: "", logo: "" }); }}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
          Tool name <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. LangChain"
        />
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-foreground">
          Website <span className="text-destructive">*</span>
        </label>
        <input
          id="website"
          name="website"
          type="url"
          required
          value={form.website}
          onChange={handleChange}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="https://..."
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="categorySlug" className="mb-1.5 block text-sm font-medium text-foreground">
          Category <span className="text-destructive">*</span>
        </label>
        <select
          id="categorySlug"
          name="categorySlug"
          required
          value={form.categorySlug}
          onChange={handleChange}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a category…</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground">
          Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={500}
          rows={4}
          value={form.description}
          onChange={handleChange}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="What does this tool do? What problem does it solve?"
        />
        <p className="mt-1 text-xs text-muted-foreground">{form.description.length}/500</p>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="mb-1.5 block text-sm font-medium text-foreground">
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          value={form.tags}
          onChange={handleChange}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="python, rag, agent (comma-separated)"
        />
      </div>

      {/* GitHub */}
      <div>
        <label htmlFor="github" className="mb-1.5 block text-sm font-medium text-foreground">
          GitHub (optional)
        </label>
        <input
          id="github"
          name="github"
          type="url"
          value={form.github}
          onChange={handleChange}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="https://github.com/..."
        />
      </div>

      {/* Logo URL */}
      <div>
        <label htmlFor="logo" className="mb-1.5 block text-sm font-medium text-foreground">
          Logo URL (optional)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="logo"
            name="logo"
            type="url"
            value={form.logo}
            onChange={handleChange}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://.../logo.png"
          />
          {/* Live preview */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
            {form.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logo}
                alt="Logo preview"
                className="h-full w-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "visible"; }}
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Leave empty to auto-detect from the website favicon.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Evaluating with AI…
          </>
        ) : (
          "Submit tool"
        )}
      </Button>
    </form>
  );
}
