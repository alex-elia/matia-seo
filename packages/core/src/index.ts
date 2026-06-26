export type { SeoGeoEntity, PageType, PublishStatus, IndexingStatus } from "./types/entity.js";
export type { SiteStrategyProfile } from "./types/strategy.js";
export type { SeoAction, ActionType, ActionStatus } from "./types/action.js";
export type {
  ParsedIntent,
  ParsedGeoEntity,
  ParsedSignal,
  ParsedBenchmarkSite,
  ParsedHostStrategy,
  ParsedRegistryEntry,
} from "./gap/parse-host-seo.js";
export {
  parseStrategyYaml,
  parseRegistryTs,
  normalizePath,
  pathFromUrl,
} from "./gap/parse-host-seo.js";
export type {
  GapAnalysisInput,
  GapAnalysisResult,
  IndexingRow,
} from "./gap/analyze-gap.js";
export { runGapAnalysis } from "./gap/analyze-gap.js";
export type { GeoProbeResult, GeoSurfaceFetch } from "./geo/probe-surfaces.js";
export { probeGeoSurfaces, mentionsEntity } from "./geo/probe-surfaces.js";
export type { CockpitArtifactType, CockpitStatus } from "./cockpit/store.js";
export {
  getCockpitRoot,
  importGapAnalysis,
  importGeoProbe,
  importSignalDetection,
  getLatestSignalDetection,
  importSnapshot,
  loadActionQueue,
  mergeActionQueue,
  updateActionStatus,
  patchAction,
  getCockpitStatus,
} from "./cockpit/store.js";
export type { ExecuteActionResult } from "./cockpit/execute-action.js";
export { executeActionOnHost } from "./cockpit/execute-action.js";
export type {
  BriefCheck,
  BriefPriority,
  BriefRecommendation,
  BuildBriefInput,
  CockpitSiteBrief,
  DriftStatus,
} from "./cockpit/brief.js";
export { buildCockpitSiteBrief, computeDriftStatus } from "./cockpit/brief.js";
export type {
  ArticleDraft,
  ContentGenerateReview,
  GroundingContext,
  GroundingFacts,
  ValidationIssue,
  ValidationResult,
} from "./content/types.js";
export { buildGroundingContext, serializeGroundingForPrompt } from "./content/grounding.js";
export { buildArticlePrompt } from "./content/prompts.js";
export { formatBlogMarkdown, parseArticleResponse } from "./content/parse-response.js";
export { validateArticleClaims } from "./content/validate-claims.js";
export { hashString, slugifyIntent } from "./content/utils.js";
export type {
  SignalFinding,
  SignalFindingSource,
  SignalFindingStatus,
  BenchmarkSite,
  BenchmarkCheckResult,
  BenchmarkSiteReport,
  SignalValidationResult,
  SignalDetectionResult,
} from "./signals/types.js";
export { SIGNALS_LANGGRAPH_DECISION } from "./signals/types.js";
export { runSignalDetection } from "./signals/runner.js";
export type { RunSignalDetectionInput } from "./signals/runner.js";
export { autoValidateSignals, applySignalValidationsToYaml } from "./signals/auto-validate.js";
export { createDeferredCitationFinding } from "./signals/llm-citation.js";

export const MATIA_VERSION = "0.3.0";

export const MATIA_TAGLINE =
  "The eyes on your search visibility. Define goals. Approve the plan. Ship.";
