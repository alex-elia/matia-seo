import { spawnSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import {
  getSiteBySlug,
  insertSnapshot,
  resolveConfigPath,
  resolveMatiaCliPath,
  type CockpitSite,
} from "./db";

export type MatiaRunResult = {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

export function runMatia(args: string[], cwd: string): MatiaRunResult {
  const cli = resolveMatiaCliPath();
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf-8",
    env: process.env,
  });
  return {
    ok: result.status === 0,
    command: `matia ${args.join(" ")}`,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status,
  };
}

export function runSiteCommand(
  site: CockpitSite,
  command: "sync-gsc" | "gap" | "probe-geo",
): MatiaRunResult {
  const configPath = resolveConfigPath(site);
  if (!fs.existsSync(configPath)) {
    return {
      ok: false,
      command: command,
      stdout: "",
      stderr: `Config not found: ${configPath}`,
      exitCode: 1,
    };
  }

  const relConfig = path.relative(site.hostRoot, configPath).split(path.sep).join("/");
  const args =
    command === "sync-gsc"
      ? ["sync-gsc", "--config", relConfig]
      : command === "gap"
        ? ["gap", "--config", relConfig, "--cockpit", "true", "--root", site.hostRoot]
        : ["probe-geo", "--config", relConfig, "--cockpit", "true", "--root", site.hostRoot];

  return runMatia(args, site.hostRoot);
}

export function hashLocalManifest(site: CockpitSite): {
  strategyHash?: string;
  registryHash?: string;
  strategyUpdatedAt?: string;
} | null {
  const strategyPath = path.join(site.hostRoot, "src", "seo", "strategy.yaml");
  const registryPath = path.join(site.hostRoot, "src", "seo", "registry.ts");
  if (!fs.existsSync(strategyPath) || !fs.existsSync(registryPath)) return null;

  const hash = (content: string) =>
    crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
  const strategyContent = fs.readFileSync(strategyPath, "utf-8");
  const registryContent = fs.readFileSync(registryPath, "utf-8");
  const updatedAtMatch = strategyContent.match(/^updatedAt:\s*"?([^"\n]+)"?/m);

  return {
    strategyHash: hash(strategyContent),
    registryHash: hash(registryContent),
    strategyUpdatedAt: updatedAtMatch?.[1]?.trim(),
  };
}

export async function fetchRemoteManifest(siteUrl: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${siteUrl.replace(/\/$/, "")}/api/seo/manifest`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function computeDrift(
  local: ReturnType<typeof hashLocalManifest>,
  remote: Record<string, unknown> | null,
): "in-sync" | "deploy-ahead" | "local-ahead" | "unknown" {
  if (!local || !remote) return "unknown";
  if (local.strategyHash === remote.strategyHash && local.registryHash === remote.registryHash) {
    return "in-sync";
  }
  if (local.strategyUpdatedAt && remote.strategyUpdatedAt) {
    const localDate = Date.parse(String(local.strategyUpdatedAt));
    const remoteDate = Date.parse(String(remote.strategyUpdatedAt));
    if (!Number.isNaN(localDate) && !Number.isNaN(remoteDate)) {
      return localDate > remoteDate ? "local-ahead" : "deploy-ahead";
    }
  }
  return local.strategyHash !== remote.strategyHash ? "local-ahead" : "in-sync";
}

export function runSiteCommandForSlug(
  slug: string,
  command: "sync-gsc" | "gap" | "probe-geo",
): MatiaRunResult {
  const site = getSiteBySlug(slug);
  if (!site) {
    return {
      ok: false,
      command,
      stdout: "",
      stderr: `Unknown site: ${slug}`,
      exitCode: 1,
    };
  }
  const result = runSiteCommand(site, command);
  if (result.ok && command === "probe-geo") {
    const latestProbePath = path.join(
      site.hostRoot,
      "src",
      "seo",
      "reports",
      slug,
    );
    if (fs.existsSync(latestProbePath)) {
      const dates = fs.readdirSync(latestProbePath).filter((d) => !d.includes(".")).sort().reverse();
      const probeFile = dates[0]
        ? path.join(latestProbePath, dates[0], "geo-probe.json")
        : null;
      if (probeFile && fs.existsSync(probeFile)) {
        insertSnapshot(slug, "probe", JSON.parse(fs.readFileSync(probeFile, "utf-8")));
      }
    }
  }
  return result;
}
