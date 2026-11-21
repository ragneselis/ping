/**
 * Sending through Resend's HTTP API (no SDK needed). Server only.
 *
 * EMAIL_FROM is the sender once mail.ragne.me is verified in Resend ("Ping <jobs@mail.ragne.me>").
 * Until then it is unset and mail goes from Resend's shared test sender, which Resend only delivers
 * to the account owner's own address: nothing can reach anyone else before the domain is verified.
 */

export const SITE_URL = (process.env.SITE_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://ping.ragne.me")).replace(/\/$/, "");
const FROM = process.env.EMAIL_FROM || "Ping <onboarding@resend.dev>";

export const links = {
  confirm: (token: string) => `${SITE_URL}/api/subscription/confirm?token=${encodeURIComponent(token)}`,
  unsubscribe: (token: string) => `${SITE_URL}/api/subscription/unsubscribe?token=${encodeURIComponent(token)}`,
  manage: (token: string) => `${SITE_URL}/?manage=${encodeURIComponent(token)}`,
  privacy: () => `${SITE_URL}/privacy`,
};

export interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Adds List-Unsubscribe (one-click, RFC 8058) for mail that carries an unsubscribe link. */
  unsubscribeToken?: string;
}

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(m: Message): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const headers: Record<string, string> = {};
  if (m.unsubscribeToken) {
    headers["List-Unsubscribe"] = `<${links.unsubscribe(m.unsubscribeToken)}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!res.ok || !body.id) throw new Error(`Resend ${res.status}: ${body.message ?? body.name ?? "unknown error"}`);
  return { id: body.id };
}
