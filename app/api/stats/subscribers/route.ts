/**
 * DELETE /api/stats/subscribers?id=N: removes one subscriber from /stats. Behind the /stats password
 * (middleware.ts), and checked again here so a change to the matcher cannot open it.
 */
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/server/db";
import { isStatsAuthorized } from "@/lib/server/stats-auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  if (!isStatsAuthorized(req.headers.get("authorization"))) return new NextResponse(null, { status: 404 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false }, { status: 400 });
  const rows = await sql()`delete from subscribers where id = ${id} returning id`;
  return NextResponse.json({ ok: rows.length > 0 }, { status: rows.length ? 200 : 404, headers: { "x-robots-tag": "noindex, nofollow" } });
}
