/**
 * Sends the job digest to confirmed subscribers who are due: daily subscribers on every run, weekly
 * ones on Monday (Tallinn time). Runs after the daily refresh in GitHub Actions.
 *
 *   npm run digest                          send to everyone due
 *   npm run digest -- --dry-run             show who would get what, send nothing
 *   npm run digest -- --test you@x.ee       send one digest to that confirmed subscriber now,
 *                    [--since-days 7]       with jobs from the last N days (default: since their last email)
 *
 * Each email holds only postings first seen since that subscriber's last email that match their
 * preferences, within reach first, at most 10. No new matches, no email. A failed send is logged
 * and skipped; the script never fails the workflow because of email (it exits 0 and warns).
 * It also deletes sign-ups never confirmed within 7 days.
 */
import { buildDigest } from "@/lib/server/digest";
import { sql, type Subscriber } from "@/lib/server/db";
import { emailConfigured, sendEmail } from "@/lib/server/email";
import { digestEmail } from "@/lib/server/templates";
import { EMPTY_PREFS } from "@/lib/subscription";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = flag("--dry-run");
const testTo = value("--test")?.toLowerCase();
const sinceDays = value("--since-days") ? Number(value("--since-days")) : null;

/** GitHub Actions shows ::warning:: lines as annotations on the run. */
const warn = (msg: string) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `Warning: ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tallinnWeekday = (d: Date) => new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/Tallinn" }).format(d);

async function main() {
  if (!process.env.DATABASE_URL) return warn("Digest skipped: DATABASE_URL is not set.");
  if (!emailConfigured() && !dryRun) return warn("Digest skipped: RESEND_API_KEY is not set.");
  const db = sql();
  const now = new Date();

  const expired = await db`delete from subscribers where confirmed = false and created_at < now() - interval '7 days' returning id`;
  await db`delete from rate_limits where window_start < now() - interval '1 hour'`;
  if (expired.length) console.log(`Deleted ${expired.length} sign-ups never confirmed within 7 days.`);

  const monday = tallinnWeekday(now) === "Monday";
  let due: Subscriber[];
  if (testTo) {
    due = (await db`select * from subscribers where email = ${testTo} and confirmed = true`) as Subscriber[];
    if (!due.length) return warn(`No confirmed subscriber with that address.`);
  } else {
    // 20 hours, not 24: the cron time can drift a little, and a re-run the same day sends nothing twice.
    due = (await db`
      select * from subscribers
      where confirmed = true
        and (frequency = 'daily' or (frequency = 'weekly' and ${monday}))
        and (last_sent_at is null or last_sent_at < now() - interval '20 hours')
      order by id`) as Subscriber[];
  }
  console.log(`${due.length} subscribers due (${monday ? "Monday: weekly and daily" : "daily only"}).`);

  let sent = 0;
  let empty = 0;
  let failed = 0;
  for (const s of due) {
    const since = sinceDays !== null ? new Date(now.getTime() - sinceDays * 86_400_000) : new Date(s.last_sent_at ?? s.created_at);
    const prefs = { ...EMPTY_PREFS, ...s.preferences };
    const digest = buildDigest(prefs, since, now.getTime());
    if (!digest.total) {
      empty++;
      continue;
    }
    const mail = digestEmail(digest, prefs, s.frequency, s.token);
    if (dryRun) {
      console.log(`[dry run] #${s.id}: ${mail.subject}`);
      continue;
    }
    try {
      await sendEmail({ to: s.email, ...mail, unsubscribeToken: s.token });
      await db`update subscribers set last_sent_at = ${now.toISOString()} where id = ${s.id}`;
      sent++;
    } catch (e) {
      failed++;
      warn(`Digest to subscriber #${s.id} failed: ${e instanceof Error ? e.message : e}`);
    }
    // Resend allows a few requests a second; stay well under it.
    await sleep(600);
  }
  console.log(`Digest: ${sent} sent, ${empty} skipped (no new matching jobs), ${failed} failed.`);
}

main().catch((e) => {
  // Never fail the workflow over email.
  warn(`Digest stopped: ${e instanceof Error ? e.message : e}`);
});
