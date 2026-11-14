/**
 * The facts registry: values that change (seat counts, who holds an office,
 * the latest population), each defined once. See ARCHITECTURE.md, "Facts
 * registry".
 *
 * Most facts are derived from the committed datasets in src/data, so a re-run
 * of a `pnpm data:*` script updates every page that uses them. The few that
 * can't be derived live in content/facts.yaml.
 *
 * In markdown, `{{commons.seats}}` (formatted: numbers get en-CA grouping) or
 * `{{commons.seats|raw}}` (the bare value). The `facts` hast plugin
 * (src/plugins/facts.ts) replaces them; resolveFacts() does the same for
 * front-matter strings. An unknown key throws.
 *
 * Plain Node (node:fs and yaml only), like src/lib/entities.ts. Memoised;
 * resetFacts() re-reads.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { fromRoot } from "./project-root";

export interface Fact {
  /** Strings are printed as they are; numbers get en-CA grouping (use a string for years). */
  value: string | number;
  /** When the value was true: an ISO date or a year. */
  asOf?: string;
  /** Where it comes from: a dataset path, or a citation for facts.yaml entries. */
  source: string;
}

export const FACTS_FILE = "content/facts.yaml";

/** `{{key}}` or `{{key|raw}}`. Group 1 is the key, group 2 is "raw" when present. */
export const FACT_RE = /\{\{\s*([a-z0-9][a-z0-9.-]*)\s*(?:\|\s*(raw)\s*)?\}\}/g;
/** Anything that looks like a placeholder, valid or not (for reporting typos such as `{{ Commons.Seats }}`). */
export const FACT_LIKE_RE = /\{\{([^{}\n]*)\}\}/g;
const KEY_RE = /^[a-z0-9][a-z0-9.-]*$/;

/** Province and territory codes used by the parliament datasets, to the site's slugs. */
const PROVINCE_CODES: Record<string, string> = {
  NL: "newfoundland-and-labrador",
  PE: "prince-edward-island",
  NS: "nova-scotia",
  NB: "new-brunswick",
  QC: "quebec",
  ON: "ontario",
  MB: "manitoba",
  SK: "saskatchewan",
  AB: "alberta",
  BC: "british-columbia",
  YT: "yukon",
  NT: "northwest-territories",
  NU: "nunavut",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2022-09-08" → "September 8, 2022". */
const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
/** 1 → "1st", 22 → "22nd", 24 → "24th". */
export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}
/** 41798407 → "41.8 million" (same rule as formatPeople in src/lib/reference.ts). */
function millions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")} million`;
  return (Math.round(n / 1000) * 1000).toLocaleString("en-CA");
}

type Json = Record<string, any>;
const readJson = (rel: string): Json => JSON.parse(readFileSync(fromRoot(rel), "utf8")) as Json;

interface Holder {
  ordinal: number;
  name: string;
  terms: { start: string; end: string | null }[];
}
/** The holder whose term is still open; throws if there isn't exactly one. */
function current<T extends Holder>(list: T[], what: string): { holder: T; since: string } {
  const open = list.filter((h) => h.terms.some((t) => t.end === null));
  if (open.length !== 1) throw new Error(`Facts: expected one current ${what}, found ${open.length}`);
  const holder = open[0]!;
  return { holder, since: holder.terms.find((t) => t.end === null)!.start };
}

/** Every derived fact. Each block names the dataset it reads. */
function deriveFacts(): Map<string, Fact> {
  const facts = new Map<string, Fact>();
  const set = (key: string, value: string | number, source: string, asOf?: string) => facts.set(key, { value, source, asOf });

  // House of Commons
  {
    const file = "src/data/parliament/commons.json";
    const d = readJson(file);
    const seats = d.seats as number;
    const majority = d.majority as number;
    if (majority !== Math.floor(seats / 2) + 1) throw new Error(`Facts: ${file} has majority ${majority}, but floor(${seats}/2)+1 is ${Math.floor(seats / 2) + 1}`);
    set("commons.seats", seats, file, d._meta.fetched);
    set("commons.majority", majority, file, d._meta.fetched);
  }
  {
    const file = "src/data/parliament/seat-allocation.json";
    const d = readJson(file);
    for (const p of d.provinces as { province: string; total: number }[]) {
      set(`commons.seats.${PROVINCE_CODES[p.province] ?? p.province.toLowerCase()}`, p.total, file, d._meta.fetched);
    }
  }
  {
    const file = "src/data/elections/2025/ridings.json";
    const d = readJson(file);
    set("ridings.count", (d.ridings as unknown[]).length, file, d._meta.fetched);
  }

  // Senate
  {
    const file = "src/data/parliament/senate.json";
    const d = readJson(file);
    set("senate.seats", d.seats as number, file, d._meta.fetched);
    for (const p of d.byProvince as { province: string; seats: number }[]) {
      set(`senate.seats.${PROVINCE_CODES[p.province] ?? p.province.toLowerCase()}`, p.seats, file, d._meta.fetched);
    }
  }

  // Officeholders
  {
    const file = "src/data/wikidata/prime-ministers.json";
    const d = readJson(file);
    const pms = d.primeMinisters as (Holder & { terms: { start: string; end: string | null; parties: string[] }[] })[];
    const { holder, since } = current(pms, "prime minister");
    const term = (holder.terms as { end: string | null; parties: string[] }[]).find((t) => t.end === null)!;
    set("pm.name", holder.name, file, d._meta.fetched);
    set("pm.ordinal", ordinal(holder.ordinal), file, d._meta.fetched);
    set("pm.since", longDate(since), file, d._meta.fetched);
    set("pm.party", term.parties[0] ?? "", file, d._meta.fetched);
    set("pm.count", new Set(pms.map((p) => p.ordinal)).size, file, d._meta.fetched);
  }
  for (const [key, file, field, what] of [
    ["gg", "src/data/wikidata/governors-general.json", "governorsGeneral", "governor general"],
    ["monarch", "src/data/wikidata/monarchs.json", "monarchs", "monarch"],
    ["chief-justice", "src/data/wikidata/chief-justices.json", "chiefJustices", "chief justice"],
  ] as const) {
    const d = readJson(file);
    const { holder, since } = current(d[field] as Holder[], what);
    set(`${key}.name`, holder.name, file, d._meta.fetched);
    set(`${key}.since`, longDate(since), file, d._meta.fetched);
    set(`${key}.since-year`, since.slice(0, 4), file, d._meta.fetched);
  }
  {
    const file = "src/data/wikidata/premiers.json";
    const d = readJson(file);
    for (const prov of d.provinces as { slug: string; terms: { name: string; party: string; start: string; end: string | null }[] }[]) {
      const open = prov.terms.filter((t) => t.end === null);
      if (open.length !== 1) throw new Error(`Facts: expected one current premier of ${prov.slug} in ${file}, found ${open.length}`);
      const t = open[0]!;
      set(`premier.${prov.slug}.name`, t.name, file, d._meta.fetched);
      set(`premier.${prov.slug}.party`, t.party, file, d._meta.fetched);
      set(`premier.${prov.slug}.since`, longDate(t.start), file, d._meta.fetched);
    }
  }

  // Population (latest quarterly estimate)
  {
    const file = "src/data/population/provinces.json";
    const d = readJson(file);
    set("population.canada", d.canada as number, file, d.refDate);
    set("population.canada.rounded", millions(d.canada as number), file, d.refDate);
    set("population.as-of", longDate(d.refDate as string), file, d.refDate);
    for (const p of d.provinces as { province: string; population: number }[]) {
      const slug = PROVINCE_CODES[p.province] ?? p.province.toLowerCase();
      set(`population.${slug}`, p.population, file, d.refDate);
      set(`population.${slug}.rounded`, millions(p.population), file, d.refDate);
    }
  }

  // Indigenous identity population (latest census)
  {
    const file = "src/data/demographics/indigenous.json";
    const d = readJson(file);
    const canada = (d.places as { slug: string; censuses: Json[] }[]).find((p) => p.slug === "canada");
    if (!canada) throw new Error(`Facts: ${file} has no "canada" place`);
    const c = [...canada.censuses].sort((a, b) => b.year - a.year)[0]!;
    set("indigenous.census-year", String(c.year), file, d._meta.fetched);
    set("indigenous.share", `${((100 * c.indigenous) / c.total).toFixed(1)}%`, file, d._meta.fetched);
    set("indigenous.rounded", c.indigenous >= 1_000_000 ? `${(c.indigenous / 1_000_000).toFixed(1)} million` : millions(c.indigenous), file, d._meta.fetched);
    for (const [key, field] of [["first-nations", "firstNations"], ["metis", "metis"], ["inuit", "inuit"]] as const) {
      set(`indigenous.${key}.rounded`, millions(c[field] as number), file, d._meta.fetched);
    }
  }

  // Federal general elections
  {
    const file = "src/data/elections/history.json";
    const d = readJson(file);
    const elections = d.elections as { year: number }[];
    set("elections.count", elections.length, file, d._meta.fetched);
    set("elections.latest.year", String(elections.at(-1)!.year), file, d._meta.fetched);
  }

  return facts;
}

/** content/facts.yaml: `key: { value, asOf, source }`, for values that can't be derived. */
function fileFacts(): Map<string, Fact> {
  const facts = new Map<string, Fact>();
  const path = fromRoot(FACTS_FILE);
  if (!existsSync(path)) return facts;
  const raw = parse(readFileSync(path, "utf8")) as unknown;
  if (raw === null || raw === undefined) return facts;
  const problems: string[] = [];
  if (typeof raw !== "object" || Array.isArray(raw)) throw new Error(`${FACTS_FILE}: must be a mapping of key: { value, asOf, source }`);
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!KEY_RE.test(key)) problems.push(`${key}: keys are lowercase words joined by "." or "-"`);
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      problems.push(`${key}: must be { value, asOf, source }`);
      continue;
    }
    const f = v as Record<string, unknown>;
    for (const k of Object.keys(f)) if (!["value", "asOf", "source"].includes(k)) problems.push(`${key}: unknown field "${k}" (allowed: value, asOf, source)`);
    if (typeof f.value !== "string" && typeof f.value !== "number") problems.push(`${key}: "value" must be a string or a number`);
    if (typeof f.source !== "string" || !f.source.trim()) problems.push(`${key}: "source" is required`);
    const asOf = f.asOf instanceof Date ? f.asOf.toISOString().slice(0, 10) : f.asOf;
    if (asOf === undefined || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(String(asOf))) problems.push(`${key}: "asOf" is required (a year or an ISO date)`);
    facts.set(key, { value: f.value as string | number, asOf: asOf === undefined ? undefined : String(asOf), source: String(f.source) });
  }
  if (problems.length) throw new Error(`${FACTS_FILE} has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  return facts;
}

let cache: Map<string, Fact> | undefined;

export function resetFacts(): void {
  cache = undefined;
}

/** Every fact, derived ones first. A key defined both ways is an error. */
export function allFacts(): Map<string, Fact> {
  if (cache) return cache;
  const derived = deriveFacts();
  const file = fileFacts();
  for (const key of file.keys()) {
    if (derived.has(key)) throw new Error(`${FACTS_FILE}: "${key}" is already derived from ${derived.get(key)!.source}; remove it from the file`);
  }
  cache = new Map([...derived, ...file]);
  return cache;
}

export const hasFact = (key: string): boolean => allFacts().has(key);

/** The fact for a key. Throws, with the closest keys, if there is none. */
export function getFact(key: string): Fact {
  const fact = allFacts().get(key);
  if (fact) return fact;
  const prefix = key.split(".")[0] ?? "";
  const near = [...allFacts().keys()].filter((k) => k.startsWith(`${prefix}.`) || k === prefix).slice(0, 8);
  throw new Error(`Unknown fact "${key}"${near.length ? ` (known ${prefix}.* facts: ${near.join(", ")})` : ` (see ${FACTS_FILE} and src/lib/facts.ts)`}`);
}

/** The text a placeholder becomes: numbers get en-CA grouping unless `raw`. */
export function formatFact(fact: Fact, raw = false): string {
  if (typeof fact.value === "number" && !raw) return fact.value.toLocaleString("en-CA");
  return String(fact.value);
}

/** Replaces every `{{key}}` / `{{key|raw}}` in a string. Throws on an unknown key. */
export function resolveFacts(text: string): string;
export function resolveFacts(text: string | undefined): string | undefined;
export function resolveFacts(text: string | undefined): string | undefined {
  if (text === undefined || !text.includes("{{")) return text;
  return text.replace(FACT_RE, (_, key: string, raw?: string) => formatFact(getFact(key), raw === "raw"));
}

/** The keys used in a string, including malformed placeholders (returned as written, trimmed). */
export function factKeysIn(text: string): string[] {
  return [...text.matchAll(FACT_LIKE_RE)].map((m) => m[1]!.replace(/\|\s*raw\s*$/, "").trim());
}

/** A short hash of every key and its rendered value; see entityDigest() in src/lib/entities.ts. */
export function factsDigest(): string {
  const h = createHash("sha1");
  for (const [key, fact] of allFacts()) h.update(`${key}\t${formatFact(fact)}\n`);
  return h.digest("hex").slice(0, 12);
}
