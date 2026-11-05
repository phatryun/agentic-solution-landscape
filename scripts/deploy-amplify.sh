#!/usr/bin/env bash
#
# Manual deploy to AWS Amplify (no Git connection).
# Builds the Next.js app and pushes a bundle that conforms to the Amplify
# Hosting deployment specification (.amplify-hosting/ with compute/, static/
# and deploy-manifest.json) so WEB_COMPUTE (SSR) serves the app correctly.
#
# Usage:
#   AWS_PROFILE=nila-project ./scripts/deploy-amplify.sh
#
# Requirements: aws CLI v2, node/npm, zip, terraform (to read app id/branch).
#
# Notes:
#   - next.config.mjs must set `output: "standalone"`.
#   - The standalone server listens on $PORT (default 3000), as required by
#     the Amplify compute primitive.

set -euo pipefail

PROFILE="${AWS_PROFILE:-nila-project}"
REGION="${AWS_REGION:-eu-west-1}"
TF_DIR="terraform/environments/dev"
NODE_RUNTIME="nodejs20.x"

echo "==> Reading Amplify identifiers from Terraform outputs"
APP_ID="$(cd "$TF_DIR" && terraform output -raw amplify_app_id)"
BRANCH="$(cd "$TF_DIR" && terraform output -raw amplify_branch_name)"
echo "    app-id=$APP_ID branch=$BRANCH profile=$PROFILE region=$REGION"

echo "==> Building the Next.js app"
npm ci
npx prisma generate
npm run build

if [[ ! -d ".next/standalone" ]]; then
  echo "ERROR: .next/standalone not found. Set output: \"standalone\" in next.config.mjs." >&2
  exit 1
fi

echo "==> Assembling .amplify-hosting deployment bundle"
STAGE="$(mktemp -d)"
HOSTING="$STAGE/.amplify-hosting"
COMPUTE="$HOSTING/compute/default"
STATIC="$HOSTING/static"
mkdir -p "$COMPUTE" "$STATIC"

# 1) Compute resource: the self-contained standalone server + its assets.
#    The standalone output already contains server.js, a minimal node_modules
#    and a trimmed .next directory.
cp -R .next/standalone/. "$COMPUTE/"

#    The standalone build does NOT include .next/static or public; the running
#    server expects to find them relative to itself, so copy them in.
mkdir -p "$COMPUTE/.next/static"
cp -R .next/static/. "$COMPUTE/.next/static/"
if [[ -d public ]]; then
  mkdir -p "$COMPUTE/public"
  cp -R public/. "$COMPUTE/public/"
fi

# 2) Static assets served by the CDN primitive at the app root.
#    Next serves build assets under /_next/static and public/* at root.
mkdir -p "$STATIC/_next/static"
cp -R .next/static/. "$STATIC/_next/static/"
if [[ -d public ]]; then
  cp -R public/. "$STATIC/"
fi

# 3) Deployment manifest: catch-all to compute, static route for /_next/static.
cat > "$HOSTING/deploy-manifest.json" <<JSON
{
  "version": 1,
  "framework": { "name": "next", "version": "14.2.4" },
  "routes": [
    { "path": "/_next/static/*", "target": { "kind": "Static" } },
    { "path": "/_next/image", "target": { "kind": "ImageOptimization" }, "fallback": { "kind": "Compute", "src": "default" } },
    { "path": "/*", "target": { "kind": "Compute", "src": "default" }, "fallback": { "kind": "Static" } }
  ],
  "computeResources": [
    { "name": "default", "entrypoint": "server.js", "runtime": "$NODE_RUNTIME" }
  ]
}
JSON

echo "==> Zipping bundle"
BUNDLE="$STAGE/amplify-bundle.zip"
# Amplify expects deploy-manifest.json, compute/ and static/ at the ROOT of
# the uploaded zip (i.e. the CONTENTS of .amplify-hosting/, not the folder).
( cd "$HOSTING" && zip -q -r "$BUNDLE" . )

echo "==> Creating Amplify deployment"
CREATE_JSON="$(aws amplify create-deployment \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --profile "$PROFILE" \
  --region "$REGION")"

JOB_ID="$(echo "$CREATE_JSON" | sed -n 's/.*"jobId": *"\([^"]*\)".*/\1/p')"
UPLOAD_URL="$(echo "$CREATE_JSON" | sed -n 's/.*"zipUploadUrl": *"\([^"]*\)".*/\1/p')"

if [[ -z "$UPLOAD_URL" ]]; then
  echo "ERROR: could not parse zipUploadUrl from create-deployment response:" >&2
  echo "$CREATE_JSON" >&2
  exit 1
fi

echo "==> Uploading artifact bundle"
curl -s -H "Content-Type: application/zip" --upload-file "$BUNDLE" "$UPLOAD_URL"

echo "==> Starting deployment (job $JOB_ID)"
aws amplify start-deployment \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --job-id "$JOB_ID" \
  --profile "$PROFILE" \
  --region "$REGION" >/dev/null

echo "==> Deployment started. Follow progress:"
echo "    https://$REGION.console.aws.amazon.com/amplify/apps/$APP_ID/branches/$BRANCH/deployments"

rm -rf "$STAGE"
