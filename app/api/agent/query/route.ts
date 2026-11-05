import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { queryLandscape } from "@/lib/agent/bedrock-agent";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(1).max(500),
  sessionId: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 agent queries per user per minute (Bedrock calls are expensive)
  const rl = rateLimit(`agent:${session.user.id}`, { maxRequests: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { query, sessionId } = parsed.data;
  const sid = sessionId ?? `user-${session.user.id}-${Date.now()}`;

  try {
    const answer = await queryLandscape(query, sid);
    return NextResponse.json({ answer, sessionId: sid });
  } catch (err) {
    console.error("[agent/query]", err);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}
