/**
 * Classification step: is this posting design work, and what is its one primary category
 * (plus an optional secondary one)? Kept separate from requirement extraction so the
 * categories can be re-run cheaply when the definitions change. Used by scripts/extract.ts.
 */
import { z } from "zod";
import { CATEGORIES } from "./types";

export const CLASSIFY_MODEL = "claude-haiku-5-5";

/** Bump when the prompt or categories change: every cached classification with an older version is re-run. */
export const CLASSIFY_VERSION = 4;

export const CLASSIFY_SYSTEM = `You classify job postings for Ping, a job tool for design students at the Estonian Academy of Arts (EKA).

Step 1. Decide from the work the posting describes (not the title alone) whether this is a design role: the person's main job is designing something (digital products, interfaces, services, brands and visuals, games and game art, physical products, spaces, learning experiences, AI behaviour) or doing design/UX research or UX writing.
NOT design roles (isDesignRole false): social media managers, content creators and influencer roles, community managers, copywriters for marketing, marketing/brand managers, recruiters (even "design recruiter"), sales and account managers, product managers without hands-on design work, software/front-end developers whose job is engineering, electrical/mechanical/civil/structural/chip "design engineers", drafters and CAD technicians who only produce engineering drawings, photographers and video editors whose job is not design, AI data-labelling or "AI trainer" gigs that only rate outputs, AI or business advisors and consultants who do not design hands-on, business development and growth leads whose core is selling, teachers of unrelated subjects.

Step 2. If it is a design role, choose exactly ONE primary category: the one that best describes the core of the job, where the person spends most of their time.
- "product": Product designer who ships. Product, UX and UI design of digital products (apps, web apps, SaaS, websites that are products), including interaction design, design systems roles and design + PM hybrids that own scope and delivery.
- "design-engineer": Design engineer / builder. The core is building design in code: UX engineers, design technologists, creative technologists, prototypers who ship front-end code.
- "ai-behaviour": AI and behaviour designer. The core is designing how AI products and agents behave: conversation design, prompt and model behaviour design, agent interaction patterns, behaviour change design.
- "brand-visual": Brand and visual craft. Brand identity, graphic, visual, motion, illustration, packaging graphics and marketing/creative design for a brand, art direction for campaigns, marketing websites and presentation design. NOT product UI work (that is "product") and NOT game art (that is "game").
- "research-service": Research and service design. Design and UX research, service design, CX/journey design, UX writing and content design. A UX designer who also does some research is "product".
- "customer-facing": Customer-facing / forward deployed designer. The core is hands-on design work done together with external customers: forward deployed designers embedded with a customer's team, solutions designers who design with each customer, strategic design consultants who run co-design with clients. Rare. An agency or consultancy employer, client presentations, pitching or "working with stakeholders" do NOT make a role customer-facing: pick the kind of design the person does (creative directors are "brand-visual", UX consultants are "product" or "research-service").
- "game": Game design. Everything made for games (video games, mobile games, slot and casino games, VR games): game, level, systems, economy, narrative, combat and live-ops designers, game UI/UX, and game art roles (technical artist, concept artist, VFX, character, environment, animation, UI artist for games). Only when the posting says the work is for games: animation, 3D, VFX or concept art for film, TV, kids' video, advertising or social content is "brand-visual" (or "other" for film/TV production design), and concept art for toys or merchandise is "industrial".
- "industrial": Industrial design. Physical products, hardware, CMF (colour, material, finish), furniture, footwear and softgoods, product design of physical things through to manufacturing.
- "other": Other design paths: interior, spatial, exhibition, lighting, fashion, textile, architecture, instructional/learning experience design, design education and coaching, design operations, and design work that fits none of the above.

Step 3. Optionally choose ONE secondary category, only when the role genuinely spans two kinds of work in roughly equal measure (for example a product designer who also owns the brand, or a design engineer who also does product design). Most roles have no secondary category: use null. The secondary category must differ from the primary.

Fill "reason" first: one short phrase (max 12 words) naming the core work of the job and what it is made for. Then decide isDesignRole, primary and secondary so they agree with your reason.
For non-design roles: primary null, secondary null.`;

/** "reason" comes first so the model names the core work before it commits to a category. */
export const ClassificationSchema = z.object({
  reason: z.string(),
  isDesignRole: z.boolean(),
  primary: z.enum(CATEGORIES).nullable(),
  secondary: z.enum(CATEGORIES).nullable(),
});

export function classifyPrompt(p: { title: string; company: string; location: string; description: string }): string {
  return `Title: ${p.title}\nCompany: ${p.company}\nLocation: ${p.location}\n\nDescription:\n${p.description.slice(0, 12000)}`;
}
