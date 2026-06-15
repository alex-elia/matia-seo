import path from "node:path";
import {
  findLatestSnapshotDir,
  loadSiteConfig,
  readJson,
  type IndexingSnapshot,
} from "@matia/integrations-google";
import { getArg } from "../args.js";

export async function runAnalyzeNotIndexedCommand(): Promise<void> {
  const configPath = getArg("--config");
  if (!configPath) {
    throw new Error("--config is required for analyze not-indexed");
  }

  const config = loadSiteConfig(configPath);
  const reportPath = getArg("--from-report");

  let snapshot: IndexingSnapshot;
  if (reportPath) {
    snapshot = readJson<IndexingSnapshot>(reportPath);
  } else {
    const latestDir = findLatestSnapshotDir(
      config.resolvedPaths.reportsBaseDir,
      config.slug,
    );
    if (!latestDir) {
      throw new Error("No snapshot found. Run matia sync-gsc first.");
    }
    snapshot = readJson<IndexingSnapshot>(
      path.join(latestDir, "indexing-status.json"),
    );
  }

  const notIndexed = snapshot.inspectionData.results.filter((r) => !r.indexed);

  console.log(`# Not indexed URLs — ${config.name}`);
  console.log(`Property: ${config.property}`);
  console.log(`Total not indexed: ${notIndexed.length}\n`);

  for (const row of notIndexed) {
    console.log(`- ${row.url}`);
    console.log(`  coverage: ${row.coverageState}`);
    if (row.error) console.log(`  error: ${row.error}`);
  }
}
