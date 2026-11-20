import type { Category } from "./types";

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
