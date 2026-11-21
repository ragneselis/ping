/**
 * POST /api/track: the anonymous usage collector (lib/usage.ts). Only components/usage-beacon.tsx calls it.
 *
 *   { kind: "view", path, view, visitor, referrer }   a page view and/or today's visitor
 *   { kind: "event", event }                          one usage event
 *
 * Always 204, whether it counted or not: the caller has nothing to do with the answer, and a bot
 * learns nothing from it. Same-origin only; crawlers, prefetches and prerenders are dropped. Nothing
 * about the request is kept beyond the counters (no IP, no user agent, no cookie).
 */
import { best, count, countryCode, deviceLetter, isBotRequest, referrerName } from "@/lib/server/usage";
import { eventFields, isPublicPath, type UsageEvent } from "@/lib/usage";
import { getDataset } from "@/lib/view";

export const dynamic = "force-dynamic";

const done = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return done();
  if (isBotRequest(request.headers)) return done();
  let body: { kind?: unknown; path?: unknown; view?: unknown; visitor?: unknown; referrer?: unknown; event?: unknown };
  try {
    body = await request.json();
  } catch {
    return done();
  }

  if (body.kind === "view") {
    if (!isPublicPath(body.path)) return done();
    const fields: string[] = [];
    if (body.visitor === true) fields.push("u");
    if (body.view !== false) {
      fields.push("v", `v:${body.path}`, `d:${deviceLetter(request.headers)}`);
      const referrer = referrerName(body.referrer);
      if (referrer) fields.push(`r:${referrer}`);
      const country = countryCode(request.headers);
      if (country) fields.push(`c:${country}`);
    }
    await count(fields);
    return done();
  }

  if (body.kind === "event" && body.event && typeof body.event === "object") {
    const event = body.event as UsageEvent;
    const fields = eventFields(event);
    if (!fields) return done();
    // Only postings that exist are counted, so nothing else can be written under job:.
    if (event.name === "job" && !getDataset().cards.some((c) => c.id === event.id && c.primary === event.category)) return done();
    await count(fields.add);
    if (fields.best) await best(fields.best.field, fields.best.value);
  }
  return done();
}
