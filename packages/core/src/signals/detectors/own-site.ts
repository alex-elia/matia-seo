import type { GeoProbeResult } from "../../geo/probe-surfaces.js";
import type { ParsedSignal } from "../../gap/parse-host-seo.js";
import type { SignalFinding } from "../types.js";

export function runOwnSiteDetector(
  probe: GeoProbeResult,
  signals: ParsedSignal[],
): SignalFinding[] {
  const now = new Date().toISOString();
  const findings: SignalFinding[] = [];

  if (probe.health?.ok) {
    findings.push({
      id: "own-health-overall",
      source: "own-site",
      status:
        probe.health.overall === "pass"
          ? "pass"
          : probe.health.overall === "fail"
            ? "fail"
            : "warn",
      evidence: [`Site health overall: ${probe.health.overall ?? "unknown"}`],
      detectedAt: now,
    });
  } else {
    findings.push({
      id: "own-health-unavailable",
      source: "own-site",
      status: "fail",
      evidence: ["/api/seo/health did not respond correctly"],
      detectedAt: now,
    });
  }

  findings.push({
    id: "own-llms-surface",
    source: "own-site",
    status: probe.surfaces.llms.ok ? "pass" : "fail",
    evidence: [
      probe.surfaces.llms.ok
        ? `llms.txt online (HTTP ${probe.surfaces.llms.status})`
        : `llms.txt missing or unreachable (HTTP ${probe.surfaces.llms.status})`,
    ],
    detectedAt: now,
  });

  findings.push({
    id: "own-facts-surface",
    source: "own-site",
    status: probe.surfaces.facts.ok ? "pass" : "fail",
    evidence: [
      probe.surfaces.facts.ok
        ? `facts.json online (HTTP ${probe.surfaces.facts.status})`
        : `facts.json missing or unreachable (HTTP ${probe.surfaces.facts.status})`,
    ],
    detectedAt: now,
  });

  for (const [entity, mentions] of Object.entries(probe.entityMentions)) {
    const complete = mentions.llms && mentions.facts;
    findings.push({
      id: `own-entity-${entity.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`,
      source: "geo-probe",
      status: complete ? "pass" : "warn",
      evidence: [
        `GEO entity "${entity}": llms=${mentions.llms}, facts=${mentions.facts}`,
      ],
      payload: { entity, mentions },
      detectedAt: now,
    });
  }

  if (probe.health?.ok && probe.surfaces.llms.ok) {
    // health checks parsed separately in runner via /api/seo/health fetch
  }

  const bingSignal = signals.find((s) => s.id === "bing-copilot-eu");
  if (bingSignal) {
    const llmsMentionsBing =
      probe.surfaces.llms.ok &&
      probe.surfaces.llms.body.toLowerCase().includes("bing");
    findings.push({
      id: "own-bing-signal",
      signalId: "bing-copilot-eu",
      source: "own-site",
      status: "info",
      evidence: [
        llmsMentionsBing
          ? "llms.txt references Bing visibility"
          : "Bing signal relies on robots.txt + sitemap (check health report)",
      ],
      hypothesis: bingSignal.hypothesis,
      detectedAt: now,
    });
  }

  const regulatedSignal = signals.find((s) => s.id === "regulated-sector-proof");
  if (regulatedSignal) {
    const refEntity = Object.entries(probe.entityMentions).find(([name]) =>
      name.toLowerCase().includes("reference") || name.toLowerCase().includes("client"),
    );
    const complete = refEntity?.[1]?.llms && refEntity?.[1]?.facts;
    findings.push({
      id: "own-regulated-sector-proof",
      signalId: "regulated-sector-proof",
      source: "geo-probe",
      status: complete ? "pass" : "warn",
      evidence: complete
        ? ["Client references appear on both llms.txt and facts.json"]
        : ["Client references incomplete on AI surfaces"],
      hypothesis: regulatedSignal.hypothesis,
      detectedAt: now,
    });
  }

  const mvpSignal = signals.find((s) => s.id === "mvp-price-entry");
  if (mvpSignal) {
    const llmsBody = probe.surfaces.llms.body.toLowerCase();
    const hasOffer =
      llmsBody.includes("€5") ||
      llmsBody.includes("5k") ||
      llmsBody.includes("two weeks") ||
      llmsBody.includes("2 weeks");
    findings.push({
      id: "own-mvp-price-entry",
      signalId: "mvp-price-entry",
      source: "geo-probe",
      status: hasOffer ? "pass" : "warn",
      evidence: hasOffer
        ? ["Offer ladder (MVP sprint / from €5k) cited on llms.txt"]
        : ["Offer ladder not clearly cited on llms.txt"],
      hypothesis: mvpSignal.hypothesis,
      detectedAt: now,
    });
  }

  return findings;
}
