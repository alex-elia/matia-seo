import { NextResponse } from "next/server";
import {
  executeActionOnHost,
  loadActionQueue,
  patchAction,
  updateActionStatus,
  type SeoAction,
} from "@matia/core";
import { getSiteBySlug, resolveConfigPath } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string }> };

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function jsonOrRedirect(
  request: Request,
  slug: string,
  payload: CockpitActionResponse,
  status = 200,
): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json(payload, { status });
  }
  const target =
    payload.ok && payload.label
      ? `/sites/${slug}?msg=${encodeURIComponent(payload.label)}`
      : `/sites/${slug}`;
  return NextResponse.redirect(new URL(target, request.url));
}

type CockpitActionResponse = {
  ok: boolean;
  label: string;
  actionId?: string;
  status?: string;
};

function approveSuccessLabel(
  action: SeoAction,
  filesWritten: string[],
  markDone: boolean,
): string {
  const files =
    filesWritten.length > 0
      ? ` → ${filesWritten.slice(0, 3).join(", ")}${filesWritten.length > 3 ? "…" : ""}`
      : "";
  if (markDone) {
    return `Applied locally${files} — marked done`;
  }
  switch (action.type) {
    case "submit-indexing":
      return `Indexing checklist${files} — run seo:submit in host repo, then mark done`;
    case "update-geo-surface":
      return `GEO task file${files} — edit llms.txt / facts.json, then mark done`;
    default:
      return `Draft generated${files} — review in repo, then mark done`;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const form = await request.formData();
  const actionId = String(form.get("actionId") ?? "");
  const status = String(form.get("status") ?? "approved") as
    | "approved"
    | "done"
    | "rejected";

  if (!actionId) {
    return jsonOrRedirect(
      request,
      slug,
      { ok: false, label: "Missing action id" },
      400,
    );
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
        label = approveSuccessLabel(action, result.filesWritten, result.markDone);
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

  return jsonOrRedirect(request, slug, {
    ok: true,
    label,
    actionId,
    status,
  });
}
