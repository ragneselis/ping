/**
 * The link in the confirmation email. Marks the address as confirmed (double opt-in) and starts its
 * digest clock now, so the first email holds only jobs added after confirming.
 */
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/server/db";
import { count } from "@/lib/server/usage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (token.length < 20) return NextResponse.redirect(new URL("/subscription/invalid", req.nextUrl.origin), 303);
  // Only a first confirmation counts (and starts the digest clock); a second click still lands on "confirmed".
  const confirmed = await sql()`update subscribers set confirmed = true, last_sent_at = now() where token = ${token} and confirmed = false returning id`;
  if (confirmed.length) await count(["sub:confirm"]);
  const exists = confirmed.length || (await sql()`select 1 from subscribers where token = ${token}`).length;
  const state = exists ? "confirmed" : "invalid";
  return NextResponse.redirect(new URL(`/subscription/${state}`, req.nextUrl.origin), 303);
}
