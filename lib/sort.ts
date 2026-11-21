/**
 * The Jobs sort orders, shared by the server (lib/view.ts, the email digest) and the controls.
 * Client-safe: no data loading here.
 */

/** "best": Best fit first (see fitRank); "newest": by date only. */
export type Sort = "best" | "newest";
export const SORTS: readonly Sort[] = ["best", "newest"];
export const SORT_LABEL: Record<Sort, string> = { best: "Best fit first", newest: "Newest" };

/** The sort in a URL: "newest", or Best fit first (also for the old ?sort=reach and anything unknown). */
export function resolveSort(raw: string): Sort {
  return raw === "newest" ? "newest" : "best";
}

/**
 * Best fit first, the default order for EKA students (the Jobs list and the email digest):
 * 0 within reach and open to Estonia, 1 within reach, 2 open to Estonia, 3 everything else.
 * Newest first inside each group (compareFit).
 */
export function fitRank(c: { withinReach: boolean; openToEstonia: boolean }): number {
  return c.withinReach ? (c.openToEstonia ? 0 : 1) : c.openToEstonia ? 2 : 3;
}

type Dated = { postedAt: string | null };
export const byNewest = (a: Dated, b: Dated) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "");

type Fit = Dated & { withinReach: boolean; openToEstonia: boolean };
export const compareFit = (a: Fit, b: Fit) => fitRank(a) - fitRank(b) || byNewest(a, b);
