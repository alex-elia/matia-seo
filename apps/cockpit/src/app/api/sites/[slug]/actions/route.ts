import { NextResponse } from "next/server";
import { updateActionStatus } from "@matia/core";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const form = await request.formData();
  const actionId = String(form.get("actionId") ?? "");
  const status = String(form.get("status") ?? "approved") as "approved" | "done" | "rejected";

  if (!actionId) {
    return NextResponse.redirect(new URL(`/sites/${slug}`, request.url));
  }

  updateActionStatus(slug, actionId, status);
  const label =
    status === "approved"
      ? "Step approved — implement in your site repo, then mark done"
      : status === "done"
        ? "Marked done"
        : "Updated";
  return NextResponse.redirect(new URL(`/sites/${slug}?msg=${encodeURIComponent(label)}`, request.url));
}
