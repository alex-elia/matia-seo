import { MATIA_VERSION } from "@matia/core";

export type SeoManifest = {
  schemaVersion: "1.0";
  project: string;
  siteUrl: string;
  generatedAt: string;
  matiaVersion: string;
  strategyUpdatedAt: string;
  strategyHash: string;
  registryHash: string;
  registryEntryCount: number;
  publishedIndexableCount: number;
  buildId?: string;
};

export type BuildSeoManifestInput = {
  project: string;
  siteUrl: string;
  strategyUpdatedAt: string;
  strategyHash: string;
  registryHash: string;
  registryEntryCount: number;
  publishedIndexableCount: number;
  buildId?: string;
  generatedAt?: string;
};

/** Read-only deploy fingerprint for cockpit drift detection (no secrets). */
export function buildSeoManifest(input: BuildSeoManifestInput): SeoManifest {
  return {
    schemaVersion: "1.0",
    project: input.project,
    siteUrl: input.siteUrl.replace(/\/$/, ""),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    matiaVersion: MATIA_VERSION,
    strategyUpdatedAt: input.strategyUpdatedAt,
    strategyHash: input.strategyHash,
    registryHash: input.registryHash,
    registryEntryCount: input.registryEntryCount,
    publishedIndexableCount: input.publishedIndexableCount,
    buildId: input.buildId,
  };
}
