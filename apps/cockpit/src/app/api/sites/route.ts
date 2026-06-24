import { NextResponse } from "next/server";
import { listSitesFromDb } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ sites: listSitesFromDb() });
}
