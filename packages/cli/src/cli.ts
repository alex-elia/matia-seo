#!/usr/bin/env node
import { MATIA_TAGLINE, MATIA_VERSION } from "@matia/core";

const HELP = `
Matia — SEO/GEO Agent Platform (v${MATIA_VERSION})
${MATIA_TAGLINE}

Usage:
  matia <command> [options]

Commands:
  help        Show this help
  version     Show version
  check       Validate SEO setup (coming soon)
  inventory   Scan page inventory (coming soon)
  strategy    Strategy tools (coming soon)
  action      Action queue tools (coming soon)

Examples:
  matia help
  matia version

Docs: https://github.com/alex-elia/matia-seo
`;

const command = process.argv[2] ?? "help";

switch (command) {
  case "version":
  case "--version":
  case "-v":
    console.log(MATIA_VERSION);
    break;
  case "help":
  case "--help":
  case "-h":
  default:
    console.log(HELP.trim());
    if (
      command !== "help" &&
      command !== "--help" &&
      command !== "-h"
    ) {
      console.error(`\nUnknown command: ${command}`);
      process.exit(1);
    }
    break;
}
