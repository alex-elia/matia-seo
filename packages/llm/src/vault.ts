import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readOvhProcessEnv, type OvhProcessEnv } from "./ovh-env.js";

export function getDefaultVaultPath(): string {
  return path.join(os.homedir(), ".matia", "secrets", "ovh.env");
}

/** Parse KEY=VALUE lines (no multiline values). Later entries override. */
export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadVaultEnv(vaultPath = getDefaultVaultPath()): OvhProcessEnv {
  if (!fs.existsSync(vaultPath)) {
    return readOvhProcessEnv(process.env);
  }
  const fileEnv = parseEnvFile(fs.readFileSync(vaultPath, "utf-8"));
  const merged = { ...fileEnv, ...process.env };
  return readOvhProcessEnv(merged);
}

export function vaultExists(vaultPath = getDefaultVaultPath()): boolean {
  return fs.existsSync(vaultPath);
}
