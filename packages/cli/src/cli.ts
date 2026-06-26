#!/usr/bin/env node
import { MATIA_TAGLINE, MATIA_VERSION } from "@matia/core";
import { getCommand, getSubcommand } from "./args.js";
import { runAnalyzeNotIndexedCommand } from "./commands/analyze-not-indexed.js";
import { runCheckCommand } from "./commands/check.js";
import { runCockpitCommand } from "./commands/cockpit.js";
import { runGapCommand } from "./commands/gap.js";
import { runProbeGeoCommand } from "./commands/probe-geo.js";
import { runSubmitIndexingCommand } from "./commands/submit-indexing.js";
import { runSyncGscCommand } from "./commands/sync-gsc.js";
import { runContentGenerateCommand } from "./commands/content-generate.js";
import { runLlmCommand } from "./commands/llm.js";
import { runSignalsDetectCommand } from "./commands/signals-detect.js";

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
  check                         Validate src/seo/strategy.yaml + registry.ts
  gap                           Strategy operator — intent × registry × GSC → actions
  probe-geo                     GEO measurement — llms.txt, facts.json, health
  signals                       Signal detection — benchmark, GSC, schema, GEO
  cockpit                       Local operator store (status, queue, import, approve)
  llm                           OVH LLM operator vault (probe)
  content                       Grounded article generation (generate)

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

check options:
  --root <path>                 Host app root (default: process.cwd)

gap options:
  --config <path>               Site config JSON (for GSC overlap + report output)
  --root <path>                 Host app root (default: process.cwd)
  --from-report <path>          Optional indexing-status.json
  --cockpit true                Import proposed actions into local cockpit queue

probe-geo options:
  --config <path>               Site config JSON (required)
  --root <path>                 Host app root (default: process.cwd)
  --cockpit true                Also write probe artifact to cockpit
  --gap false                   Skip merged gap report after probe

signals detect options:
  --config <path>               Site config JSON (required)
  --root <path>                 Host app root (default: process.cwd)
  --cockpit true                Write detection artifact to cockpit
  --benchmark-only              Only run benchmark site probes
  --auto-validate               Promote signals hypothesis→validated in strategy.yaml
  --merge-gap false             Skip merged gap report after detection

cockpit options:
  status --project <slug>       Show local cockpit state
  queue --project <slug>          List action queue (--status proposed|approved|done)
  approve --project <slug> --id   Approve one queued action
  import --config <path>          Import latest GSC snapshot into cockpit

Examples:
  matia sync-gsc --config configs/sites/example-site.json
  matia submit-indexing --config configs/sites/example-site.json --dry-run
  matia analyze not-indexed --config configs/sites/example-site.json
  matia gap --config src/seo/matia.config.json --cockpit true
  matia probe-geo --config src/seo/matia.config.json --cockpit true
  matia signals detect --config src/seo/matia.config.json --cockpit true
  matia cockpit status --project elia-studio
  matia llm probe
  matia content generate --root /path/to/host --intent "..." --slug my-post --dry-run true
  matia check examples/next-host
  matia check --root /path/to/host

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
    case "check":
      await runCheckCommand();
      return;
    case "gap":
      await runGapCommand();
      return;
    case "probe-geo":
      await runProbeGeoCommand();
      return;
    case "signals": {
      const sub = getSubcommand();
      if (sub === "detect") {
        await runSignalsDetectCommand();
        return;
      }
      console.error(`Unknown signals subcommand: ${sub ?? "(none)"}`);
      console.error("Try: matia signals detect --config <path> --cockpit true");
      process.exit(1);
    }
    case "cockpit":
      await runCockpitCommand();
      return;
    case "llm":
      await runLlmCommand();
      return;
    case "content": {
      const sub = getSubcommand();
      if (sub === "generate") {
        await runContentGenerateCommand();
        return;
      }
      console.error(`Unknown content subcommand: ${sub ?? "(none)"}`);
      console.error("Try: matia content generate --root <host> --intent \"...\"");
      process.exit(1);
    }
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
