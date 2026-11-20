# Ping

Job site for design students at the Estonian Academy of Arts (EKA): current design jobs sorted into nine directions, plus what the market is asking for.

Scope: design work of every kind, sorted into nine categories by the work each posting describes (not by job title). Remote roles anywhere, plus on-site and hybrid roles in Europe (Estonia included).

Each posting gets exactly one primary category (the core of the job) and, only when a role genuinely spans two, one secondary category shown as a small tag. All counts, filters and overviews use the primary category. Categories: Product designer who ships · Design engineer / builder · AI and behaviour designer · Brand and visual craft · Research and service design · Customer-facing / forward deployed designer · Game design · Industrial design · Other design paths.

## Stack

Next.js 15 (App Router) + TypeScript, deployable on Vercel. Data scripts run with `tsx` and write JSON to `data/`.

Interface: Tailwind CSS 4 + shadcn/ui (Base UI flavour) + Lucide icons + Recharts via the shadcn chart component. The theme in `app/globals.css` is the single source of truth for colours, radius and shadows; don't add one-off colours. Fonts: Chakra Petch (sans) and Fira Code (mono, for numbers, counts, tags and stats) via `next/font`. Dark first: `next-themes` defaults to dark (no "system" option, stored under `ping-theme`), with a light-mode toggle.

| Page | Code |
|---|---|
| Jobs (home): stats, URL filters, job cards, load more | `app/page.tsx`, `components/job-filters.tsx`, `components/job-card.tsx` |
| Market insights: asks overall and per direction, direction comparison | `app/insights/page.tsx`, `components/insight-charts.tsx` |
| Header, theme toggle, "Get new jobs" placeholder dialog | `components/site-header.tsx`, `components/theme-toggle.tsx`, `components/subscribe-dialog.tsx` |
| Server-side view layer (filters, cards, insight numbers) | `lib/view.ts`, `lib/categories.ts` |

Each direction has two colour tokens in `app/globals.css` (light and dark): `--cat-<name>` is the vivid version for dots, chart bars, fills, borders and tints (at least 3:1 non-text contrast on `--card` and `--background`), and `--cat-<name>-text` is the contrast-safe version used only for category tag text (at least 4.6:1 on its tint and on `--card`). They are mapped to categories in one place, `CATEGORY_TOKEN` in `lib/categories.ts`. Tags, chips, dots, charts and cards all read it through `components/category.tsx`. Light-theme values are tuned for WCAG AA (at least 4.6:1) as text on their own 15% tint over `--background` and `--card`. Pink (`--primary`) is kept for the brand and actions: logo dot, buttons, links, focus rings and the active "All directions" chip.

Shared pieces of the look: hairline borders with a chamfered corner (`cut-corner` utility and `--cut` in `app/globals.css`, used by `components/ui/card.tsx`), a blueprint frame (`components/blueprint.tsx`: every page is a stack of `Band`s with `--frame-line` rules between sections and either side of the content column, and 45-degree hatching in the gutters), the mono readout strip (`components/readout.tsx`) instead of stat cards, and signal tags on `--accent` for the facts a graduate decides on: open to Estonia, within reach, level (`components/signal.tsx`). "All directions" charts stack each bar by the postings' main direction in the vivid category colours (fixed order, one shared legend, breakdown in the tooltip and in each chart's hidden data table); a single direction's charts use its own colour; pink never appears in charts. Signals (open to Estonia, within reach) are solid `--accent` with navy text.

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
