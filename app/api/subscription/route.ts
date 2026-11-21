/**
 * Email subscriptions.
 *   POST  { email, prefs, frequency, website }  sign up (double opt-in: sends a confirmation email)
 *   GET   ?token=...                            a subscriber's saved preferences, for the manage modal
 *   PUT   { token, prefs, frequency }            change preferences from the manage link
 *
 * Spam protection: a honeypot field (`website`), and limits per IP address (salted hash, kept an
 * hour) and per email address, so the form cannot be used to flood anyone's inbox. A sign-up always
 * gets the same answer, whether or not the address is already subscribed.
 */
import { NextResponse, type NextRequest } from "next/server";
import { allow, newToken, sql, type Subscriber } from "@/lib/server/db";
import { emailConfigured, links, sendEmail } from "@/lib/server/email";
import { confirmationEmail, describePrefs } from "@/lib/server/templates";
import { ManageSchema, normalisePrefs, SubscribeSchema } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const ok = () => NextResponse.json({ ok: true });
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

function ip(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

async function body(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const parsed = SubscribeSchema.safeParse(await body(req));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const { email, frequency, website } = parsed.data;
  const prefs = normalisePrefs(parsed.data.prefs);
  // A filled honeypot is a bot: answer as if it worked, do nothing.
  if (website) return ok();
  if (!(await allow(`ip:${ip(req)}`, 5))) return fail(429, "Too many sign-ups from this connection. Try again in an hour.");
  if (!(await allow(`email:${email}`, 3))) return fail(429, "A confirmation email is already on its way. Check your inbox, or try again in an hour.");
  if (!emailConfigured()) return fail(503, "Email sign-up is not switched on yet. Try again soon.");

  const db = sql();
  const [existing] = (await db`select * from subscribers where email = ${email}`) as Subscriber[];
  try {
    if (existing?.confirmed) {
      // Already subscribed: send their manage link instead, so only the inbox owner can change anything.
      await sendEmail({
        to: email,
        subject: "Your Ping job emails",
        text: `This address already gets Ping job emails (${describePrefs(existing.preferences, existing.frequency)})\n\nChange what you get: ${links.manage(existing.token)}\nUnsubscribe: ${links.unsubscribe(existing.token)}`,
        html: `<p style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#101014">This address already gets Ping job emails (${describePrefs(existing.preferences, existing.frequency)})</p><p style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:23px"><a href="${links.manage(existing.token)}" style="color:#047857">Change what you get</a> &nbsp;/&nbsp; <a href="${links.unsubscribe(existing.token)}" style="color:#047857">Unsubscribe</a></p>`,
        unsubscribeToken: existing.token,
      });
      return ok();
    }
    const token = existing?.token ?? newToken();
    if (existing) await db`update subscribers set preferences = ${JSON.stringify(prefs)}::jsonb, frequency = ${frequency} where id = ${existing.id}`;
    else await db`insert into subscribers (email, preferences, frequency, token) values (${email}, ${JSON.stringify(prefs)}::jsonb, ${frequency}, ${token})`;
    const mail = confirmationEmail(token, prefs, frequency);
    try {
      await sendEmail({ to: email, ...mail });
    } catch (e) {
      // Nothing was sent, so nothing is kept for a brand-new address.
      if (!existing) await db`delete from subscribers where token = ${token} and confirmed = false`;
      throw e;
    }
    return ok();
  } catch (e) {
    console.error("subscribe failed:", e instanceof Error ? e.message : e);
    return fail(502, "The confirmation email could not be sent. Try again in a minute.");
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (token.length < 20) return fail(404, "This link is not valid any more.");
  if (!(await allow(`ip:manage:${ip(req)}`, 60))) return fail(429, "Too many requests. Try again in an hour.");
  const [s] = (await sql()`select email, preferences, frequency, confirmed from subscribers where token = ${token}`) as Subscriber[];
  if (!s) return fail(404, "This link is not valid any more. The address may have been unsubscribed.");
  return NextResponse.json({ ok: true, email: s.email, prefs: s.preferences, frequency: s.frequency, confirmed: s.confirmed });
}

export async function PUT(req: NextRequest) {
  const parsed = ManageSchema.safeParse(await body(req));
  if (!parsed.success) return fail(400, "Check the form and try again.");
  if (!(await allow(`ip:manage:${ip(req)}`, 60))) return fail(429, "Too many requests. Try again in an hour.");
  const { token, frequency } = parsed.data;
  const prefs = normalisePrefs(parsed.data.prefs);
  const rows = await sql()`update subscribers set preferences = ${JSON.stringify(prefs)}::jsonb, frequency = ${frequency} where token = ${token} returning id`;
  if (!rows.length) return fail(404, "This link is not valid any more. The address may have been unsubscribed.");
  return ok();
}
