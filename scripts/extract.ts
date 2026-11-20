/**
 * Two Claude Haiku steps over the candidate postings in data/jobs.json, both cached by posting id:
 *   1. classify: design or not, one primary category, optional secondary  -> data/classifications.json
 *      (re-runs every posting whose cached result has an older CLASSIFY_VERSION)
 *   2. requirements: only for design roles that have none yet             -> data/extractions.json
 * Re-runs only pay for new postings or a changed classification prompt.
 *
 *   npm run extract                     # both steps (reads ANTHROPIC_API_KEY from .env.local)
 *   npm run extract -- --classify-only  # step 1 only
 *   npm run extract -- --limit 20       # at most 20 calls per step (quick test)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CLASSIFY_MODEL, CLASSIFY_SYSTEM, CLASSIFY_VERSION, ClassificationSchema, classifyPrompt } from "../lib/classification";
import { EXTRACTION_MODEL, EXTRACTION_SYSTEM, ExtractionSchema, costUsd, postingPrompt } from "../lib/extraction";
import { pool } from "../lib/http";
import type { Classification, Extraction, Job, Usage } from "../lib/types";

interface Run { at: string; model: string; postings: number; failed: number; usage: Usage; costUsd: number; note?: string }
interface Store<T> { results: Record<string, T>; runs: Run[] }

const client = new Anthropic({ maxRetries: 6 });
const args = process.argv.slice(2);
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

function load<T>(file: string): Store<T> {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { results: {}, runs: [] };
}

/** One structured-output call with a prompt-cached system prompt. */
async function call<T>(model: string, system: string, schema: Parameters<typeof zodOutputFormat>[0], user: string): Promise<{ out: T; usage: Usage }> {
  const res = await client.messages.parse({
    model,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(schema) },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new Error(`refused (${res.stop_details?.category ?? "no category"})`);
  if (res.stop_reason === "max_tokens") throw new Error("hit max_tokens");
  if (!res.parsed_output) throw new Error("no parsed output");
  const u = res.usage;
  return {
    out: res.parsed_output as T,
    usage: { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 },
  };
}

/** Run one step over `todo`, saving every 25 results so an interrupted run loses nothing it paid for. */
async function step<T extends { usage: Usage }>(name: string, file: string, store: Store<T>, todo: Job[], model: string, one: (j: Job) => Promise<T>, note?: string) {
  console.log(`\n[${name}] ${todo.length} to do with ${model}.`);
  if (!todo.length) return;
  const save = () => writeFileSync(file, JSON.stringify(store, null, 1));
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let done = 0, failed = 0;
  const work = async (job: Job) => {
    try {
      const r = await one(job);
      store.results[job.id] = r;
      for (const k of Object.keys(usage) as (keyof Usage)[]) usage[k] += r.usage[k];
    } catch (err: any) {
      failed++;
      console.log(`fail ${job.title} @ ${job.company}: ${err?.message ?? err}`);
    }
    if (++done % 50 === 0) {
      save();
      console.log(`  ${done}/${todo.length}  $${costUsd(usage).toFixed(4)}`);
    }
  };
  // The first call writes the system prompt to the cache; the parallel calls after it read it.
  await work(todo[0]);
  await pool(todo.slice(1), 8, work);
  const run: Run = { at: new Date().toISOString(), model, postings: todo.length - failed, failed, usage, costUsd: Number(costUsd(usage).toFixed(4)), note };
  store.runs.push(run);
  save();
  console.log(`[${name}] ${run.postings} done, ${failed} failed. Tokens: ${usage.input} in, ${usage.cacheRead} cache read, ${usage.cacheWrite} cache write, ${usage.output} out. Cost $${run.costUsd}.`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Put it in .env.local.");
    process.exit(1);
  }
  const jobs: Job[] = JSON.parse(readFileSync("data/jobs.json", "utf8"));

  // 1. Classification
  const CLS = "data/classifications.json";
  const cls = load<Classification>(CLS);
  const toClassify = jobs.filter((j) => (cls.results[j.id]?.version ?? 0) < CLASSIFY_VERSION).slice(0, LIMIT);
  await step("classify", CLS, cls, toClassify, CLASSIFY_MODEL, async (job) => {
    const { out, usage } = await call<{ isDesignRole: boolean; primary: Classification["primary"]; secondary: Classification["secondary"]; reason: string }>(
      CLASSIFY_MODEL, CLASSIFY_SYSTEM, ClassificationSchema, classifyPrompt(job),
    );
    const design = out.isDesignRole && !!out.primary;
    return {
      id: job.id,
      isDesignRole: design,
      primary: design ? out.primary : null,
      secondary: design && out.secondary !== out.primary ? out.secondary : null,
      reason: out.reason,
      version: CLASSIFY_VERSION,
      model: CLASSIFY_MODEL,
      classifiedAt: new Date().toISOString(),
      usage,
    };
  }, `classification v${CLASSIFY_VERSION}`);

  // 2. Requirements, for design roles only
  if (!args.includes("--classify-only")) {
    const EXT = "data/extractions.json";
    const ext = load<Extraction>(EXT);
    // Legacy entries the old combined run marked "not design" have empty requirements: redo them if now design.
    const toExtract = jobs.filter((j) => cls.results[j.id]?.isDesignRole && (!ext.results[j.id] || ext.results[j.id].isDesignRole === false)).slice(0, LIMIT);
    await step("requirements", EXT, ext, toExtract, EXTRACTION_MODEL, async (job) => {
      const { out, usage } = await call<Omit<Extraction, "id" | "model" | "extractedAt" | "usage">>(EXTRACTION_MODEL, EXTRACTION_SYSTEM, ExtractionSchema, postingPrompt(job));
      return { id: job.id, ...out, model: EXTRACTION_MODEL, extractedAt: new Date().toISOString(), usage };
    });
  }

  const counts: Record<string, number> = {};
  for (const j of jobs) {
    const c = cls.results[j.id];
    const key = !c ? "not classified" : c.isDesignRole ? c.primary! : "not design";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  console.log("\nPrimary category counts:", counts);
}

main();
