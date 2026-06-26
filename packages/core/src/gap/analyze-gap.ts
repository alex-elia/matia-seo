import type { SeoAction } from "../types/action.js";
import type { SignalFinding } from "../signals/types.js";
import type { IndexingStatus } from "../types/entity.js";
import {
  normalizePath,
  pathFromUrl,
  type ParsedHostStrategy,
  type ParsedRegistryEntry,
} from "./parse-host-seo.js";

export type IndexingRow = {
  url: string;
  indexingStatus?: IndexingStatus | string;
  coverageState?: string;
};

export type GapAnalysisInput = {
  strategy: ParsedHostStrategy;
  registry: ParsedRegistryEntry[];
  indexingRows?: IndexingRow[];
  siteUrl?: string;
  geoProbe?: {
    entityMentions: Record<string, { llms: boolean; facts: boolean }>;
  };
  signalFindings?: SignalFinding[];
  signalDetection?: {
    comparisonMatrix?: Array<{
      checkId: string;
      label: string;
      ownSite: boolean | null;
      benchmark: boolean | null;
    }>;
  };
};

export type GapAnalysisResult = {
  project: string;
  analyzedAt: string;
  intentCoverage: {
    total: number;
    covered: number;
    partial: number;
    missing: number;
    percentCovered: number;
  };
  signalSummary: {
    total: number;
    hypothesis: number;
    validated: number;
  };
  registryPaths: string[];
  notIndexedTargets: string[];
  actions: SeoAction[];
};

function actionId(prefix: string, index: number): string {
  return `${prefix}-${Date.now()}-${index}`;
}

function registryHasPath(registry: ParsedRegistryEntry[], targetPath: string): boolean {
  const normalized = normalizePath(targetPath);
  return registry.some((entry) => {
    if (!entry.url) return normalizePath(`/${entry.slug}`) === normalized;
    return pathFromUrl(entry.url) === normalized;
  });
}

function findIndexingStatus(
  rows: IndexingRow[] | undefined,
  siteUrl: string | undefined,
  targetPath: string,
): IndexingStatus | string | undefined {
  if (!rows?.length) return undefined;
  const normalized = normalizePath(targetPath);
  const row = rows.find((item) => {
    const itemPath = pathFromUrl(item.url);
    if (itemPath === normalized) return true;
    if (siteUrl) {
      const absolute = `${siteUrl.replace(/\/$/, "")}${normalized === "/" ? "/" : normalized}`;
      return item.url === absolute || item.url === absolute.replace(/\/$/, "");
    }
    return false;
  });
  return row?.indexingStatus ?? row?.coverageState;
}

function isWeakIndexStatus(status: IndexingStatus | string | undefined): boolean {
  if (!status) return false;
  const value = status.toLowerCase();
  return (
    value === "unknown" ||
    value === "not-submitted" ||
    value === "discovered" ||
    value === "needs-review" ||
    value.includes("unknown") ||
    value.includes("not indexed") ||
    value.includes("discovered")
  );
}

export function runGapAnalysis(input: GapAnalysisInput): GapAnalysisResult {
  const { strategy, registry, indexingRows, siteUrl, geoProbe, signalFindings } = input;
  const now = new Date().toISOString();
  const actions: SeoAction[] = [];
  let actionIndex = 0;

  const covered = strategy.intents.filter((i) => i.status === "covered").length;
  const partial = strategy.intents.filter((i) => i.status === "partial").length;
  const missing = strategy.intents.filter((i) => i.status === "missing").length;
  const total = strategy.intents.length;

  const registryPaths = [
    ...new Set(registry.map((entry) => pathFromUrl(entry.url || `/${entry.slug}`))),
  ];

  const notIndexedTargets: string[] = [];

  for (const intent of strategy.intents) {
    for (const target of intent.targetPages) {
      if (!registryHasPath(registry, target)) {
        actions.push({
          id: actionId("registry", actionIndex++),
          project: strategy.project,
          type: "enrich-registry",
          status: "proposed",
          rationale: `Intent "${intent.intent}" targets ${target} but registry has no matching page.`,
          targetUrl: siteUrl ? `${siteUrl.replace(/\/$/, "")}${normalizePath(target)}` : target,
          payload: { intent: intent.intent, targetPath: normalizePath(target) },
          proposedAt: now,
        });
      }

      const indexStatus = findIndexingStatus(indexingRows, siteUrl, target);
      if (isWeakIndexStatus(indexStatus)) {
        const url = siteUrl
          ? `${siteUrl.replace(/\/$/, "")}${normalizePath(target) === "/" ? "/" : normalizePath(target)}`
          : target;
        notIndexedTargets.push(url);
        actions.push({
          id: actionId("index", actionIndex++),
          project: strategy.project,
          type: "submit-indexing",
          status: "proposed",
          rationale: `Priority page for "${intent.intent}" is ${indexStatus ?? "not indexed"} in latest GSC snapshot.`,
          targetUrl: url,
          payload: { intent: intent.intent, gscStatus: indexStatus },
          proposedAt: now,
        });
      }
    }

    if (intent.status === "missing") {
      actions.push({
        id: actionId("content", actionIndex++),
        project: strategy.project,
        type: "create-page",
        status: "proposed",
        rationale: `Intent "${intent.intent}" is marked missing in strategy.`,
        payload: {
          intent: intent.intent,
          targetPages: intent.targetPages,
          priority: intent.priority,
          contentHints: strategy.contentPrinciples.slice(0, 3),
        },
        proposedAt: now,
      });
    } else if (intent.status === "partial") {
      actions.push({
        id: actionId("content", actionIndex++),
        project: strategy.project,
        type: "update-content",
        status: "proposed",
        rationale: `Intent "${intent.intent}" is partial — strengthen copy and metadata on target pages.`,
        payload: {
          intent: intent.intent,
          targetPages: intent.targetPages,
          notes: intent.notes,
          contentHints: strategy.contentPrinciples.slice(0, 3),
        },
        proposedAt: now,
      });
    }
  }

  if (geoProbe) {
    for (const entity of strategy.geoEntities) {
      const mentions = geoProbe.entityMentions[entity.name];
      if (!mentions) continue;
      if (!mentions.llms || !mentions.facts) {
        actions.push({
          id: actionId("geo", actionIndex++),
          project: strategy.project,
          type: "update-geo-surface",
          status: "proposed",
          rationale: `GEO entity "${entity.name}" is incomplete on public surfaces (llms: ${mentions.llms}, facts: ${mentions.facts}).`,
          payload: {
            entity: entity.name,
            expectedSurfaces: entity.surfaces,
            mentions,
          },
          proposedAt: now,
        });
      }
    }
  }

  for (const signal of strategy.signals) {
    if (signal.status !== "hypothesis") continue;
    const validatedByDetector = signalFindings?.some(
      (f) => f.signalId === signal.id && f.status === "pass",
    );
    if (validatedByDetector) continue;
    actions.push({
      id: actionId("signal", actionIndex++),
      project: strategy.project,
      type: "update-content",
      status: "proposed",
      rationale: `Signal "${signal.id}" is still a hypothesis — gather evidence: ${signal.evidenceRequired.join(", ")}.`,
      payload: {
        signalId: signal.id,
        source: signal.source,
        hypothesis: signal.hypothesis,
        evidenceRequired: signal.evidenceRequired,
      },
      proposedAt: now,
    });
  }

  if (signalFindings?.length) {
    for (const finding of signalFindings) {
      if (finding.status !== "warn" && finding.status !== "fail") continue;
      const schemaType = finding.payload?.schemaType as string | undefined;
      if (schemaType && finding.id.startsWith("schema-gap-")) {
        actions.push({
          id: actionId("signal-schema", actionIndex++),
          project: strategy.project,
          type: "update-geo-surface",
          status: "proposed",
          rationale: finding.evidence[0] ?? `Add ${schemaType} JSON-LD to match benchmark`,
          payload: {
            schemaType,
            findingId: finding.id,
            action: "add-json-ld",
          },
          proposedAt: now,
        });
      } else if (finding.source === "benchmark" && finding.status === "warn") {
        actions.push({
          id: actionId("signal-bench", actionIndex++),
          project: strategy.project,
          type: "update-content",
          status: "proposed",
          rationale: finding.evidence[0] ?? "Benchmark comparison suggests content gap",
          payload: {
            findingId: finding.id,
            benchmark: finding.payload?.benchmark,
          },
          proposedAt: now,
        });
      } else if (finding.source === "gsc" && finding.status === "fail") {
        actions.push({
          id: actionId("signal-gsc", actionIndex++),
          project: strategy.project,
          type: "submit-indexing",
          status: "proposed",
          rationale: finding.evidence.join("; "),
          payload: {
            signalId: finding.signalId,
            weakPaths: finding.payload?.weakPaths,
          },
          proposedAt: now,
        });
      }
    }

    const ownAdvantages = signalFindings.filter(
      (f) =>
        f.id === "own-llms-surface" &&
        f.status === "pass" &&
        signalFindings.some(
          (b) => b.source === "benchmark" && b.id.includes("-llms") && b.payload?.value === false,
        ),
    );
    if (ownAdvantages.length > 0) {
      actions.push({
        id: actionId("signal-adv", actionIndex++),
        project: strategy.project,
        type: "update-geo-surface",
        status: "proposed",
        rationale:
          "Competitive advantage: you have llms.txt while benchmark site does not — maintain and expand entity vocabulary",
        payload: { advantage: "llms-txt" },
        proposedAt: now,
      });
    }
  }

  const hypothesis = strategy.signals.filter((s) => s.status === "hypothesis").length;
  const validated = strategy.signals.filter((s) => s.status === "validated").length;

  return {
    project: strategy.project,
    analyzedAt: now,
    intentCoverage: {
      total,
      covered,
      partial,
      missing,
      percentCovered: total > 0 ? Math.round((covered / total) * 100) : 0,
    },
    signalSummary: {
      total: strategy.signals.length,
      hypothesis,
      validated,
    },
    registryPaths,
    notIndexedTargets: [...new Set(notIndexedTargets)],
    actions,
  };
}
