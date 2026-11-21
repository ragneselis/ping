import { NextResponse, type NextRequest } from "next/server";
import { allow, blocked } from "@/lib/server/db";
import { basicUser, isStatsAuthorized, LOGOUT_USER } from "@/lib/server/stats-auth";

/*
 * THE /stats GATE, as on ragne.me (its src/proxy.ts): /stats and its data routes ask for the
 * password with HTTP Basic Auth (lib/server/stats-auth.ts) and say noindex in the header, the 401
 * included. The page checks again itself.
 *
 * WRONG PASSWORDS are limited: 10 failed attempts per (salted, hashed) IP address per 15 minutes,
 * then 429 until the window passes, even with the right password. Only a request that sent a
 * password and got it wrong counts; the first visit (no password yet) does not.
 *
 * LOG OUT: Basic Auth has no session to end, so the log-out button (app/stats/logout-button.tsx)
 * sends a request here with the user name "logout" and a throwaway password. It gets a 401, the
 * browser replaces the cached password with the throwaway one, and the next visit asks again.
 * That request is not counted as a failed attempt.
 *
 * Runs on Node (not the edge) for the database and node:crypto.
 */

const NOINDEX = "noindex, nofollow";
const MAX_FAILS = 10;
const WINDOW_MINUTES = 15;

const ip = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

function denied(status: 401 | 429, text: string) {
  return new NextResponse(text, {
    status,
    headers: {
      ...(status === 401 ? { "www-authenticate": 'Basic realm="Ping stats", charset="UTF-8"' } : {}),
      "x-robots-tag": NOINDEX,
      "cache-control": "no-store",
    },
  });
}

export async function middleware(req: NextRequest) {
  const header = req.headers.get("authorization");
  const key = `stats-login:${ip(req)}`;
  if (basicUser(header) === LOGOUT_USER) return denied(401, "Logged out.");
  if (await blocked(key, MAX_FAILS, WINDOW_MINUTES)) return denied(429, "Too many wrong passwords. Try again in 15 minutes.");
  if (isStatsAuthorized(header)) {
    const res = NextResponse.next();
    res.headers.set("x-robots-tag", NOINDEX);
    res.headers.set("cache-control", "no-store");
    return res;
  }
  if (header) await allow(key, MAX_FAILS, WINDOW_MINUTES);
  return denied(401, "Password required.");
}

export const config = {
  runtime: "nodejs",
  matcher: ["/stats", "/stats/:path*", "/api/stats/:path*"],
};
