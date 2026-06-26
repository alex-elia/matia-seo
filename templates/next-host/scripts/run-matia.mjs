/**
 * CANONICAL COPY — templates/next-host/scripts/run-matia.mjs
 * Spec: docs/specifications/host-integration-v1-spec.md
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = path.join(root, "matia-seo", "packages", "cli", "dist", "cli.js");

if (!fs.existsSync(cliEntry)) {
  console.error(
    "[run-matia] Missing matia CLI. Run: npm install (runs ensure-matia) or npm run build in ../matia-seo",
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliEntry, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
