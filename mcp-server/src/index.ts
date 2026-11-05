/**
 * GenAI Landscape — MCP Server
 *
 * Exposes the landscape data (solutions, categories, semantic search)
 * via the Model Context Protocol so external agents can query it.
 *
 * Tools exposed:
 *  - list_categories        — list all categories
 *  - list_solutions         — list all solutions (optionally filtered by category)
 *  - get_solution           — get full details of a solution by slug
 *  - search_solutions       — semantic search across solutions
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import matter from "gray-matter";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-1" });
const BUCKET = process.env.S3_VAULT_BUCKET!;

// ── S3 helpers ────────────────────────────────────────────────────────────────

async function getMarkdown(key: string): Promise<{ frontMatter: Record<string, unknown>; content: string }> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const raw = await res.Body!.transformToString();
  const { data, content } = matter(raw);
  return { frontMatter: data, content };
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

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "genai-landscape", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_categories",
      description: "List all GenAI landscape categories with metadata",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_solutions",
      description: "List all solutions, optionally filtered by category slug",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category slug (optional)" },
        },
      },
    },
    {
      name: "get_solution",
      description: "Get full details of a solution by its slug",
      inputSchema: {
        type: "object",
        required: ["slug"],
        properties: {
          slug: { type: "string", description: "Solution slug (e.g. langchain)" },
        },
      },
    },
    {
      name: "search_solutions",
      description: "Semantic search across all GenAI solutions",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Natural language search query" },
          top_k: { type: "number", description: "Number of results (default 5)" },
        },
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "list_categories") {
    const keys = await listKeys("categories/");
    const categories = await Promise.all(
      keys.map(async (key) => {
        const slug = key.replace("categories/", "").replace(".md", "");
        const { frontMatter } = await getMarkdown(key);
        return { slug, ...frontMatter };
      })
    );
    return { content: [{ type: "text", text: JSON.stringify(categories, null, 2) }] };
  }

  if (name === "list_solutions") {
    const categoryFilter = (args as { category?: string }).category;
    const keys = await listKeys("solutions/");
    const solutions = await Promise.all(
      keys.map(async (key) => {
        const slug = key.replace("solutions/", "").replace(".md", "");
        const { frontMatter } = await getMarkdown(key);
        return { slug, ...frontMatter };
      })
    );
    const filtered = categoryFilter
      ? solutions.filter((s) => (s as Record<string, unknown>).category === categoryFilter)
      : solutions;
    return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
  }

  if (name === "get_solution") {
    const { slug } = z.object({ slug: z.string() }).parse(args);
    const { frontMatter, content } = await getMarkdown(`solutions/${slug}.md`);
    return {
      content: [
        { type: "text", text: JSON.stringify({ slug, ...frontMatter }, null, 2) },
        { type: "text", text: content },
      ],
    };
  }

  if (name === "search_solutions") {
    // Semantic search via S3 Vectors — delegated to the main app API
    const { query, top_k = 5 } = z
      .object({ query: z.string(), top_k: z.number().optional() })
      .parse(args);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, topK: top_k }),
    });
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server on stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("GenAI Landscape MCP server running on stdio");
