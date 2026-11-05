/**
 * AWS Secrets Manager client
 * Resolves secrets at runtime from Secrets Manager using ARNs stored in env vars.
 * Secrets are cached in memory for the lifetime of the Lambda/server instance.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
});

const cache = new Map<string, string>();

export async function getSecret(arn: string): Promise<string> {
  if (cache.has(arn)) return cache.get(arn)!;

  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  const value = res.SecretString ?? "";
  cache.set(arn, value);
  return value;
}

// ── Typed accessors ───────────────────────────────────────────────────────────

export async function getDatabaseUrl(): Promise<string> {
  // In local dev, fall back to env var directly
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return getSecret(process.env.SM_DATABASE_URL_ARN!);
}

export async function getNextAuthSecret(): Promise<string> {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  return getSecret(process.env.SM_NEXTAUTH_SECRET_ARN!);
}

export async function getCronSecret(): Promise<string> {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  return getSecret(process.env.SM_CRON_SECRET_ARN!);
}

export async function getCognitoClientSecret(): Promise<string> {
  if (process.env.COGNITO_CLIENT_SECRET) return process.env.COGNITO_CLIENT_SECRET;
  return getSecret(process.env.SM_COGNITO_SECRET_ARN!);
}
