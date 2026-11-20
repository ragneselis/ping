/**
 * One model call per posting: decide whether it is design work, which kinds of design work it is,
 * and what the employer asks for. Used by scripts/extract.ts.
 */
import { z } from "zod";
import { CATEGORIES } from "./types";

export const EXTRACTION_MODEL = "claude-haiku-5-5";

/** USD per million tokens for EXTRACTION_MODEL (prompts under 100K tokens). Cache writes 1.25x, reads 0.1x input. */
export const PRICE = { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 };

export function costUsd(u: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  return (u.input * PRICE.input + u.output * PRICE.output + u.cacheWrite * PRICE.cacheWrite + u.cacheRead * PRICE.cacheRead) / 1e6;
}

export const EXTRACTION_SYSTEM = `You read job postings for Ping, a job tool for design students at the Estonian Academy of Arts (EKA).
Students there study product, UX/UI, interaction, service, graphic, game, industrial and other design.

Your job for each posting:
1. Decide from the work the posting describes (not from the job title alone) whether this is a design role: the person's main job is designing something (products, interfaces, services, brands, visuals, games, physical products, spaces, AI behaviour, design systems) or doing design research. Engineering roles that only "design systems/architecture", sales, marketing managers, PMs without design work, recruiters, chip/circuit/mechanical engineering and pure software development are NOT design roles. A design engineer who builds UI in code IS a design role.
2. If it is a design role, pick every category that fits the actual work (usually 1, at most 3):
- "product": Product designer who ships. End-to-end product/UX/UI design of digital products, owning features from problem to delivery. Includes design + PM hybrids that own scope and delivery.
- "design-engineer": Design engineer / builder. Designs and builds in code: prototypes, front-end, design systems in code, creative technologists, designers who ship with AI coding tools.
- "ai-behaviour": AI and behaviour designer. Designs how AI products and agents behave: conversation design, prompt/model behaviour, AI interaction patterns, behaviour change design.
- "brand-visual": Brand and visual craft. Brand, graphic, visual, motion, illustration, creative and marketing design, art direction, web design for marketing sites.
- "research-service": Research and service design. User/design research, service design, CX/journey design, strategic or systems-level design of services.
- "customer-facing": Customer-facing / forward deployed designer. Designs with or for clients and customers directly: forward deployed designers, solutions/implementation designers, agency or consultancy designers working on client projects.
- "game": Game design. Game, level, systems, economy, narrative, combat or live-ops design, UI/UX for games, technical artist roles.
- "industrial": Industrial design. Physical products, hardware, CMF (colour, material, finish), furniture, packaging structure, product engineering-led design of physical things.
- "other": Other design paths beyond digital products: interior, spatial, exhibition, fashion, textile, architecture, instructional/learning design, design education, design operations, and anything else that is design but fits none of the above.
If it is not a design role, return isDesignRole false, an empty categories list and empty requirement lists.
categoryReason: one short phrase (max 12 words) naming the work that decided it.

3. Requirements (only for design roles): what the employer asks of the candidate (requirements and nice-to-haves), not what the company offers. Use short canonical English names so results can be counted across postings:
- skills: design and professional skills, e.g. "User research", "Prototyping", "Interaction design", "Visual design", "Design systems", "Usability testing", "Information architecture", "Accessibility", "Data-informed design", "Stakeholder management", "Storytelling", "Product thinking", "AI product design", "Front-end coding", "Mentoring", "Brand identity", "Typography", "Motion design", "Level design", "Game systems design", "CMF", "Sketching", "3D modelling", "Design for manufacturing", "Service blueprinting". Capitalise only the first word.
- tools: named software only, e.g. "Figma", "FigJam", "Miro", "Framer", "Adobe Creative Suite", "After Effects", "Jira", "HTML/CSS", "React", "Protopie", "Cursor", "Maze", "Unity", "Unreal Engine", "Blender", "SolidWorks", "Rhino", "KeyShot". Never put generic skills here.
- experienceLevel: one of "intern", "junior", "mid", "senior", "staff/principal", "lead/manager", "unspecified".
- yearsMin / yearsMax: years of experience asked for, numbers or null.
- education: short phrase if a degree is required or preferred, else null.
- languages: spoken languages required (e.g. "English", "German"), empty if none stated.
- other: other notable requirements in 2-5 words each, e.g. "Portfolio required", "B2B SaaS experience", "Fintech domain", "Time zone overlap US", "Work authorisation UK", "Startup experience".
Keep each list to the 12 most important items at most.`;

export const ExtractionSchema = z.object({
  isDesignRole: z.boolean(),
  categories: z.array(z.enum(CATEGORIES)),
  categoryReason: z.string(),
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
