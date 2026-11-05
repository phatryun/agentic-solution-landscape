/**
 * Logo storage — Second Brain assets
 *
 * Logos are the source-of-truth for a solution's icon. They are resolved ONCE
 * at write time (user submission or agent scan), stored in the vault bucket
 * under `logos/<slug>.png`, and referenced from the solution front-matter as a
 * same-origin path `/api/logos/<slug>`.
 *
 * Storing at write time (instead of hot-linking a third-party favicon at render
 * time) means:
 *   - the landscape renders without depending on an external service,
 *   - the PNG poster export works (same-origin image, no CORS taint),
 *   - the logo is versioned alongside the rest of the vault data.
 *
 * Resolution order:
 *   1. explicit logo URL (provided by the user or agent)
 *   2. favicon derived from the solution's website domain
 *   3. nothing — caller leaves front-matter `logo` unset and the UI falls back
 *      to initials.
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-1" });
const BUCKET = process.env.S3_VAULT_BUCKET;
const USE_LOCAL = process.env.USE_LOCAL_VAULT === "true";

const LOCAL_VAULT_DIR = path.join(process.cwd(), "vault");
const LOGO_PREFIX = "logos";
const MAX_LOGO_BYTES = 512 * 1024; // 512 KB cap — favicons/logos are small
const FETCH_TIMEOUT_MS = 5000;

/** Public, same-origin path the UI uses to request a stored logo. */
export function logoPublicPath(slug: string): string {
  return `/api/logos/${slug}`; // served by GET /api/logos/[slug]/route.ts
}

/** Derive a high-res favicon URL from a website, or null if unparseable. */
function faviconUrlFor(website?: string): string | null {
  if (!website) return null;
  try {
    const host = new URL(website).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}

/** Fetch image bytes with a size cap and timeout. Returns null on any failure. */
async function fetchImageBytes(
  url: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_LOGO_BYTES) return null;

    return { bytes: buf, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function storeBytes(slug: string, bytes: Buffer, contentType: string): Promise<void> {
  const key = `${LOGO_PREFIX}/${slug}.png`;
  if (USE_LOCAL) {
    const dir = path.join(LOCAL_VAULT_DIR, LOGO_PREFIX);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_VAULT_DIR, `${key}`), bytes);
    return;
  }
  if (!BUCKET) throw new Error("S3_VAULT_BUCKET not configured");
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: "public, max-age=86400",
    })
  );
}

/** Read stored logo bytes for serving. Returns null if absent. */
export async function readLogoBytes(
  slug: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const key = `${LOGO_PREFIX}/${slug}.png`;
  if (USE_LOCAL) {
    const file = path.join(LOCAL_VAULT_DIR, key);
    if (!fs.existsSync(file)) return null;
    return { bytes: fs.readFileSync(file), contentType: "image/png" };
  }
  if (!BUCKET) return null;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const bytes = Buffer.from(await res.Body!.transformToByteArray());
    return { bytes, contentType: res.ContentType ?? "image/png" };
  } catch {
    return null;
  }
}

/**
 * Resolve a logo for a solution and persist it.
 * Returns the front-matter `logo` value (same-origin path) or undefined if no
 * logo could be obtained.
 */
export async function resolveAndStoreLogo(
  slug: string,
  opts: { website?: string; logoUrl?: string }
): Promise<string | undefined> {
  // 1. explicit logo URL, then 2. derived favicon
  const candidates = [opts.logoUrl, faviconUrlFor(opts.website)].filter(
    (u): u is string => typeof u === "string" && u.length > 0
  );

  for (const url of candidates) {
    const img = await fetchImageBytes(url);
    if (img) {
      try {
        await storeBytes(slug, img.bytes, img.contentType);
        return logoPublicPath(slug);
      } catch {
        // storage failed — try next candidate
      }
    }
  }
  return undefined;
}
