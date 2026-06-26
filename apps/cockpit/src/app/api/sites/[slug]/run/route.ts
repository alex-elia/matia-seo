import { NextResponse } from "next/server";
import { runSiteCommandForSlug } from "@/lib/matia-runner";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body = (await request.json()) as {
    command?: "sync-gsc" | "gap" | "probe-geo" | "signals-detect";
  };
  if (!body.command) {
    return NextResponse.json({ ok: false, stderr: "command required" }, { status: 400 });
  }
  const result = runSiteCommandForSlug(slug, body.command);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
