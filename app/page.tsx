import { loadClassifiedJobs, loadExtractions, loadJobs, loadSources, tally } from "@/lib/data";
import { CATEGORIES, CATEGORY_LABEL, type Category, type ClassifiedJob, type Extraction } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = { [k: string]: string | string[] | undefined };

/** Seniority levels a student or recent graduate can realistically apply for. */
const REACH = new Set(["intern", "junior", "mid", "unspecified"]);
const LIST_LIMIT = 100;

function Bars({ title, items, total, limit = 15 }: { title: string; items: { label: string; count: number }[]; total: number; limit?: number }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      <h3>{title}</h3>
      {items.length === 0 && <p className="muted">None stated.</p>}
      <table>
        <tbody>
          {items.slice(0, limit).map((i) => (
            <tr key={i.label}>
              <td style={{ width: "55%" }}>{i.label}</td>
              <td>
                <span className="bar" style={{ width: `${(i.count / max) * 100}px` }} />
                {i.count}/{total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Some boards list 100+ countries in the location; collapse long lists so the page stays readable. */
function shortLoc(loc: string): string {
  return loc
    .split(" · ")
    .map((part) => {
      const m = part.match(/^(.*?)\((.*)\)\s*$/);
      if (!m || m[2].length < 80) return part;
      const n = m[2].split(/,\s*(?=[A-ZÅÉ])/).length;
      return `${m[1].trim()} (${n} countries${/Estonia/.test(m[2]) ? ", incl. Estonia" : ""})`;
    })
    .join(" · ");
}

function fmtDate(iso: string | null) {
  return iso ? iso.slice(0, 10) : "-";
}

const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "-");

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const store = loadExtractions();
  const candidates = loadJobs();
  const jobs = loadClassifiedJobs(store);
  const sources = loadSources();

  const extractedCandidates = candidates.filter((j) => store.results[j.id]);
  const notDesign = extractedCandidates.filter((j) => !store.results[j.id].isDesignRole).length;
  const pending = candidates.length - extractedCandidates.length;
  const totalCost = store.runs.reduce((n, r) => n + r.costUsd, 0);
  const totalCalls = store.runs.reduce((n, r) => n + r.postings, 0);

  // Filters (plain GET form), shared by the overview and the job list.
  const q = get("q").toLowerCase();
  const f = { remote: get("remote"), estonia: get("estonia"), category: get("category"), source: get("source"), seniority: get("seniority") };
  const filtered = jobs.filter(
    (j) =>
      (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) &&
      (!f.remote || j.remote === f.remote) &&
      (!f.estonia || String(j.openToEstonia) === f.estonia) &&
      (!f.category || (f.category === "pending" ? !j.extraction : j.categories.includes(f.category as Category))) &&
      (!f.source || j.source === f.source || j.alsoListedOn.includes(f.source)) &&
      (!f.seniority || (f.seniority === "reach" ? REACH.has(j.seniority) : j.seniority === f.seniority)),
  );
  const uniq = (xs: string[]) => [...new Set(xs)].sort();
  const estonia = jobs.filter((j) => j.openToEstonia);
  const estoniaByCompany = [...Map.groupBy(estonia, (j) => j.company).entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const filterActive = Object.values(f).some(Boolean) || !!q;

  // Requirements overview for the current filter.
  const ex = filtered.map((j) => j.extraction).filter((e): e is Extraction => !!e);
  const n = ex.length;
  const years = ex.map((r) => r.yearsMin).filter((y): y is number => typeof y === "number");

  // Per category comparison (all jobs, not filtered).
  const perCat = CATEGORIES.map((c) => {
    const list = jobs.filter((j) => j.categories.includes(c));
    const e = list.map((j) => j.extraction!);
    return {
      c,
      total: list.length,
      estonia: list.filter((j) => j.openToEstonia).length,
      reach: list.filter((j) => REACH.has(j.seniority)).length,
      reachEstonia: list.filter((j) => j.openToEstonia && REACH.has(j.seniority)).length,
      skills: tally(e.map((r) => r.skills)).slice(0, 6),
      tools: tally(e.map((r) => r.tools)).slice(0, 6),
      years: median(e.map((r) => r.yearsMin).filter((y): y is number => typeof y === "number")),
      level: tally(e.map((r) => [r.experienceLevel]))[0],
    };
  });
  const catLink = (c: string, extra = "") => `/?category=${c}${extra}`;

  return (
    <main>
      <h1>Ping: data test</h1>
      <p className="muted">
        Design jobs of every kind, sorted by Claude into nine categories from the work each posting describes. Scope: remote anywhere, plus on-site
        and hybrid roles in Europe.
        {sources && <> Fetched {sources.fetchedAt.replace("T", " ").slice(0, 16)} UTC.</>}
      </p>
      <p>
        <b>{jobs.length - pending} design roles</b>, {estonia.length} open to someone based in Estonia.{" "}
        <span className="muted">
          {candidates.length} candidate postings passed the broad title pre-filter; the model read {extractedCandidates.length} and set aside {notDesign} as not
          design work{pending > 0 && <>, {pending} still waiting for <code>npm run extract</code></>}. Extraction: {totalCalls} model calls in {store.runs.length} run
          {store.runs.length === 1 ? "" : "s"}, ${totalCost.toFixed(2)} in total{store.runs.length > 0 && <> ({store.runs[0].model})</>}.
        </span>
      </p>

      {/* ---------------- Filters ---------------- */}
      <form method="get">
        <input name="q" placeholder="Search title, company, location" defaultValue={get("q")} />
        <select name="category" defaultValue={f.category}>
          <option value="">Category: any</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          {pending > 0 && <option value="pending">Not classified yet</option>}
        </select>
        <select name="estonia" defaultValue={f.estonia}>
          <option value="">Open to Estonia: any</option>
          <option value="true">Open to Estonia: yes</option>
          <option value="false">Open to Estonia: no</option>
        </select>
        <select name="remote" defaultValue={f.remote}>
          <option value="">Remote status: any</option>
          {uniq(jobs.map((j) => j.remote)).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select name="seniority" defaultValue={f.seniority}>
          <option value="">Seniority: any</option>
          <option value="reach">Within reach (intern, junior, mid, unspecified)</option>
          {uniq(jobs.map((j) => j.seniority)).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select name="source" defaultValue={f.source}>
          <option value="">Source: any</option>
          {uniq(jobs.flatMap((j) => [j.source, ...j.alsoListedOn])).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button type="submit">Filter</button> <a href="/">Reset</a>
      </form>

      {/* ---------------- Categories ---------------- */}
      <h2>Jobs per category</h2>
      <p className="muted">A posting can be in more than one category, so the rows add up to more than the total.</p>
      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>All</th>
              <th>Open to Estonia</th>
              <th>Within reach</th>
              <th>Open to Estonia and within reach</th>
            </tr>
          </thead>
          <tbody>
            {perCat.map((r) => (
              <tr key={r.c}>
                <td><a href={catLink(r.c)}>{CATEGORY_LABEL[r.c]}</a></td>
                <td>{r.total}</td>
                <td><a href={catLink(r.c, "&estonia=true")}>{r.estonia}</a></td>
                <td><a href={catLink(r.c, "&seniority=reach")}>{r.reach}</a></td>
                <td><a href={catLink(r.c, "&estonia=true&seniority=reach")}>{r.reachEstonia}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- Requirements overview ---------------- */}
      <h2>What the market asks for{filterActive ? " (current filter)" : " (all design roles)"}</h2>
      {n ? (
        <>
          <p className="muted">
            {n} postings with extracted requirements{filterActive && <> out of {jobs.filter((j) => j.extraction).length}</>}.
            {years.length > 0 && <> {years.length}/{n} state years of experience, median minimum {median(years)} years.</>}
            {f.category && f.category !== "pending" && <> Category: {CATEGORY_LABEL[f.category as Category]}.</>}
          </p>
          <div className="grid">
            <Bars title="Skills" items={tally(ex.map((r) => r.skills))} total={n} limit={20} />
            <Bars title="Tools" items={tally(ex.map((r) => r.tools))} total={n} limit={20} />
            <Bars title="Experience level" items={tally(ex.map((r) => [r.experienceLevel]))} total={n} />
            <Bars title="Other requirements" items={tally(ex.map((r) => r.other))} total={n} limit={20} />
            <Bars title="Languages" items={tally(ex.map((r) => r.languages))} total={n} />
            <Bars title="Education" items={tally(ex.map((r) => (r.education ? [r.education] : [])))} total={n} />
          </div>
        </>
      ) : (
        <p>No extracted postings for this filter. Run <code>npm run extract</code>.</p>
      )}

      <h3>Per category</h3>
      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Postings</th>
              <th>Top skills</th>
              <th>Top tools</th>
              <th>Median min. years</th>
              <th>Most common level</th>
            </tr>
          </thead>
          <tbody>
            {perCat.map((r) => (
              <tr key={r.c}>
                <td><a href={catLink(r.c)}>{CATEGORY_LABEL[r.c]}</a></td>
                <td>{r.total}</td>
                <td>{r.skills.map((s) => <span className="tag" key={s.label}>{s.label} {pct(s.count, r.total)}</span>)}</td>
                <td>{r.tools.map((s) => <span className="tag" key={s.label}>{s.label} {pct(s.count, r.total)}</span>)}</td>
                <td>{r.years ?? "-"}</td>
                <td>{r.level ? `${r.level.label} (${pct(r.level.count, r.total)})` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- Sources ---------------- */}
      <h2>Sources</h2>
      {sources ? (
        <>
          <p className="muted">
            {sources.totalInScope} candidate postings in scope, {sources.duplicatesRemoved} duplicates removed, {sources.unique} unique candidates.
          </p>
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Fetched (all roles)</th>
                  <th>Title pre-filter</th>
                  <th>In scope</th>
                  <th>Design roles (model)</th>
                  <th>Open to Estonia</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sources.sources.map((s) => (
                  <tr key={s.source}>
                    <td>{s.source}</td>
                    <td>{s.sourceType === "ats" ? "Company ATS" : "Job board"}</td>
                    <td>{s.ok ? s.fetched : <b>failed</b>}</td>
                    <td>{s.candidates}</td>
                    <td>{s.inScope}</td>
                    <td>{jobs.filter((j) => j.source === s.source && j.extraction).length}</td>
                    <td>{jobs.filter((j) => j.source === s.source && j.openToEstonia).length}</td>
                    <td className="muted">{s.error ?? s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Roles open to someone based in Estonia, by company ({estonia.length})</h3>
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Roles</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {estoniaByCompany.map(([company, list]) => (
                  <tr key={company}>
                    <td>{company}</td>
                    <td>
                      {list.map((j) => (
                        <div key={j.id}>
                          <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a>{" "}
                          <span className="muted" title={j.location}>
                            · {shortLoc(j.location)} · {j.remote} · {j.categories.map((c) => CATEGORY_LABEL[c]).join(", ") || "not classified yet"}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="muted">{[...new Set(list.map((j) => j.source))].join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>No data yet. Run <code>npm run fetch</code>.</p>
      )}

      {/* ---------------- Job list ---------------- */}
      <h2>Jobs ({filtered.length} of {jobs.length})</h2>
      {filtered.length > LIST_LIMIT && <p className="muted">Showing the {LIST_LIMIT} newest. Use the filters above to narrow the list.</p>}
      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Remote</th>
              <th>Who can apply</th>
              <th>Seniority</th>
              <th>Posted</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, LIST_LIMIT).map((j: ClassifiedJob) => (
              <tr key={j.id}>
                <td>
                  <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a>
                  <div>
                    {j.categories.length ? j.categories.map((c) => <span className="tag" key={c}>{CATEGORY_LABEL[c]}</span>) : <span className="muted">not classified yet</span>}
                  </div>
                  <details>
                    <summary className="muted">Requirements and description</summary>
                    {j.extraction && (
                      <div style={{ margin: "6px 0" }}>
                        <div className="muted">{j.extraction.categoryReason}</div>
                        {[...j.extraction.skills, ...j.extraction.tools, ...j.extraction.other, ...j.extraction.languages].map((s, i) => <span className="tag" key={i}>{s}</span>)}
                      </div>
                    )}
                    <pre>{j.description.length > 3000 ? `${j.description.slice(0, 3000)}…` : j.description}</pre>
                  </details>
                </td>
                <td>{j.company}</td>
                <td title={j.location}>{shortLoc(j.location)}</td>
                <td>{j.remote}</td>
                <td>
                  {j.regions.join(", ") || "-"}
                  <div className="muted">{j.openToEstonia === true ? "Open to Estonia" : j.openToEstonia === false ? "Not from Estonia" : "Unclear"}</div>
                </td>
                <td>{j.seniority}</td>
                <td>{fmtDate(j.postedAt)}</td>
                <td>
                  {j.source}
                  {j.alsoListedOn.length > 0 && <div className="muted">also: {j.alsoListedOn.join(", ")}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
