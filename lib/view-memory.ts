/**
 * The visitor's own Jobs view (filters and sort), remembered in their browser's localStorage
 * ("ping-jobs-view"): no cookie, nothing sent anywhere. Restored on the next visit to Jobs.
 *
 * - Saved whenever the visitor changes the view themselves (useQueryState, FilterLink), never when a
 *   page is merely opened, so a shared link does not overwrite what they chose.
 * - A URL that already carries any view parameter (a shared or filtered link, an email digest) wins:
 *   nothing is restored.
 * - Reset (the Jobs filters) and "Design jobs live" go back to the default view and clear the memory.
 * - Search and the company filter (a Discover link) are not remembered: they are one-offs.
 * - Restoring is not a filter choice, so it is never counted in the usage stats.
 *
 * A full page load restores before paint with VIEW_RESTORE_SCRIPT (inline, app/page.tsx); a client
 * navigation to Jobs restores with RestoreView (components/view-memory.tsx). Both use the rules here.
 */

export const VIEW_KEY = "ping-jobs-view";

/** Set (sessionStorage) for the load a restore causes, so the page does not scroll as for a shared link. */
const RESTORED_FLAG = "ping-view-restored";

/** True once after a restore swapped the URL; clears itself. */
export function consumeRestored(): boolean {
  try {
    const was = window.sessionStorage.getItem(RESTORED_FLAG) === "1";
    window.sessionStorage.removeItem(RESTORED_FLAG);
    return was;
  } catch {
    return false;
  }
}

/** Parameters that are remembered, in a stable order. */
export const REMEMBERED = ["category", "level", "estonia", "remote", "sort"] as const;

/** Parameters that make a URL a chosen view: if any is present, the URL wins over the memory. */
export const VIEW_PARAMS = [...REMEMBERED, "reach", "q", "company"] as const;

/** The remembered part of a query string, normalised ("" for the default view). */
export function rememberedQuery(qs: string): string {
  const from = new URLSearchParams(qs);
  const out = new URLSearchParams();
  for (const k of REMEMBERED) {
    const v = from.get(k);
    if (v) out.set(k, v);
  }
  // The old ?reach=1 is the level "reach".
  if (from.get("reach") === "1" && !out.get("level")?.split(",").includes("reach")) {
    out.set("level", [...(out.get("level")?.split(",").filter(Boolean) ?? []), "reach"].join(","));
  }
  // Best fit first is the default: no need to keep it.
  if (out.get("sort") !== "newest") out.delete("sort");
  return out.toString();
}

/** Remember the view a Jobs query string shows (the visitor chose it). Empty clears the memory. */
export function rememberView(qs: string) {
  try {
    const q = rememberedQuery(qs);
    if (q) window.localStorage.setItem(VIEW_KEY, q);
    else window.localStorage.removeItem(VIEW_KEY);
  } catch {
    // Private mode or blocked storage: nothing is remembered.
  }
}

export function forgetView() {
  rememberView("");
}

/** The remembered query string to restore for this URL's query, or null (the URL wins, or nothing is stored). */
export function viewToRestore(search: string): string | null {
  const params = new URLSearchParams(search);
  if (VIEW_PARAMS.some((k) => params.has(k))) return null;
  try {
    const stored = window.localStorage.getItem(VIEW_KEY);
    return stored ? rememberedQuery(stored) || null : null;
  } catch {
    return null;
  }
}

/**
 * Inline, before the Jobs page paints on a full load: the same rule as viewToRestore, kept tiny.
 * It swaps the URL to the remembered view with location.replace (no extra history entry).
 */
export const VIEW_RESTORE_SCRIPT = `(function(){try{var p=new URLSearchParams(location.search);var v=${JSON.stringify(VIEW_PARAMS)};for(var i=0;i<v.length;i++)if(p.has(v[i]))return;var s=localStorage.getItem(${JSON.stringify(VIEW_KEY)});if(!s)return;var k=${JSON.stringify(REMEMBERED)},o=new URLSearchParams(s),q=new URLSearchParams();for(var j=0;j<k.length;j++){var x=o.get(k[j]);if(x&&!(k[j]==="sort"&&x!=="newest"))q.set(k[j],x)}q=q.toString();if(!q)return;try{sessionStorage.setItem(${JSON.stringify(RESTORED_FLAG)},"1")}catch(e){}location.replace(location.pathname+"?"+q+location.hash)}catch(e){}})()`;
