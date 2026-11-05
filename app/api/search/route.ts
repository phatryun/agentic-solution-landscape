/**
 * POST /api/search
 * Semantic search over GenAI solutions using S3 Vectors.
 * Requires authentication.
 * Also used by the MCP server's search_solutions tool.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { semanticSearch } from "@/lib/search/s3-vectors";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db/client";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(1).max(500),
  topK: z.number().int().min(1).max(20).optional().default(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 searches per user per minute
  const rl = rateLimit(`search:${session.user.id}`, { maxRequests: 30, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { query, topK } = parsed.data;

  // Log the search
  await db.searchLog.create({
    data: { userId: session.user.id, query },
  });

  const results = await semanticSearch(query, topK);

  return NextResponse.json({ results, query });
}
