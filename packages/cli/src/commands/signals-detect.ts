import fs from "node:fs";
import path from "node:path";
import {
  applySignalValidationsToYaml,
  importGapAnalysis,
  importSignalDetection,
  parseRegistryTs,
  parseStrategyYaml,
  runGapAnalysis,
  runSignalDetection,
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
): IndexingRow[] | undefined {
  const latest = findLatestSnapshotDir(reportsBaseDir, slug);
  const reportPath = latest ? path.join(latest, "indexing-status.json") : null;
  if (!reportPath || !fs.existsSync(reportPath)) return undefined;

  const snapshot = readJson<IndexingSnapshot>(reportPath);
  return snapshot.inspectionData?.results?.map((row) => ({
    url: row.url,
    indexingStatus: row.indexingStatus,
    coverageState: row.coverageState,
  }));
}

/** Manual baseline from signalseo.co vs elia-studio spike (2026-06-26). */
const MANUAL_BASELINE_MATRIX = {
  capturedAt: "2026-06-26T08:16:00.000Z",
  signalseo: {
    llmsTxt: false,
    factsJson: false,
    robotsTxt: false,
    note: "GEO surfaces absent — pattern site uses JSON-LD + dense entity vocabulary instead",
  },
  eliaStudio: {
    llmsTxt: true,
    factsJson: true,
    note: "llms.txt and facts.json on www.elia-studio.eu",
  },
};

export async function runSignalsDetectCommand(): Promise<void> {
  const configPath = getArg("--config");
  if (!configPath) {
    throw new Error("--config is required (site matia.config.json)");
  }

  const rootArg = getArg("--root") ?? getArg("--cwd") ?? ".";
  const importCockpit = getArg("--cockpit") === "true";
  const benchmarkOnly = getArg("--benchmark-only") === "true";
  const autoValidate = getArg("--auto-validate") === "true";
  const mergeGap = getArg("--merge-gap") !== "false";

  const config = loadSiteConfig(configPath);
  const root = resolveHostRoot(rootArg);
  const strategyPath = path.join(root, "src", "seo", "strategy.yaml");
  const registryPath = path.join(root, "src", "seo", "registry.ts");

  if (!fs.existsSync(strategyPath)) {
    throw new Error(`Missing ${strategyPath}`);
  }

  const strategyYaml = fs.readFileSync(strategyPath, "utf-8");
  const strategy = parseStrategyYaml(strategyYaml);
  const registry = fs.existsSync(registryPath)
    ? parseRegistryTs(fs.readFileSync(registryPath, "utf-8"))
    : [];

  const indexingRows = loadIndexingRows(config.resolvedPaths.reportsBaseDir, config.slug);

  const result = await runSignalDetection({
    strategy,
    siteUrl: config.siteUrl,
    registry,
    indexingRows,
    benchmarkOnly,
    baselineMatrix: MANUAL_BASELINE_MATRIX,
  });

  console.log(`Matia signals detect — ${config.siteUrl}`);
  console.log("=".repeat(50));
  console.log(`Findings: ${result.findings.length}`);
  console.log(`Benchmark sites: ${result.benchmarkReports.length}`);
  console.log(`Comparison checks: ${result.comparisonMatrix.length}`);

  const byStatus = { pass: 0, warn: 0, fail: 0, info: 0 };
  for (const f of result.findings) {
    byStatus[f.status]++;
  }
  console.log(
    `Status breakdown: pass=${byStatus.pass} warn=${byStatus.warn} fail=${byStatus.fail} info=${byStatus.info}`,
  );

  if (result.comparisonMatrix.length > 0) {
    console.log("\nBenchmark matrix (own vs benchmark):");
    for (const row of result.comparisonMatrix) {
      const own = row.ownSite === null ? "—" : row.ownSite ? "✓" : "✗";
      const bench = row.benchmark === null ? "—" : row.benchmark ? "✓" : "✗";
      console.log(`  ${row.label}: own=${own} benchmark=${bench}`);
    }
  }

  const promoted = result.validations.filter(
    (v) => v.suggestedStatus === "validated" && v.previousStatus === "hypothesis",
  );
  if (promoted.length > 0) {
    console.log(`\nSignals ready to validate (${promoted.length}):`);
    for (const v of promoted) {
      console.log(`  - ${v.signalId}: ${v.reason}`);
    }
  }

  console.log("\nTop findings:");
  for (const finding of result.findings.slice(0, 15)) {
    console.log(`  [${finding.status}] ${finding.evidence[0]}`);
  }
  if (result.findings.length > 15) {
    console.log(`  ... and ${result.findings.length - 15} more`);
  }

  const dateLabel = new Date().toISOString().slice(0, 10);
  const outDir = path.join(
    config.resolvedPaths.reportsBaseDir,
    config.slug,
    dateLabel,
  );
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "signal-detection.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${outPath}`);

  if (importCockpit) {
    const artifactPath = importSignalDetection(result);
    console.log(`Cockpit signals artifact: ${artifactPath}`);
  }

  if (autoValidate && promoted.length > 0) {
    const updatedYaml = applySignalValidationsToYaml(strategyYaml, result.validations);
    if (updatedYaml !== strategyYaml) {
      fs.writeFileSync(strategyPath, updatedYaml);
      console.log(`\nUpdated strategy.yaml — promoted ${promoted.length} signal(s) to validated`);
    }
  }

  if (mergeGap && !benchmarkOnly) {
    const gap = runGapAnalysis({
      strategy,
      registry,
      indexingRows,
      siteUrl: config.siteUrl,
      signalFindings: result.findings,
      signalDetection: { comparisonMatrix: result.comparisonMatrix },
    });
    const gapPath = path.join(outDir, "gap-analysis.json");
    fs.writeFileSync(gapPath, JSON.stringify(gap, null, 2));
    console.log(`Wrote ${gapPath} (${gap.actions.length} proposed actions)`);
    if (importCockpit) {
      const { artifactPath, queuePath } = importGapAnalysis(gap);
      console.log(`Cockpit gap artifact: ${artifactPath}`);
      console.log(`Cockpit queue: ${queuePath}`);
    }
  }
}
