import type { ParsedGeoEntity } from "../gap/parse-host-seo.js";

export type GeoSurfaceFetch = {
  ok: boolean;
  status: number;
  body: string;
};

export type GeoProbeResult = {
  siteUrl: string;
  probedAt: string;
  health?: {
    ok: boolean;
    overall?: string;
    summary?: { pass: number; warn: number; fail: number };
  };
  manifest?: {
    ok: boolean;
    remote?: {
      project: string;
      strategyUpdatedAt: string;
      strategyHash: string;
      registryHash: string;
      buildId?: string;
      matiaVersion?: string;
    };
  };
  surfaces: {
    llms: GeoSurfaceFetch;
    facts: GeoSurfaceFetch;
  };
  entityMentions: Record<string, { llms: boolean; facts: boolean }>;
  missingEntities: string[];
};

async function fetchSurface(url: string): Promise<GeoSurfaceFetch> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "*/*" },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

function mentionsEntity(text: string, entityName: string): boolean {
  const normalized = entityName.toLowerCase();
  const haystack = text.toLowerCase();
  if (haystack.includes(normalized)) return true;

  const tokens = normalized.split(/\s+/).filter((token) => token.length > 3);
  if (tokens.length === 0) return false;
  const matched = tokens.filter((token) => haystack.includes(token)).length;
  return matched / tokens.length >= 0.6;
}

export async function probeGeoSurfaces(
  siteUrl: string,
  geoEntities: ParsedGeoEntity[],
): Promise<GeoProbeResult> {
  const base = siteUrl.replace(/\/$/, "");
  const [healthRes, manifestRes, llms, facts] = await Promise.all([
    fetchSurface(`${base}/api/seo/health`),
    fetchSurface(`${base}/api/seo/manifest`),
    fetchSurface(`${base}/llms.txt`),
    fetchSurface(`${base}/api/facts.json`),
  ]);

  let health: GeoProbeResult["health"];
  if (healthRes.ok) {
    try {
      const parsed = JSON.parse(healthRes.body) as {
        overall?: string;
        summary?: { pass: number; warn: number; fail: number };
      };
      health = {
        ok: true,
        overall: parsed.overall,
        summary: parsed.summary,
      };
    } catch {
      health = { ok: false };
    }
  } else {
    health = { ok: false };
  }

  let manifest: GeoProbeResult["manifest"];
  if (manifestRes.ok) {
    try {
      const parsed = JSON.parse(manifestRes.body) as {
        project: string;
        strategyUpdatedAt: string;
        strategyHash: string;
        registryHash: string;
        buildId?: string;
        matiaVersion?: string;
      };
      manifest = { ok: true, remote: parsed };
    } catch {
      manifest = { ok: false };
    }
  } else {
    manifest = { ok: false };
  }

  const entityMentions: Record<string, { llms: boolean; facts: boolean }> = {};
  const missingEntities: string[] = [];

  for (const entity of geoEntities) {
    const llmsHit = mentionsEntity(llms.body, entity.name);
    const factsHit = mentionsEntity(facts.body, entity.name);
    entityMentions[entity.name] = { llms: llmsHit, facts: factsHit };
    if (!llmsHit || !factsHit) missingEntities.push(entity.name);
  }

  return {
    siteUrl: base,
    probedAt: new Date().toISOString(),
    health,
    manifest,
    surfaces: { llms, facts },
    entityMentions,
    missingEntities,
  };
}
