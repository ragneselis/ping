# Companies

Every company Ping knows is in one list, `data/companies.json` (schema `CompanySchema` in `lib/company.ts`; see "Companies and discovery" in [DEVELOPMENT.md](DEVELOPMENT.md)). Each entry is one of two kinds:

- **Readable**: Ping reads its jobs every morning, from one of the eight public job boards (Greenhouse, Lever, Ashby, Teamtailor, Workable, Recruitee, SmartRecruiters, Personio) or one of the readers in `lib/sources/readers.ts` (Workday, Teamdash, or a site's own careers page).
- **Careers link only** (`careersLinkOnly: true`): Ping cannot read its jobs, so Discover shows the company with a link to its careers page.

Companies with designers in Estonia (`inEstonia: true`: headquartered there, or a real team in Tallinn or Tartu) are listed on Discover, each with a one-line `description`.

To check a company: `npm run detect -- "Name=https://their.site/careers"`. It finds the job board behind the careers page (or tries likely board names, accepting one only when its roles are located in Estonia) and reads it with the real fetcher.

## Not listed: gambling, betting and iGaming

Ping is a job site for students and does not list gambling, betting or iGaming companies: casino and betting operators, slot and casino game studios, and their suppliers. The names are in `GAMBLING` in `lib/company.ts` (matched however the name is spelled), plus any company whose own name says casino, betting, sportsbook, iGaming, gambling, lottery, poker or slots.

- Their postings are dropped from every source when jobs are fetched and when the data is read, so they never reach Jobs, Discover, Market insights or the email digest.
- Weekly discovery skips them and logs the reason (the model flags them as gambling too).
- Removed from the list on 2026-11-21: Relax Gaming, Sisu Group, Studioworks, Playtech and Betsson. Coolbet, Evolution and Games Global were found in research and never added.

## Own careers sites: checked 2026-11-21

Rules for a reader: the site serves its jobs to every visitor in a structured form (a public JSON endpoint, or records in the page), its robots.txt allows the pages read, and its terms do not forbid it. Never CV.ee, CV Keskus or LinkedIn. Full descriptions are fetched only for titles that could be design work.

| Company | Result | How |
|---|---|---|
| Bolt | **Read** (custom reader `bolt`) | The careers page renders every position as a record (title, team, locations, date); the detail page holds the full description. robots.txt allows everything; no website terms about automated access found. |
| Telia | **Read** (Workday, `teliacompany.wd3/Telia_careers`) | The public JSON the Workday careers site calls itself. robots.txt allows `/Telia_careers/`; no clause in Telia's terms. |
| Helmes | **Read** (Teamdash, `www.helmes.com/career/`) | Job pages on helmes.teamdash.com, linked from the careers page. Teamdash's robots.txt allows everything; no clause in Helmes's terms. |
| Cybernetica | **Read** (Teamdash, `cyber.ee/careers/open-positions/`) | As Helmes. cyber.ee's robots.txt allows the careers page. |
| SEB Estonia | Skipped | Its legal notice forbids reproducing site information without written permission, and its jobs are on CV.ee. |
| Tallink Grupp | Skipped | Jobs are only on CV Keskus. |
| Elisa Eesti | Skipped | The careers page lists no jobs and links to no job source. |
| Enefit | Skipped | The careers page lists no jobs and links to no job source. |
| Cleveron | Skipped | The "job offers" section has no job links or data. |
| Net Group | Skipped | No job list or job data on the careers page (its structured data describes the website, not jobs). |
| Lingvist | Skipped | No job list on the jobs page. |

## Careers link only

The companies below have designers in Estonia but no board or careers site Ping can read (their own system, a page without a job list, or listings only on CV.ee or LinkedIn). They are in `data/companies.json` as careers link only and show on Discover. Checked 2026-11-21; revisit when they change systems.

Cleveron, Clevon, Toggl, Lingvist, ESTO, Funderbeam, Insly, Ampler Bikes, Auve Tech, Elisa Eesti, SEB Estonia, Coop Pank, Bigbank, Tallink Grupp, Enefit, Ridango, Net Group, Mooncascade, Trinidad Wiseman, Fob Solutions, Mobi Lab, Velvet, celerart, CM Games, Playstack, Bercman Technologies, Woola, Karl Storz Video Endoscopy Estonia, DS Smith Packaging Estonia, Tarmeko, 1oT, Speakly, Äripäev, Omniva, SMIT, RIK, TEHIK, Zendesk.

Also left out during research: Yolo Group (pausing operations), Ready Player Me (site did not respond), Torerro (registered in Malta, no listings), Wallester (lists jobs only on CV.ee, no careers page). Agencies without a careers page at all: Kontuur Leo Burnett, Tank, Identity, Division, and probably Rakett and Taevas Ogilvy. Game studios without one: Galaxy4Games, Placeholder Gameworks, Interactive Fate.

The weekly discovery (`scripts/discover.ts`) records its own additions and skipped candidates, with reasons, in `data/discovery.json`; /stats shows the latest run.
