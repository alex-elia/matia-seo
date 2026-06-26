import type { ParsedRegistryEntry } from "../../gap/parse-host-seo.js";
import type { BenchmarkSiteReport, SignalFinding } from "../types.js";
import { extractJsonLdTypes, fetchSurface } from "../fetch-surface.js";

const KEY_PAGES = ["/", "/services", "/about", "/references", "/contact"];

const SCHEMA_TYPES_OF_INTEREST = [
  "Organization",
  "Person",
  "FAQPage",
  "Service",
  "WebSite",
] as const;

export async function runSchemaOrgDetector(
  siteUrl: string,
  registry: ParsedRegistryEntry[],
  benchmarkReports: BenchmarkSiteReport[],
): Promise<SignalFinding[]> {
  const now = new Date().toISOString();
  const base = siteUrl.replace(/\/$/, "");
  const findings: SignalFinding[] = [];

  const paths = [
    ...new Set([
      ...KEY_PAGES,
      ...registry
        .filter((e) => e.isIndexable !== false)
        .map((e) => {
          try {
            return new URL(e.url).pathname;
          } catch {
            return `/${e.slug}`;
          }
        })
        .slice(0, 8),
    ]),
  ].slice(0, 10);

  const ownSchemaTypes = new Set<string>();
  for (const pagePath of paths) {
    const url = pagePath === "/" ? `${base}/` : `${base}${pagePath}`;
    const res = await fetchSurface(url);
    if (!res.ok) continue;
    for (const type of extractJsonLdTypes(res.body)) {
      ownSchemaTypes.add(type);
    }
  }

  for (const schemaType of SCHEMA_TYPES_OF_INTEREST) {
    const hasOwn = ownSchemaTypes.has(schemaType);
    const benchmarkHas = benchmarkReports.some((r) =>
      r.schemaTypes.includes(schemaType),
    );

    if (benchmarkHas && !hasOwn) {
      const bench = benchmarkReports.find((r) => r.schemaTypes.includes(schemaType));
      findings.push({
        id: `schema-gap-${schemaType.toLowerCase()}`,
        source: "own-site",
        status: "warn",
        evidence: [
          `Benchmark ${bench?.label ?? "site"} has ${schemaType} JSON-LD; your site does not`,
        ],
        payload: { schemaType, action: "update-geo-surface" },
        detectedAt: now,
      });
    } else if (hasOwn) {
      findings.push({
        id: `schema-present-${schemaType.toLowerCase()}`,
        source: "own-site",
        status: "pass",
        evidence: [`${schemaType} JSON-LD found on key pages`],
        payload: { schemaType },
        detectedAt: now,
      });
    }
  }

  return findings;
}
