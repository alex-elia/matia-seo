import path from "node:path";
import { runSyncGsc } from "@matia/integrations-google";
import { getArg } from "../args.js";

export async function runSyncGscCommand(): Promise<void> {
  const configPath =
    getArg("--config") ??
    path.join("configs", "sites", "example-site.json");
  const maxUrlsRaw = getArg("--max-urls");
  const delayMsRaw = getArg("--delay-ms");

  console.log("Running SEO indexing snapshot (sync-gsc)");
  console.log("=".repeat(60));

  const result = await runSyncGsc({
    configPath,
    maxUrls: maxUrlsRaw ? Number(maxUrlsRaw) : undefined,
    delayMs: delayMsRaw ? Number(delayMsRaw) : undefined,
  });

  console.log("\nSnapshot complete!");
  console.log(`JSON: ${result.jsonPath}`);
  console.log(`Markdown: ${result.markdownPath}`);
}
