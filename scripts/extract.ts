/**
 * Requirement extraction with a cheap model (Claude Haiku) over data/sample.json.
 * Writes data/requirements.json.
 *
 *   ANTHROPIC_API_KEY=... npm run extract
 */
import { readFileSync, writeFileSync } from "node:fs";
import { EXTRACTION_MODEL, EXTRACTION_SCHEMA, EXTRACTION_SYSTEM, postingPrompt } from "../lib/extraction";
import { pool } from "../lib/http";
import type { Requirements } from "../lib/types";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

async function extractOne(p: { id: string; title: string; company: string; location: string; description: string }): Promise<Requirements> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: EXTRACTION_MODEL,
      max_tokens: 1500,
      system: EXTRACTION_SYSTEM,
      tools: [{ name: "save_requirements", description: "Save the extracted requirements.", input_schema: EXTRACTION_SCHEMA }],
      tool_choice: { type: "tool", name: "save_requirements" },
      messages: [{ role: "user", content: postingPrompt(p) }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const block = data.content.find((c: any) => c.type === "tool_use");
  return { id: p.id, ...block.input };
}

async function main() {
  const sample = JSON.parse(readFileSync("data/sample.json", "utf8"));
  const out = await pool(sample, 4, async (p: any) => {
    try {
      const r = await extractOne(p);
      console.log(`ok   ${p.title}`);
      return r;
    } catch (e: any) {
      console.log(`fail ${p.title}: ${e.message}`);
      return null;
    }
  });
  const results = out.filter(Boolean);
  writeFileSync(
    "data/requirements.json",
    JSON.stringify({ model: EXTRACTION_MODEL, method: "Anthropic API, forced tool call", extractedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`Saved ${results.length}/${sample.length}`);
}

main();
