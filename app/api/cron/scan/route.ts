/**
 * POST /api/cron/scan
 * Called by EventBridge → Lambda daily.
 * Protected by a shared secret resolved from Secrets Manager at runtime.
 */

import { NextRequest, NextResponse } from "next/server";
import { runDailyScan } from "@/lib/agent/bedrock-agent";
import { putSolution } from "@/lib/s3/vault";
import { upsertSolutionVector } from "@/lib/search/s3-vectors";
import { resolveAndStoreLogo } from "@/lib/s3/logos";
import { db } from "@/lib/db/client";
import { getCronSecret } from "@/lib/secrets/manager";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  // Validate cron secret — resolved at runtime from Secrets Manager
  const expectedSecret = await getCronSecret();
  const providedSecret = req.headers.get("x-cron-secret");

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const log = await db.agentScanLog.create({ data: {} });

  try {
    // Run the Bedrock Agent scan — returns a validated array of solutions
    const scanned = await runDailyScan(log.id);

    let newCount = 0;
    let updatedCount = 0;

    for (const tool of scanned) {
      const slug = slugify(tool.name);
      const today = new Date().toISOString().split("T")[0];

      // Check if solution already exists in DB
      const existing = await db.solution.findUnique({ where: { slug } });

      // Resolve + store the logo from the tool's website (favicon).
      // Non-fatal on failure: UI falls back to initials when `logo` is unset.
      const logo = await resolveAndStoreLogo(slug, { website: tool.website });

      // Write Markdown to S3 vault
      await putSolution(slug, {
        id: slug,
        name: tool.name,
        category: tool.category,
        tags: tool.tags,
        website: tool.website,
        added: existing?.createdAt.toISOString().split("T")[0] ?? today,
        last_updated: today,
        status: "active",
        logo,
        description_short: tool.description_short,
      }, `Discovered via daily agent scan on ${today}.`);

      // Upsert vector embedding
      await upsertSolutionVector(slug, `${tool.name} ${tool.description_short} ${tool.tags.join(" ")}`, {
        slug,
        name: tool.name,
        category: tool.category,
        tags: tool.tags,
        description_short: tool.description_short,
      });

      // Upsert in PostgreSQL — ensure category exists first
      await db.category.upsert({
        where: { slug: tool.category },
        create: { slug: tool.category, name: tool.category },
        update: {},
      });

      if (existing) {
        await db.solution.update({
          where: { slug },
          data: { tags: tool.tags, logo, updatedAt: new Date() },
        });
        updatedCount++;
      } else {
        await db.solution.create({
          data: {
            slug,
            name: tool.name,
            categorySlug: tool.category,
            tags: tool.tags,
            website: tool.website,
            logo,
            status: "ACTIVE",
            approvedAt: new Date(),
          },
        });
        newCount++;
      }
    }

    await db.agentScanLog.update({
      where: { id: log.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        newSolutions: newCount,
        updatedSolutions: updatedCount,
      },
    });

    return NextResponse.json({
      ok: true,
      scanId: log.id,
      newSolutions: newCount,
      updatedSolutions: updatedCount,
    });
  } catch (err) {
    console.error("[cron/scan]", err);
    await db.agentScanLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: String(err),
      },
    });
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
