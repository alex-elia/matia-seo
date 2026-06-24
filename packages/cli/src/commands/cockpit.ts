import fs from "node:fs";
import path from "node:path";
import {
  getCockpitRoot,
  getCockpitStatus,
  importSnapshot,
  loadActionQueue,
  updateActionStatus,
} from "@matia/core";
import { findLatestSnapshotDir, loadSiteConfig, readJson } from "@matia/integrations-google";
import { getArg, getSubcommand } from "../args.js";

export async function runCockpitCommand(): Promise<void> {
  const sub = getSubcommand();

  switch (sub) {
    case "status":
      await runCockpitStatus();
      return;
    case "queue":
      await runCockpitQueue();
      return;
    case "approve":
      await runCockpitApprove();
      return;
    case "import":
      await runCockpitImport();
      return;
    default:
      console.error(`Unknown cockpit subcommand: ${sub ?? "(none)"}`);
      console.error("Try: matia cockpit status|queue|approve|import");
      process.exit(1);
  }
}

async function runCockpitStatus(): Promise<void> {
  const project = getArg("--project");
  if (!project) {
    throw new Error("--project is required");
  }

  const status = getCockpitStatus(project);
  console.log(`Matia cockpit — ${project}`);
  console.log("=".repeat(50));
  console.log(`Root: ${getCockpitRoot()}`);
  console.log(`Latest gap: ${status.latestGap ?? "(none)"}`);
  console.log(`Latest probe: ${status.latestProbe ?? "(none)"}`);
  console.log(`Latest snapshot: ${status.latestSnapshot ?? "(none)"}`);
  console.log(
    `Queue: ${status.queue.total} total (${status.queue.proposed} proposed, ${status.queue.approved} approved, ${status.queue.done} done)`,
  );
}

async function runCockpitQueue(): Promise<void> {
  const project = getArg("--project");
  if (!project) {
    throw new Error("--project is required");
  }

  const statusFilter = getArg("--status");
  const queue = loadActionQueue(project).filter(
    (action) => !statusFilter || action.status === statusFilter,
  );

  console.log(`Action queue — ${project} (${queue.length})`);
  for (const action of queue) {
    console.log(`\n[${action.status}] ${action.id}`);
    console.log(`  type: ${action.type}`);
    console.log(`  ${action.rationale}`);
    if (action.targetUrl) console.log(`  url: ${action.targetUrl}`);
  }
}

async function runCockpitApprove(): Promise<void> {
  const project = getArg("--project");
  const actionId = getArg("--id");
  if (!project || !actionId) {
    throw new Error("--project and --id are required");
  }

  const updated = updateActionStatus(project, actionId, "approved");
  if (!updated) {
    throw new Error(`Action not found: ${actionId}`);
  }
  console.log(`Approved ${actionId}`);
}

async function runCockpitImport(): Promise<void> {
  const configPath = getArg("--config");
  if (!configPath) {
    throw new Error("--config is required");
  }

  const config = loadSiteConfig(configPath);
  const latestDir = findLatestSnapshotDir(
    config.resolvedPaths.reportsBaseDir,
    config.slug,
  );

  if (!latestDir) {
    console.log("No GSC snapshot to import.");
    return;
  }

  const snapshotPath = path.join(latestDir, "indexing-status.json");
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Missing ${snapshotPath}`);
  }

  const snapshot = readJson(snapshotPath);
  const artifactPath = importSnapshot(config.slug, snapshot);
  console.log(`Imported snapshot to cockpit: ${artifactPath}`);
}
