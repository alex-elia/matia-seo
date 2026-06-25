import { NextResponse } from "next/server";
import {
  executeActionOnHost,
  loadActionQueue,
  patchAction,
  updateActionStatus,
} from "@matia/core";
import { getSiteBySlug, resolveConfigPath } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const form = await request.formData();
  const actionId = String(form.get("actionId") ?? "");
  const status = String(form.get("status") ?? "approved") as
    | "approved"
    | "done"
    | "rejected";

  if (!actionId) {
    return NextResponse.redirect(new URL(`/sites/${slug}`, request.url));
  }

  let label = "Updated";

  if (status === "approved") {
    updateActionStatus(slug, actionId, "approved");
    const site = getSiteBySlug(slug);
    const action = loadActionQueue(slug).find((item) => item.id === actionId);

    if (site && action) {
      patchAction(slug, actionId, { status: "executing" });
      const result = executeActionOnHost(
        site.hostRoot,
        action,
        resolveConfigPath(site),
      );

      const nextStatus = result.markDone ? "done" : "executing";
      patchAction(slug, actionId, {
        status: result.ok ? nextStatus : "approved",
        outcome: result.outcome,
        executedAt: result.ok ? new Date().toISOString() : undefined,
      });

      if (result.ok) {
        const files =
          result.filesWritten.length > 0
            ? ` → ${result.filesWritten.slice(0, 3).join(", ")}${result.filesWritten.length > 3 ? "…" : ""}`
            : "";
        label = result.markDone
          ? `Applied locally${files} — marked done`
          : `Draft generated${files} — review in repo, then mark done`;
      } else {
        label = `Approved — ${result.outcome}`;
      }
    } else {
      label = "Approved — no hostRoot configured in sites.json";
    }
  } else if (status === "done") {
    updateActionStatus(slug, actionId, "done");
    label = "Marked done";
  } else {
    updateActionStatus(slug, actionId, status);
    label = "Updated";
  }

  return NextResponse.redirect(
    new URL(`/sites/${slug}?msg=${encodeURIComponent(label)}`, request.url),
  );
}
