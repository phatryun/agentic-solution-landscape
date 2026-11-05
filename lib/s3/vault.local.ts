/**
 * Local mock for vault — used in dev when AWS is not configured.
 * Reads .md files directly from ./vault/ on the filesystem.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type {
  VaultDocument,
  SolutionFrontMatter,
  CategoryFrontMatter,
} from "./vault";

const VAULT_DIR = path.join(process.cwd(), "vault");

// Slug validation — only allow safe lowercase kebab-case slugs
function validateSlug(slug: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
    throw new Error(`Invalid slug: "${slug}". Only lowercase letters, numbers, and hyphens allowed.`);
  }
}

export function getSolutionLocal(slug: string): VaultDocument<SolutionFrontMatter> {
  validateSlug(slug);
  const filePath = path.join(VAULT_DIR, "solutions", `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { frontMatter: data as SolutionFrontMatter, content, slug };
}

export function listSolutionsLocal(): VaultDocument<SolutionFrontMatter>[] {
  const dir = path.join(VAULT_DIR, "solutions");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getSolutionLocal(f.replace(".md", "")));
}

export function getCategoryLocal(slug: string): VaultDocument<CategoryFrontMatter> {
  validateSlug(slug);
  const filePath = path.join(VAULT_DIR, "categories", `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { frontMatter: data as CategoryFrontMatter, content, slug };
}

export function listCategoriesLocal(): VaultDocument<CategoryFrontMatter>[] {
  const dir = path.join(VAULT_DIR, "categories");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getCategoryLocal(f.replace(".md", "")));
}
