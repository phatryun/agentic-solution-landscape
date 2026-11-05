/**
 * S3 Vault — Second Brain
 * Reads/writes Markdown files (solutions & categories) from/to S3.
 * Front-matter is parsed with gray-matter.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import matter from "gray-matter";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-1" });
const BUCKET = process.env.S3_VAULT_BUCKET!;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SolutionFrontMatter {
  id: string;
  name: string;
  category: string;
  tags: string[];
  website?: string;
  github?: string;
  added: string;
  last_updated: string;
  status: "active" | "deprecated" | "pending";
  related?: string[];
  logo?: string;
  description_short?: string;
}

export interface CategoryFrontMatter {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
}

export interface VaultDocument<T> {
  frontMatter: T;
  content: string; // markdown body
  slug: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getObject(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  return res.Body!.transformToString();
}

async function putObject(key: string, body: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "text/markdown; charset=utf-8",
    })
  );
}

async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    (res.Contents ?? []).forEach((o) => { if (o.Key) keys.push(o.Key); });
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

// ── Solutions ─────────────────────────────────────────────────────────────────

export async function getSolution(slug: string): Promise<VaultDocument<SolutionFrontMatter>> {
  const raw = await getObject(`solutions/${slug}.md`);
  const { data, content } = matter(raw);
  return { frontMatter: data as SolutionFrontMatter, content, slug };
}

export async function listSolutions(): Promise<VaultDocument<SolutionFrontMatter>[]> {
  const keys = await listKeys("solutions/");
  return Promise.all(
    keys.map(async (key) => {
      const slug = key.replace("solutions/", "").replace(".md", "");
      return getSolution(slug);
    })
  );
}

export async function putSolution(
  slug: string,
  frontMatter: SolutionFrontMatter,
  content: string
): Promise<void> {
  const raw = matter.stringify(content, frontMatter);
  await putObject(`solutions/${slug}.md`, raw);
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategory(slug: string): Promise<VaultDocument<CategoryFrontMatter>> {
  const raw = await getObject(`categories/${slug}.md`);
  const { data, content } = matter(raw);
  return { frontMatter: data as CategoryFrontMatter, content, slug };
}

export async function listCategories(): Promise<VaultDocument<CategoryFrontMatter>[]> {
  const keys = await listKeys("categories/");
  return Promise.all(
    keys.map(async (key) => {
      const slug = key.replace("categories/", "").replace(".md", "");
      return getCategory(slug);
    })
  );
}
