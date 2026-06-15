export type {
  IndexingReport,
  IndexingSnapshot,
  InspectionData,
  MatiaSiteConfig,
  ResolvedMatiaSiteConfig,
  SitemapData,
  UrlInspectionStatus,
} from "./types.js";

export { loadSiteConfig } from "./config-loader.js";
export { buildIndexingReport } from "./report-builder.js";
export { createSearchConsoleClient } from "./search-console/client.js";
export { fetchSitemapUrls } from "./search-console/sitemap-fetcher.js";
export { inspectUrls } from "./search-console/url-inspector.js";
export {
  createSnapshotDir,
  findLatestSnapshotDir,
  readJson,
  writeJson,
  writeText,
} from "./snapshot-storage.js";
export { runSyncGsc } from "./sync-gsc.js";
export type { SyncGscOptions, SyncGscResult } from "./sync-gsc.js";
export {
  submitUrlsToIndexingApi,
  urlsFromCsv,
  urlsFromSnapshotNotIndexed,
} from "./indexing/submit.js";
export type {
  SubmitIndexingOptions,
  SubmitIndexingResult,
} from "./indexing/submit.js";

import type { IndexingStatus } from "@matia/core";

export function mapCoverageToIndexingStatus(
  coverageState: string,
  indexed: boolean,
): IndexingStatus {
  if (indexed) return "indexed";
  const state = coverageState.toLowerCase();
  if (state.includes("discovered")) return "discovered";
  if (state.includes("submitted")) return "submitted";
  if (state.includes("excluded")) return "excluded";
  if (state === "error") return "needs-review";
  return "needs-review";
}
