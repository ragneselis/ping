const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "-", mdash: "-", hellip: "...", rsquo: "'", lsquo: "'",
  rdquo: '"', ldquo: '"', bull: "•", middot: "·", copy: "©", reg: "®", trade: "™",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML to readable plain text, keeping paragraphs and bullet points. */
export function htmlToText(html: string): string {
  let s = html;
  // Some sources double-encode their HTML.
  if (/&lt;\/?[a-z]/i.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|tr|section)>/gi, "\n")
    .replace(/<(p|div|h[1-6]|ul|ol|tr|section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  s = decodeEntities(s)
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export function normKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(inc|ltd|llc|gmbh|oy|as|ou|ab|plc|corp|co)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function toIso(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  let d: Date;
  if (typeof v === "number" || /^\d+$/.test(String(v))) {
    const n = Number(v);
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else {
    d = new Date(String(v));
  }
  return isNaN(d.getTime()) ? null : d.toISOString();
}
