import type { ParsedBenchmarkSite, ParsedGeoEntity } from "../../gap/parse-host-seo.js";
import type { BenchmarkSiteReport, SignalFinding } from "../types.js";
import {
  entityTokenOverlap,
  extractJsonLdTypes,
  extractSitemapLocs,
  fetchSurface,
  parseRobotsAiAgents,
} from "../fetch-surface.js";

const SCHEMA_TYPES_OF_INTEREST = [
  "Organization",
  "Person",
  "FAQPage",
  "Service",
  "WebSite",
  "LocalBusiness",
] as const;

export async function probeBenchmarkSite(
  site: ParsedBenchmarkSite,
  geoEntities: ParsedGeoEntity[],
): Promise<{ report: BenchmarkSiteReport; findings: SignalFinding[] }> {
  const base = site.url.replace(/\/$/, "");
  const now = new Date().toISOString();
  const entityNames = geoEntities.map((e) => e.name);

  const [llms, facts, robots, homepage, sitemap] = await Promise.all([
    fetchSurface(`${base}/llms.txt`),
    fetchSurface(`${base}/api/facts.json`),
    fetchSurface(`${base}/robots.txt`),
    fetchSurface(`${base}/`),
    fetchSurface(`${base}/sitemap.xml`),
  ]);

  const schemaTypes = extractJsonLdTypes(homepage.body);
  const aiAgentsAllowed = parseRobotsAiAgents(robots.ok ? robots.body : "");
  const allowedAgents = Object.entries(aiAgentsAllowed)
    .filter(([, allowed]) => allowed)
    .map(([agent]) => agent);

  let factsValidJson = false;
  if (facts.ok) {
    try {
      JSON.parse(facts.body);
      factsValidJson = true;
    } catch {
      factsValidJson = false;
    }
  }

  const sitemapLocs = sitemap.ok ? extractSitemapLocs(sitemap.body) : [];
  const hasHreflang =
    homepage.body.includes('rel="alternate"') && homepage.body.includes("hreflang");
  const hasEnPath = homepage.body.includes("/en/") || sitemapLocs.some((u: string) => u.includes("/en/"));

  const combinedText = [homepage.body, llms.ok ? llms.body : ""].join("\n");
  const entityOverlapPercent = entityTokenOverlap(combinedText, entityNames);

  const checks: BenchmarkSiteReport["checks"] = {
    llmsTxt: llms.ok && llms.body.length > 100,
    factsJson: facts.ok && factsValidJson,
    robotsTxt: robots.ok,
    homepageOk: homepage.ok,
    sitemapOk: sitemap.ok,
    hasOrganizationSchema: schemaTypes.includes("Organization"),
    hasPersonSchema: schemaTypes.includes("Person"),
    hasFaqSchema: schemaTypes.includes("FAQPage"),
    hasServiceSchema: schemaTypes.includes("Service"),
    hasHreflang,
    hasEnPath,
    sitemapHasLlms: sitemapLocs.some((u: string) => u.endsWith("/llms.txt")),
    sitemapHasFacts: sitemapLocs.some((u: string) => u.includes("facts.json")),
  };

  const report: BenchmarkSiteReport = {
    url: base,
    label: site.label,
    checks,
    schemaTypes,
    aiAgentsAllowed: allowedAgents,
    entityOverlapPercent,
  };

  const findings: SignalFinding[] = [];
  const slug = site.label.toLowerCase().replace(/\s+/g, "-");

  findings.push({
    id: `bench-${slug}-llms`,
    source: "benchmark",
    status: checks.llmsTxt ? "info" : "info",
    evidence: [
      checks.llmsTxt
        ? `${site.label} has /llms.txt (${llms.body.length} bytes)`
        : `${site.label} has no /llms.txt (HTTP ${llms.status})`,
    ],
    payload: { benchmark: site.label, check: "llmsTxt", value: checks.llmsTxt },
    detectedAt: now,
  });

  findings.push({
    id: `bench-${slug}-facts`,
    source: "benchmark",
    status: checks.factsJson ? "info" : "info",
    evidence: [
      checks.factsJson
        ? `${site.label} has /api/facts.json`
        : `${site.label} has no /api/facts.json (HTTP ${facts.status})`,
    ],
    payload: { benchmark: site.label, check: "factsJson", value: checks.factsJson },
    detectedAt: now,
  });

  for (const schemaType of SCHEMA_TYPES_OF_INTEREST) {
    if (schemaTypes.includes(schemaType)) {
      findings.push({
        id: `bench-${slug}-schema-${schemaType.toLowerCase()}`,
        source: "benchmark",
        status: "info",
        evidence: [`${site.label} homepage has ${schemaType} JSON-LD`],
        payload: { benchmark: site.label, schemaType },
        detectedAt: now,
      });
    }
  }

  if (entityOverlapPercent > 0) {
    findings.push({
      id: `bench-${slug}-entity-overlap`,
      source: "benchmark",
      status: entityOverlapPercent >= 50 ? "warn" : "info",
      evidence: [
        `${site.label} entity vocabulary overlap with your geoEntities: ${entityOverlapPercent}%`,
      ],
      payload: { benchmark: site.label, entityOverlapPercent },
      detectedAt: now,
    });
  }

  return { report, findings };
}

export async function runBenchmarkDetector(
  benchmarkSites: ParsedBenchmarkSite[],
  geoEntities: ParsedGeoEntity[],
): Promise<{ reports: BenchmarkSiteReport[]; findings: SignalFinding[] }> {
  const reports: BenchmarkSiteReport[] = [];
  const findings: SignalFinding[] = [];

  for (const site of benchmarkSites) {
    if (!site.url) continue;
    const result = await probeBenchmarkSite(site, geoEntities);
    reports.push(result.report);
    findings.push(...result.findings);
  }

  return { reports, findings };
}
