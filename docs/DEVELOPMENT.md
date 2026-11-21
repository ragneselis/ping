# Ping: development notes

Design system, page structure and implementation details. The short overview is in the [README](../README.md).

Each posting gets exactly one primary category (the core of the job) and, only when a role genuinely spans two, one secondary category, shown as muted text under the direction. All counts, filters and overviews use the primary category. Categories: Product designer who ships, Design engineer / builder, AI and behaviour designer, Brand and visual craft, Research and service design, Customer-facing / forward deployed designer, Game design, Industrial design, Other design paths.

## Stack

Next.js 15 (App Router) + TypeScript, deployable on Vercel. Data scripts run with `tsx` and write JSON to `data/`.

Interface: Tailwind CSS 4 + shadcn/ui (Base UI flavour) + Lucide icons + Recharts via the shadcn chart component. The theme in `app/globals.css` is the single source of truth for colours, radius and shadows; don't add one-off colours. The direction is contemporary and a little playful, built on GrönLoop's system: white surfaces, near-black ink (#101014) and hairlines at low alpha, square corners (`--radius` is 0, 2px at most for inputs), no shadows. Fonts via `next/font/google`: Martian Mono (`--font-heading`, weight 600, run at 87.5% width with tight tracking: -0.03em, -0.04em on h1) for headings, panel titles, the wordmark and the big readout numbers, a monospaced display face that sits with the pixel art; heading sizes are tokens in `app/globals.css` (`text-h1` 48px, scaling with the viewport on phones; `text-h2` 32px; `text-title` 18px for panel titles), applied to h1 and h2 by default, never sized per page; the hero data note (source counts and last update) is the shared `components/data-note.tsx`; Geist (`--font-sans`) for body and UI; Geist Mono (`--font-mono`) for numbers, levels, dates and data labels. Buttons follow GrönLoop: square, mono uppercase labels; primary is the emerald fill, secondary a hairline outline. Theme: one header button (`components/theme-toggle.tsx`) showing the current choice and opening a Light / Dark / System menu (Base UI Menu: arrows, Enter, Escape, outside click). On phones the header has two rows (wordmark and buttons sticky on top, the tabs below). UI sound (`lib/sound.ts`, wired once in `components/sound.tsx` by a delegated document listener, so every element gets it, including ones added later; opt out with `data-sound="none"`): Web Audio synthesis, no files; a soft ping on clicks, a clearly audible tick on mouse hover over buttons, tabs, filters, links, panels and chart bars (pitch rising with the bar's value; at most every 40ms), a softer tick when the pointer reaches a new job row (at most every 80ms), higher and lower notes for open and close, a chirp on the mascots, and rising or falling notes on theme change. Off by default; the header toggle stores the choice under `ping-sound`, and no audio context exists until a user gesture with sound on. Touch devices have no sound at all: where `(hover: none) and (pointer: coarse)` matches (`TOUCH_QUERY` and `isTouchDevice()` in `lib/sound.ts`, `useTouchDevice()` in `components/sound.tsx`, the `touch:` CSS variant in `app/globals.css`), the header toggle is not rendered (and `touch:hidden` keeps it from painting before hydration), the delegated listener adds nothing, and `audio()` never creates an AudioContext, even when a desktop visit stored `on`. The stored choice is left as it is. The check is by input, not width, so a narrow desktop window keeps the toggle. Hover rules: every control of the same kind ticks the same way on mouse hover (buttons, links, tabs, menu items, segmented options, panels), found by one delegated `pointerover` listener on the document, so icon-only buttons (the target is often the SVG inside), the sticky header and elements added later are covered. Two opt-outs, on an element or an ancestor: `data-sound="own-click"` (`OWN_CLICK_SOUND` in `lib/sound.ts`) keeps the hover tick and skips only the delegated click ping, for controls that play their own sound when pressed (the header icon buttons, the theme menu and its items, the "+N similar" expander); `data-sound="none"` silences everything (only the snake board). Disabled controls stay silent. Browsers keep audio suspended until the first click or key press (a modifier key alone does not count), so hover, row and chart-bar ticks are passive: they never create or resume audio and are skipped, not queued, until a click or key press anywhere has started it; from then on they play. Light on a first visit; System follows prefers-color-scheme live. The choice is stored under `ping-theme` and applied before first paint by next-themes.

| Page | Code |
|---|---|
| Jobs (home): readout, URL filters, the jobs list, load more | `app/page.tsx`, `components/job-filters.tsx`, `components/job-row.tsx` |
| Market insights: asks overall and per direction, direction comparison | `app/insights/page.tsx`, `components/insight-charts.tsx` |
| Header, theme toggle, "Get new jobs" placeholder dialog | `components/site-header.tsx`, `components/theme-toggle.tsx`, `components/subscribe-dialog.tsx` |
| Server-side view layer (filters, cards, insight numbers) | `lib/view.ts`, `lib/categories.ts` |

Category colours come from Tailwind's palette, the same family as GrönLoop's emerald and amber, avoiding green, emerald and teal so nothing competes with the brand: product blue, design engineering indigo, AI and behaviour violet, brand and visual rose, research and service sky, customer-facing orange, game fuchsia, industrial amber, other paths slate. `--cat-<name>` references shade 500 in light and 400 in dark (dots, the "Which directions are hiring" chart, single-direction charts); `--cat-<name>-text` references 700 in light and 300 in dark (the direction label; 5.05:1 or better on white, 7.7:1 or better on the dark surfaces). "All directions" charts draw one emerald bar per row (`--brand-lg`), and "Which directions are hiring" uses two greens (`--brand-lg` within reach, `--brand-pale` the rest) with each direction's dot before its label; hovering or tapping a bar shows its split by direction, and the hidden data tables keep the per-direction columns. Tokens are mapped to categories in one place, `CATEGORY_TOKEN` in `lib/categories.ts`, and read through `components/category.tsx`.

Visual system: GrönLoop, ported through tokens and shared components. White surfaces, near-black ink (#101014), hairlines at low alpha (`--hairline`, `--hairline-strong`, `--guide`) and one emerald accent in three contrast rungs: `--brand` #10b981 for decoration only, `--brand-lg` #059669 for big readout numbers and UI marks, `--brand-sm` #047857 for small text, links, signals and the primary button fill. Dark derives from GrönLoop's dark panel (#0a1320 / #111c2c, off-white ink, #34d399 emerald). Tiles are pixel tiles in `components/tiles.tsx`: SVGs of an 8 x 8 grid of square pixels (crispEdges, no images) in the five brand greens (`--px-1` to `--px-5`), in six flat variants (solid, pale, checker, dither, diagonal stripe, corner pixel). At 32px a tile pixel is 4px, and the mascots draw at 4px per pixel on phones and 8px from md, so tiles and mascots share one pixel grid. They are placed as a light scatter in each hero (one small staircase and two single tiles, a different arrangement per page), the pixel mascots (`components/mascot.tsx`: 16 x 16 SVG pixel art on a square tile, one rect per pixel with crispEdges, always at 4, 6 or 8px per pixel; the block on Jobs, the student on Market insights), the Ping mark, and the fresh tile before jobs posted in the last 24 hours and on "New today", whose soft pulse is the only motion (still under prefers-reduced-motion). Its rules live in `components/rules.tsx` (the dispersing lines, once per page: under the readout band on Jobs and on Market insights) and in the readout band (dashed hairline dividers, `components/readout.tsx`). Shared pieces: the blueprint frame (`components/blueprint.tsx`: every page is a stack of `Band`s with `--frame-line` rules between sections and either side of the content column, and 45-degree hatching in the gutters), one shared panel for every card-like block (`components/panel.tsx`: hairline border, padded slots for header, description, body and footer; a linked panel turns its border the accent colour, underlines its title and shows an arrow on hover and focus), the readout strip (`components/readout.tsx`), text tabs in the shared `TabRow` (`components/tab-row.tsx`: wraps onto more lines from tablet width, scrolls with snap and an edge fade on phones) and square segmented controls (`components/filter-controls.tsx`), and signals as a small Lucide icon plus text in `--brand-sm` (`components/signal.tsx`). Jobs are a dense list of rows (`components/job-row.tsx`) with mono column headers; near-identical postings from one company (same level, titles sharing 70% of their words) fold into one row with a "+N similar" expander (`groupSimilar` in `lib/view.ts`). Sorting: the Sort control next to the job count, and the Level and Posted headers (faint arrow at rest). Direction tabs keep one fixed order on both pages (`directionOrder`); empty ones stay, dimmed with 0. Emerald figures are good news only (within reach, open to Estonia, new today); requirement and zero figures use the text colour. An empty result names the filter that emptied it, with a one-click way to remove just that filter. Charts have square bars, mono labels and totals; a single direction's charts use its own colour.

Layout: full width like a dashboard, no max width on the content column or header. Fixed gutters from the `--gutter` token: 16px on phones, 32px from 768px, 48px from 1024px, 64px from 1920px (`4xl`). Headings and text blocks keep a 65ch measure (`max-w-prose`). Market insights chart panels: 2 across from lg, 3 from xl (1280px), 4 from 4xl (1920px).

Jobs filters in the URL: `category`, `estonia=1`, `remote`, `level` (comma list of `reach`, `mid`, `senior`; empty = any level; the old `reach=1` still works) and `sort` (`best` or `newest`; the old `reach` means `best`). The default order is **Best fit first** (`fitRank` and `compareFit` in `lib/sort.ts`, shared by the Jobs list and the email digest): within reach and open to Estonia, then within reach, then open to Estonia, then everything else, newest first inside each group. It only orders: nothing is filtered by default. `getDataset` returns the cards already in this order; `newest` re-sorts by date. Level buckets are `levelBucket` in `lib/view.ts`.

Remembered view (`lib/view-memory.ts`): the visitor's direction, level, location, work setup and sort are kept in localStorage (`ping-jobs-view`, no cookie) and restored on the next visit to Jobs. They are saved only when the visitor changes the view (`useQueryState`, `FilterLink`), never when a page is just opened, and search is not kept. A URL with any view parameter (a shared link, a digest link) wins and nothing is restored. A full load restores before paint with the inline `VIEW_RESTORE_SCRIPT` (`location.replace`, and a one-time sessionStorage flag so `ResultsTarget` does not scroll as for a shared link); a client navigation to Jobs restores with `RestoreView` (`components/view-memory.tsx`). Restoring never sends a filter event to the usage stats. **Reset** in the filters (shown whenever the view differs from the default, sort included) and the "Design jobs live" readout go back to the default view and clear the memory.

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
| Source adapters (company ATS) | `lib/sources/ats.ts` (Greenhouse, Lever, Ashby, Teamtailor, Workable, Recruitee, SmartRecruiters, Personio), reading every board in `data/companies.json` (see "Companies and discovery") |
| Which job system a careers page uses, and can it be read | `lib/sources/detect.ts` (`npm run detect`) |
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


## Alignment

Two rules, enforced by `npm run check:align` (Playwright, `tests/alignment.spec.ts`; also on every push in `.github/workflows/checks.yml`).

**Never place an icon, dot or small glyph next to text without `<IconText>`** (`components/icon-text.tsx`). It centres the icon on the cap height of the text's first line, for one line or wrapped text, at every size and in every font. The browser puts the icon's bottom edge on the text's own baseline (baseline alignment, which uses the first line of wrapping text), then `translate: 0 calc(50% - 0.5cap)` moves it by half its own height and half the text's cap height (the `icon-text`, `icon-text-inline`, `icon-slot` and `icon-hang` utilities in `app/globals.css`). No pixel nudges, no icon sizes, no font tables: a formula from line height and font metrics was tried and measured up to 0.8px off, because browsers snap the baseline to whole pixels. How to use it:

- Put the text style (size, weight, font, line height) on `IconText` itself; `icon` goes before the text, `iconEnd` after it (an arrow, a check). Use `as` for the element (`as="p"`, `as="h2"`, `as={Link}`), `inline` inside running text, `textClassName="flex-1"` to push `iconEnd` to the far end, `iconsHidden={false}` when the slot holds a real control (the subscription checkbox).
- In a box taller than one line (a 44px touch row) add `flex-wrap content-center`, or centre the IconText inside the box.
- `Button` and `Badge` apply the same slot rule to their own svg children (`[&>svg]:icon-slot`), so `<ArrowRight data-icon="inline-end" />` inside them needs nothing else, and a button's label still gives the button its baseline.
- An icon that hangs into the gap before the text (the fresh tile before a job title) uses `icon-hang` with margins that keep the text in place.
- Icon-only buttons (the header icons, the search clear button) have no text to align with and centre the icon in the box.
- In use: `CategoryLabel`, `TabContent`, `SignalTag`, the readouts, `DataNote`, `Panel` (lead dot and arrow), the Discover rows, the Market insights heading, the wordmark, the theme menu, the subscription modal, the "+N similar" expander, the /stats status lines. Emails are not covered: email clients do not support these units, and the email header aligns its logo with table cells.

**Text next to text aligns on the baseline** (`baseline-row`): a count beside its label, a small mono label beside its control, a heading beside a badge, a panel header, figures and their labels side by side. Never on the centre of the boxes: an 11px uppercase `label-mono` fills the top of its box and lowercase text sits low in its own, so centred boxes put the words on different lines. `Segmented`, `Panel`, `Badge`, `TabContent` and the phone meta line of a job row follow it; IconText offers its text's baseline, so it lines up inside a baseline row like plain text. Figures stacked over labels and set side by side align on the labels (`items-baseline-last`). `cn()` keeps `baseline-row`, `icon-text` and `icon-slot` beside any Tailwind class (it only merges classes it knows), but it cannot tell that `items-center` undoes the baseline: both classes stay and the stylesheet order decides, so never add an `items-*` class to a baseline row or an IconText. The site header is the one exception to the baseline rule: the wordmark and the header buttons are boxes centred in the bar. Do not name a utility `text-*`: `cn()` merges it away as a text size.

**The check** loads Jobs, Discover, Market insights and /stats (when `STATS_PASSWORD` is set) at 1440px and 375px, light and dark, plus the Jobs data note narrowed so it wraps. It fails when any icon in an IconText, button, badge or `icon-hang` is more than 0.75px off its first line's cap-height centre (the baseline read from the page, the cap height from the font), or when words on one line of a `baseline-row` are more than 0.6px apart. Locally it reuses the dev server and the installed Chrome; CI builds, starts the production server and uses Playwright's Chromium.

## Motion and play

Motion is short and purposeful, set through tokens in `app/globals.css` (`--ease-out`, `--dur-fast`, `--dur-ui`, `--dur-enter`, `--stagger`); only transform and opacity animate, plus the "+N similar" expander's height. Under `prefers-reduced-motion` everything sits in its final state.

- Mascots (`components/mascot.tsx`): frame-based pixel sprites, moving only by whole pixels. Entrance once on load (the block drops in with a stretch and a squash, the student pops up), irregular one-frame blinks, and a hover or tap reaction (wave and hop; look left and right with a pixel "ping") at most every 600ms, with the chirp.
- Page: hero tiles pop in one by one, dispersing lines draw in from the left, readout figures count up when first seen (`components/count-up.tsx`), panels and the first job rows rise in once (`components/reveal.tsx`), chart bars grow when their panel appears, the job list cross-fades on filter changes (`components/results-fade.tsx`).
- Sound moments: a soft ping when a count-up lands and a quiet tick when filtered results arrive (both only once audio is running, never on load), open and close sounds on the "+N similar" expander, a ping when the snake eats.
- Snake (`components/snake.tsx`, in `components/closing-band.tsx` above the footer): ported from GrönLoop's closing call to action. It plays itself until clicked, tapped or started with Enter/Space; arrow keys or WASD steer, swipes on touch. A game starts at 260ms per step and each tile eaten makes it about 6% faster, down to 120ms; the label shows the score and speed level, and Play again resets the pace. The demo moves at a steady 220ms. Ping's pixel tiles on exact 32px cells; pauses off screen or in a hidden tab; a still arrangement under reduced motion.


## Companies and discovery

`data/companies.json` is the curated, version-controlled list of company boards Ping reads (schema `CompanySchema` in `lib/company.ts`, loaded by `loadCompanies` in `lib/data.ts`): name, careers URL, ATS and board slug (for Teamtailor and Personio a custom careers host also works), `basedInEstonia`, `addedAt`, and `addedBy` (`manual` or `discovery`). Add a company by hand after `npm run detect` confirms its board is readable; companies checked and not readable are logged in [COMPANIES.md](COMPANIES.md).

- **Fetch:** every board goes through the same fetchers, normalising, scope filter, dedupe, classification and requirements as every other source. A company whose board fails keeps its postings from the last good run (matched by the board's id prefix, `boardIdPrefix`), is named in `sources.json` (`failedCompanies`) and in `run.json`'s failed sources, and shows on /stats. A company with no open roles, or none in design, simply stays on the list.
- **Based in Estonia:** every posting from a company with `basedInEstonia: true` counts as open to Estonia, whichever source listed it (applied in `loadClassifiedJobs`). Only set it for companies headquartered in Estonia.
- **Detection** (`lib/sources/detect.ts`): the careers URL and page HTML are searched for the public board addresses of the eight systems (plus Teamtailor sites on their own domain); when the page loads its list with JavaScript, likely slugs from the company name are tried on every system and a guessed board counts only if one of its roles is located in Estonia. A match counts only when the real fetcher reads the board.
- **Weekly discovery** (`scripts/discover.ts`, `.github/workflows/weekly-discovery.yml`, Mondays 03:00 UTC, an hour before the daily refresh, same concurrency group): Claude Haiku 5.5 with web search (at most 8 searches) suggests up to 15 companies in Estonia that hire designers and are not on the list or skipped before. Recruiters, job boards, duplicates (name, careers host or board) and unreadable boards are skipped with the reason; at most 5 are added a week, marked `discovery`. `basedInEstonia` is set only when the model says so and the board has a role located in Estonia. Each run, its cost (tokens plus $0.01 per search) and every skip are kept in `data/discovery.json`; /stats shows the latest. `npm run discover -- --dry-run` shows what it would add and writes nothing.

## Discover

`/discover` (`app/discover/page.tsx`; `/companies` redirects there) lists every company Ping tracks or has seen hiring designers (`companyDirectory` in `lib/view.ts`), most current design roles first, then name; Newest sorts by each company's newest role. Each row (`components/company-row.tsx`) has the name, "Based in Estonia" or "N open to Estonia", the directions as category dots, the number of roles, a link to those jobs on Jobs (`/?company=<companySlug>`, carrying the page's direction and Estonia filters; counted as a `company` event) and the careers page for tracked companies. Tracked companies with no open roles stay listed with a quiet line. The direction tabs and Open to Estonia work as on Jobs and live in the URL; Reset clears them; 50 rows at a time with Load more. On Jobs, `?company=` filters to one company and shows a removable "Company" row; it counts as a chosen view (a shared link wins over the remembered view) but is not remembered itself.

## Daily refresh and deploy

`.github/workflows/daily-refresh.yml` runs every day at 04:00 UTC (06:00 in Tallinn in winter, 07:00 in summer) and can be started by hand (Actions, "Daily refresh", Run workflow):

1. `npm run fetch`: every source, deduplicated. Postings no longer listed drop out. A source that fails keeps its postings from the last good run and is named in the log; a run that loses every source, or more than half the postings, exits without writing, so the site keeps the previous data.
2. `npm run extract`: classification and requirements for new postings only (both cached by posting id). `ANTHROPIC_API_KEY` comes from the repository's Actions secret.
3. `npm run stamp`: writes `data/run.json` (last run, next scheduled run, failed sources), which the data note shows in Tallinn time, and `data/seen.json` (when each posting was first seen), which the email digest uses.
4. Commits `data/` to main only when postings, classifications or requirements changed. That push deploys on Vercel.
5. `npm run digest`: emails confirmed subscribers who are due. It can never fail the refresh (it exits 0 with a warning, and the step has `continue-on-error`).

Locally, `npm run refresh` runs the same three steps. The site is on Vercel (production branch main) and reads `data/*.json` at request time (`outputFileTracingIncludes` in `next.config.mjs`), so no local files are needed to build or run it.

## Email subscriptions

"Get new jobs" in the header opens the subscription modal (`components/subscribe-dialog.tsx`). It starts from the visitor's current Jobs filters; directions, level, location, work setup and frequency (weekly on Monday, or daily) stay editable.

- **Storage:** Neon Postgres from the Vercel Marketplace (`ping-db`, Frankfurt), connected to the Vercel project, so `DATABASE_URL` is set there automatically. Locally it is in `.env.local`; in Actions it is a repository secret. `npm run db:setup` creates the tables. `subscribers` keeps only email, preferences, frequency, confirmed, a random token, `created_at` and `last_sent_at`. `rate_limits` keeps a salted IP hash for at most an hour.
- **Routes:** `POST /api/subscription` signs up (honeypot field, 5 sign-ups per IP and 3 per address per hour, inline and server-side email checks, the same answer whether or not the address exists). `GET`/`PUT` with a token load and save preferences for the "Change what you get" link (`/?manage=<token>`). `/api/subscription/confirm` confirms; `/api/subscription/unsubscribe` deletes the record (GET from the link, POST for one-click `List-Unsubscribe`). Landing pages are `/subscription/confirmed`, `/removed` and `/invalid`; the policy is at `/privacy`.
- **Sending:** Resend over its HTTP API (`lib/server/email.ts`), with `RESEND_API_KEY` in `.env.local`, Vercel and Actions. The sender is `EMAIL_FROM` (`Ping <jobs@mail.ragne.me>` once `mail.ragne.me` is verified in Resend; until then Resend's test sender, which only delivers to the account owner).
- **Digest:** `scripts/digest.ts` picks postings first seen since each subscriber's last email that match their preferences, Best fit first (the Jobs order), near-duplicates folded, at most 10, with one line of market insight and a link to the same filters on Ping. No new matches, no email. Weekly subscribers get it on Monday (Tallinn time). Sign-ups never confirmed are deleted after 7 days. `npm run digest -- --dry-run` shows what would go out; `npm run digest -- --test <address> --since-days 7` sends one digest to that confirmed subscriber.
- **Templates:** `lib/server/templates.ts`, HTML and plain text, tables and inline styles, system fonts, white background, near-black text, emerald accent and the Ping tile.


## Logo and channels

- The logo is the block mascot's face on an 8 x 8 pixel grid (`lib/logo.ts`), drawn by `components/logo.tsx` in the header, as table cells in the emails, and as the favicons. `npm run icons` writes `app/icon.svg`, PNGs at 16, 32, 48, 192 and 512 px and `app/apple-icon.png` (180 px), all at whole-pixel scales.
- Slack and Discord are coming soon: icon buttons in the header (in the theme menu on phones) open the "Get new jobs" modal at "Where to get them", where Email is the only channel that can be picked. The glyphs are Simple Icons (CC0) in `components/brand-icons.tsx`; Slack comes from release 15.22.0, the last that includes it.

## Sharing

Every page shares the description "New design jobs every morning, sorted by direction and level." (`lib/share.ts`); the Jobs page shares as "Ping | Design jobs for EKA students", other pages as "Ping", and the image from `app/opengraph-image.tsx` (reused by `app/twitter-image.tsx`): the mascot tile's light green, "Ping" in Martian Mono (a static 600 weight, 87.5% width instance in `assets/fonts`, OFL) and the block mascot drawn from its grid in `lib/mascots.ts` at 24px per pixel.

## Ping misses you

`components/tab-presence.tsx` (mounted once in `app/layout.tsx`): when the tab goes to the background (`visibilitychange`), the title becomes "Ping misses you" and the favicon links point at the sleeping face (`public/favicon-sleeping.svg` and `.png`, written by `npm run icons` from `SLEEPING_ROWS` in `lib/logo.ts`). Coming back restores the title saved at that moment and the normal favicons. It never runs on first load; no sound, no animation.

## /stats and usage stats

`/stats` is the private back office: visitors, subscribers, what people use and pipeline health. Access works as on ragne.me: HTTP Basic Auth with `STATS_PASSWORD` (any user name), asked for by `middleware.ts` (Node runtime) and checked again by the page and `/api/stats/*`. Wrong passwords are limited to 10 per hashed IP per 15 minutes. "Log out" sends the user name `logout` with a throwaway password, which the browser then caches instead of the real one. Everything under `/stats` is noindex and linked from nowhere.

Usage stats are anonymous daily counters in Neon (`daily_counts`, see `lib/usage.ts`), on ragne.me's method: `components/usage-beacon.tsx` reports views (once per page per 30 minutes) and visitors (once per browser per Tallinn day) with a note in localStorage, plus events (job clicks, company links on Discover, filters, searches, the subscription modal, the snake); `app/api/track` drops bots and prefetches and adds to the counters. No cookie, no IP, no identifier. Local and preview runs are filed under `dev`, apart from production's `prod`. Subscriptions (sign-up, confirm, unsubscribe) and the digest (sent, failed) add to the same counters server-side.

