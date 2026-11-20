/**
 * Requirement extraction: what a design posting asks of the candidate. Runs only for postings the
 * classification step (lib/classification.ts) marked as design. Used by scripts/extract.ts.
 */
import { z } from "zod";

export const EXTRACTION_MODEL = "claude-haiku-5-5";

/** USD per million tokens for Claude Haiku 5.5 (prompts under 100K tokens). Cache writes 1.25x, reads 0.1x input. */
export const PRICE = { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 };

export function costUsd(u: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  return (u.input * PRICE.input + u.output * PRICE.output + u.cacheWrite * PRICE.cacheWrite + u.cacheRead * PRICE.cacheRead) / 1e6;
}

export const EXTRACTION_SYSTEM = `You read design job postings for Ping, a job tool for design students at the Estonian Academy of Arts (EKA).
Extract the requirements:
 what the employer asks of the candidate (requirements and nice-to-haves), not what the company offers. Use short canonical English names so results can be counted across postings:
- skills: design and professional skills, e.g. "User research", "Prototyping", "Interaction design", "Visual design", "Design systems", "Usability testing", "Information architecture", "Accessibility", "Data-informed design", "Stakeholder management", "Storytelling", "Product thinking", "AI product design", "Front-end coding", "Mentoring", "Brand identity", "Typography", "Motion design", "Level design", "Game systems design", "CMF", "Sketching", "3D modelling", "Design for manufacturing", "Service blueprinting". Capitalise only the first word.
- tools: named software only, e.g. "Figma", "FigJam", "Miro", "Framer", "Adobe Creative Suite", "After Effects", "Jira", "HTML/CSS", "React", "Protopie", "Cursor", "Maze", "Unity", "Unreal Engine", "Blender", "SolidWorks", "Rhino", "KeyShot". Never put generic skills here.
- experienceLevel: one of "intern", "junior", "mid", "senior", "staff/principal", "lead/manager", "unspecified".
- yearsMin / yearsMax: years of experience asked for, numbers or null.
- education: short phrase if a degree is required or preferred, else null.
- languages: spoken languages required (e.g. "English", "German"), empty if none stated.
- other: other notable requirements in 2-5 words each, e.g. "Portfolio required", "B2B SaaS experience", "Fintech domain", "Time zone overlap US", "Work authorisation UK", "Startup experience".
Keep each list to the 12 most important items at most.`;

export const ExtractionSchema = z.object({
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  experienceLevel: z.enum(["intern", "junior", "mid", "senior", "staff/principal", "lead/manager", "unspecified"]),
  yearsMin: z.number().nullable(),
  yearsMax: z.number().nullable(),
  education: z.string().nullable(),
  languages: z.array(z.string()),
  other: z.array(z.string()),
});

export function postingPrompt(p: { title: string; company: string; location: string; description: string }): string {
  return `Title: ${p.title}\nCompany: ${p.company}\nLocation: ${p.location}\n\nDescription:\n${p.description.slice(0, 12000)}`;
}
