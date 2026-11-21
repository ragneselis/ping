/**
 * Unsubscribe deletes the subscriber's record: nothing about the address is kept.
 *   GET   the link in every email (one click), then a short "you are unsubscribed" page
 *   POST  one-click unsubscribe from the mail client (List-Unsubscribe-Post, RFC 8058)
 */
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/server/db";
import { count } from "@/lib/server/usage";

export const dynamic = "force-dynamic";

async function remove(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (token.length < 20) return 0;
  const rows = await sql()`delete from subscribers where token = ${token} returning id`;
  // The record is gone; only the number of unsubscribes per day is kept, for /stats.
  if (rows.length) await count(["sub:unsub"]);
  return rows.length;
}

export async function GET(req: NextRequest) {
  await remove(req);
  // The same page whether or not the record still existed: either way the address gets nothing more.
  return NextResponse.redirect(new URL("/subscription/removed", req.nextUrl.origin), 303);
}

export async function POST(req: NextRequest) {
  await remove(req);
  return new NextResponse(null, { status: 200 });
}
