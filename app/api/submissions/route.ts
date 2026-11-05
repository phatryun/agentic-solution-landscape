import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { evaluateSubmission } from "@/lib/agent/bedrock-agent";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const submitSchema = z.object({
  name: z.string().min(1).max(100),
  website: z.string().url().max(500),
  description: z.string().min(10).max(500),
  categorySlug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  tags: z.array(z.string().max(30).regex(/^[a-z0-9-]+$/)).max(10),
  github: z.string().url().max(500).optional().or(z.literal("")),
  logo: z.string().url().max(500).optional().or(z.literal("")),
});

// POST — submit a new tool
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 submissions per user per hour
  const rl = rateLimit(`submit:${session.user.id}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait before submitting again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Ask Bedrock agent to pre-evaluate the submission
  const evaluation = await evaluateSubmission({
    name: data.name,
    website: data.website,
    description: data.description,
    category: data.categorySlug,
    tags: data.tags,
  });

  const submission = await db.submission.create({
    data: {
      userId: session.user.id,
      name: data.name,
      website: data.website,
      description: data.description,
      categorySlug: data.categorySlug,
      tags: data.tags,
      github: data.github ?? null,
      logo: data.logo || null,
      status: evaluation.verdict === "approve" ? "APPROVED" : "PENDING",
      reviewNotes: evaluation.reason,
    },
  });

  return NextResponse.json({ submission, evaluation }, { status: 201 });
}

// GET — list submissions
// ADMIN/EDITOR: can filter by any status
// USER: can only see their own submissions
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "EDITOR";

  const where = isAdmin
    ? // Admins can filter by any status or see all
      status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}
    : // Regular users see only their own
      { userId: session.user.id };

  const submissions = await db.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ submissions });
}
