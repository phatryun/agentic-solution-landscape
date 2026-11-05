/**
 * PUT /api/submissions/[id]/approve
 * ADMIN/EDITOR only — approves a pending submission:
 *   1. Validates the submission
 *   2. Writes the .md to S3 vault
 *   3. Upserts the vector in S3 Vectors
 *   4. Creates/updates Solution in PostgreSQL
 *   5. Links Submission.solutionId
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { putSolution } from "@/lib/s3/vault";
import { upsertSolutionVector } from "@/lib/search/s3-vectors";
import { resolveAndStoreLogo } from "@/lib/s3/logos";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submission = await db.submission.findUnique({ where: { id: params.id } });
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.status === "APPROVED") {
    return NextResponse.json({ error: "Already approved" }, { status: 400 });
  }

  const slug = slugify(submission.name);
  const today = new Date().toISOString().split("T")[0];

  // Resolve + store the logo (explicit submission logo, else favicon from website).
  // Failure is non-fatal: the UI falls back to initials when `logo` is unset.
  const logo = await resolveAndStoreLogo(slug, {
    website: submission.website,
    logoUrl: submission.logo ?? undefined,
  });

  // Write .md to S3 vault
  await putSolution(
    slug,
    {
      id: slug,
      name: submission.name,
      category: submission.categorySlug,
      tags: submission.tags,
      website: submission.website,
      github: submission.github ?? undefined,
      added: today,
      last_updated: today,
      status: "active",
      logo,
      description_short: submission.description.slice(0, 200),
    },
    submission.description
  );

  // Upsert vector embedding
  await upsertSolutionVector(
    slug,
    `${submission.name} ${submission.description} ${submission.tags.join(" ")}`,
    {
      slug,
      name: submission.name,
      category: submission.categorySlug,
      tags: submission.tags,
      description_short: submission.description.slice(0, 200),
    }
  );

  // Ensure category exists
  await db.category.upsert({
    where: { slug: submission.categorySlug },
    create: { slug: submission.categorySlug, name: submission.categorySlug },
    update: {},
  });

  // Create Solution
  const solution = await db.solution.upsert({
    where: { slug },
    create: {
      slug,
      name: submission.name,
      categorySlug: submission.categorySlug,
      tags: submission.tags,
      website: submission.website,
      logo,
      status: "ACTIVE",
      approvedAt: new Date(),
    },
    update: {
      tags: submission.tags,
      logo,
      updatedAt: new Date(),
    },
  });

  // Link submission to solution and mark approved
  await db.submission.update({
    where: { id: submission.id },
    data: {
      status: "APPROVED",
      solutionId: solution.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, solution });
}
