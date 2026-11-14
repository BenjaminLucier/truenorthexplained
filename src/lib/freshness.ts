/**
 * Freshness: what on the site may have gone out of date, and what's coming up.
 *
 * Five checks, all warnings (staleness never fails a build):
 *
 * - **Datasets.** Every generated file under src/data records when it was
 *   fetched (`_meta.fetched`, or `fetched` in a `*.meta.json`). Each belongs to
 *   a refresh script with a maximum age that suits how fast it changes:
 *   office-holders a month, budgets and rates a quarter, census data a year.
 * - **Facts.** Entries in content/facts.yaml carry `asOf`; ones older than
 *   FACT_MAX_DAYS need re-checking against their source.
 * - **Timeline.** The newest event in content/entities/events.yaml, so a
 *   timeline that stopped a year ago shows up.
 * - **Watchlist.** content/watchlist.yaml lists known upcoming changes (a
 *   premier being sworn in, a court decision, a bill), each with a date to
 *   check by and what to do then.
 * - **Dated phrases.** "As of 2025"-style phrases in content written by hand,
 *   which go stale silently. Prefer a `{{fact}}` placeholder.
 *
 * `pnpm freshness` prints the full report; `pnpm validate` prints a summary
 * line; `pnpm refresh` prints it after re-running the data scripts.
 *
 * Plain Node, like src/lib/facts.ts. The pure functions take their inputs so
 * they can be tested; `freshnessReport()` reads the project.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";
import { fromRoot, projectRoot } from "./project-root";

/** A refresh script and how old its output may get before it's flagged. */
export interface DatasetRule {
  /** Paths under the project root this rule covers (prefix match). */
  paths: string[];
  /** The command that refreshes them. */
  script: string;
  maxDays: number;
  why: string;
}

/** First match wins, so put specific paths before their folders. */
export const DATASET_RULES: DatasetRule[] = [
  { paths: ["src/data/wikidata/premiers.json"], script: "pnpm data:premiers", maxDays: 30, why: "premiers change after provincial elections and leadership races" },
  { paths: ["src/data/elections/history.json"], script: "pnpm data:election-history", maxDays: 365, why: "changes only after a federal general election" },
  { paths: ["src/data/population/census-2021.json"], script: "pnpm data:population", maxDays: 365, why: "census figures" },
  { paths: ["src/data/portraits.json"], script: "pnpm data:portraits", maxDays: 90, why: "new office-holders need portraits" },
  { paths: ["src/data/wikidata/", "src/data/flags.json", "src/data/statcan/"], script: "pnpm grounding", maxDays: 30, why: "prime ministers, governors general, the monarch and population estimates" },
  { paths: ["src/data/elections/", "src/data/parliament/", "src/data/population/"], script: "pnpm data:elections", maxDays: 30, why: "current MPs, by-elections, Senate groups" },
  { paths: ["src/data/money/"], script: "pnpm data:money", maxDays: 90, why: "interest rates and prices change monthly; budgets yearly" },
  { paths: ["src/data/demographics/"], script: "pnpm data:demographics", maxDays: 365, why: "census and annual estimates" },
  { paths: ["src/data/geo/treaties"], script: "pnpm data:treaties", maxDays: 365, why: "treaty boundaries change rarely" },
  { paths: ["src/data/geo/"], script: "pnpm data:geo", maxDays: 365, why: "boundaries change rarely" },
];

/** content/facts.yaml entries older than this are flagged. */
export const FACT_MAX_DAYS = 180;
/** Flag the timeline when its newest event is older than this. */
export const TIMELINE_MAX_DAYS = 180;
/** Watchlist items show as "coming up" this many days before their date. */
export const WATCH_LEAD_DAYS = 14;

const DAY = 24 * 60 * 60 * 1000;

/** Today, or TNE_TODAY (YYYY-MM-DD) when set, for tests and reproducible reports. */
export function today(): Date {
  const forced = process.env.TNE_TODAY;
  if (forced) return parseDate(forced);
  const now = new Date(); // the local calendar date, not UTC's
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * "2026", "2026-06" or "2026-06-08" to a UTC date. A bare year or month is
 * read as its last day, so "2025" isn't flagged as stale in early 2025.
 */
export function parseDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  const s = String(value).trim();
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(s);
  if (!m) throw new Error(`Not a date: "${s}"`);
  const year = Number(m[1]);
  if (m[3]) return new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[3])));
  if (m[2]) return new Date(Date.UTC(year, Number(m[2]), 0));
  return new Date(Date.UTC(year, 11, 31));
}

export const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY);

export const ruleFor = (path: string, rules = DATASET_RULES) => rules.find((r) => r.paths.some((p) => path.startsWith(p)));

export interface DatasetAge {
  path: string;
  fetched: string;
  days: number;
  rule?: DatasetRule;
  stale: boolean;
}

export function datasetAge(path: string, fetched: string, now: Date, rules = DATASET_RULES): DatasetAge {
  const rule = ruleFor(path, rules);
  const days = daysBetween(parseDate(fetched), now);
  return { path, fetched, days, rule, stale: rule ? days > rule.maxDays : false };
}

export interface WatchItem {
  id: string;
  what: string;
  /** The date to look again: when the change is expected, or a reminder. */
  checkBy: string;
  /** What to do then. */
  then: string;
  source?: string;
}

export type WatchStatus = "overdue" | "due" | "upcoming" | "later";

export function watchStatus(item: Pick<WatchItem, "checkBy">, now: Date, lead = WATCH_LEAD_DAYS): WatchStatus {
  const days = daysBetween(now, parseDate(item.checkBy));
  if (days < 0) return "overdue";
  if (days === 0) return "due";
  if (days <= lead) return "upcoming";
  return "later";
}

/** Problems with the watchlist file's shape, as messages. */
export function checkWatchlist(raw: unknown): { items: WatchItem[]; errors: string[] } {
  const errors: string[] = [];
  const items: WatchItem[] = [];
  const list = (raw as { items?: unknown } | null)?.items ?? [];
  if (!Array.isArray(list)) return { items, errors: ["watchlist: `items` must be a list"] };
  const ids = new Set<string>();
  for (const [i, entry] of list.entries()) {
    const e = entry as Partial<WatchItem>;
    const where = `watchlist item ${e?.id ?? i + 1}`;
    for (const key of ["id", "what", "checkBy", "then"] as const) {
      if (!e?.[key] || typeof e[key] !== "string") errors.push(`${where}: \`${key}\` is required`);
    }
    if (typeof e?.checkBy === "string") {
      try {
        parseDate(e.checkBy);
      } catch {
        errors.push(`${where}: checkBy "${e.checkBy}" isn't a date`);
      }
    }
    if (e?.id) {
      if (ids.has(e.id)) errors.push(`${where}: duplicate id`);
      ids.add(e.id);
    }
    if (errors.length === 0) items.push(e as WatchItem);
  }
  return { items, errors };
}

/** "As of 2025", "as of June 2026", "as of November 13, 2026" … */
export const DATED_PHRASE_RE =
  /\bas of (?:(?:January|February|March|April|May|June|July|August|September|October|November|December)(?: \d{1,2},)? )?((?:19|20)\d{2})\b/gi;

export interface DatedPhrase {
  file: string;
  line: number;
  text: string;
  year: number;
}

/** Dated phrases in a file's text, skipping `{{fact}}` placeholders and HTML comments. */
export function findDatedPhrases(file: string, text: string): DatedPhrase[] {
  const visible = text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, " "));
  const found: DatedPhrase[] = [];
  for (const m of visible.matchAll(DATED_PHRASE_RE)) {
    const line = visible.slice(0, m.index).split("\n").length;
    found.push({ file, line, text: m[0], year: Number(m[1]) });
  }
  return found;
}

// ---------------------------------------------------------------------------
// Reading the project

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function readFetched(file: string): string | undefined {
  try {
    const json = JSON.parse(readFileSync(file, "utf8")) as { _meta?: { fetched?: string }; fetched?: string };
    return json._meta?.fetched ?? json.fetched;
  } catch {
    return undefined;
  }
}

export interface FreshnessReport {
  today: string;
  datasets: DatasetAge[];
  facts: { key: string; asOf: string; days: number }[];
  timeline: { newest?: string; newestTitle?: string; days?: number; stale: boolean };
  watch: { item: WatchItem; status: WatchStatus }[];
  phrases: DatedPhrase[];
  errors: string[];
}

export function freshnessReport(now = today()): FreshnessReport {
  const root = projectRoot();
  const rel = (p: string) => relative(root, p);
  const errors: string[] = [];

  const datasets = walk(fromRoot("src/data"))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const fetched = readFetched(f);
      return fetched ? [datasetAge(rel(f), fetched, now)] : [];
    })
    .sort((a, b) => b.days - a.days || a.path.localeCompare(b.path));

  const factsFile = fromRoot("content/facts.yaml");
  const factEntries = existsSync(factsFile) ? ((parse(readFileSync(factsFile, "utf8")) ?? {}) as Record<string, { asOf?: string | number }>) : {};
  const facts = Object.entries(factEntries)
    .filter(([, f]) => f?.asOf !== undefined)
    .map(([key, f]) => ({ key, asOf: String(f.asOf), days: daysBetween(parseDate(String(f.asOf)), now) }))
    .filter((f) => f.days > FACT_MAX_DAYS)
    .sort((a, b) => b.days - a.days);

  const eventsFile = fromRoot("content/entities/events.yaml");
  const events = existsSync(eventsFile)
    ? (((parse(readFileSync(eventsFile, "utf8")) ?? {}) as { events?: { date: string | number; title: string }[] }).events ?? [])
    : [];
  const newest = events
    .map((e) => ({ e, d: parseDate(String(e.date)) }))
    .sort((a, b) => b.d.getTime() - a.d.getTime())[0];
  const timelineDays = newest ? daysBetween(newest.d, now) : undefined;
  const timeline = {
    newest: newest ? String(newest.e.date) : undefined,
    newestTitle: newest?.e.title,
    days: timelineDays,
    stale: timelineDays === undefined || timelineDays > TIMELINE_MAX_DAYS,
  };

  const watchFile = fromRoot("content/watchlist.yaml");
  const checked = checkWatchlist(existsSync(watchFile) ? parse(readFileSync(watchFile, "utf8")) : { items: [] });
  errors.push(...checked.errors);
  const watch = checked.items
    .map((item) => ({ item, status: watchStatus(item, now) }))
    .sort((a, b) => parseDate(a.item.checkBy).getTime() - parseDate(b.item.checkBy).getTime());

  const thisYear = now.getUTCFullYear();
  const phrases = walk(fromRoot("content"))
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) => findDatedPhrases(rel(f), readFileSync(f, "utf8")))
    .filter((p) => p.year < thisYear);

  return { today: now.toISOString().slice(0, 10), datasets, facts, timeline, watch, phrases, errors };
}

/** One line for `pnpm validate`. */
export function freshnessSummary(r: FreshnessReport): string {
  const stale = r.datasets.filter((d) => d.stale).length;
  const due = r.watch.filter((w) => w.status !== "later").length;
  const timeline = r.timeline.newest ? `timeline newest ${r.timeline.newest}${r.timeline.stale ? " (stale)" : ""}` : "timeline empty";
  return `Freshness: ${stale} stale datasets, ${r.facts.length} stale facts, ${due} watchlist items due or coming up, ${timeline}, ${r.phrases.length} dated phrases from past years (pnpm freshness for details)`;
}
