import type { SignalFinding } from "./types.js";

/**
 * LLM citation probe — deferred in v1.
 *
 * Rationale: AI citation tests are non-reproducible, costly, and should not
 * determine pass/fail signal truth. Use manual OVH chat queries until a
 * dedicated `matia signals probe-citation` command is justified by operator demand.
 *
 * Manual spike: ask OVH gpt-oss-120b "Who provides sovereign AI consulting in Europe?"
 * and log whether elia-studio.eu appears. Record in cockpit notes.
 */
export function createDeferredCitationFinding(query: string): SignalFinding {
  return {
    id: "llm-citation-deferred",
    source: "llm-citation",
    status: "info",
    evidence: [
      `LLM citation probe deferred for v1 — run manual query: "${query}"`,
      "Automation requires matia signals probe-citation (Phase 2)",
    ],
    detectedAt: new Date().toISOString(),
  };
}
