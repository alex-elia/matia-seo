import path from "node:path";
import {
  findLatestSnapshotDir,
  loadSiteConfig,
  readJson,
  submitUrlsToIndexingApi,
  urlsFromCsv,
  urlsFromSnapshotNotIndexed,
  type IndexingSnapshot,
} from "@matia/integrations-google";
import { getArg, hasFlag } from "../args.js";

export async function runSubmitIndexingCommand(): Promise<void> {
  const configPath = getArg("--config");
  if (!configPath) {
    throw new Error("--config is required for submit-indexing");
  }

  const config = loadSiteConfig(configPath);
  const dryRun = hasFlag("--dry-run");
  const filterLowValue = hasFlag("--filter-low-value");
  const limit = Number(getArg("--limit", "200"));
  const csvPath = getArg("--csv");
  const fromReport = getArg("--from-report");

  let urls: string[] = [];

  if (csvPath) {
    urls = urlsFromCsv(csvPath);
    console.log(`Read ${urls.length} URLs from CSV`);
  } else if (fromReport) {
    const snapshot = readJson<IndexingSnapshot>(fromReport);
    urls = urlsFromSnapshotNotIndexed(snapshot.inspectionData.results);
    console.log(`Read ${urls.length} not-indexed URLs from report`);
  } else {
    const latestDir = findLatestSnapshotDir(
      config.resolvedPaths.reportsBaseDir,
      config.slug,
    );
    if (!latestDir) {
      throw new Error(
        `No snapshot found. Run matia sync-gsc --config ${configPath} first.`,
      );
    }
    const reportPath = path.join(latestDir, "indexing-status.json");
    const snapshot = readJson<IndexingSnapshot>(reportPath);
    urls = urlsFromSnapshotNotIndexed(snapshot.inspectionData.results);
    console.log(`Read ${urls.length} not-indexed URLs from latest snapshot`);
  }

  const result = await submitUrlsToIndexingApi({
    keyPath: config.resolvedPaths.serviceAccountKey,
    urls,
    limit,
    dryRun,
    filterLowValue,
  });

  console.log("\nSubmission results");
  console.log("=".repeat(60));
  console.log(`Successful: ${result.successful.length}`);
  console.log(`Failed: ${result.failed.length}`);
  if (dryRun) {
    console.log("Dry run only — no URLs were submitted.");
  }
  if (result.failed.length > 0) {
    for (const item of result.failed) {
      console.log(`  FAIL ${item.url}: ${item.error}`);
    }
  }
}
