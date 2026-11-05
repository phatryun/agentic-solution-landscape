/**
 * GET /api/logos/[slug]
 * Serves a stored solution logo from the (private) vault bucket, same-origin.
 * Returns 404 if no logo is stored for the slug.
 */

import { NextRequest, NextResponse } from "next/server";
import { readLogoBytes } from "@/lib/s3/logos";

// Only allow safe kebab-case slugs — prevents path traversal into the bucket.
const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const logo = await readLogoBytes(slug);
  if (!logo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(logo.bytes), {
    status: 200,
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
