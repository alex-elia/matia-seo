import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { SeoAction } from "../types/action.js";

export type ExecuteActionResult = {
  ok: boolean;
  filesWritten: string[];
  outcome: string;
  /** When true, cockpit may mark the action done immediately. */
  markDone: boolean;
  error?: string;
};

type MatiaHostConfig = {
  execution?: {
    script?: string;
    enabled?: boolean;
  };
};

function readHostConfig(hostRoot: string, configPath?: string): MatiaHostConfig {
  const candidates = [
    configPath,
    path.join(hostRoot, "src", "seo", "matia.config.json"),
    path.join(hostRoot, "matia.config.json"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, "utf-8")) as MatiaHostConfig;
    }
  }
  return {};
}

/**
 * Runs the host repo's Matia execution script after approval.
 * Host apps implement `scripts/matia-execute.mjs` (or path from matia.config.json).
 */
export function executeActionOnHost(
  hostRoot: string,
  action: SeoAction,
  configPath?: string,
): ExecuteActionResult {
  const config = readHostConfig(hostRoot, configPath);

  if (config.execution?.enabled === false) {
    return {
      ok: false,
      filesWritten: [],
      outcome: "Execution disabled in matia.config.json",
      markDone: false,
      error: "execution disabled",
    };
  }

  const scriptRel = config.execution?.script ?? "scripts/matia-execute.mjs";
  const scriptPath = path.join(hostRoot, scriptRel);

  if (!fs.existsSync(scriptPath)) {
    return {
      ok: false,
      filesWritten: [],
      outcome: `No host executor at ${scriptRel} — add scripts/matia-execute.mjs`,
      markDone: false,
      error: "missing executor script",
    };
  }

  const payload = JSON.stringify({ hostRoot, action });
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: hostRoot,
    input: payload,
    encoding: "utf-8",
    env: process.env,
  });

  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();

  if (stdout) {
    try {
      const parsed = JSON.parse(stdout) as ExecuteActionResult;
      return {
        ok: parsed.ok ?? result.status === 0,
        filesWritten: parsed.filesWritten ?? [],
        outcome: parsed.outcome ?? "Executed on host",
        markDone: parsed.markDone ?? false,
        error: parsed.error ?? (result.status !== 0 ? stderr : undefined),
      };
    } catch {
      // fall through
    }
  }

  if (result.status === 0) {
    return {
      ok: true,
      filesWritten: [],
      outcome: stdout || "Host executor completed",
      markDone: false,
    };
  }

  return {
    ok: false,
    filesWritten: [],
    outcome: stderr || stdout || "Host executor failed",
    markDone: false,
    error: stderr || `exit ${result.status}`,
  };
}
