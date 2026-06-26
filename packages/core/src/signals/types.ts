export type SignalFindingStatus = "pass" | "warn" | "fail" | "info";

export type SignalFindingSource =
  | "own-site"
  | "benchmark"
  | "gsc"
  | "geo-probe"
  | "llm-citation"
  | "manual";

export type SignalFinding = {
  id: string;
  signalId?: string;
  source: SignalFindingSource;
  status: SignalFindingStatus;
  hypothesis?: string;
  evidence: string[];
  payload?: Record<string, unknown>;
  detectedAt: string;
};

export type BenchmarkSite = {
  url: string;
  label: string;
  reason: string;
};

export type BenchmarkCheckResult = {
  checkId: string;
  label: string;
  ownSite: boolean | null;
  benchmark: boolean | null;
  ownDetail?: string;
  benchmarkDetail?: string;
};

export type BenchmarkSiteReport = {
  url: string;
  label: string;
  checks: Record<string, boolean | number | string[]>;
  schemaTypes: string[];
  aiAgentsAllowed: string[];
  entityOverlapPercent: number;
};

export type SignalValidationResult = {
  signalId: string;
  previousStatus: "hypothesis" | "validated" | "rejected";
  suggestedStatus: "hypothesis" | "validated" | "rejected";
  reason: string;
};

export type SignalDetectionResult = {
  project: string;
  detectedAt: string;
  siteUrl: string;
  findings: SignalFinding[];
  benchmarkReports: BenchmarkSiteReport[];
  comparisonMatrix: BenchmarkCheckResult[];
  validations: SignalValidationResult[];
  baselineMatrix?: Record<string, unknown>;
};

/**
 * LangGraph decision (v1): deferred.
 * Deterministic detectors cover pass/fail signal truth; a single OVH synthesis call
 * suffices for brief generation. Revisit LangGraph when multi-step branching investigations
 * (matia signals investigate --signal X) prove necessary after v1 ships.
 */
export const SIGNALS_LANGGRAPH_DECISION =
  "v1 uses deterministic detectors only; LangGraph deferred to v2+ for investigate workflows";
