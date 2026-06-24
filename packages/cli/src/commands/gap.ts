import fs from "node:fs";
import path from "node:path";
import {
  importGapAnalysis,
  parseRegistryTs,
  parseStrategyYaml,
  runGapAnalysis,
  type IndexingRow,
} from "@matia/core";
import {
  findLatestSnapshotDir,
  loadSiteConfig,
  readJson,
} from "@matia/integrations-google";
import { getArg } from "../args.js";
import { resolveHostRoot } from "./check.js";

type IndexingSnapshot = {
  inspectionData?: {
    results?: Array<{
      url: string;
      indexingStatus?: string;
      coverageState?: string;
    }>;
  };
};

function loadIndexingRows(
  reportsBaseDir: string,
  slug: string,
  fromReport?: string,
): IndexingRow[] | undefined {
  const reportPath =
    fromReport ??
    (() => {
      const latest = findLatestSnapshotDir(reportsBaseDir, slug);
      return latest ? path.join(latest, "indexing-status.json") : null;
    })();

  if (!reportPath || !fs.existsSync(reportPath)) return undefined;

  const snapshot = readJson<IndexingSnapshot>(reportPath);
  return snapshot.inspectionData?.results?.map((row) => ({
    url: row.url,
    indexingStatus: row.indexingStatus,
    coverageState: row.coverageState,
  }));
}

export async function runGapCommand(): Promise<void> {
  const configPath = getArg("--config");
  const rootArg = getArg("--root") ?? getArg("--cwd") ?? ".";
  const fromReport = getArg("--from-report");
  const writeReport = getArg("--write-report") !== "false";
  const importCockpit = getArg("--cockpit") === "true";

  const root = resolveHostRoot(rootArg);
  const strategyPath = path.join(root, "src", "seo", "strategy.yaml");
  const registryPath = path.join(root, "src", "seo", "registry.ts");

  if (!fs.existsSync(strategyPath) || !fs.existsSync(registryPath)) {
    throw new Error(`Missing src/seo/strategy.yaml or registry.ts under ${root}`);
  }

  const strategy = parseStrategyYaml(fs.readFileSync(strategyPath, "utf-8"));
  const registry = parseRegistryTs(fs.readFileSync(registryPath, "utf-8"));

  let siteUrl: string | undefined;
  let reportsBaseDir: string | undefined;
  let slug = strategy.project;

  if (configPath) {
    const config = loadSiteConfig(configPath);
    siteUrl = config.siteUrl;
    slug = config.slug;
    reportsBaseDir = config.resolvedPaths.reportsBaseDir;
  }

  const indexingRows = reportsBaseDir
    ? loadIndexingRows(reportsBaseDir, slug, fromReport ?? undefined)
    : undefined;

  const result = runGapAnalysis({
    strategy,
    registry,
    indexingRows,
    siteUrl,
  });

  console.log(`Matia gap — ${strategy.project}`);
  console.log("=".repeat(50));
  console.log(
    `Intent coverage: ${result.intentCoverage.covered}/${result.intentCoverage.total} covered (${result.intentCoverage.percentCovered}%)`,
  );
  console.log(
    `Partial: ${result.intentCoverage.partial}, missing: ${result.intentCoverage.missing}`,
  );
  if (result.notIndexedTargets.length > 0) {
    console.log(`\nWeak GSC targets (${result.notIndexedTargets.length}):`);
    for (const url of result.notIndexedTargets.slice(0, 10)) {
      console.log(`  - ${url}`);
    }
  }

  console.log(`\nProposed actions: ${result.actions.length}`);
  for (const action of result.actions.slice(0, 12)) {
    console.log(`  [${action.type}] ${action.rationale}`);
  }
  if (result.actions.length > 12) {
    console.log(`  ... and ${result.actions.length - 12} more`);
  }

  if (writeReport && configPath) {
    const config = loadSiteConfig(configPath);
    const dateLabel = new Date().toISOString().slice(0, 10);
    const outDir = path.join(
      config.resolvedPaths.reportsBaseDir,
      config.slug,
      dateLabel,
    );
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "gap-analysis.json");
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log(`\nWrote ${outPath}`);
  }

  if (importCockpit) {
    const { artifactPath, queuePath } = importGapAnalysis(result);
    console.log(`\nCockpit artifact: ${artifactPath}`);
    console.log(`Cockpit queue: ${queuePath}`);
  }
}
