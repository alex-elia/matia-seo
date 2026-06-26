import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SeoAction } from "../types/action.js";
import type { GapAnalysisResult } from "../gap/analyze-gap.js";
import type { GeoProbeResult } from "../geo/probe-surfaces.js";

import type { SignalDetectionResult } from "../signals/types.js";

export type CockpitArtifactType = "gap" | "probe" | "snapshot" | "signals";

export function getCockpitRoot(): string {
  return process.env.MATIA_COCKPIT_DIR ?? path.join(os.homedir(), ".matia", "cockpit");
}

function projectDir(project: string): string {
  const dir = path.join(getCockpitRoot(), project);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeArtifact(
  project: string,
  type: CockpitArtifactType,
  data: unknown,
  dateLabel = new Date().toISOString().slice(0, 10),
): string {
  const dir = path.join(projectDir(project), type);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${dateLabel}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

export function importGapAnalysis(result: GapAnalysisResult): {
  artifactPath: string;
  queuePath: string;
} {
  const artifactPath = writeArtifact(result.project, "gap", result);
  const queuePath = mergeActionQueue(result.project, result.actions);
  return { artifactPath, queuePath };
}

export function importGeoProbe(result: GeoProbeResult, project: string): string {
  return writeArtifact(project, "probe", result);
}

export function importSignalDetection(result: SignalDetectionResult): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(projectDir(result.project), "signals");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `detect-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  return filePath;
}

export function getLatestSignalDetection(project: string): SignalDetectionResult | null {
  const dir = path.join(projectDir(project), "signals");
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("detect-") && name.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf-8")) as SignalDetectionResult;
}

export function importSnapshot(project: string, snapshot: unknown): string {
  return writeArtifact(project, "snapshot", snapshot);
}

function queuePathFor(project: string): string {
  const dir = projectDir(project);
  return path.join(dir, "actions-queue.json");
}

export function loadActionQueue(project: string): SeoAction[] {
  const filePath = queuePathFor(project);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as SeoAction[];
}

export function mergeActionQueue(project: string, incoming: SeoAction[]): string {
  const filePath = queuePathFor(project);
  const existing = loadActionQueue(project);
  const byKey = new Map<string, SeoAction>();

  for (const action of existing) {
    if (action.status === "approved" || action.status === "executing") {
      byKey.set(action.id, action);
    }
  }

  for (const action of incoming) {
    const key = `${action.type}:${action.targetUrl ?? ""}:${String(action.payload.intent ?? action.payload.signalId ?? "")}`;
    const duplicate = [...byKey.values()].find(
      (item) =>
        item.type === action.type &&
        item.targetUrl === action.targetUrl &&
        item.status === "proposed" &&
        JSON.stringify(item.payload) === JSON.stringify(action.payload),
    );
    if (!duplicate) {
      byKey.set(key, action);
    }
  }

  const merged = [...byKey.values()].sort((a, b) =>
    a.proposedAt.localeCompare(b.proposedAt),
  );
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  return filePath;
}

export function updateActionStatus(
  project: string,
  actionId: string,
  status: SeoAction["status"],
): SeoAction | null {
  return patchAction(project, actionId, { status });
}

export function patchAction(
  project: string,
  actionId: string,
  patch: Partial<SeoAction>,
): SeoAction | null {
  const queue = loadActionQueue(project);
  const index = queue.findIndex((action) => action.id === actionId);
  if (index < 0) return null;

  const now = new Date().toISOString();
  const current = queue[index];
  const nextStatus = patch.status ?? current.status;

  queue[index] = {
    ...current,
    ...patch,
    status: nextStatus,
    approvedAt:
      nextStatus === "approved" || nextStatus === "executing"
        ? patch.approvedAt ?? current.approvedAt ?? now
        : current.approvedAt,
    executedAt:
      nextStatus === "done" || nextStatus === "executing"
        ? patch.executedAt ?? current.executedAt ?? now
        : current.executedAt,
  };
  fs.writeFileSync(queuePathFor(project), JSON.stringify(queue, null, 2));
  return queue[index];
}

export type CockpitStatus = {
  project: string;
  cockpitRoot: string;
  latestGap?: string;
  latestProbe?: string;
  latestSnapshot?: string;
  latestSignals?: string;
  queue: {
    total: number;
    proposed: number;
    approved: number;
    done: number;
  };
};

export function getCockpitStatus(project: string): CockpitStatus {
  const root = projectDir(project);
  const listLatest = (subdir: string): string | undefined => {
    const dir = path.join(root, subdir);
    if (!fs.existsSync(dir)) return undefined;
    const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort().reverse();
    return files[0] ? path.join(dir, files[0]) : undefined;
  };

  const queue = loadActionQueue(project);
  return {
    project,
    cockpitRoot: root,
    latestGap: listLatest("gap"),
    latestProbe: listLatest("probe"),
    latestSnapshot: listLatest("snapshot"),
    latestSignals: (() => {
      const dir = path.join(root, "signals");
      if (!fs.existsSync(dir)) return undefined;
      const files = fs
        .readdirSync(dir)
        .filter((name) => name.startsWith("detect-") && name.endsWith(".json"))
        .sort()
        .reverse();
      return files[0] ? path.join(dir, files[0]) : undefined;
    })(),
    queue: {
      total: queue.length,
      proposed: queue.filter((a) => a.status === "proposed").length,
      approved: queue.filter((a) => a.status === "approved").length,
      done: queue.filter((a) => a.status === "done").length,
    },
  };
}
