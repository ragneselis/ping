export const USER_AGENT = "PingJobTest/0.1 (job board prototype for design students at EKA)";

export async function getText(url: string, timeoutMs = 30000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json, application/rss+xml, text/xml, */*" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function getJson<T = any>(url: string, timeoutMs = 30000): Promise<T> {
  return JSON.parse(await getText(url, timeoutMs)) as T;
}

/** Run async tasks with a small concurrency limit, to be polite to public APIs. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
