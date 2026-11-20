import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Job, Requirements, SourceReport } from "./types";

const dir = path.join(process.cwd(), "data");

function read<T>(file: string, fallback: T): T {
  const p = path.join(dir, file);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback;
}

export function loadJobs(): Job[] {
  return read<Job[]>("jobs.json", []);
}

export function loadSources() {
  return read<{ fetchedAt: string; totalInScope: number; duplicatesRemoved: number; unique: number; sources: SourceReport[] } | null>("sources.json", null);
}

export function loadRequirements() {
  return read<{ model: string; method: string; extractedAt: string; results: Requirements[] } | null>("requirements.json", null);
}

/** Count items across postings, case-insensitively, keeping the most common spelling. */
export function tally(lists: string[][]): { label: string; count: number }[] {
  const counts = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const list of lists) {
    const seen = new Set<string>();
    for (const raw of list) {
      const label = raw.trim();
      const key = label.toLowerCase().replace(/[^a-z0-9+/#]/g, "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const e = counts.get(key) ?? { count: 0, spellings: new Map() };
      e.count++;
      e.spellings.set(label, (e.spellings.get(label) ?? 0) + 1);
      counts.set(key, e);
    }
  }
  return [...counts.values()]
    .map((e) => ({ label: [...e.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0], count: e.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
