/**
 * S3 Vectors — Vector search for GenAI Landscape
 *
 * AWS S3 Vectors is a native S3 vector store (GA May 2025).
 * Vectors are stored in an S3 Vector Bucket, queried via the
 * S3Vectors SDK client (@aws-sdk/client-s3vectors).
 *
 * Bedrock is used to generate embeddings (Amazon Titan Embeddings V2).
 */

import {
  S3VectorsClient,
  PutVectorsCommand,
  QueryVectorsCommand,
} from "@aws-sdk/client-s3vectors";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const s3vectors = new S3VectorsClient({ region: process.env.AWS_REGION ?? "eu-west-1" });
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "eu-west-1" });

const VECTOR_BUCKET = process.env.S3_VECTOR_BUCKET!;
const VECTOR_INDEX = process.env.S3_VECTOR_INDEX ?? "genai-solutions";
const EMBEDDING_MODEL = "amazon.titan-embed-text-v2:0";

// ── Embed text via Amazon Titan Embeddings V2 ─────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: EMBEDDING_MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: text }),
    })
  );
  const body = JSON.parse(new TextDecoder().decode(res.body));
  return body.embedding as number[];
}

// ── Upsert a solution vector ──────────────────────────────────────────────────

export interface SolutionVectorMetadata {
  slug: string;
  name: string;
  category: string;
  tags: string[];
  description_short?: string;
}

// Cast helper — S3Vectors metadata field accepts any serialisable object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDocumentType(obj: SolutionVectorMetadata): any {
  return obj;
}

export async function upsertSolutionVector(
  slug: string,
  text: string,
  metadata: SolutionVectorMetadata
): Promise<void> {
  const embedding = await embedText(text);
  await s3vectors.send(
    new PutVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: VECTOR_INDEX,
      vectors: [
        {
          key: slug,
          data: { float32: embedding },
          metadata: toDocumentType(metadata),
        },
      ],
    })
  );
}

// ── Semantic search ───────────────────────────────────────────────────────────

export interface SearchResult {
  slug: string;
  score: number;
  metadata: SolutionVectorMetadata;
}

export async function semanticSearch(
  query: string,
  topK = 10
): Promise<SearchResult[]> {
  const queryEmbedding = await embedText(query);
  const res = await s3vectors.send(
    new QueryVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: VECTOR_INDEX,
      queryVector: { float32: queryEmbedding },
      topK,
      returnMetadata: true,
    })
  );

  return (res.vectors ?? []).map((v) => ({
    slug: v.key!,
    score: v.distance ?? 0,
    metadata: v.metadata as unknown as SolutionVectorMetadata,
  }));
}
