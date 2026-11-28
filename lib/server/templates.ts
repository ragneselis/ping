/**
 * Ping's emails, HTML and plain text. Built for email clients: tables, inline styles, system fonts
 * (Quantico and Geist cannot load in most inboxes, so a monospace stack carries the headings and
 * labels, a system sans the body). White background, near-black text, emerald accent, and the Ping
 * mark: the block mascot's face from the site's wordmark, drawn as table cells (no image to block).
 */
import { CATEGORY_META } from "@/lib/categories";
import { LOGO_COLORS, LOGO_ROWS } from "@/lib/logo";
import { REMOTE_LABEL } from "@/lib/categories";
import { DIGEST_CAP, FREQUENCY_LABEL, type Frequency, type Prefs, prefsToQuery, toFrequency } from "@/lib/subscription";
import type { Category } from "@/lib/types";
import { directionsPhrase, type Digest, type DigestJob } from "./digest";
import { links, SITE_URL } from "./email";

const C = {
  ink: "#101014",
  muted: "#5b5b61",
  rule: "#e2e2df",
  brand: "#059669",
  brandText: "#047857",
  tint: "#e8f7f0",
  white: "#ffffff",
};
const MONO = "Menlo, Consolas, 'SFMono-Regular', 'Liberation Mono', 'Courier New', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** The category colours from app/globals.css (Tailwind 500 for the dot, 700 for the label). */
const CAT: Record<Category, [string, string]> = {
  product: ["#3b82f6", "#1d4ed8"],
  "design-engineer": ["#6366f1", "#4338ca"],
  "ai-behaviour": ["#8b5cf6", "#6d28d9"],
  "brand-visual": ["#f43f5e", "#be123c"],
  "research-service": ["#0ea5e9", "#0369a1"],
  "customer-facing": ["#f97316", "#c2410c"],
  game: ["#d946ef", "#a21caf"],
  industrial: ["#f59e0b", "#b45309"],
  other: ["#64748b", "#334155"],
};

/** The logo (the block mascot's face, lib/logo.ts) as an 8 x 8 table of 2px cells: no image to block. */
const logoTable = `<table role="presentation" width="16" cellpadding="0" cellspacing="0" border="0" style="width:16px;height:16px;border-collapse:collapse;">${LOGO_ROWS.map(
  (row) =>
    `<tr>${[...row].map((c) => `<td width="2" height="2" bgcolor="${LOGO_COLORS[c as keyof typeof LOGO_COLORS]}" style="width:2px;height:2px;padding:0;font-size:0;line-height:0;background:${LOGO_COLORS[c as keyof typeof LOGO_COLORS]};"></td>`).join("")}</tr>`,
).join("")}</table>`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LEVEL_NAME = { reach: "within reach", mid: "mid level", senior: "senior" } as const;

/** One sentence describing a subscriber's preferences, for the confirmation email and the footer. */
export function describePrefs(p: Prefs, f: Frequency) {
  const parts = [directionsPhrase(p.categories).replace(/^your (\d+)/, "$1")];
  if (p.levels.length && p.levels.length < 3) parts.push(p.levels.map((l) => LEVEL_NAME[l]).join(" or "));
  if (p.estonia) parts.push("open to Estonia");
  if (p.remote) parts.push(REMOTE_LABEL[p.remote].toLowerCase());
  return `${FREQUENCY_LABEL[toFrequency(f)]}, ${parts.join(", ")}.`;
}

function layout({ preheader, body, footer }: { preheader: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Ping</title>
</head>
<body style="margin:0;padding:0;background:${C.white};color:${C.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.white};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 0 24px 0;border-bottom:1px solid ${C.rule};">
  <a href="${SITE_URL}" style="text-decoration:none;color:${C.ink};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="16" valign="middle" style="width:16px;">${logoTable}</td>
      <td style="padding-left:8px;font-family:${MONO};font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${C.ink};">Ping</td>
    </tr></table>
  </a>
</td></tr>
${body}
<tr><td style="padding:24px 0 0 0;border-top:1px solid ${C.rule};font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted};">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.brandText}" style="background:${C.brandText};">
  <a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.white};text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;

const link = (href: string, label: string) => `<a href="${href}" style="color:${C.brandText};text-decoration:underline;">${esc(label)}</a>`;

/* ---------- Confirmation ---------- */

export function confirmationEmail(token: string, prefs: Prefs, frequency: Frequency) {
  const url = links.confirm(token);
  const what = describePrefs(prefs, frequency);
  const body = `
<tr><td style="padding:32px 0 8px 0;font-family:${MONO};font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.02em;color:${C.ink};">Confirm your email</td></tr>
<tr><td style="padding:0 0 24px 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.ink};">
  Someone, hopefully you, asked Ping to bring new design jobs to this address.
  Nothing is sent until you confirm.
</td></tr>
<tr><td style="padding:0 0 24px 0;">${button(url, "Confirm and get new jobs")}</td></tr>
<tr><td style="padding:0 0 8px 0;font-family:${MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};">What you will get</td></tr>
<tr><td style="padding:0 0 32px 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.ink};">
  ${esc(what)} Only new jobs that match, at most ${DIGEST_CAP} per email.
</td></tr>`;
  const footer = `If you did not ask for this, ignore this email and nothing will be sent. ${link(links.privacy(), "Privacy")}`;
  return {
    subject: "Confirm your Ping job emails",
    html: layout({ preheader: "Confirm to start getting new design jobs that match.", body, footer }),
    text: [
      "Ping",
      "",
      "Confirm your email",
      "",
      "Someone, hopefully you, asked Ping to bring new design jobs to this address. Nothing is sent until you confirm.",
      "",
      `Confirm: ${url}`,
      "",
      `What you will get: ${what} Only new jobs that match, at most ${DIGEST_CAP} per email.`,
      "",
      "If you did not ask for this, ignore this email and nothing will be sent.",
      `Privacy: ${links.privacy()}`,
    ].join("\n"),
  };
}

/* ---------- Digest ---------- */

function jobMeta(j: DigestJob) {
  return [j.company, j.level === "Not stated" ? null : j.level, j.location, REMOTE_LABEL[j.remote] && j.remote !== "unknown" ? REMOTE_LABEL[j.remote] : null].filter(Boolean).join("  /  ");
}

const similarNote = (j: DigestJob) => `Plus ${j.similar} similar ${j.similar === 1 ? "posting" : "postings"} from ${j.company} on Ping`;

function jobHtml(j: DigestJob) {
  const [dot, text] = CAT[j.primary];
  const flags = [j.withinReach ? "Within reach" : null, j.openToEstonia ? "Open to Estonia" : null].filter(Boolean) as string[];
  return `
<tr><td style="padding:20px 0;border-bottom:1px solid ${C.rule};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="8" style="width:8px;"><div style="width:8px;height:8px;border-radius:4px;background:${dot};font-size:0;line-height:0;">&nbsp;</div></td>
    <td style="padding-left:8px;font-family:${SANS};font-size:13px;font-weight:600;color:${text};">${esc(CATEGORY_META[j.primary].short)}</td>
  </tr></table>
  <div style="padding-top:6px;font-family:${SANS};font-size:16px;line-height:22px;font-weight:600;">
    <a href="${esc(j.url)}" style="color:${C.ink};text-decoration:none;">${esc(j.title)}</a>
  </div>
  <div style="padding-top:4px;font-family:${SANS};font-size:14px;line-height:20px;color:${C.muted};">${esc(jobMeta(j))}</div>
  ${j.similar ? `<div style="padding-top:4px;font-family:${SANS};font-size:13px;line-height:19px;color:${C.muted};">${esc(similarNote(j))}</div>` : ""}
  ${
    flags.length
      ? `<div style="padding-top:8px;">${flags
          .map((f) => `<span style="display:inline-block;margin-right:6px;padding:2px 6px;background:${C.tint};font-family:${MONO};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${C.brandText};">${esc(f)}</span>`)
          .join("")}</div>`
      : ""
  }
</td></tr>`;
}

export function digestEmail(d: Digest, prefs: Prefs, frequency: Frequency, token: string) {
  const qs = prefsToQuery(prefs);
  const seeAll = `${SITE_URL}/${qs ? `?${qs}` : ""}`;
  const n = d.total;
  const reach = d.withinReach;
  const subject = `Ping found ${n} new design ${n === 1 ? "job" : "jobs"} for you${reach && reach < n ? `, ${reach} within reach` : ""}`;
  const heading = `Ping found ${n} new ${n === 1 ? "job" : "jobs"} that ${n === 1 ? "matches" : "match"} what you follow`;
  const shown = d.jobs.reduce((k, j) => k + 1 + j.similar, 0);
  const rest = Math.max(0, n - shown);
  const what = describePrefs(prefs, frequency);

  const body = `
<tr><td style="padding:32px 0 ${d.insight ? "16px" : "8px"} 0;font-family:${MONO};font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.02em;color:${C.ink};">${esc(heading)}</td></tr>
${
  d.insight
    ? `<tr><td style="padding:12px 14px;background:${C.tint};border-left:3px solid ${C.brand};font-family:${SANS};font-size:14px;line-height:21px;color:${C.ink};">${esc(d.insight)}</td></tr>`
    : ""
}
<tr><td style="padding:8px 0 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${d.jobs.map(jobHtml).join("")}
</table></td></tr>
<tr><td style="padding:24px 0 32px 0;">${button(seeAll, rest ? `See ${rest} more on Ping` : "See them on Ping")}</td></tr>`;

  const footer = `
You get this because you follow: ${esc(what)}<br>
${link(links.manage(token), "Change what you get")} &nbsp;/&nbsp; ${link(links.unsubscribe(token), "Unsubscribe")} &nbsp;/&nbsp; ${link(links.privacy(), "Privacy")}`;

  const text = [
    "Ping",
    "",
    heading,
    ...(d.insight ? ["", d.insight] : []),
    "",
    ...d.jobs.flatMap((j) => [
      `${CATEGORY_META[j.primary].short}${j.withinReach ? " / Within reach" : ""}${j.openToEstonia ? " / Open to Estonia" : ""}`,
      j.title,
      jobMeta(j),
      ...(j.similar ? [similarNote(j)] : []),
      j.url,
      "",
    ]),
    `${rest ? `See ${rest} more` : "See them"} on Ping: ${seeAll}`,
    "",
    `You get this because you follow: ${what}`,
    `Change what you get: ${links.manage(token)}`,
    `Unsubscribe: ${links.unsubscribe(token)}`,
    `Privacy: ${links.privacy()}`,
  ].join("\n");

  return { subject, html: layout({ preheader: d.insight ?? subject, body, footer }), text };
}
