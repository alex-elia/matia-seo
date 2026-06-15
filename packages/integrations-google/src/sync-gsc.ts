import path from "node:path";
import { loadSiteConfig } from "./config-loader.js";
import { buildIndexingReport } from "./report-builder.js";
import { createSearchConsoleClient } from "./search-console/client.js";
import { fetchSitemapUrls } from "./search-console/sitemap-fetcher.js";
import { inspectUrls } from "./search-console/url-inspector.js";
import {
  createSnapshotDir,
  writeJson,
  writeText,
} from "./snapshot-storage.js";
import type { IndexingSnapshot, ResolvedMatiaSiteConfig } from "./types.js";

export interface SyncGscOptions {
  configPath: string;
  maxUrls?: number;
  delayMs?: number;
  verbose?: boolean;
}

export interface SyncGscResult {
  config: ResolvedMatiaSiteConfig;
  snapshotDir: string;
  jsonPath: string;
  markdownPath: string;
  snapshot: IndexingSnapshot;
}

export async function runSyncGsc(
  options: SyncGscOptions,
): Promise<SyncGscResult> {
  const config = loadSiteConfig(options.configPath);

  if (options.verbose !== false) {
    console.log(`Loaded config for ${config.name}`);
  }

  const searchConsole = createSearchConsoleClient(
    config.resolvedPaths.serviceAccountKey,
  );

  if (options.verbose !== false) {
    console.log("Fetching sitemap URLs...");
  }

  const sitemapData = await fetchSitemapUrls(searchConsole, config.property);

  if (options.verbose !== false) {
    console.log(
      `Found ${sitemapData.totalUrls} URLs across ${sitemapData.sitemapsCount} sitemap(s)`,
    );
  }

  let urlsToInspect = sitemapData.urls;
  if (
    config.inspection?.includeAllSitemapUrls === false &&
    Array.isArray(config.priorityUrls)
  ) {
    urlsToInspect = config.priorityUrls.map((url) => ({ url }));
    if (options.verbose !== false) {
      console.log(`Inspecting ${urlsToInspect.length} priority URLs only`);
    }
  }

  const inspectionOptions = {
    maxUrls: options.maxUrls ?? config.inspection?.maxUrls ?? 500,
    delayMs: options.delayMs ?? config.inspection?.delayMs ?? 120,
    verbose: options.verbose !== false,
  };

  if (options.verbose !== false) {
    console.log(
      `Inspecting up to ${inspectionOptions.maxUrls} URLs (delay ${inspectionOptions.delayMs}ms)`,
    );
  }

  const inspectionData = await inspectUrls(
    searchConsole,
    config.property,
    urlsToInspect,
    inspectionOptions,
  );

  const report = buildIndexingReport({ config, sitemapData, inspectionData });

  const snapshotDir = createSnapshotDir(
    config.resolvedPaths.reportsBaseDir,
    config.slug,
    new Date(),
  );

  const snapshot: IndexingSnapshot = {
    config: {
      name: config.name,
      property: config.property,
      siteUrl: config.siteUrl,
    },
    sitemapData,
    inspectionData,
    summary: report.summary,
  };

  const jsonPath = path.join(snapshotDir, "indexing-status.json");
  const markdownPath = path.join(snapshotDir, "indexing-summary.md");

  writeJson(jsonPath, snapshot);
  writeText(markdownPath, report.markdown);

  return { config, snapshotDir, jsonPath, markdownPath, snapshot };
}
