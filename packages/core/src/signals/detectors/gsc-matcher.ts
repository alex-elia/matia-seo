import type { IndexingRow } from "../../gap/analyze-gap.js";
import type { ParsedIntent, ParsedSignal } from "../../gap/parse-host-seo.js";
import type { SignalFinding } from "../types.js";
import { normalizePath, pathFromUrl } from "../../gap/parse-host-seo.js";

export type GscSignalMatcherConfig = {
  minImpressions?: number;
  keywordPatterns?: string[];
};

function isIndexed(status: string | undefined): boolean {
  if (!status) return false;
  const value = status.toLowerCase();
  return (
    value.includes("indexed") &&
    !value.includes("not indexed") &&
    !value.includes("unknown")
  );
}

function findIndexingForPath(
  rows: IndexingRow[] | undefined,
  siteUrl: string,
  targetPath: string,
): string | undefined {
  if (!rows?.length) return undefined;
  const normalized = normalizePath(targetPath);
  const row = rows.find((item) => {
    const itemPath = pathFromUrl(item.url);
    if (itemPath === normalized) return true;
    const absolute = `${siteUrl.replace(/\/$/, "")}${normalized === "/" ? "/" : normalized}`;
    return item.url === absolute || item.url.replace(/\/$/, "") === absolute.replace(/\/$/, "");
  });
  return row?.indexingStatus ?? row?.coverageState;
}

function extractPathsFromEvidence(evidence: string[]): string[] {
  const paths: string[] = [];
  for (const line of evidence) {
    const matches = line.match(/\/[\w/-]+/g);
    if (matches) paths.push(...matches);
  }
  return [...new Set(paths)];
}

export function runGscSignalMatcher(
  signals: ParsedSignal[],
  intents: ParsedIntent[],
  indexingRows: IndexingRow[] | undefined,
  siteUrl: string,
  config?: GscSignalMatcherConfig,
): SignalFinding[] {
  const now = new Date().toISOString();
  const findings: SignalFinding[] = [];

  const gscSignals = signals.filter((s) => s.source === "gsc");
  if (gscSignals.length === 0) return findings;

  if (!indexingRows?.length) {
    for (const signal of gscSignals) {
      findings.push({
        id: `gsc-no-snapshot-${signal.id}`,
        signalId: signal.id,
        source: "gsc",
        status: "warn",
        evidence: [
          `No GSC indexing snapshot available — run matia sync-gsc to validate signal "${signal.id}"`,
        ],
        hypothesis: signal.hypothesis,
        detectedAt: now,
      });
    }
    return findings;
  }

  for (const signal of gscSignals) {
    const pathsFromEvidence = extractPathsFromEvidence(signal.evidenceRequired);
    const relatedIntents = intents.filter((intent) => {
      const queries = intent.hypothesisQueries ?? [];
      const patterns = signal.keywordPatterns ?? config?.keywordPatterns ?? [];
      if (queries.length === 0 && patterns.length === 0) return false;
      const intentLower = intent.intent.toLowerCase();
      return (
        patterns.some((p) => intentLower.includes(p.toLowerCase())) ||
        queries.some((q) => intentLower.includes(q.toLowerCase()))
      );
    });

    const targetPaths = [
      ...pathsFromEvidence,
      ...relatedIntents.flatMap((i) => i.targetPages),
    ];
    const uniquePaths = [...new Set(targetPaths.map(normalizePath))];

    if (uniquePaths.length === 0) {
      findings.push({
        id: `gsc-signal-${signal.id}`,
        signalId: signal.id,
        source: "gsc",
        status: "info",
        evidence: [
          `Signal "${signal.id}" has no indexable paths in evidence — add keywordPatterns or path hints`,
        ],
        hypothesis: signal.hypothesis,
        detectedAt: now,
      });
      continue;
    }

    const indexedPaths: string[] = [];
    const weakPaths: string[] = [];

    for (const targetPath of uniquePaths) {
      const status = findIndexingForPath(indexingRows, siteUrl, targetPath);
      if (isIndexed(status)) {
        indexedPaths.push(targetPath);
      } else {
        weakPaths.push(`${targetPath} (${status ?? "no data"})`);
      }
    }

    const allIndexed = weakPaths.length === 0;
    findings.push({
      id: `gsc-signal-${signal.id}`,
      signalId: signal.id,
      source: "gsc",
      status: allIndexed ? "pass" : weakPaths.length < uniquePaths.length ? "warn" : "fail",
      evidence: allIndexed
        ? [`All ${indexedPaths.length} evidence page(s) indexed in latest GSC snapshot`]
        : [
            `Indexed: ${indexedPaths.join(", ") || "none"}`,
            `Weak/missing: ${weakPaths.join(", ")}`,
          ],
      hypothesis: signal.hypothesis,
      payload: { indexedPaths, weakPaths, targetPaths: uniquePaths },
      detectedAt: now,
    });
  }

  return findings;
}
