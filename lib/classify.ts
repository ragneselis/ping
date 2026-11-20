import type { Category, RemoteStatus, Seniority } from "./types";

/* ---------- Is this a product / UX / UI design role? ---------- */

const EXCLUDE =
  /\b(instructional|interior|structural|civil|fashion|graphic|packaging|landscape|hardware|chip|circuit|asic|fpga|analog|mechanical|electrical|sound|lighting|kitchen|floral|curriculum|architectural|architecture|thumbnail|physical|industrial|jewelry|furniture|textile|teaching|tutor|recruiter|recruiting|recruitment|compensation|sales|advocate|production|soft goods|ad|ads|thumbnail|learning experience|solutions? design(er)?|network design|database design|engineer(ing)? manager)\b/i;

const PRODUCT = /\b(product design(er)?|head of design|design (lead|manager|director)|director,? (of )?(product )?design|vp,? (of )?design|principal designer|staff designer|founding designer|lead designer|senior designer|designer)\b/i;
const UX = /\b(ux|user experience|experience design(er)?|interaction design(er)?|service design(er)?|ux research(er)?|design research(er)?|content design(er)?|ux writer|conversation(al)? design(er)?)\b/i;
const UI = /\b(ui|user interface|visual design(er)?|interface design(er)?|web design(er)?|design engineer|design systems?|digital design(er)?)\b/i;

/**
 * Game design: game, level, gameplay, live ops, economy, combat, narrative... designers,
 * plus game UI/UX roles that studios title "UI Artist" / "UX Artist".
 * Audio, VFX, art-only and engineering roles are left out.
 */
const GAME =
  /\b(game|games|gaming|(?<!(entry|mid|senior|junior|top|high|low)[\s-]?)level|gameplay|live ?ops|economy|combat|narrative|quest|mission|encounter|monetization|progression)\b[\w\s&]{0,30}\bdesign(er|ers)?\b|\b(ui|ux|ui ux|ux ui) artist\b/i;
const GAME_EXCLUDE = /\b(sound|audio|music|composer|lighting|vfx|engineer|developer|programmer|recruit\w*|marketing|graphic)\b/i;

/** Returns the category if the title is a product/UX/UI/game design role, else null. */
export function designCategory(title: string): Category | null {
  const t = title.replace(/[\/|,–-]/g, " ");
  if (GAME.test(t) && !GAME_EXCLUDE.test(t)) return "game";
  if (EXCLUDE.test(t)) return null;
  // "Designer" alone is too broad (brand, motion, graphic), so plain "designer"
  // only counts together with a product/digital qualifier, handled by PRODUCT patterns
  // except the bare word. We require a design-ish noun.
  if (!/design/i.test(t)) return null;
  if (/\b(brand|marketing|motion|illustrat|3d|video|social media|print|presentation|creative)\b/i.test(t) && !UX.test(t) && !/product design/i.test(t)) return null;
  if (UX.test(t)) return "ux";
  if (/\bproduct design/i.test(t)) return "product";
  if (UI.test(t)) return "ui";
  // Bare "Designer"/"Senior Designer"/"Design Lead" at a tech company is almost always product design.
  if (PRODUCT.test(t) && !/\b(engineer|developer|architect|analyst|scientist)\b/i.test(t)) return "product";
  return null;
}

/* ---------- Seniority ---------- */

export function seniorityFromTitle(title: string, hints: string[] = []): Seniority {
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee|praktika|werkstudent|working student|apprentice)\b/.test(t)) return "intern";
  if (/\b(head|director|vp|vice president|manager)\b/.test(t)) return "lead/manager";
  if (/\b(staff|principal|distinguished)\b/.test(t)) return "staff/principal";
  if (/\blead\b/.test(t)) return "lead/manager";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry|graduate|new grad|associate)\b/.test(t)) return "junior";
  if (/\b(mid|intermediate|ii)\b/.test(t)) return "mid";
  const h = hints.join(" ").toLowerCase();
  if (/intern/.test(h)) return "intern";
  if (/entry|junior/.test(h)) return "junior";
  if (/mid/.test(h)) return "mid";
  if (/senior/.test(h)) return "senior";
  if (/manager|director|executive|lead/.test(h)) return "lead/manager";
  return "unspecified";
}

/* ---------- Location, remote status and regions ---------- */

const ESTONIA = /\b(estonia|eesti|tallinn|tartu)\b/i;
const EUROPE_PLACES = [
  "europe", "european union", "emea", "eu", "eea", "cet", "cest", "gmt",
  "latvia", "riga", "lithuania", "vilnius", "finland", "helsinki", "sweden", "stockholm", "gothenburg", "malmo",
  "norway", "oslo", "denmark", "copenhagen", "germany", "deutschland", "berlin", "munich", "münchen", "hamburg",
  "frankfurt", "cologne", "köln", "düsseldorf", "stuttgart", "leipzig", "netherlands", "amsterdam", "rotterdam",
  "utrecht", "the hague", "belgium", "brussels", "antwerp", "france", "paris", "lyon", "spain", "madrid", "barcelona",
  "valencia", "portugal", "lisbon", "porto", "italy", "milan", "rome", "ireland", "dublin", "united kingdom", "uk",
  "england", "london", "manchester", "edinburgh", "scotland", "bristol", "cambridge, uk", "poland", "warsaw", "krakow",
  "kraków", "wroclaw", "czech", "czechia", "prague", "brno", "austria", "vienna", "wien", "switzerland", "zurich",
  "zürich", "geneva", "basel", "hungary", "budapest", "romania", "bucharest", "cluj", "greece", "athens", "bulgaria",
  "sofia", "croatia", "zagreb", "serbia", "belgrade", "ukraine", "kyiv", "kiev", "lviv", "slovakia", "bratislava",
  "slovenia", "ljubljana", "luxembourg", "iceland", "reykjavik", "malta", "cyprus", "estonia", "tallinn", "tartu",
];
const EUROPE = new RegExp(`(^|[^a-zà-ÿ])(${EUROPE_PLACES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![a-zà-ÿ])`, "i");

const REGION_RULES: [string, RegExp][] = [
  ["Worldwide", /\b(worldwide|anywhere|global(ly)?|any location|all countries|international)\b/i],
  ["Estonia", ESTONIA],
  ["Europe", EUROPE],
  ["UK", /\b(uk|united kingdom|england|london|scotland)\b/i],
  ["US", /\b(us|usa|u\.s\.|united states|america|new york|nyc|san francisco|seattle|austin|boston|chicago|los angeles|denver|atlanta|remote[- ]us)\b/i],
  ["US", /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|county)\b/i],
  ["US", /\b[A-Z][a-z]+, (CA|NY|WA|TX|MA|IL|CO|GA|OR|FL|NC|VA|UT|AZ|PA|NJ|MN)\b/],
  ["Canada", /\b(canada|toronto|vancouver|montreal|ontario)\b/i],
  ["LATAM", /\b(latam|latin america|south america|mexico|brazil|brasil|argentina|colombia|chile|peru|costa rica|ecuador|uruguay|guatemala|panama|venezuela|bolivia|paraguay|dominican|caribbean|são paulo|sao paulo)\b/i],
  ["APAC", /\b(apac|asia|india|bangalore|bengaluru|singapore|japan|tokyo|australia|sydney|melbourne|new zealand|philippines|indonesia|korea|seoul|hong kong|china|vietnam|malaysia|thailand|pakistan|bangladesh|nepal|sri lanka|taiwan)\b/i],
  ["Middle East & Africa", /\b(israel|tel aviv|uae|dubai|saudi|africa|nigeria|kenya|egypt|turkey|istanbul|iraq|jordan|lebanon|qatar|ghana|south africa|morocco|pakistan)\b/i],
];

export function detectRegions(texts: string[]): string[] {
  const joined = texts.filter(Boolean).join(" | ");
  const out = new Set<string>();
  for (const [name, re] of REGION_RULES) if (re.test(joined)) out.add(name);
  if (out.has("UK")) out.add("Europe");
  if (out.has("Estonia")) out.add("Europe");
  return [...out];
}

export function isInEurope(texts: string[]): boolean {
  return EUROPE.test(texts.filter(Boolean).join(" | "));
}

export function remoteFromText(texts: string[]): RemoteStatus {
  const j = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\bhybrid\b/.test(j)) return "hybrid";
  if (/\b(remote|anywhere|distributed|work from home|wfh)\b/.test(j)) return "remote";
  if (/\b(on-?site|in office|in-office)\b/.test(j)) return "onsite";
  return "unknown";
}

/** Broad European scope (not a single country): Europe, EU, EEA, EMEA, CET. */
export function isBroadEurope(texts: string[]): boolean {
  return /\b(europe|european|eu|eea|emea|cet|cest)\b/i.test(texts.filter(Boolean).join(" | "));
}

/** True when the location text names nothing beyond "remote"/"anywhere". */
export function isUnrestricted(texts: string[]): boolean {
  const j = texts.filter(Boolean).join(" ").toLowerCase().replace(/\b(remote|anywhere( in the world)?|worldwide|global|fully|100%|work from home)\b/g, "").replace(/[^a-z]/g, "");
  return j.length === 0;
}
