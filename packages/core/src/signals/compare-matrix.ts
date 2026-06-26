import type { BenchmarkCheckResult, BenchmarkSiteReport } from "./types.js";

const MATRIX_CHECKS: Array<{
  id: string;
  label: string;
  ownKey: string;
  benchKey: string;
}> = [
  { id: "llms-txt", label: "llms.txt", ownKey: "llmsTxt", benchKey: "llmsTxt" },
  { id: "facts-json", label: "facts.json", ownKey: "factsJson", benchKey: "factsJson" },
  {
    id: "org-schema",
    label: "Organization schema",
    ownKey: "hasOrganizationSchema",
    benchKey: "hasOrganizationSchema",
  },
  {
    id: "person-schema",
    label: "Person schema",
    ownKey: "hasPersonSchema",
    benchKey: "hasPersonSchema",
  },
  {
    id: "faq-schema",
    label: "FAQ schema",
    ownKey: "hasFaqSchema",
    benchKey: "hasFaqSchema",
  },
  {
    id: "service-schema",
    label: "Service schema",
    ownKey: "hasServiceSchema",
    benchKey: "hasServiceSchema",
  },
  { id: "hreflang", label: "hreflang", ownKey: "hasHreflang", benchKey: "hasHreflang" },
];

export function buildComparisonMatrix(
  ownReport: BenchmarkSiteReport | null,
  benchmarkReports: BenchmarkSiteReport[],
): BenchmarkCheckResult[] {
  const matrix: BenchmarkCheckResult[] = [];
  const primaryBench = benchmarkReports[0];

  if (!ownReport && !primaryBench) return matrix;

  for (const check of MATRIX_CHECKS) {
    const ownVal = ownReport?.checks[check.ownKey];
    const benchVal = primaryBench?.checks[check.benchKey];
    matrix.push({
      checkId: check.id,
      label: check.label,
      ownSite: typeof ownVal === "boolean" ? ownVal : null,
      benchmark: typeof benchVal === "boolean" ? benchVal : null,
      ownDetail: ownReport?.label,
      benchmarkDetail: primaryBench?.label,
    });
  }

  if (ownReport && primaryBench) {
    matrix.push({
      checkId: "entity-overlap",
      label: "Entity vocabulary overlap",
      ownSite: ownReport.entityOverlapPercent >= 50,
      benchmark: primaryBench.entityOverlapPercent >= 50,
      ownDetail: `${ownReport.entityOverlapPercent}%`,
      benchmarkDetail: `${primaryBench.entityOverlapPercent}%`,
    });
  }

  return matrix;
}
