# Company boards

Ping reads the public job boards of the companies in `data/companies.json` every morning (see "Companies and discovery" in [DEVELOPMENT.md](DEVELOPMENT.md)). This file logs companies that were checked and could not be added, so nobody checks them again by hand without a reason.

To check a company: `npm run detect -- "Name=https://their.site/careers"`. It finds the job system behind the careers page (or tries likely board names, accepting one only when its roles are located in Estonia) and reads the board with the real fetcher.

## Not readable (checked 2026-11-21)

Companies based in Estonia, or with a design team there, that hire designers but whose careers page has no board Ping can read: their own job system, a page without a supported board, or listings only on CV.ee or LinkedIn. Revisit when they change systems.

| Company | Careers page | Reason |
|---|---|---|
| Bolt | https://bolt.eu/en/careers/positions/ | no supported job system found on the careers page |
| Cleveron | https://cleveron.com/join-the-team/ | no supported job system found on the careers page |
| Clevon | https://clevon.com/careers/ | no supported job system found on the careers page |
| Toggl | https://toggl.com/jobs | board found but not readable (ashby/toggl: HTTP 404 for https://api.ashbyhq.com/posting-api/job-board/t) |
| Lingvist | https://lingvist.com/jobs/ | no supported job system found on the careers page |
| ESTO | https://global.esto.eu/careers/ | board found but not readable (teamtailor/global.esto.eu: HTTP 404 for https://global.esto.eu/jobs.rss) |
| Funderbeam | https://www.funderbeam.com/careers | no supported job system found on the careers page |
| Insly | https://insly.com/about-us/careers/ | no supported job system found on the careers page |
| Ampler Bikes | https://amplerbikes.com/pages/jobs | no supported job system found on the careers page |
| Auve Tech | https://www.auve.tech/careers-and-team | no supported job system found on the careers page |
| Elisa Eesti | https://www.elisa.ee/et/nextchapter | no supported job system found on the careers page |
| Telia Eesti | https://www.telia.ee/ettevottest/karjaar-telias | no supported job system found on the careers page |
| SEB Estonia | https://www.seb.ee/karjaar | no supported job system found on the careers page |
| Coop Pank | https://www.cooppank.ee/coop-pank/tule-toole | no supported job system found on the careers page |
| Bigbank | https://jobs.bigbank.eu/et | no supported job system found on the careers page |
| Tallink Grupp | https://company.tallink.com/jobs-and-careers/job-offers | no supported job system found on the careers page |
| Enefit | https://www.enefit.com/et/too-ja-praktika/tule-toole | no supported job system found on the careers page |
| Ridango | https://www.ridango.com/careers/ | no supported job system found on the careers page |
| Cybernetica | https://cyber.ee/careers/open-positions/ | no supported job system found on the careers page |
| Helmes | https://www.helmes.com/career/ | no supported job system found on the careers page |
| Net Group | https://netgroup.com/careers/ | no supported job system found on the careers page |
| Mooncascade | https://www.mooncascade.com/career | no supported job system found on the careers page |
| Trinidad Wiseman | https://www.twn.ee/tule-toole | board found but not readable (teamtailor/www.twn.ee: HTTP 404 for https://www.twn.ee/jobs.rss) |
| Fob Solutions | https://www.fob-solutions.com/career/ | no supported job system found on the careers page |
| Mobi Lab | https://www.lab.mobi/who-we-are | no supported job system found on the careers page |
| Velvet | https://www.velvet.ee/careers | no supported job system found on the careers page |
| celerart | https://celerart.com/careers | no supported job system found on the careers page |
| CM Games | https://cm.games/people | no supported job system found on the careers page |
| Evolution | https://careers.evolution.com/ | no supported job system found on the careers page |
| Playstack | https://www.playstack.com/careers | no supported job system found on the careers page |
| Games Global | https://careers.gamesglobal.com/jobs | no supported job system found on the careers page |
| Coolbet | https://www.coolbet.com/careers | no supported job system found on the careers page |
| Bercman Technologies | https://bercman.com/careers/ | no supported job system found on the careers page |
| Woola | https://www.woola.io/jobs | no supported job system found on the careers page |
| Karl Storz Video Endoscopy Estonia | https://career.karlstorz.com/ | no supported job system found on the careers page |
| DS Smith Packaging Estonia | https://www.dssmith.com/careers | no supported job system found on the careers page |
| Tarmeko | https://www.tarmeko.ee/grupist/toopakkumised | no supported job system found on the careers page |
| 1oT | https://www.1ot.com/jobs | no supported job system found on the careers page |
| Speakly | https://speakly.me/en/careers | no supported job system found on the careers page |
| Äripäev | https://firma.aripaev.ee/tule-toole/ | no supported job system found on the careers page |
| Omniva | https://www.omnivagroup.com/et/karjaar | no supported job system found on the careers page |
| SMIT | https://www.smit.ee/et/karjaar | no supported job system found on the careers page |
| RIK | https://www.rik.ee/et/karjaarileht/tere-tulemast-riki | no supported job system found on the careers page |
| TEHIK | https://www.tehik.ee/miks-meiega-liituda | no supported job system found on the careers page |
| Zendesk | https://www.zendesk.com/company/careers/ | no supported job system found on the careers page |

Also left out during research: Yolo Group (pausing operations), Ready Player Me (site did not respond), Torerro (registered in Malta, no listings), Wallester (lists jobs only on CV.ee). Agencies without a careers page at all: Kontuur Leo Burnett, Tank, Identity, Division, and probably Rakett and Taevas Ogilvy. Game studios without one: Galaxy4Games, Placeholder Gameworks, Interactive Fate.

The weekly discovery (`scripts/discover.ts`) records its own skipped candidates and reasons in `data/discovery.json`; /stats shows the latest run.
