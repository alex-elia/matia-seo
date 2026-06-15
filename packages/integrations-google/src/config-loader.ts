import fs from "node:fs";
import path from "node:path";
import type { MatiaSiteConfig, ResolvedMatiaSiteConfig } from "./types.js";

function resolvePath(baseDir: string, targetPath?: string | null): string | null {
  if (!targetPath) return null;
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(baseDir, targetPath);
}

export function loadSiteConfig(configPath: string): ResolvedMatiaSiteConfig {
  const resolvedConfigPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(configPath);

  if (!fs.existsSync(resolvedConfigPath)) {
    throw new Error(`Config file not found: ${resolvedConfigPath}`);
  }

  const raw = fs.readFileSync(resolvedConfigPath, "utf-8");
  const config = JSON.parse(raw) as MatiaSiteConfig;
  const configDir = path.dirname(resolvedConfigPath);

  const serviceAccountKey =
    resolvePath(configDir, config.serviceAccountKey) ??
    resolvePath(configDir, "../../.secrets/gsc-service-account.json");

  if (!serviceAccountKey) {
    throw new Error("serviceAccountKey is required in site config");
  }

  const reportsBaseDir =
    resolvePath(configDir, config.reports?.baseDir) ??
    path.resolve(configDir, "../../reports");

  return {
    ...config,
    resolvedPaths: {
      serviceAccountKey,
      reportsBaseDir,
      configDir,
      configPath: resolvedConfigPath,
    },
  };
}
