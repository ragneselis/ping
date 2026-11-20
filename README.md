# Ping

Job site for design students at the Estonian Academy of Arts (EKA): current design jobs sorted into nine directions, plus what the market is asking for.

Scope: design work of every kind, sorted into nine categories by the work each posting describes (not by job title). Remote roles anywhere, plus on-site and hybrid roles in Europe (Estonia included).

Each posting gets exactly one primary category (the core of the job) and, only when a role genuinely spans two, one secondary category shown as a small tag. All counts, filters and overviews use the primary category. Categories: Product designer who ships · Design engineer / builder · AI and behaviour designer · Brand and visual craft · Research and service design · Customer-facing / forward deployed designer · Game design · Industrial design · Other design paths.

## Stack

Next.js 15 (App Router) + TypeScript, deployable on Vercel. Data scripts run with `tsx` and write JSON to `data/`.

Interface: Tailwind CSS 4 + shadcn/ui (Base UI flavour) + Lucide icons + Recharts via the shadcn chart component. The theme in `app/globals.css` is the single source of truth for colours, radius and shadows; don't add one-off colours. Fonts: Chakra Petch (sans) and Fira Code (mono, for numbers, counts, tags and stats) via `next/font`. Light and dark mode via `next-themes`, defaulting to the system setting.

| Page | Code |
|---|---|
| Jobs (home): stats, URL filters, job cards, load more | `app/page.tsx`, `components/job-filters.tsx`, `components/job-card.tsx` |
| Market insights: asks overall and per direction, direction comparison | `app/insights/page.tsx`, `components/insight-charts.tsx` |
| Header, theme toggle, "Get new jobs" placeholder dialog | `components/site-header.tsx`, `components/theme-toggle.tsx`, `components/subscribe-dialog.tsx` |
| Server-side view layer (filters, cards, insight numbers) | `lib/view.ts`, `lib/categories.ts` |

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
