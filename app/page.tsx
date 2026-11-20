import { loadJobs, loadRequirements, loadSources, tally } from "@/lib/data";
import { CATEGORY_LABEL, type Job } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = { [k: string]: string | string[] | undefined };

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

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const jobs = loadJobs();
  const sources = loadSources();
  const req = loadRequirements();
  const byId = new Map(jobs.map((j) => [j.id, j]));

  // Filters for the job list (plain GET form).
  const q = get("q").toLowerCase();
  const f = { remote: get("remote"), estonia: get("estonia"), category: get("category"), source: get("source"), seniority: get("seniority") };
  const filtered = jobs.filter(
    (j: Job) =>
      (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) &&
      (!f.remote || j.remote === f.remote) &&
      (!f.estonia || String(j.openToEstonia) === f.estonia) &&
      (!f.category || j.category === f.category) &&
      (!f.source || j.source === f.source || j.alsoListedOn.includes(f.source)) &&
      (!f.seniority || j.seniority === f.seniority),
  );
  const uniq = (xs: string[]) => [...new Set(xs)].sort();
  const estonia = jobs.filter((j) => j.openToEstonia);
  const estoniaByCompany = [...Map.groupBy(estonia, (j) => j.company).entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const results = req?.results ?? [];
  const n = results.length;
  const years = results.map((r) => r.yearsMin).filter((y): y is number => typeof y === "number");

  return (
    <main>
      <h1>Ping: data test</h1>
      <p className="muted">
        Product, UX, UI and game design postings. Scope: remote anywhere, plus on-site and hybrid roles in Europe.
        {sources && <> Fetched {sources.fetchedAt.replace("T", " ").slice(0, 16)} UTC.</>}
      </p>

      {/* ---------------- Sources ---------------- */}
      <h2>Sources</h2>
      {sources ? (
        <>
          <p>
            {sources.totalInScope} postings in scope, {sources.duplicatesRemoved} duplicates removed, <b>{sources.unique} unique</b>.{" "}
            {estonia.length} are open to someone based in Estonia.
          </p>
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Fetched (all roles)</th>
                  <th>Design matches</th>
                  <th>In scope</th>
                  <th>Unique after dedupe</th>
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
                    <td>{s.designMatches}</td>
                    <td>{s.inScope}</td>
                    <td>{jobs.filter((j) => j.source === s.source).length}</td>
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
                          <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a> <span className="muted" title={j.location}>· {shortLoc(j.location)} · {j.remote}</span>
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

      {/* ---------------- Requirements summary ---------------- */}
      <h2>What the market asks for (extraction test, {n} postings)</h2>
      {req ? (
        <>
          <p className="muted">
            Model: {req.model}. Method: {req.method}. Extracted {req.extractedAt.slice(0, 16).replace("T", " ")}.
            {years.length > 0 && (
              <>
                {" "}Postings stating years of experience: {years.length}/{n}, median minimum {years.sort((a, b) => a - b)[Math.floor(years.length / 2)]} years.
              </>
            )}
          </p>
          <div className="grid">
            <Bars title="Skills" items={tally(results.map((r) => r.skills))} total={n} limit={20} />
            <Bars title="Tools" items={tally(results.map((r) => r.tools))} total={n} />
            <Bars title="Experience level" items={tally(results.map((r) => [r.experienceLevel]))} total={n} />
            <Bars title="Other requirements" items={tally(results.map((r) => r.other))} total={n} limit={20} />
            <Bars title="Languages" items={tally(results.map((r) => r.languages))} total={n} />
            <Bars title="Education" items={tally(results.map((r) => (r.education ? [r.education] : [])))} total={n} />
          </div>

          <h3>Per posting</h3>
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Posting</th>
                  <th>Level / years</th>
                  <th>Skills</th>
                  <th>Tools</th>
                  <th>Other</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const j = byId.get(r.id);
                  return (
                    <tr key={r.id}>
                      <td>
                        {j ? <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a> : r.id}
                        <div className="muted">{j?.company} · {j?.source}</div>
                      </td>
                      <td>
                        {r.experienceLevel}
                        <div className="muted">{r.yearsMin != null ? `${r.yearsMin}${r.yearsMax ? `-${r.yearsMax}` : "+"} yrs` : ""}</div>
                      </td>
                      <td>{r.skills.map((s) => <span className="tag" key={s}>{s}</span>)}</td>
                      <td>{r.tools.map((s) => <span className="tag" key={s}>{s}</span>)}</td>
                      <td>{[...r.other, ...r.languages, ...(r.education ? [r.education] : [])].map((s) => <span className="tag" key={s}>{s}</span>)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>No extraction yet. Run <code>npm run sample</code> then <code>npm run extract</code>.</p>
      )}

      {/* ---------------- Job list ---------------- */}
      <h2>Jobs ({filtered.length} of {jobs.length})</h2>
      <form method="get">
        <input name="q" placeholder="Search title, company, location" defaultValue={get("q")} />
        <select name="estonia" defaultValue={f.estonia}>
          <option value="">Open to Estonia: any</option>
          <option value="true">Open to Estonia: yes</option>
          <option value="false">Open to Estonia: no</option>
        </select>
        <select name="remote" defaultValue={f.remote}>
          <option value="">Remote status: any</option>
          {uniq(jobs.map((j) => j.remote)).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select name="category" defaultValue={f.category}>
          <option value="">Category: any</option>
          {uniq(jobs.map((j) => j.category)).map((v) => <option key={v} value={v}>{CATEGORY_LABEL[v as Job["category"]] ?? v}</option>)}
        </select>
        <select name="seniority" defaultValue={f.seniority}>
          <option value="">Seniority: any</option>
          {uniq(jobs.map((j) => j.seniority)).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select name="source" defaultValue={f.source}>
          <option value="">Source: any</option>
          {uniq(jobs.flatMap((j) => [j.source, ...j.alsoListedOn])).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button type="submit">Filter</button> <a href="/">Reset</a>
      </form>
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
            {filtered.map((j) => (
              <tr key={j.id}>
                <td>
                  <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a>
                  <span className="muted"> ({CATEGORY_LABEL[j.category] ?? j.category})</span>
                  <details>
                    <summary className="muted">Description</summary>
                    <pre>{j.description}</pre>
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
