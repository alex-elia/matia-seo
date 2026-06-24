import fs from "node:fs";
import path from "node:path";
import { getCockpitRoot } from "@matia/core";

export type CockpitSite = {
  slug: string;
  name: string;
  siteUrl: string;
  hostRoot: string;
  configPath: string;
};

export function getSitesRegistryPath(): string {
  return path.join(getCockpitRoot(), "sites.json");
}

function defaultSitesPath(): string {
  const candidates = [
    path.join(process.cwd(), "data", "sites.example.json"),
    path.join(process.cwd(), "..", "..", "apps", "cockpit", "data", "sites.example.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export function ensureSitesRegistry(): CockpitSite[] {
  const registryPath = getSitesRegistryPath();
  if (!fs.existsSync(registryPath)) {
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    const example = defaultSitesPath();
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, registryPath);
    } else {
      fs.writeFileSync(registryPath, JSON.stringify({ sites: [] }, null, 2));
    }
  }
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8")) as {
    sites: CockpitSite[];
  };
  return raw.sites;
}

export function listSitesFromDb(): CockpitSite[] {
  return ensureSitesRegistry();
}

export function getSiteBySlug(slug: string): CockpitSite | null {
  return ensureSitesRegistry().find((site) => site.slug === slug) ?? null;
}

export function insertSnapshot(
  siteSlug: string,
  type: string,
  payload: unknown,
  capturedAt = new Date().toISOString(),
): string {
  const dir = path.join(getCockpitRoot(), siteSlug, type);
  fs.mkdirSync(dir, { recursive: true });
  const dateLabel = capturedAt.slice(0, 10);
  const filePath = path.join(dir, `${dateLabel}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

export function getLatestSnapshot(
  siteSlug: string,
  type: string,
): { id: string; capturedAt: string; payload: unknown } | null {
  const dir = path.join(getCockpitRoot(), siteSlug, type);
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  const filePath = path.join(dir, files[0]);
  const capturedAt = files[0].replace(".json", "");
  return {
    id: filePath,
    capturedAt,
    payload: JSON.parse(fs.readFileSync(filePath, "utf-8")),
  };
}

export function resolveConfigPath(site: CockpitSite): string {
  return path.isAbsolute(site.configPath)
    ? site.configPath
    : path.join(site.hostRoot, site.configPath);
}

export function resolveMatiaCliPath(): string {
  const fromApp = path.join(process.cwd(), "..", "..", "packages", "cli", "dist", "cli.js");
  if (fs.existsSync(fromApp)) return fromApp;
  throw new Error(`Matia CLI not found at ${fromApp}. Run npm run build from matia-seo root.`);
}

export function homeDisplayPath(): string {
  return getCockpitRoot();
}
