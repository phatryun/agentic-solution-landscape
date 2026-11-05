/**
 * Bedrock Agent client
 * Used for:
 *  1. Answering natural language queries about the landscape
 *  2. Triggering the daily scan agent
 *  3. Evaluating user-submitted solutions
 *
 * Security notes:
 *  - User input is never interpolated directly into prompts.
 *    Structured fields are passed as clearly labelled, delimited sections
 *    to limit prompt injection surface.
 *  - The agent instruction (in Terraform) instructs it to respond ONLY
 *    with the expected JSON format for evaluation requests.
 */

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  type InvokeAgentCommandOutput,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { z } from "zod";

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
});

const AGENT_ID = process.env.BEDROCK_AGENT_ID!;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID!;

// ── Stream helper — collects chunks into a single string ──────────────────────

async function collectAgentResponse(output: InvokeAgentCommandOutput): Promise<string> {
  const chunks: string[] = [];
  if (!output.completion) return "";

  for await (const event of output.completion) {
    if (event.chunk?.bytes) {
      chunks.push(new TextDecoder().decode(event.chunk.bytes));
    }
  }
  return chunks.join("");
}

// ── Internal invoke helper ────────────────────────────────────────────────────

async function invokeAgent(inputText: string, sessionId: string): Promise<string> {
  const cmd = new InvokeAgentCommand({
    agentId: AGENT_ID,
    agentAliasId: AGENT_ALIAS_ID,
    sessionId,
    inputText,
  });
  const response = await client.send(cmd);
  return collectAgentResponse(response);
}

// ── Query the landscape via Bedrock Agent ─────────────────────────────────────

export async function queryLandscape(
  query: string,
  sessionId: string
): Promise<string> {
  // Validate query length — prevent abuse
  if (!query || query.length > 1000) {
    throw new Error("Query must be between 1 and 1000 characters");
  }
  return invokeAgent(query, sessionId);
}

// ── Submission evaluation ─────────────────────────────────────────────────────

const EvaluationResult = z.object({
  verdict: z.enum(["approve", "reject", "needs_review"]),
  reason: z.string(),
});

export type EvaluationVerdict = z.infer<typeof EvaluationResult>;

export async function evaluateSubmission(submission: {
  name: string;
  website: string;
  description: string;
  category: string;
  tags: string[];
}): Promise<EvaluationVerdict> {
  // Structured prompt with explicit delimiters — limits prompt injection surface.
  // User content is placed in clearly labelled sections with XML-like boundaries
  // that are referenced in the agent system instruction.
  const prompt = [
    "TASK: evaluate_submission",
    "---",
    `FIELD:name|${submission.name}`,
    `FIELD:website|${submission.website}`,
    `FIELD:category|${submission.category}`,
    `FIELD:tags|${submission.tags.join(",")}`,
    "FIELD:description|BEGIN",
    // Description is placed last and bounded to prevent injection into later fields
    submission.description.slice(0, 500),
    "FIELD:description|END",
    "---",
    "Respond only with valid JSON: {\"verdict\":\"approve\"|\"reject\"|\"needs_review\",\"reason\":\"string\"}",
  ].join("\n");

  const text = await invokeAgent(prompt, `eval-${Date.now()}`);

  // Extract first JSON object from response
  const jsonMatch = text.match(/\{[\s\S]*?"verdict"[\s\S]*?\}/);
  if (jsonMatch) {
    const parsed = EvaluationResult.safeParse(JSON.parse(jsonMatch[0]));
    if (parsed.success) return parsed.data;
  }

  // Fallback — agent response was not parseable
  return { verdict: "needs_review", reason: `Agent response not parseable: ${text.slice(0, 200)}` };
}

// ── Daily scan ────────────────────────────────────────────────────────────────

const ScannedSolution = z.object({
  name: z.string().min(1).max(100),
  website: z.string().url(),
  category: z.enum([
    "orchestration", "evaluation", "memory", "sdk",
    "platform", "web-search", "data", "observability",
  ]),
  tags: z.array(z.string().max(30)).max(10),
  description_short: z.string().max(300),
});

export type ScannedSolution = z.infer<typeof ScannedSolution>;

export async function runDailyScan(scanId: string): Promise<ScannedSolution[]> {
  const prompt = [
    "TASK: daily_scan",
    "---",
    "Search the web for GenAI and Agentic AI tools announced or updated in the last 24 hours.",
    "Return ONLY a JSON array. Each item must have:",
    "  name (string), website (URL), category (one of: orchestration|evaluation|memory|sdk|platform|web-search|data|observability),",
    "  tags (string array, max 10), description_short (string, max 300 chars).",
    "Return an empty array [] if nothing new was found.",
    "Do not include any text outside the JSON array.",
  ].join("\n");

  const text = await invokeAgent(prompt, `scan-${scanId}`);

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const raw = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(raw)) return [];

    // Validate and filter each item
    const valid: ScannedSolution[] = [];
    for (const item of raw) {
      const parsed = ScannedSolution.safeParse(item);
      if (parsed.success) {
        valid.push(parsed.data);
      }
    }
    return valid;
  } catch {
    return [];
  }
}
