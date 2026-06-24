export type { SeoGeoEntity, PageType, PublishStatus, IndexingStatus } from "./types/entity.js";
export type { SiteStrategyProfile } from "./types/strategy.js";
export type { SeoAction, ActionType, ActionStatus } from "./types/action.js";
export type {
  ParsedIntent,
  ParsedGeoEntity,
  ParsedSignal,
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
export { probeGeoSurfaces } from "./geo/probe-surfaces.js";
export type { CockpitArtifactType, CockpitStatus } from "./cockpit/store.js";
export {
  getCockpitRoot,
  importGapAnalysis,
  importGeoProbe,
  importSnapshot,
  loadActionQueue,
  mergeActionQueue,
  updateActionStatus,
  getCockpitStatus,
} from "./cockpit/store.js";

export const MATIA_VERSION = "0.2.0";

export const MATIA_TAGLINE =
  "The eyes on your search visibility. Define goals. Approve the plan. Ship.";
