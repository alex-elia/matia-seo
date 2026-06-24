import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@matia/core"],
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
