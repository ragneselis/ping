# Ping

Job site for design students at the Estonian Academy of Arts (EKA): current design jobs sorted into nine directions, plus what the market is asking for.

Scope: design work of every kind, sorted into nine categories by the work each posting describes (not by job title). Remote roles anywhere, plus on-site and hybrid roles in Europe (Estonia included).

Each posting gets exactly one primary category (the core of the job) and, only when a role genuinely spans two, one secondary category, shown as muted text under the direction. All counts, filters and overviews use the primary category. Categories: Product designer who ships, Design engineer / builder, AI and behaviour designer, Brand and visual craft, Research and service design, Customer-facing / forward deployed designer, Game design, Industrial design, Other design paths.

## Stack

Next.js 15 (App Router) + TypeScript, deployable on Vercel. Data scripts run with `tsx` and write JSON to `data/`.

Interface: Tailwind CSS 4 + shadcn/ui (Base UI flavour) + Lucide icons + Recharts via the shadcn chart component. The theme in `app/globals.css` is the single source of truth for colours, radius and shadows; don't add one-off colours. The direction is contemporary and a little playful, built on GrönLoop's system: white surfaces, near-black ink (#101014) and hairlines at low alpha, square corners (`--radius` is 0, 2px at most for inputs), no shadows. Fonts via `next/font/google`: Bricolage Grotesque (`--font-heading`, semibold) for headings, titles, the wordmark and the big readout numbers; Geist (`--font-sans`) for body and UI; Geist Mono (`--font-mono`) for numbers, levels, dates and data labels. Buttons follow GrönLoop: square, mono uppercase labels; primary is the emerald fill, secondary a hairline outline. Theme: a Light / Dark / System switch in the header (`components/theme-toggle.tsx`, a menu on phones). Light on a first visit; System follows prefers-color-scheme live. The choice is stored under `ping-theme` and applied before first paint by next-themes.

| Page | Code |
|---|---|
| Jobs (home): readout, URL filters, the jobs list, load more | `app/page.tsx`, `components/job-filters.tsx`, `components/job-row.tsx` |
| Market insights: asks overall and per direction, direction comparison | `app/insights/page.tsx`, `components/insight-charts.tsx` |
| Header, theme toggle, "Get new jobs" placeholder dialog | `components/site-header.tsx`, `components/theme-toggle.tsx`, `components/subscribe-dialog.tsx` |
| Server-side view layer (filters, cards, insight numbers) | `lib/view.ts`, `lib/categories.ts` |

Category colours come from Tailwind's palette, the same family as GrönLoop's emerald and amber, avoiding green, emerald and teal so nothing competes with the brand: product blue, design engineering indigo, AI and behaviour violet, brand and visual rose, research and service sky, customer-facing orange, game fuchsia, industrial amber, other paths slate. `--cat-<name>` references shade 500 in light and 400 in dark (dots, the "Which directions are hiring" chart, single-direction charts); `--cat-<name>-text` references 700 in light and 300 in dark (the direction label; 5.05:1 or better on white, 7.7:1 or better on the dark surfaces). "All directions" charts draw one emerald bar per row (`--brand-lg`), and "Which directions are hiring" uses two greens (`--brand-lg` within reach, `--brand-pale` the rest) with each direction's dot before its label; hovering or tapping a bar shows its split by direction, and the hidden data tables keep the per-direction columns. Tokens are mapped to categories in one place, `CATEGORY_TOKEN` in `lib/categories.ts`, and read through `components/category.tsx`.

Visual system: GrönLoop (~/Documents/gronloop), ported through tokens and shared components. White surfaces, near-black ink (#101014), hairlines at low alpha (`--hairline`, `--hairline-strong`, `--guide`) and one emerald accent in three contrast rungs: `--brand` #10b981 for decoration only, `--brand-lg` #059669 for big readout numbers and UI marks, `--brand-sm` #047857 for small text, links, signals and the primary button fill. Dark derives from GrönLoop's dark panel (#0a1320 / #111c2c, off-white ink, #34d399 emerald). GrönLoop's tiles live in `public/tiles` and are placed by `components/tiles.tsx`: a light scatter in each hero (one small staircase and two single tiles, a different arrangement per page), the pixel mascots (`components/mascot.tsx`: 16 x 16 SVG pixel art on a square tile, one rect per pixel with crispEdges, always at 4, 6 or 8px per pixel; the block on Jobs, the student on Market insights), the Ping mark, and the fresh tile before jobs posted in the last 24 hours and on "New today", whose soft pulse is the only motion (still under prefers-reduced-motion). Its rules live in `components/rules.tsx` (the dispersing lines, once per page: under the readout band on Jobs and on Market insights) and in the readout band (dashed hairline dividers, `components/readout.tsx`). Shared pieces: the blueprint frame (`components/blueprint.tsx`: every page is a stack of `Band`s with `--frame-line` rules between sections and either side of the content column, and 45-degree hatching in the gutters), the readout strip (`components/readout.tsx`), text tabs in the shared `TabRow` (`components/tab-row.tsx`: wraps onto more lines from tablet width, scrolls with snap and an edge fade on phones) and square segmented controls (`components/filter-controls.tsx`), and signals as a small Lucide icon plus text in `--brand-sm` (`components/signal.tsx`). Jobs are a dense list of rows (`components/job-row.tsx`) with mono column headers; Level and Posted in the header are the sort controls. Charts have square bars, mono labels and totals; a single direction's charts use its own colour.

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
