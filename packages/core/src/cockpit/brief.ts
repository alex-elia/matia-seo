import type { SeoAction } from "../types/action.js";
import type { GapAnalysisResult } from "../gap/analyze-gap.js";
import type { GeoProbeResult } from "../geo/probe-surfaces.js";
import type { SignalDetectionResult } from "../signals/types.js";

export type DriftStatus = "in-sync" | "local-ahead" | "deploy-ahead" | "unknown";

export type BriefPriority = "high" | "medium" | "low";

export type BriefCheck = {
  id: string;
  status: "pass" | "warn" | "fail" | "unknown";
  title: string;
  explanation: string;
};

export type BriefRecommendation = {
  id: string;
  priority: BriefPriority;
  title: string;
  whyItMatters: string;
  whatToDo: string;
  actionType?: SeoAction["type"];
  targetUrl?: string;
  technicalNote?: string;
};

export type CockpitSiteBrief = {
  generatedAt: string;
  headline: string;
  summary: string;
  overallScore: "good" | "attention" | "critical" | "unknown";
  deploy: {
    status: DriftStatus;
    title: string;
    explanation: string;
    nextStep: string;
  };
  visibility: {
    title: string;
    checks: BriefCheck[];
  };
  content: {
    title: string;
    intentPercent: number | null;
    explanation: string;
    partialTopics: string[];
  };
  signals: {
    title: string;
    hypothesis: number;
    validated: number;
    findings: Array<{ status: string; text: string }>;
    comparisonMatrix: Array<{
      label: string;
      ownSite: boolean | null;
      benchmark: boolean | null;
    }>;
  };
  recommendations: BriefRecommendation[];
};

function driftCopy(status: DriftStatus): Pick<CockpitSiteBrief["deploy"], "title" | "explanation" | "nextStep"> {
  switch (status) {
    case "in-sync":
      return {
        title: "Live site matches your plan",
        explanation:
          "What visitors and search engines see online matches the strategy and page list in your project folder.",
        nextStep: "No deploy needed for strategy files. Continue with content improvements below if any.",
      };
    case "local-ahead":
      return {
        title: "Unpublished changes on your computer",
        explanation:
          "You edited strategy or page inventory locally, but the live site has not been updated yet.",
        nextStep: "Commit and deploy the site, then refresh this page to confirm.",
      };
    case "deploy-ahead":
      return {
        title: "Live site and local files differ",
        explanation:
          "The deployed site was built from different file content than what is on this machine (often an older commit or line-ending difference).",
        nextStep: "Run git pull, or deploy your latest commit, until status shows in-sync.",
      };
    default:
      return {
        title: "Could not verify deploy status",
        explanation: "The live site did not return a readable manifest, or local project files are missing.",
        nextStep: "Check the site is online, then run Probe GEO.",
      };
  }
}

function humanizeAction(action: SeoAction): BriefRecommendation {
  const intent = String(action.payload.intent ?? "");
  const target = action.targetUrl ?? (action.payload.targetPages as string[] | undefined)?.[0];

  switch (action.type) {
    case "update-content":
      return {
        id: action.id,
        priority: intent ? "high" : "medium",
        title: intent ? `Strengthen content for “${intent}”` : "Improve page content",
        whyItMatters:
          "Search engines and AI assistants rank pages that clearly answer what your buyers are looking for.",
        whatToDo: target
          ? `Review and update copy on ${target} (and FR equivalent if applicable). Align with your strategy proof points.`
          : "Update the pages listed in your strategy for this topic — services, references, or home as relevant.",
        actionType: action.type,
        targetUrl: action.targetUrl,
        technicalNote: action.rationale,
      };
    case "submit-indexing":
      return {
        id: action.id,
        priority: "medium",
        title: "Ask Google to review important pages",
        whyItMatters:
          "New or updated pages may not appear in search until Google crawls and indexes them — this can take days.",
        whatToDo:
          "Run indexing submit from Matia (or wait for natural crawl). Do not resubmit daily — once per meaningful update is enough.",
        actionType: action.type,
        targetUrl: action.targetUrl,
        technicalNote: action.rationale,
      };
    case "update-geo-surface":
      return {
        id: action.id,
        priority: "high",
        title: "Update AI-friendly business summary",
        whyItMatters:
          "Tools like ChatGPT and Perplexity read llms.txt and facts.json to cite your offers and proof points.",
        whatToDo:
          "Ensure your key offers and client names appear consistently on llms.txt, facts.json, and the relevant pages.",
        actionType: action.type,
        technicalNote: action.rationale,
      };
    case "create-page":
      return {
        id: action.id,
        priority: "high",
        title: "Create a missing page for a planned topic",
        whyItMatters: "You planned to target a search topic but have no dedicated page for it yet.",
        whatToDo: "Add a new page to the site and register it in src/seo/registry.ts, then deploy.",
        actionType: action.type,
        technicalNote: action.rationale,
      };
    case "enrich-registry":
      return {
        id: action.id,
        priority: "medium",
        title: "Add a page to your site inventory",
        whyItMatters: "Matia tracks which URLs belong to your SEO plan — missing entries cause blind spots.",
        whatToDo: "Add the page to src/seo/registry.ts so sitemap and gap analysis stay accurate.",
        actionType: action.type,
        targetUrl: action.targetUrl,
        technicalNote: action.rationale,
      };
    default:
      return {
        id: action.id,
        priority: "low",
        title: "Review suggested SEO improvement",
        whyItMatters: action.rationale,
        whatToDo: "Discuss with your operator or implement in the site repository.",
        actionType: action.type,
        targetUrl: action.targetUrl,
        technicalNote: action.rationale,
      };
  }
}

function probeChecks(probe: GeoProbeResult | null | undefined): BriefCheck[] {
  if (!probe) {
    return [
      {
        id: "probe-missing",
        status: "unknown",
        title: "No recent live check",
        explanation: "Run Probe GEO to scan your public site (health, AI summary files, facts).",
      },
    ];
  }

  const checks: BriefCheck[] = [];

  if (probe.health?.ok) {
    checks.push({
      id: "health",
      status: probe.health.overall === "pass" ? "pass" : probe.health.overall === "fail" ? "fail" : "warn",
      title:
        probe.health.overall === "pass"
          ? "Public SEO setup looks healthy"
          : "Some SEO checks need attention",
      explanation:
        probe.health.overall === "pass"
          ? "Sitemap, robots, llms.txt, and facts.json are reachable and aligned with your page list."
          : "Open the technical health report or run seo:audit for details.",
    });
  } else {
    checks.push({
      id: "health",
      status: "fail",
      title: "Could not read site health",
      explanation: "The /api/seo/health endpoint did not respond correctly.",
    });
  }

  checks.push({
    id: "llms",
    status: probe.surfaces.llms.ok ? "pass" : "fail",
    title: probe.surfaces.llms.ok ? "AI summary file (llms.txt) is online" : "llms.txt missing or unreachable",
    explanation: probe.surfaces.llms.ok
      ? "AI crawlers can read a plain-language summary of your business."
      : "Add or fix /llms.txt so AI tools can cite you accurately.",
  });

  checks.push({
    id: "facts",
    status: probe.surfaces.facts.ok ? "pass" : "fail",
    title: probe.surfaces.facts.ok ? "Structured facts file is online" : "facts.json missing or unreachable",
    explanation: probe.surfaces.facts.ok
      ? "Structured data helps AI and search understand your offers and references."
      : "Add or fix /api/facts.json.",
  });

  if (probe.missingEntities.length > 0) {
    checks.push({
      id: "geo-entities",
      status: "warn",
      title: `${probe.missingEntities.length} proof point(s) incomplete on AI surfaces`,
      explanation: `Missing or partial: ${probe.missingEntities.join(", ")}. Align llms.txt and facts.json with your strategy.`,
    });
  } else if (Object.keys(probe.entityMentions).length > 0) {
    checks.push({
      id: "geo-entities",
      status: "pass",
      title: "Key offers and references appear on AI surfaces",
      explanation: "Your planned GEO entities are mentioned on llms.txt and facts.json.",
    });
  }

  return checks;
}

export type BuildBriefInput = {
  drift: DriftStatus;
  probe?: GeoProbeResult | null;
  gap?: GapAnalysisResult | null;
  signalDetection?: SignalDetectionResult | null;
  proposedActions?: SeoAction[];
};

export function buildCockpitSiteBrief(input: BuildBriefInput): CockpitSiteBrief {
  const { drift, probe, gap, signalDetection, proposedActions = [] } = input;
  const deploy = driftCopy(drift);
  const checks = probeChecks(probe ?? null);

  const intentPercent = gap?.intentCoverage.percentCovered ?? null;
  const partialTopics =
    gap?.actions
      .filter((a) => a.type === "update-content" && a.payload.intent)
      .map((a) => String(a.payload.intent))
      .slice(0, 5) ?? [];

  const hypothesis =
    signalDetection?.validations.filter((v) => v.suggestedStatus === "hypothesis").length ??
    gap?.signalSummary.hypothesis ??
    0;
  const validated =
    signalDetection?.validations.filter((v) => v.suggestedStatus === "validated").length ??
    gap?.signalSummary.validated ??
    0;

  const signalFindings =
    signalDetection?.findings
      .filter((f) => f.status === "warn" || f.status === "fail" || f.status === "pass")
      .slice(0, 8)
      .map((f) => ({ status: f.status, text: f.evidence[0] ?? f.id })) ?? [];

  const comparisonMatrix =
    signalDetection?.comparisonMatrix.map((row) => ({
      label: row.label,
      ownSite: row.ownSite,
      benchmark: row.benchmark,
    })) ?? [];

  const recommendations = proposedActions.slice(0, 8).map(humanizeAction);

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  let overallScore: CockpitSiteBrief["overallScore"] = "good";
  if (drift !== "in-sync" || failCount > 0) overallScore = "critical";
  else if (warnCount > 0 || (intentPercent !== null && intentPercent < 70) || recommendations.length > 3) {
    overallScore = "attention";
  } else if (!probe && !gap) overallScore = "unknown";

  let headline = "Your site visibility looks good";
  if (overallScore === "critical") headline = "Some issues need attention before you invest in ads";
  else if (overallScore === "attention") headline = "Solid base — a few improvements will help discovery";
  else if (overallScore === "unknown") headline = "Run a live check to see how your site is doing";

  const summaryParts: string[] = [];
  if (intentPercent !== null) {
    summaryParts.push(`You cover ${intentPercent}% of the search topics in your plan.`);
  }
  if (recommendations.length > 0) {
    summaryParts.push(`${recommendations.length} recommended step(s) below — approve any you want to implement.`);
  }
  if (drift !== "in-sync") {
    summaryParts.push(deploy.explanation);
  }

  return {
    generatedAt: new Date().toISOString(),
    headline,
    summary: summaryParts.join(" ") || "Use Probe GEO and Run gap to generate insights.",
    overallScore,
    deploy: { status: drift, ...deploy },
    visibility: {
      title: "Can people and AI find you?",
      checks,
    },
    content: {
      title: "Do your pages match what buyers search for?",
      intentPercent,
      explanation:
        intentPercent === null
          ? "Run gap analysis to compare your strategy topics with your live pages and Google indexing."
          : intentPercent >= 80
            ? "Most planned topics are covered. Focus on strengthening partial pages and proof points."
            : "Several planned topics are only partially covered — improving services and references pages usually helps first.",
      partialTopics,
    },
    signals: {
      title: "GEO signals & benchmark comparison",
      hypothesis,
      validated,
      findings: signalFindings,
      comparisonMatrix,
    },
    recommendations,
  };
}

export function computeDriftStatus(
  local: { strategyHash?: string; registryHash?: string; strategyUpdatedAt?: string } | null,
  remote: Record<string, unknown> | null,
): DriftStatus {
  if (!local || !remote) return "unknown";
  if (
    local.strategyHash === remote.strategyHash &&
    local.registryHash === remote.registryHash
  ) {
    return "in-sync";
  }
  if (local.strategyUpdatedAt && remote.strategyUpdatedAt) {
    const localDate = Date.parse(String(local.strategyUpdatedAt));
    const remoteDate = Date.parse(String(remote.strategyUpdatedAt));
    if (!Number.isNaN(localDate) && !Number.isNaN(remoteDate) && localDate !== remoteDate) {
      return localDate > remoteDate ? "local-ahead" : "deploy-ahead";
    }
  }
  return "deploy-ahead";
}
