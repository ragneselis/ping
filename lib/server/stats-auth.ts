import { createHash, timingSafeEqual } from "node:crypto";

/*
 * /stats' password: STATS_PASSWORD, as HTTP Basic Auth with any user name. The same approach as
 * ragne.me's /stats (its src/lib/stats-auth.ts): middleware.ts asks for it and the page checks again,
 * so a change to the matcher cannot open the page. With no password set nothing passes. Hashed
 * first, so the comparison is constant-time at any length.
 */
const digest = (text: string) => createHash("sha256").update(text).digest();

/** The user name in a Basic Authorization header, or null. */
export function basicUser(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString();
  return decoded.slice(0, Math.max(0, decoded.indexOf(":")));
}

export function isStatsAuthorized(header: string | null): boolean {
  const password = process.env.STATS_PASSWORD;
  if (!password || !header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString();
  const candidate = decoded.slice(decoded.indexOf(":") + 1);
  return timingSafeEqual(digest(candidate), digest(password));
}

/** The user name the log-out button sends; it never signs in, so the browser forgets the real password. */
export const LOGOUT_USER = "logout";
