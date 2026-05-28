import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@workflow/ui",
    "@workflow/db",
    "@workflow/ai",
    "@workflow/workflow",
    "@workflow/integrations",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
