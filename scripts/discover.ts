/**
 * Weekly discovery: Claude Haiku with web search looks for companies in Estonia that hire designers
 * and are not on data/companies.json yet. Each candidate's careers page goes through the same
 * detector as hand checks (lib/sources/detect.ts). A board the real fetcher can read is added as readable;
 * a careers page with no readable board is added as careers link only (Discover links to it). Both are
 * marked "discovery", in Estonia, with a one-line description from the model. Runs on Mondays before the daily refresh (.github/workflows/weekly-discovery.yml).
 *
 *   npm run discover                # find, check and add (at most MAX_ADDS), record the run
 *   npm run discover -- --dry-run   # find and check, print what would be added, write nothing
 *
 * Skipped: recruiters and job boards, gambling, betting and iGaming companies, companies already on the
 * list (same name, careers host or board), careers pages that do not load, and anything over the weekly cap.
 * A company is marked based in Estonia only when the model says so AND its board has a role located in
 * Estonia, because that flag makes every one of its postings count as open to Estonia.
 * Every run is recorded in data/discovery.json with its cost; /stats shows the latest.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CompanySchema, companySlug, isGambling, isReadable, type Company } from "../lib/company";
import { loadCompanies } from "../lib/data";
import { costUsd } from "../lib/extraction";
import { detectBoard, readBoard } from "../lib/sources/detect";
import type { Usage } from "../lib/types";

const MODEL = "claude-haiku-5-5";
/** Companies added per week at most. */
const MAX_ADDS = 5;
/** Web searches per run at most ($0.01 each). */
const MAX_SEARCHES = 8;
const SEARCH_PRICE_USD = 0.01;
const FILE = "data/discovery.json";
const dryRun = process.argv.includes("--dry-run");

const Candidates = z.object({
  candidates: z.array(
    z.object({
      name: z.string(),
      website: z.string(),
      careersUrl: z.string(),
      kind: z.enum(["employer", "recruiter", "job_board"]),
      /** Gambling, betting, casino or iGaming business (operators, game studios and suppliers alike). */
      gambling: z.boolean(),
      hqEstonia: z.boolean(),
      /** One short factual line about what the company does, at most 80 characters, no marketing words. */
      description: z.string(),
      why: z.string(),
    }),
  ),
});

export interface DiscoveryRun {
  at: string;
  model: string;
  searches: number;
  usage: Usage;
  costUsd: number;
  added: { name: string; ats: string; slug: string; roles: number; careersUrl: string; reason?: string }[];
  skipped: { name: string; reason: string }[];
}

const SYSTEM = `You find companies for Ping, a job site for design students at the Estonian Academy of Arts (EKA).
Find companies based in Estonia (headquartered there, or with a real design team in Tallinn or Tartu) that employ designers: product, UX and UI, brand and visual, game, industrial and product design, service design. Product companies, scale-ups, design agencies and studios, game studios, hardware firms, banks and telecoms with in-house design teams all count.
Use web search. For each company give the URL of the page that lists its open roles (its careers page), as exact as you can,
and one short factual line about what the company does (at most 80 characters, British English, no marketing words, no em dashes).
Mark recruiters, staffing agencies and job boards with their kind; do not leave them out silently.
Mark every gambling, betting, casino or iGaming business (operators, slot and game studios for casinos, their suppliers) with gambling: true.
Never suggest a company from the list of names you are given: those are already tracked or already checked.`;

const client = new Anthropic({ maxRetries: 4 });

function load(): { runs: DiscoveryRun[] } {
  return existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { runs: [] };
}

async function findCandidates(known: string[]) {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Already tracked or checked, do not suggest: ${known.join(", ")}.\n\nFind up to 15 more companies in Estonia that hire designers, and return them as JSON.`,
    },
  ];
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let searches = 0;
  // Web search can pause a long turn; continue it a few times at most.
  for (let turn = 0; turn < 4; turn++) {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "low", format: zodOutputFormat(Candidates) },
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES }],
      messages,
    });
    usage.input += res.usage.input_tokens;
    usage.output += res.usage.output_tokens;
    usage.cacheRead += res.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += res.usage.cache_creation_input_tokens ?? 0;
    searches += res.usage.server_tool_use?.web_search_requests ?? 0;
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    if (res.stop_reason === "refusal") throw new Error(`refused (${res.stop_details?.category ?? "no category"})`);
    if (!res.parsed_output) throw new Error(`no candidates returned (stop: ${res.stop_reason})`);
    return { candidates: res.parsed_output.candidates, usage, searches };
  }
  throw new Error("web search kept pausing; giving up for this week");
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
};

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const companies = loadCompanies();
  const store = load();
  const checkedBefore = store.runs.flatMap((r) => r.skipped.map((s) => s.name));
  const known = [...new Set([...companies.map((c) => c.name), ...checkedBefore])];

  const { candidates, usage, searches } = await findCandidates(known);
  const cost = Number((costUsd(usage) + searches * SEARCH_PRICE_USD).toFixed(4));
  console.log(`${candidates.length} candidates from ${searches} searches, $${cost.toFixed(4)}.`);

  const slugs = new Set(companies.map((c) => companySlug(c.name)));
  const hosts = new Set(companies.map((c) => hostOf(c.careersUrl)));
  const boards = new Set(companies.filter(isReadable).map((c) => `${c.ats}:${c.slug.toLowerCase()}`));
  const added: DiscoveryRun["added"] = [];
  const skipped: DiscoveryRun["skipped"] = [];
  const newCompanies: Company[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const c of candidates) {
    const skip = (reason: string) => {
      skipped.push({ name: c.name, reason });
      console.log(`  skip  ${c.name}: ${reason}`);
    };
    if (c.kind !== "employer") { skip(c.kind === "recruiter" ? "recruiter" : "job board"); continue; }
    if (c.gambling || isGambling(c.name)) { skip("gambling, betting or iGaming: Ping does not list them"); continue; }
    if (slugs.has(companySlug(c.name)) || hosts.has(hostOf(c.careersUrl))) { skip("already on the list"); continue; }
    if (added.length >= MAX_ADDS) { skip(`weekly cap of ${MAX_ADDS} reached`); continue; }
    const careersUrl = /^https?:\/\//.test(c.careersUrl) ? c.careersUrl : `https://${c.careersUrl}`;
    const description = c.description.replace(/\s+/g, " ").replace(/[\u2014\u00b7]/g, ",").trim().slice(0, 90);
    const d = await detectBoard(careersUrl, c.name);
    // A careers page that does not load cannot even be linked: skip. One that loads but has no board Ping
    // can read joins the list as careers link only, so Discover still shows the company.
    if (!d.ok && /could not be loaded/.test(d.reason)) { skip(d.reason); continue; }
    if (d.ok && boards.has(`${d.board.ats}:${d.board.slug.toLowerCase()}`)) { skip("board already on the list"); continue; }
    // Based in Estonia only with evidence on the board itself (see the header).
    const read = d.ok ? await readBoard(d.board) : null;
    const rolesInEstonia = !!read?.ok && read.postings.some((p) => /\b(estonia|eesti|tallinn|tartu)\b/i.test([p.location, ...(p.regionHints ?? [])].join(" ")));
    const company = CompanySchema.parse({
      name: c.name,
      careersUrl,
      ...(d.ok ? { ats: d.board.ats, slug: d.board.slug, ...(d.board.eu ? { eu: true } : {}) } : { careersLinkOnly: true }),
      basedInEstonia: d.ok ? c.hqEstonia && rolesInEstonia : c.hqEstonia,
      inEstonia: true,
      ...(description ? { description } : {}),
      addedAt: today,
      addedBy: "discovery",
    });
    newCompanies.push(company);
    slugs.add(companySlug(c.name));
    if (d.ok) boards.add(`${d.board.ats}:${d.board.slug.toLowerCase()}`);
    added.push(
      d.ok
        ? { name: c.name, ats: d.board.ats, slug: d.board.slug, roles: d.roles, careersUrl }
        : { name: c.name, ats: "careers link only", slug: "", roles: 0, careersUrl, reason: d.reason },
    );
    console.log(`  ${dryRun ? "would add" : "add"}  ${c.name}: ${d.ok ? `${d.board.ats} ${d.board.slug}, ${d.roles} open roles` : `careers link only (${d.reason})`}${company.basedInEstonia ? ", based in Estonia" : ""}`);
  }

  if (dryRun) return console.log(`\nDry run: ${added.length} would be added, ${skipped.length} skipped. Nothing written.`);
  writeFileSync("data/companies.json", JSON.stringify([...companies, ...newCompanies], null, 2) + "\n");
  const run: DiscoveryRun = { at: new Date().toISOString(), model: MODEL, searches, usage, costUsd: cost, added, skipped };
  // Keep half a year of runs.
  writeFileSync(FILE, JSON.stringify({ runs: [...store.runs, run].slice(-26) }, null, 2) + "\n");
  console.log(`\n${added.length} added, ${skipped.length} skipped. Cost $${cost.toFixed(4)}.`);
}

main().catch((e) => {
  console.error(`Discovery stopped: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
