/**
 * GET /api/cron/refresh: the Vercel cron backup for the refresh (vercel.json, Monday and Thursday at
 * 05:20 UTC; see lib/schedule.ts). GitHub can delay or skip scheduled workflows, so this starts the workflow itself
 * through the GitHub API (workflow_dispatch, trigger "vercel-cron") when today's run has not happened.
 *
 * 1. Only Vercel's cron may call it: Authorization "Bearer <CRON_SECRET>", which Vercel sends.
 * 2. Not a run day (Monday or Thursday): nothing to do.
 *    Reads data/run.json from main on GitHub (fresher than this deployment): today's run (Tallinn date)
 *    already succeeded, nothing to do.
 * 3. A run in progress or queued: nothing to do (the workflow's concurrency group would queue it anyway).
 * 4. Otherwise dispatches the workflow with GITHUB_DISPATCH_TOKEN (a token allowed to run Actions on
 *    this repository; a Vercel env var, never logged).
 */
import { timingSafeEqual, createHash } from "node:crypto";
import { isRunDay, tallinnDay } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const REPO = "ragneselis/ping";
const WORKFLOW = "refresh.yml";
const digest = (t: string) => createHash("sha256").update(t).digest();

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(header.slice(7)), digest(secret));
}

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return json(401, { ok: false });
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) return json(500, { ok: false, status: "GITHUB_DISPATCH_TOKEN is not set" });
  const gh = (path: string, init?: RequestInit) =>
    fetch(`https://api.github.com/repos/${REPO}${path}`, {
      ...init,
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "user-agent": "ping-cron", "x-github-api-version": "2022-11-28", ...init?.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

  // 2. Not a run day, or today's run already succeeded?
  if (!isRunDay(tallinnDay(new Date()))) return json(200, { ok: true, status: "not a run day" });
  const raw = await fetch(`https://raw.githubusercontent.com/${REPO}/main/data/run.json?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (raw.ok) {
    const run = (await raw.json()) as { lastRun?: string; lastStatus?: string };
    // run.json is only written by a successful run, so a lastRun today means today is done.
    if ((run.lastStatus ?? "success") === "success" && run.lastRun && tallinnDay(new Date(run.lastRun)) === tallinnDay(new Date())) {
      return json(200, { ok: true, status: "today's run already succeeded", lastRun: run.lastRun });
    }
  }

  // 3. One already running or queued?
  for (const state of ["in_progress", "queued"]) {
    const res = await gh(`/actions/workflows/${WORKFLOW}/runs?status=${state}&per_page=1`);
    if (res.ok && ((await res.json()) as { total_count: number }).total_count > 0) return json(200, { ok: true, status: `a run is ${state.replace("_", " ")}` });
  }

  // 4. Start it.
  const res = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ref: "main", inputs: { trigger: "vercel-cron" } }),
  });
  if (!res.ok) return json(502, { ok: false, status: `GitHub answered ${res.status}` });
  return json(200, { ok: true, status: "dispatched" });
}
