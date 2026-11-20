import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Classification, ClassifiedJob, Extraction, Job, SourceReport } from "./types";

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

export interface ExtractionStore {
  results: Record<string, Extraction>;
  runs: { at: string; model: string; postings: number; failed: number; usage: Extraction["usage"]; costUsd: number; note?: string }[];
}

export function loadExtractions(): ExtractionStore {
  return read<ExtractionStore>("extractions.json", { results: {}, runs: [] });
}

export interface ClassificationStore {
  results: Record<string, Classification>;
  runs: ExtractionStore["runs"];
}

export function loadClassifications(): ClassificationStore {
  return read<ClassificationStore>("classifications.json", { results: {}, runs: [] });
}

/**
 * Candidates joined with the model's classification and requirements. Postings classified as not design
 * work are dropped; postings not classified yet are kept without a category until the next extract run.
 * The model's experience level replaces the title-based seniority when the title says nothing.
 */
export function loadClassifiedJobs(store = loadExtractions(), cls = loadClassifications()): ClassifiedJob[] {
  return loadJobs()
    .map((j) => {
      const c = cls.results[j.id] ?? null;
      const e = c?.isDesignRole ? store.results[j.id] ?? null : null;
      const seniority = j.seniority === "unspecified" && e && e.experienceLevel !== "unspecified" ? (e.experienceLevel as Job["seniority"]) : j.seniority;
      return { ...j, seniority, titleSeniority: j.seniority, primary: c?.primary ?? null, secondary: c?.secondary ?? null, classification: c, extraction: e };
    })
    .filter((j) => !j.classification || j.classification.isDesignRole);
}

/** Normalised key used to count items as the same skill or tool ("Design systems" = "design-systems"). */
export const tallyKey = (label: string) => label.trim().toLowerCase().replace(/[^a-z0-9+/#]/g, "");

/** Count items across postings, case-insensitively, keeping the most common spelling. */
export function tally(lists: string[][]): { label: string; count: number }[] {
  const counts = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const list of lists) {
    const seen = new Set<string>();
    for (const raw of list) {
      const label = raw.trim();
      const key = tallyKey(label);
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
