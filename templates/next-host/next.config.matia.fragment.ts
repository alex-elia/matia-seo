/**
 * Merge into your next.config.ts — Matia host standard (v1).
 * Spec: docs/specifications/host-integration-v1-spec.md
 *
 * Do NOT use experimental.externalDir — it type-checks the full cloned matia-seo monorepo.
 */
import type { NextConfig } from "next";

export const matiaHostNextConfig = {
  transpilePackages: ["@matia/core", "@matia/next"],
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/matia-seo/**", "**/node_modules/**"],
    };
    return config;
  },
} satisfies Pick<NextConfig, "transpilePackages" | "webpack">;
