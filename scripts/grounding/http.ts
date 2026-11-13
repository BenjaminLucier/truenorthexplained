/**
 * Polite HTTP for Wikimedia and Statistics Canada.
 *
 * - One shared User-Agent with no personal details.
 * - At most MAX_CONCURRENCY requests in flight at once, across all callers.
 * - Retries with exponential backoff on network errors, 429, 5xx, and
 *   MediaWiki `maxlag` errors, honouring Retry-After when the server sends it.
 */

export const USER_AGENT = "tne-data-scripts/1.0 (educational static site build script)";
export const MAX_CONCURRENCY = 4;
const MAX_ATTEMPTS = 6;

let active = 0;
const waiting: (() => void)[] = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function release(): void {
  const next = waiting.shift();
  if (next) next();
  else active--;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Fetch with the shared limiter and retries. Returns the Response once it's OK. */
export async function politeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const base = 1000 * 2 ** (attempt - 1);
      await sleep(base + Math.floor(Math.random() * 500));
    }
    await acquire();
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT, ...init.headers },
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      lastError = e;
      release();
      continue;
    }
    release();

    if (res.ok) {
      // MediaWiki reports maxlag as HTTP 200 with an error body plus a Retry-After header.
      if (res.headers.get("mediawiki-api-error") === "maxlag") {
        const wait = Number(res.headers.get("retry-after") ?? "5");
        lastError = new Error("maxlag");
        await sleep(wait * 1000);
        continue;
      }
      return res;
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) await sleep(Math.min(retryAfter, 60) * 1000);
      lastError = new HttpError(`${res.status} ${res.statusText} for ${url}`, res.status);
      continue;
    }
    throw new HttpError(`${res.status} ${res.statusText} for ${url}`, res.status);
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed after ${MAX_ATTEMPTS} attempts: ${url}`);
}

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await politeFetch(url, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  return (await res.json()) as T;
}

/** Calls the MediaWiki Action API with format=json, formatversion=2 and maxlag=5. */
export async function mediawiki<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params });
  const data = await getJson<T & { error?: { code: string; info: string } }>(`${endpoint}?${qs}`);
  if (data.error) {
    if (data.error.code === "maxlag") {
      await sleep(5000);
      return mediawiki<T>(endpoint, params);
    }
    throw new Error(`MediaWiki error ${data.error.code}: ${data.error.info}`);
  }
  return data;
}

/** Runs async work over items with the shared concurrency limit, keeping input order. */
export async function mapLimit<T, R>(items: readonly T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}
