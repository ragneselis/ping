# Ping

Job tool for design students at the Estonian Academy of Arts (EKA). This is the first data test: no UI design yet.

Scope: product, UX, UI and game design roles (game, level, game UI/UX designers, tagged "Game design"). Remote roles anywhere, plus on-site and hybrid roles in Europe (Estonia included).

## Stack

Next.js 15 (App Router) + TypeScript, deployable on Vercel. Data scripts run with `tsx` and write JSON to `data/`.

## Run

```bash
npm install
npm run fetch      # pull all sources -> data/jobs.json, data/sources.json
npm run sample     # pick ~20 varied postings -> data/sample.json
npm run extract    # Haiku requirement extraction -> data/requirements.json (reads ANTHROPIC_API_KEY from .env.local)
npm run dev        # http://localhost:3000
```

Behind an HTTPS proxy, Node's built-in fetch needs `NODE_USE_ENV_PROXY=1` (Node 22.21+).

## API key

Put your Anthropic key in `.env.local` (git-ignored) as `ANTHROPIC_API_KEY=sk-ant-...`. Never commit it.

## Pipeline

| Step | Code |
|---|---|
| Source adapters (job boards) | `lib/sources/boards.ts` (Remote OK, We Work Remotely, Himalayas, Remotive, Arbeitnow) |
| Source adapters (company ATS) | `lib/sources/ats.ts` (Greenhouse, Lever, Ashby, Teamtailor, Workable, Recruitee, SmartRecruiters, Personio; company list in `COMPANIES`, incl. ~90 Estonian, Baltic and Nordic companies) |
| Design-role filter, seniority, regions, remote status | `lib/classify.ts` |
| Normalise to one `Job` shape, scope filter, dedupe | `lib/normalize.ts`, types in `lib/types.ts` |
| Requirement extraction prompt + schema | `lib/extraction.ts` |
| Page | `app/page.tsx` |

Dedupe rule: same company + same normalised title is one posting. The ATS version wins over a board re-listing; other sources are kept in `alsoListedOn`.

## Source terms

Remote OK and Himalayas ask for a visible link back to them when jobs are shown. Remotive's API notes ask that jobs are not resubmitted to third-party sites and are delayed by 24h. Check each source's terms before the public launch.
