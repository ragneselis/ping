/**
 * The link in the confirmation email. Marks the address as confirmed (double opt-in) and starts its
 * digest clock now, so the first email holds only jobs added after confirming.
 */
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const rows =
    token.length >= 20
      ? await sql()`update subscribers set confirmed = true, last_sent_at = coalesce(last_sent_at, now()) where token = ${token} returning frequency`
      : [];
  const state = rows.length ? "confirmed" : "invalid";
  return NextResponse.redirect(new URL(`/subscription/${state}`, req.nextUrl.origin), 303);
}
