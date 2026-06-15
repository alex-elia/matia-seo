import type {
  IndexingReport,
  InspectionData,
  ResolvedMatiaSiteConfig,
  SitemapData,
  UrlInspectionStatus,
} from "./types.js";

function formatPercent(value: number, total: number): string {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function buildPriorityTable(
  priorityUrls: string[] = [],
  statuses: UrlInspectionStatus[] = [],
): string {
  if (!priorityUrls.length) return "No priority URLs configured.\n";

  const lookup = new Map(statuses.map((status) => [status.url, status]));
  const rows = priorityUrls.map((url) => {
    const status = lookup.get(url);
    if (!status) return `| ${url} | Not inspected in this run |`;
    return `| ${url} | ${status.indexed ? "Indexed" : status.coverageState} |`;
  });

  return ["| URL | Status |", "| --- | --- |", ...rows].join("\n");
}

export function buildIndexingReport(input: {
  config: ResolvedMatiaSiteConfig;
  sitemapData: SitemapData;
  inspectionData: InspectionData;
}): IndexingReport {
  const { config, sitemapData, inspectionData } = input;
  const generatedAt = new Date().toISOString();
  const totalUrls = sitemapData.totalUrls;
  const inspected = inspectionData.inspected;
  const indexed = inspectionData.results.filter((r) => r.indexed).length;
  const notIndexed = inspected - indexed;
  const coverageBreakdown = inspectionData.results.reduce<Record<string, number>>(
    (acc, result) => {
      const key = result.coverageState || "UNKNOWN";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {},
  );

  const summary = {
    generatedAt,
    property: config.property,
    totalUrls,
    inspected,
    indexed,
    notIndexed,
    coverageBreakdown,
    rateLimited: inspectionData.rateLimited,
  };

  const sections: string[] = [];
  sections.push(`# ${config.name} – SEO Indexing Snapshot`);
  sections.push(`_Generated at ${generatedAt}_`);
  sections.push("");
  sections.push("## Summary");
  sections.push(`- Property: \`${config.property}\``);
  sections.push(`- Total URLs in sitemap(s): **${totalUrls}**`);
  sections.push(`- URLs inspected: **${inspected}**`);
  sections.push(
    `- Indexed: **${indexed}** (${formatPercent(indexed, inspected)})`,
  );
  sections.push(`- Not indexed: **${notIndexed}**`);
  sections.push(
    inspectionData.rateLimited
      ? "- URL Inspection API rate limit reached during run."
      : "- No rate limiting encountered.",
  );
  sections.push("");
  sections.push("## Coverage Breakdown");
  if (Object.keys(coverageBreakdown).length === 0) {
    sections.push("No inspection data available.");
  } else {
    sections.push("| Coverage State | Count |");
    sections.push("| --- | ---: |");
    for (const [state, count] of Object.entries(coverageBreakdown)) {
      sections.push(`| ${state} | ${count} |`);
    }
  }
  sections.push("");
  sections.push("## Priority URLs");
  sections.push(buildPriorityTable(config.priorityUrls, inspectionData.results));
  sections.push("");
  sections.push("## Next Steps");
  sections.push("- Fix outstanding technical issues (metadata, canonical, structured data).");
  sections.push("- Resubmit updated URLs via `matia submit-indexing`.");
  sections.push("- Re-run `matia sync-gsc` next week to track progress.");

  return { summary, markdown: sections.join("\n") };
}
