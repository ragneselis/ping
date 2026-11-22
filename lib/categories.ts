import type React from "react";
import { CATEGORIES, type Category } from "./types";

/** Short names for tags and chart axes, and one-line descriptions for the interface. */
export const CATEGORY_META: Record<Category, { short: string; blurb: string }> = {
  product: { short: "Product", blurb: "UX and UI for apps, web products and design systems, shipped end to end." },
  "design-engineer": { short: "Design engineering", blurb: "Designers who build in code: prototypes, front end, design systems." },
  "ai-behaviour": { short: "AI and behaviour", blurb: "Shaping how assistants and agents talk, act and earn trust." },
  "brand-visual": { short: "Brand and visual", blurb: "Identity, graphic, motion, illustration and campaign craft." },
  "research-service": { short: "Research and service", blurb: "User research, service design, UX writing and content design." },
  "customer-facing": { short: "Customer-facing", blurb: "Designing hands-on alongside clients and customers." },
  game: { short: "Game", blurb: "Game, level and systems design, game UI and game art." },
  industrial: { short: "Industrial", blurb: "Physical products, hardware, CMF, furniture and footwear." },
  other: { short: "Other paths", blurb: "Interior, spatial, lighting, learning design and more." },
};

export const REMOTE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: "Not stated",
};

/**
 * The one place that maps a category to its colour tokens (--cat-* and --cat-*-text in app/globals.css).
 * Components set `--cat` from here and style with the shared classes in components/category.tsx.
 */
export const CATEGORY_TOKEN: Record<Category, string> = {
  product: "--cat-product",
  "design-engineer": "--cat-engineering",
  "ai-behaviour": "--cat-ai",
  "brand-visual": "--cat-brand",
  "research-service": "--cat-research",
  "customer-facing": "--cat-customer",
  game: "--cat-game",
  industrial: "--cat-industrial",
  other: "--cat-other",
};

/** The category colour (Tailwind 500 light / 400 dark): dots, the hiring chart and single-direction charts. Never for text. */
export const categoryColor = (c: Category) => `var(${CATEGORY_TOKEN[c]})`;

/** Contrast-safe category colour (Tailwind 700 light / 300 dark), for the direction label. */
export const categoryTextColor = (c: Category) => `var(${CATEGORY_TOKEN[c]}-text)`;

/** Inline style that sets `--cat` and `--cat-text` for a subtree, read by the shared category classes. */
export const categoryVars = (c: Category) => ({ "--cat": categoryColor(c), "--cat-text": categoryTextColor(c) }) as React.CSSProperties;

/** One-line definition shown wherever "within reach" appears (the rule lives in lib/view.ts isWithinReach). */
/** The years a role may ask for and still be within reach, as written everywhere on the site and in emails. */
/** How many directions Ping sorts roles into, as copy writes it: "9". */
export const DIRECTION_COUNT = CATEGORIES.length;

export const REACH_YEARS = "0-2 years";
export const REACH_DEFINITION = `Within reach: internships, junior roles and roles asking for ${REACH_YEARS} of experience.`;
