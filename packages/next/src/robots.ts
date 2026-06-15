import type { MetadataRoute } from "next";
import { AI_CRAWLER_AGENTS } from "./metadata.js";

export type BuildRobotsInput = {
  siteUrl: string;
  agents?: readonly string[];
  sitemapPath?: string;
  host?: boolean;
};

export function buildRobotsFromAgents(
  input: BuildRobotsInput,
): MetadataRoute.Robots {
  const base = input.siteUrl.replace(/\/$/, "");
  const agents = input.agents ?? AI_CRAWLER_AGENTS;
  const sitemapPath = input.sitemapPath ?? "/sitemap.xml";

  return {
    rules: agents.map((userAgent) => ({
      userAgent,
      allow: "/",
    })),
    sitemap: `${base}${sitemapPath.startsWith("/") ? sitemapPath : `/${sitemapPath}`}`,
    ...(input.host !== false ? { host: base } : {}),
  };
}
