# Ping

Job site for design students at the Estonian Academy of Arts (EKA): current design jobs sorted into nine directions, plus what the market is asking for.

Scope: design work of every kind, sorted into nine categories by the work each posting describes (not by job title). Remote roles anywhere, plus on-site and hybrid roles in Europe (Estonia included).

Each posting gets exactly one primary category (the core of the job) and, only when a role genuinely spans two, one secondary category, shown as muted text under the direction. All counts, filters and overviews use the primary category. Categories: Product designer who ships, Design engineer / builder, AI and behaviour designer, Brand and visual craft, Research and service design, Customer-facing / forward deployed designer, Game design, Industrial design, Other design paths.

## Stack

Next.js 15 (App Router) + TypeScript, deployable on Vercel. Data scripts run with `tsx` and write JSON to `data/`.

Interface: Tailwind CSS 4 + shadcn/ui (Base UI flavour) + Lucide icons + Recharts via the shadcn chart component. The theme in `app/globals.css` is the single source of truth for colours, radius and shadows; don't add one-off colours. The direction is calm and editorial: warm neutrals, 1px hairlines, square corners (`--radius` is 0, 2px at most for inputs), no shadows. Fonts via `next/font`: Bricolage Grotesque (`--font-heading`, semibold) for headings and the wordmark; Geist (`--font-sans`) for body and UI; Geist Mono (`--font-mono`) for numbers, levels, dates and data labels. Primary buttons are solid foreground with background-coloured text; secondary buttons are outline. Theme: a Light / Dark / System switch in the header (`components/theme-toggle.tsx`, a menu on phones). Light on a first visit; System follows prefers-color-scheme live. The choice is stored under `ping-theme` and applied before first paint by next-themes.

| Page | Code |
|---|---|
| Jobs (home): readout, URL filters, the jobs list, load more | `app/page.tsx`, `components/job-filters.tsx`, `components/job-row.tsx` |
| Market insights: asks overall and per direction, direction comparison | `app/insights/page.tsx`, `components/insight-charts.tsx` |
| Header, theme toggle, "Get new jobs" placeholder dialog | `components/site-header.tsx`, `components/theme-toggle.tsx`, `components/subscribe-dialog.tsx` |
| Server-side view layer (filters, cards, insight numbers) | `lib/view.ts`, `lib/categories.ts` |

Category colours are clean pastels, three tokens per direction on the pastel's own hue: `--cat-<name>` (the pastel) for chart fills, row highlights and the top rule of direction blocks; `--cat-<name>-strong` (about L 0.60, C 0.13, at least 3.5:1 on white) for the small dots and anything thin; `--cat-<name>-text` for the category label (AA on white and on its pastel). Pastels: product #c4dcf2, design engineering #d2d4f2, AI and behaviour #e4d0f0, brand and visual #f3cdc6, research and service #bde4e1, customer-facing #f8d3b9, game #cde3bf, industrial #f2e6a6 (strong and text tones at hue 85, so they read gold rather than olive), other paths #e8e6e0. In dark, fills and dots share one tone (L 0.72, C 0.09) and text sits at L 0.82. Stacked chart segments are split by a 1px white gap. Neutrals: white page and surfaces, #f2f1ee ground in the hatched gutters, #101014 text, #5b5b61 muted, #e3e1db hairlines, #8a887f strong hairline (active tabs, table header rule); dark uses #111113 / #18181b, #f2f1ee text, #a1a1aa muted, #2a2a2e hairlines. Tokens are mapped to categories in one place, `CATEGORY_TOKEN` in `lib/categories.ts`, and read through `components/category.tsx`.

Pink (`--pulse`, Tailwind pink-500 light / pink-400 dark) is Ping's signature and nothing else: the logo dot, which pulses once on load, and a small dot before jobs posted in the last 24 hours (plus the "New today" readout), which pulses softly. These are the only animated and the only pink elements; under prefers-reduced-motion the dots stay still (`pulse-once`, `pulse-soft` and `pulse-dot` utilities in `app/globals.css`). Shared pieces: the blueprint frame (`components/blueprint.tsx`: every page is a stack of `Band`s with `--frame-line` rules between sections and either side of the content column, and 45-degree hatching in the gutters), the readout strip (`components/readout.tsx`), text tabs in the shared `TabRow` (`components/tab-row.tsx`: wraps onto more lines from tablet width, scrolls with snap and an edge fade on phones) and square segmented controls (`components/filter-controls.tsx`), and signals as a small Lucide icon plus text in the foreground colour (`components/signal.tsx`). Jobs are a dense list of rows (`components/job-row.tsx`) with mono column headers; Level and Posted in the header are the sort controls. "All directions" charts stack each bar by the postings' main direction (fixed order, one shared legend, breakdown in the tooltip and in each chart's hidden data table), with square bars, hairline gaps between segments, mono labels and totals; a single direction's charts use its own colour.

Layout: full width like a dashboard, no max width on the content column or header. Fixed gutters from the `--gutter` token: 16px on phones, 32px from 768px, 48px from 1024px, 64px from 1920px (`4xl`). Headings and text blocks keep a 65ch measure (`max-w-prose`). Market insights chart panels: 2 across from lg, 3 from xl (1280px), 4 from 4xl (1920px).

Jobs filters in the URL: `category`, `estonia=1`, `remote`, `level` (comma list of `reach`, `mid`, `senior`; empty = any level; the old `reach=1` still works) and `sort` (`reach` or `newest`; defaults to within reach first, or newest when the level filter leaves within reach out). Level buckets are `levelBucket` in `lib/view.ts`.

"Within reach" (`isWithinReach` in `lib/view.ts`): a level in the title wins (only intern or junior count); otherwise the posting's level (intern or junior) or the years asked (0 to 2) decide; a posting that states no level and no years counts. Mid-level and above never count. Within-reach jobs are listed first.

Directions with fewer than `EARLY_SIGNAL_THRESHOLD` postings (15, in `lib/view.ts`) get an "Early signal" badge and show lists with counts instead of charts.

Copy rules: British English, no em dashes, no middot separators, no mention of Claude or AI tools in the copy.

## Run

```bash
npm install
npm run fetch      # pull all sources -> candidate postings in data/jobs.json, data/sources.json
npm run extract    # Claude Haiku: classify -> data/classifications.json, then requirements for design roles -> data/extractions.json (reads ANTHROPIC_API_KEY from .env.local)
npm run dev        # http://localhost:3000
```

Behind an HTTPS proxy, Node's built-in fetch needs `NODE_USE_ENV_PROXY=1` (Node 22.21+).

## API key

Put your Anthropic key in `.env.local` (git-ignored) as `ANTHROPIC_API_KEY=sk-ant-...`. Never commit it.

## Pipeline

| Step | Code |
|---|---|
| Source adapters (job boards) | `lib/sources/boards.ts` (Remote OK, We Work Remotely, Himalayas, Remotive, Arbeitnow, Lemanoosh for industrial design) |
| Source adapters (company ATS) | `lib/sources/ats.ts` (Greenhouse, Lever, Ashby, Teamtailor, Workable, Recruitee, SmartRecruiters, Personio; company list in `COMPANIES`, incl. ~90 Estonian, Baltic and Nordic companies and ~45 industrial design, hardware and design studio companies) |
| Broad title pre-filter (could this be design work at all?), seniority, regions, remote status | `lib/classify.ts` |
| Normalise to one `Job` shape, scope filter, dedupe | `lib/normalize.ts`, types in `lib/types.ts` |
| Classification (design or not, primary + optional secondary category), Haiku | `lib/classification.ts` (bump `CLASSIFY_VERSION` after changing the prompt to re-run it) |
| Requirement extraction for design roles, Haiku | `lib/extraction.ts`, both steps run by `scripts/extract.ts` |
| Join candidates with model results | `lib/data.ts` |
| Page | `app/page.tsx` |

Both steps are incremental: `data/classifications.json` and `data/extractions.json` cache every result by posting id (including "not design" verdicts) and logs the token usage and cost of each run, so re-running only pays for new postings. The system prompt is prompt-cached across calls.

Dedupe rule: same company + same normalised title is one posting. The ATS version wins over a board re-listing; other sources are kept in `alsoListedOn`.

## Source terms

Remote OK and Himalayas ask for a visible link back to them when jobs are shown. Remotive's API notes ask that jobs are not resubmitted to third-party sites and are delayed by 24h. Lemanoosh has no API: Ping reads its RSS feed and each job page, and every job links back to Lemanoosh. Ask Lemanoosh before showing its jobs publicly. Workable rate-limits bursts (HTTP 429); the fetcher reads Workable boards one at a time and backs off. Check each source's terms before the public launch.
