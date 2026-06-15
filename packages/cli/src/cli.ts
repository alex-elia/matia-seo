#!/usr/bin/env node
import { MATIA_TAGLINE, MATIA_VERSION } from "@matia/core";
import { getCommand, getSubcommand } from "./args.js";
import { runAnalyzeNotIndexedCommand } from "./commands/analyze-not-indexed.js";
import { runSubmitIndexingCommand } from "./commands/submit-indexing.js";
import { runSyncGscCommand } from "./commands/sync-gsc.js";

const HELP = `
Matia — SEO/GEO Agent Platform (v${MATIA_VERSION})
${MATIA_TAGLINE}

Usage:
  matia <command> [options]

Commands:
  help                          Show this help
  version                       Show version
  sync-gsc                      GSC indexing snapshot (ported from EliaGo weekly check)
  submit-indexing               Submit URLs via Google Indexing API
  analyze not-indexed           List not-indexed URLs from latest snapshot
  check                         Validate SEO setup (coming soon)

sync-gsc options:
  --config <path>               Site config JSON (required for real runs)
  --max-urls <n>                Max URLs to inspect
  --delay-ms <n>                Delay between inspections

submit-indexing options:
  --config <path>               Site config JSON (required)
  --from-report <path>          indexing-status.json (default: latest snapshot)
  --csv <path>                  CSV with URLs (legacy EliaGo format)
  --limit <n>                   Max URLs (default 200)
  --dry-run                     Preview without submitting
  --filter-low-value            Skip tag/author/category URLs

analyze not-indexed options:
  --config <path>               Site config JSON (required)
  --from-report <path>          Optional specific snapshot

Examples:
  matia sync-gsc --config configs/sites/example-site.json
  matia submit-indexing --config configs/sites/example-site.json --dry-run
  matia analyze not-indexed --config configs/sites/example-site.json

Docs: https://github.com/alex-elia/matia-seo
`;

async function main(): Promise<void> {
  const command = getCommand();

  switch (command) {
    case "version":
    case "--version":
    case "-v":
      console.log(MATIA_VERSION);
      return;
    case "sync-gsc":
      await runSyncGscCommand();
      return;
    case "submit-indexing":
      await runSubmitIndexingCommand();
      return;
    case "analyze": {
      const sub = getSubcommand();
      if (sub === "not-indexed") {
        await runAnalyzeNotIndexedCommand();
        return;
      }
      console.error(`Unknown analyze subcommand: ${sub ?? "(none)"}`);
      console.error("Try: matia analyze not-indexed --config <path>");
      process.exit(1);
    }
    case "help":
    case "--help":
    case "-h":
      console.log(HELP.trim());
      return;
    default:
      console.log(HELP.trim());
      console.error(`\nUnknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
