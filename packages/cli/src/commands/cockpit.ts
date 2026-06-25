import fs from "node:fs";
import path from "node:path";
import {
  getCockpitRoot,
  getCockpitStatus,
  importSnapshot,
  loadActionQueue,
  updateActionStatus,
  patchAction,
  executeActionOnHost,
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
    case "export":
      await runCockpitExport();
      return;
    case "done":
      await runCockpitDone();
      return;
    case "execute":
      await runCockpitExecute();
      return;
    default:
      console.error(`Unknown cockpit subcommand: ${sub ?? "(none)"}`);
      console.error("Try: matia cockpit status|queue|approve|execute|done|export|import");
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

  const hostRoot = getArg("--root");
  if (hostRoot) {
    const configPath = getArg("--config");
    const action = loadActionQueue(project).find((item) => item.id === actionId);
    if (action) {
      patchAction(project, actionId, { status: "executing" });
      const result = executeActionOnHost(hostRoot, action, configPath);
      patchAction(project, actionId, {
        status: result.ok && result.markDone ? "done" : result.ok ? "executing" : "approved",
        outcome: result.outcome,
        executedAt: result.ok ? new Date().toISOString() : undefined,
      });
      console.log(`Approved ${actionId}`);
      console.log(result.outcome);
      if (result.filesWritten.length) {
        console.log(`Files: ${result.filesWritten.join(", ")}`);
      }
      return;
    }
  }

  console.log(`Approved ${actionId}`);
  console.log("Tip: pass --root <host-repo> to apply changes locally on approve");
}

async function runCockpitDone(): Promise<void> {
  const project = getArg("--project");
  const actionId = getArg("--id");
  if (!project || !actionId) {
    throw new Error("--project and --id are required");
  }

  const updated = updateActionStatus(project, actionId, "done");
  if (!updated) {
    throw new Error(`Action not found: ${actionId}`);
  }
  console.log(`Marked done: ${actionId}`);
}

async function runCockpitExecute(): Promise<void> {
  const project = getArg("--project");
  const actionId = getArg("--id");
  const hostRoot = getArg("--root");
  if (!project || !actionId || !hostRoot) {
    throw new Error("--project, --id, and --root are required");
  }

  const action = loadActionQueue(project).find((item) => item.id === actionId);
  if (!action) {
    throw new Error(`Action not found: ${actionId}`);
  }

  const configPath = getArg("--config");
  patchAction(project, actionId, { status: "executing" });
  const result = executeActionOnHost(hostRoot, action, configPath);
  patchAction(project, actionId, {
    status: result.ok && result.markDone ? "done" : result.ok ? "executing" : action.status,
    outcome: result.outcome,
    executedAt: result.ok ? new Date().toISOString() : undefined,
  });

  console.log(result.ok ? "Executed" : "Execution failed");
  console.log(result.outcome);
  if (result.filesWritten.length) {
    console.log(`Files: ${result.filesWritten.join(", ")}`);
  }
  if (!result.ok && result.error) {
    process.exit(1);
  }
}

async function runCockpitExport(): Promise<void> {
  const project = getArg("--project");
  if (!project) {
    throw new Error("--project is required");
  }

  const statusFilter = getArg("--status") ?? "approved";
  const queue = loadActionQueue(project).filter(
    (action) => action.status === statusFilter,
  );

  if (queue.length === 0) {
    console.log(`No ${statusFilter} actions for ${project}.`);
    return;
  }

  console.log(`# Matia approved actions — ${project}\n`);
  console.log(
    "Implement in the host repo (messages, metadata, strategy.yaml), deploy, then mark done.\n",
  );

  for (const action of queue) {
    const pages =
      (action.payload.targetPages as string[] | undefined)?.join(", ") ??
      action.targetUrl ??
      "(see payload)";

    console.log(`## ${action.id}`);
    console.log(`- **Type:** ${action.type}`);
    console.log(`- **Pages:** ${pages}`);
    console.log(`- **Rationale:** ${action.rationale}`);

    const intent = action.payload.intent as string | undefined;
    if (intent) {
      console.log(`- **Intent:** ${intent}`);
    }

    const proofPoints = action.payload.proofPoints as string[] | undefined;
    if (proofPoints?.length) {
      console.log(`- **Proof points:** ${proofPoints.join("; ")}`);
    }

    console.log("");
  }
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
