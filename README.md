# Ping

Design jobs for students at the Estonian Academy of Arts (EKA), updated daily. Live at [ping.ragne.me](https://ping.ragne.me).

Ping collects current design roles from job boards and company career pages, sorts each one into one of nine directions (product, design engineering, AI and behaviour, brand and visual, research and service, customer-facing, game, industrial, other paths) and marks what a graduate can realistically apply for ("within reach") and what is open to someone in Estonia. Discover lists the companies that hire designers, with their current roles and careers pages, and Market insights counts the skills, tools and experience the postings ask for. Anyone can get new matching jobs by email.

## How the data works

1. **Sources** (`npm run fetch`): public job board APIs and feeds (Remote OK, We Work Remotely, Himalayas, Remotive, Arbeitnow, Lemanoosh) and the public job boards of the companies in `data/companies.json` (Greenhouse, Lever, Ashby, Teamtailor, Workable, Recruitee, SmartRecruiters, Personio), including companies based in Estonia, whose postings always count as open to Estonia. Postings are normalised to one shape, kept to remote roles anywhere plus on-site and hybrid roles in Europe, and deduplicated.
2. **Classification** (`npm run extract`): a small language model decides for each new posting whether it is design work, picks its direction, and extracts what it asks for (skills, tools, level, years). Results are cached by posting id, so each run only pays for new postings.
3. **Daily refresh**: a GitHub Actions workflow (`.github/workflows/daily-refresh.yml`) runs every day at 04:00 UTC: fetch, classify, stamp the run time, commit the data to `main` (which redeploys the site on Vercel), then send the email digest to subscribers who are due.

4. **Weekly discovery**: on Mondays (`.github/workflows/weekly-discovery.yml`) a small language model with web search looks for companies in Estonia that hire designers; the ones whose job board Ping can read are added to the list (`npm run discover -- --dry-run` shows what it would add). `npm run detect -- <careers url>` checks one company by hand.

The data lives as JSON in `data/`; the site reads it at request time.

## Run it locally

Needs Node 22 or later.

```bash
npm install
npm run dev        # the site, at http://localhost:3000, using the data in data/
npm run fetch      # refresh postings from every source
npm run extract    # classify new postings (needs ANTHROPIC_API_KEY)
```

Put environment variables in `.env.local` (git-ignored). Never commit them.

| Variable | Needed for |
|---|---|
| `ANTHROPIC_API_KEY` | `npm run extract` (classification and requirements) and `npm run discover` |
| `DATABASE_URL` | Email subscriptions (Postgres; Neon in production) |
| `RESEND_API_KEY` | Sending email (Resend) |
| `EMAIL_FROM` | Optional: the sender address for email |
| `SITE_URL` | Optional: the base URL used in email links (defaults to the live site, or localhost in development) |
| `STATS_PASSWORD` | The private `/stats` page (HTTP Basic Auth, any user name) |

With none of them set, the site still runs on the committed data; only refreshing and email need them. `npm run db:setup` creates the subscription tables, and `npm run digest -- --dry-run` shows what the digest would send.

## More

Design system, page structure and implementation notes: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Job postings belong to their sources; every listing links back to the original.

Built and maintained by [Ragne Selis](https://ragne.me). Code under the [MIT licence](LICENSE).
