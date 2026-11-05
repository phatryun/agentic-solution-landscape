/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for AWS Amplify WEB_COMPUTE manual deploys: produces a
  // self-contained server bundle under .next/standalone that we map into
  // the .amplify-hosting/compute/default directory.
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
};

export default nextConfig;