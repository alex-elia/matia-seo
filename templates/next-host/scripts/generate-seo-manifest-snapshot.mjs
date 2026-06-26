/**
 * CANONICAL COPY — templates/next-host/scripts/generate-seo-manifest-snapshot.mjs
 * Spec: docs/specifications/host-integration-v1-spec.md
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seoDir = path.join(root, "src", "seo");
const strategyPath = path.join(seoDir, "strategy.yaml");
const registryPath = path.join(seoDir, "registry.ts");
const outPath = path.join(seoDir, "manifest.snapshot.json");

function hash(content) {
  return crypto.createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex").slice(0, 16);
}

const strategyContent = fs.readFileSync(strategyPath, "utf-8");
const registryContent = fs.readFileSync(registryPath, "utf-8");
const updatedAtMatch = strategyContent.match(/^updatedAt:\s*"?([^"\n]+)"?/m);
const projectMatch = strategyContent.match(/^project:\s*(.+)$/m);

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      project: projectMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "host",
      strategyUpdatedAt: updatedAtMatch?.[1]?.trim() ?? "unknown",
      strategyHash: hash(strategyContent),
      registryHash: hash(registryContent),
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(`[seo-manifest] Wrote ${outPath}`);
