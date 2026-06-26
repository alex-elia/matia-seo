export type ParsedBenchmarkSite = {
  url: string;
  label: string;
  reason: string;
};

export type ParsedIntent = {
  intent: string;
  type: string;
  priority: "high" | "medium" | "low";
  targetPages: string[];
  status: "covered" | "partial" | "missing";
  notes?: string;
  hypothesisQueries?: string[];
};

export type ParsedGeoEntity = {
  name: string;
  type: string;
  surfaces: string[];
};

export type ParsedSignal = {
  id: string;
  source: string;
  hypothesis: string;
  evidenceRequired: string[];
  keywordPatterns?: string[];
  status: "hypothesis" | "validated" | "rejected";
};

export type ParsedHostStrategy = {
  project: string;
  intents: ParsedIntent[];
  geoEntities: ParsedGeoEntity[];
  signals: ParsedSignal[];
  benchmarkSites: ParsedBenchmarkSite[];
  contentPrinciples: string[];
};

export type ParsedRegistryEntry = {
  slug: string;
  url: string;
  locale?: string;
  pageType?: string;
  isIndexable?: boolean;
};

function parseQuotedValue(line: string): string {
  const match = line.match(/:\s*["']([^"']+)["']/);
  return match?.[1]?.trim() ?? "";
}

function parseInlineArray(line: string): string[] {
  const match = line.match(/\[(.*)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function extractSection(content: string, listKey: string): string {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) =>
    new RegExp(`^${listKey}:\\s*`).test(line),
  );
  if (startIndex < 0) return "";

  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0 && /^\S/.test(line)) break;
    sectionLines.push(line);
  }
  return sectionLines.join("\n");
}

function parseYamlListBlock(
  content: string,
  listKey: string,
): Array<Record<string, string | string[]>> {
  const section = extractSection(content, listKey);
  if (!section.trim()) return [];

  const lines = section.split(/\r?\n/);
  const items: Array<Record<string, string | string[]>> = [];
  let current: Record<string, string | string[]> | null = null;
  let nestedListKey: string | null = null;

  for (const line of lines) {
    if (/^\s{2}-\s/.test(line)) {
      if (current) items.push(current);
      current = {};
      nestedListKey = null;

      const inline = line.match(/^\s{2}-\s+([\w-]+):\s*(.*)$/);
      if (!inline) continue;
      const [, key, rawValue] = inline;
      if (rawValue.includes("[") && rawValue.includes("]")) {
        current[key] = parseInlineArray(rawValue);
      } else if (/^["']/.test(rawValue)) {
        current[key] = parseQuotedValue(`${key}: ${rawValue}`);
      } else if (rawValue.trim()) {
        current[key] = rawValue.trim();
      }
      continue;
    }

    if (!current) continue;

    const nestedKeyMatch = line.match(/^\s{4}([\w-]+):\s*$/);
    if (nestedKeyMatch) {
      nestedListKey = nestedKeyMatch[1];
      current[nestedListKey] = [];
      continue;
    }

    const nestedItemMatch = line.match(/^\s{6}-\s+(.+)$/);
    if (nestedListKey && nestedItemMatch) {
      const value = nestedItemMatch[1].trim().replace(/^["']|["']$/g, "");
      const list = current[nestedListKey];
      if (Array.isArray(list)) list.push(value);
      continue;
    }

    const fieldMatch = line.match(/^\s{4}([\w-]+):\s*(.*)$/);
    if (fieldMatch) {
      nestedListKey = null;
      const [, key, rawValue] = fieldMatch;
      if (rawValue.includes("[") && rawValue.includes("]")) {
        current[key] = parseInlineArray(rawValue);
      } else if (/^["']/.test(rawValue)) {
        current[key] = parseQuotedValue(`${key}: ${rawValue}`);
      } else if (rawValue.trim()) {
        current[key] = rawValue.trim();
      }
    }
  }

  if (current) items.push(current);
  return items;
}

export function parseStrategyYaml(content: string): ParsedHostStrategy {
  const projectMatch = content.match(/^project:\s*(.+)$/m);
  const project = projectMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "unknown";

  const intents = parseYamlListBlock(content, "intentMap").map((item) => ({
    intent: String(item.intent ?? ""),
    type: String(item.type ?? "commercial"),
    priority: (item.priority as ParsedIntent["priority"]) ?? "medium",
    targetPages: Array.isArray(item.targetPages)
      ? item.targetPages
      : parseInlineArray(`targetPages: ${String(item.targetPages ?? "[]")}`),
    status: (item.status as ParsedIntent["status"]) ?? "partial",
    notes: item.notes ? String(item.notes) : undefined,
    hypothesisQueries: Array.isArray(item.hypothesisQueries)
      ? item.hypothesisQueries
      : item.hypothesisQueries
        ? parseInlineArray(`hypothesisQueries: ${String(item.hypothesisQueries)}`)
        : undefined,
  }));

  const geoEntities = parseYamlListBlock(content, "geoEntities").map((item) => ({
    name: String(item.name ?? ""),
    type: String(item.type ?? "entity"),
    surfaces: Array.isArray(item.surfaces)
      ? item.surfaces
      : parseInlineArray(`surfaces: ${String(item.surfaces ?? "[]")}`),
  }));

  const signals = parseYamlListBlock(content, "signalDetection").map((item) => ({
    id: String(item.id ?? item.source ?? "signal"),
    source: String(item.source ?? "unknown"),
    hypothesis: String(item.hypothesis ?? ""),
    evidenceRequired: Array.isArray(item.evidenceRequired)
      ? item.evidenceRequired
      : parseInlineArray(
          `evidenceRequired: ${String(item.evidenceRequired ?? "[]")}`,
        ),
    keywordPatterns: Array.isArray(item.keywordPatterns)
      ? item.keywordPatterns
      : item.keywordPatterns
        ? parseInlineArray(`keywordPatterns: ${String(item.keywordPatterns)}`)
        : undefined,
    status: (item.status as ParsedSignal["status"]) ?? "hypothesis",
  }));

  const benchmarkSites = parseYamlListBlock(content, "benchmarkSites").map((item) => ({
    url: String(item.url ?? ""),
    label: String(item.label ?? item.url ?? "benchmark"),
    reason: String(item.reason ?? ""),
  }));

  const principlesSection = extractSection(content, "contentPrinciples");
  const contentPrinciples = principlesSection
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  return { project, intents, geoEntities, signals, benchmarkSites, contentPrinciples };
}

export function parseRegistryTs(content: string): ParsedRegistryEntry[] {
  const entries: ParsedRegistryEntry[] = [];
  const blocks = content.split(/\{\s*\n/);

  for (const block of blocks) {
    const slugMatch = block.match(/\bslug:\s*["']([^"']+)["']/);
    const urlMatch = block.match(/\burl:\s*["']([^"']+)["']/);
    if (!slugMatch && !urlMatch) continue;

    const localeMatch = block.match(/\blocale:\s*["']([^"']+)["']/);
    const pageTypeMatch = block.match(/\bpageType:\s*["']([^"']+)["']/);
    const indexableMatch = block.match(/\bisIndexable:\s*(true|false)/);

    entries.push({
      slug: slugMatch?.[1] ?? "",
      url: urlMatch?.[1] ?? "",
      locale: localeMatch?.[1],
      pageType: pageTypeMatch?.[1],
      isIndexable: indexableMatch ? indexableMatch[1] === "true" : undefined,
    });
  }

  return entries.filter((entry) => entry.url || entry.slug);
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function pathFromUrl(url: string): string {
  try {
    return normalizePath(new URL(url).pathname);
  } catch {
    return normalizePath(url);
  }
}
