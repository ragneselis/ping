/**
 * Classify every candidate posting in data/jobs.json with Claude Haiku and extract its requirements.
 * Results are cached in data/extractions.json by posting id, so re-runs only pay for new postings.
 *
 *   npm run extract            # all postings not extracted yet (reads ANTHROPIC_API_KEY from .env.local)
 *   npm run extract -- 20      # at most 20 new postings (for a quick test)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACTION_MODEL, EXTRACTION_SYSTEM, ExtractionSchema, costUsd, postingPrompt } from "../lib/extraction";
import { pool } from "../lib/http";
import type { Extraction, Job } from "../lib/types";

const FILE = "data/extractions.json";

interface Run { at: string; model: string; postings: number; failed: number; usage: Extraction["usage"]; costUsd: number }
interface Store { results: Record<string, Extraction>; runs: Run[] }

const client = new Anthropic({ maxRetries: 6 });

async function extractOne(job: Job): Promise<Extraction> {
  const res = await client.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(ExtractionSchema) },
    // Same system prompt on every call, cached so each posting only pays for its own text.
    system: [{ type: "text", text: EXTRACTION_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: postingPrompt(job) }],
  });
  if (res.stop_reason === "refusal") throw new Error(`refused (${res.stop_details?.category ?? "no category"})`);
  if (res.stop_reason === "max_tokens") throw new Error("hit max_tokens");
  const out = res.parsed_output;
  if (!out) throw new Error("no parsed output");
  const u = res.usage;
  return {
    id: job.id,
    ...out,
    categories: out.isDesignRole ? [...new Set(out.categories)] : [],
    model: EXTRACTION_MODEL,
    extractedAt: new Date().toISOString(),
    usage: { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 },
  };
}

async function main() {
  const jobs: Job[] = JSON.parse(readFileSync("data/jobs.json", "utf8"));
  const store: Store = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { results: {}, runs: [] };
  const limit = Number(process.argv[2] ?? Infinity);
  const todo = jobs.filter((j) => !store.results[j.id]).slice(0, limit);
  console.log(`${jobs.length} postings, ${jobs.length - jobs.filter((j) => !store.results[j.id]).length} already extracted, ${todo.length} to do with ${EXTRACTION_MODEL}.`);
  if (!todo.length) return;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Put it in .env.local.");
    process.exit(1);
  }

  const save = () => writeFileSync(FILE, JSON.stringify(store, null, 1));
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let done = 0, failed = 0;
  const work = async (job: Job) => {
    try {
      const e = await extractOne(job);
      store.results[job.id] = e;
      for (const k of Object.keys(usage) as (keyof typeof usage)[]) usage[k] += e.usage[k];
    } catch (err: any) {
      failed++;
      console.log(`fail ${job.title} @ ${job.company}: ${err?.message ?? err}`);
    }
    if (++done % 25 === 0) {
      save();
      console.log(`${done}/${todo.length}  cost so far $${costUsd(usage).toFixed(4)}`);
    }
  };
  // One call first writes the system prompt to the cache; the parallel calls after it then read it.
  await work(todo[0]);
  await pool(todo.slice(1), 8, work);

  const run: Run = { at: new Date().toISOString(), model: EXTRACTION_MODEL, postings: todo.length - failed, failed, usage, costUsd: Number(costUsd(usage).toFixed(4)) };
  store.runs.push(run);
  save();
  const design = Object.values(store.results).filter((r) => r.isDesignRole).length;
  console.log(`\nDone: ${run.postings} extracted, ${failed} failed (re-run to retry).`);
  console.log(`Tokens: ${usage.input} in, ${usage.cacheRead} cache read, ${usage.cacheWrite} cache write, ${usage.output} out. Cost $${run.costUsd}.`);
  console.log(`All runs: $${store.runs.reduce((n, r) => n + r.costUsd, 0).toFixed(4)}. Design roles in cache: ${design}/${Object.keys(store.results).length}.`);
}

main();
