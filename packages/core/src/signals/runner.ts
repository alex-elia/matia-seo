import type { IndexingRow } from "../gap/analyze-gap.js";
import type { ParsedHostStrategy, ParsedRegistryEntry } from "../gap/parse-host-seo.js";
import { probeGeoSurfaces } from "../geo/probe-surfaces.js";
import { autoValidateSignals } from "./auto-validate.js";
import { buildComparisonMatrix } from "./compare-matrix.js";
import { runBenchmarkDetector, probeBenchmarkSite } from "./detectors/benchmark.js";
import { runGscSignalMatcher } from "./detectors/gsc-matcher.js";
import { runOwnSiteDetector } from "./detectors/own-site.js";
import { runSchemaOrgDetector } from "./detectors/schema-org.js";
import { fetchSurface } from "./fetch-surface.js";
import type { BenchmarkSiteReport, SignalDetectionResult, SignalFinding } from "./types.js";

export type RunSignalDetectionInput = {
  strategy: ParsedHostStrategy;
  siteUrl: string;
  registry: ParsedRegistryEntry[];
  indexingRows?: IndexingRow[];
  benchmarkOnly?: boolean;
  baselineMatrix?: Record<string, unknown>;
};

export async function runSignalDetection(
  input: RunSignalDetectionInput,
): Promise<SignalDetectionResult> {
  const { strategy, siteUrl, registry, indexingRows, benchmarkOnly, baselineMatrix } =
    input;
  const now = new Date().toISOString();
  const findings: SignalFinding[] = [];

  const probe = await probeGeoSurfaces(siteUrl, strategy.geoEntities);

  let benchmarkReports: BenchmarkSiteReport[] = [];
  if (strategy.benchmarkSites.length > 0) {
    const bench = await runBenchmarkDetector(strategy.benchmarkSites, strategy.geoEntities);
    benchmarkReports = bench.reports;
    findings.push(...bench.findings);
  }

  if (!benchmarkOnly) {
    findings.push(...runOwnSiteDetector(probe, strategy.signals));

    const healthRes = await fetchSurface(`${siteUrl.replace(/\/$/, "")}/api/seo/health`);
    if (healthRes.ok) {
      try {
        const health = JSON.parse(healthRes.body) as {
          overall?: string;
          checks?: Array<{ id: string; status: string; message?: string }>;
        };
        for (const check of health.checks ?? []) {
          if (check.id === "robots-ai-agents" || check.id.includes("bing")) {
            findings.push({
              id: `own-health-${check.id}`,
              signalId: check.id.includes("bing") ? "bing-copilot-eu" : undefined,
              source: "own-site",
              status:
                check.status === "pass"
                  ? "pass"
                  : check.status === "fail"
                    ? "fail"
                    : "warn",
              evidence: [check.message ?? `${check.id}: ${check.status}`],
              detectedAt: now,
            });
          }
        }
        void health.overall;
      } catch {
        // skip malformed health JSON
      }
    }

    findings.push(
      ...runGscSignalMatcher(
        strategy.signals,
        strategy.intents,
        indexingRows,
        siteUrl,
      ),
    );

    findings.push(
      ...(await runSchemaOrgDetector(siteUrl, registry, benchmarkReports)),
    );
  }

  const ownBench = await probeBenchmarkSite(
    { url: siteUrl, label: strategy.project, reason: "own site" },
    strategy.geoEntities,
  );

  const comparisonMatrix = buildComparisonMatrix(ownBench.report, benchmarkReports);
  const validations = autoValidateSignals(strategy.signals, findings);

  return {
    project: strategy.project,
    detectedAt: now,
    siteUrl,
    findings,
    benchmarkReports,
    comparisonMatrix,
    validations,
    baselineMatrix,
  };
}
