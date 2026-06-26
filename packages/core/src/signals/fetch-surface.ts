export type SurfaceFetch = {
  ok: boolean;
  status: number;
  body: string;
  finalUrl?: string;
};

export async function fetchSurface(url: string): Promise<SurfaceFetch> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "*/*", "User-Agent": "Matia-GEO-Probe/0.3" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body, finalUrl: res.url };
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

export function extractJsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]) as Record<string, unknown> | Record<string, unknown>[];
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const type = item["@type"];
        if (typeof type === "string") types.add(type);
        else if (Array.isArray(type)) {
          for (const t of type) {
            if (typeof t === "string") types.add(t);
          }
        }
        const graph = item["@graph"];
        if (Array.isArray(graph)) {
          for (const node of graph) {
            const nodeType = (node as Record<string, unknown>)["@type"];
            if (typeof nodeType === "string") types.add(nodeType);
          }
        }
      }
    } catch {
      // skip malformed JSON-LD
    }
  }
  return [...types];
}

export function parseRobotsAiAgents(robotsBody: string): Record<string, boolean> {
  const agents = ["GPTBot", "PerplexityBot", "Google-Extended", "Bingbot"] as const;
  const result: Record<string, boolean> = {};
  const lines = robotsBody.split(/\r?\n/);
  let currentAgent: string | null = null;

  for (const line of lines) {
    const agentMatch = line.match(/^User-agent:\s*(.+)/i);
    if (agentMatch) {
      currentAgent = agentMatch[1].trim();
      continue;
    }
    if (!currentAgent) continue;
    const disallow = line.match(/^Disallow:\s*(.*)/i);
    if (!disallow) continue;
    const path = disallow[1].trim();
    for (const agent of agents) {
      if (currentAgent === "*" || currentAgent === agent) {
        result[agent] = path !== "/";
      }
    }
  }

  for (const agent of agents) {
    if (result[agent] === undefined) result[agent] = true;
  }
  return result;
}

export function extractSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

export function entityTokenOverlap(
  text: string,
  entityNames: string[],
): number {
  if (entityNames.length === 0) return 0;
  let matched = 0;
  const haystack = text.toLowerCase();
  for (const name of entityNames) {
    const tokens = name.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    if (tokens.length === 0) continue;
    const hit = tokens.filter((t) => haystack.includes(t)).length;
    if (hit / tokens.length >= 0.6) matched++;
  }
  return Math.round((matched / entityNames.length) * 100);
}
