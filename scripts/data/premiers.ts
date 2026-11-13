/**
 * `pnpm data:premiers`: every premier of every province and territory, with
 * dates and party, for the "who has governed" ribbon chart.
 *
 *   src/data/wikidata/premiers.json
 *
 * Sources, in order of preference:
 * 1. Wikidata (CC0): everyone with a "position held" (P39) statement for each
 *    "Premier of …" item, with start (P580) and end (P582) dates, and their
 *    party memberships (P102).
 * 2. English Wikipedia (CC BY-SA 4.0): the infobox of each premier's article
 *    (office, term_start, term_end, party), used where Wikidata has no date or
 *    only a year, for terms Wikidata is missing (a premier's second term), and
 *    as a cross-check.
 * 3. src/data/wikidata/provinces.json (pnpm grounding): the current premier,
 *    checked against the office's Wikipedia page, for changes Wikidata hasn't
 *    caught up with yet.
 *
 * Party families are defined and explained in src/lib/party-families.ts. The
 * party for each term is the premier's provincial party, chosen from the
 * PARTIES table below; a party missing from it fails the run, so every party
 * is classified on purpose.
 *
 * Checks (the script fails if any is wrong): every province and territory has
 * terms; terms don't overlap (after the documented repairs); the latest term
 * is the current premier in provinces.json; every term has a family; and the
 * total time covered with no premier on record is reported, with a hard limit.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mediawiki } from "../grounding/http.ts";
import { DATA, ROOT, writeDataset } from "../grounding/util.ts";
import { PROVINCES, sparql } from "../grounding/wikidata.ts";
import { type ProvincialFamily } from "../../src/lib/party-families.ts";
import { clean, infobox, plain, rewriteTemplates, templateCalls } from "./wikitext.ts";

const OUT = resolve(DATA, "wikidata/premiers.json");
const API = "https://en.wikipedia.org/w/api.php";

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** The "Premier of …" Wikidata items. */
const OFFICES: Record<string, string> = {
  alberta: "Q3401750",
  "british-columbia": "Q7240349",
  manitoba: "Q3401758",
  "new-brunswick": "Q12270252",
  "newfoundland-and-labrador": "Q7240356",
  "northwest-territories": "Q7240368",
  "nova-scotia": "Q7240360",
  nunavut: "Q4377222",
  ontario: "Q2560704",
  "prince-edward-island": "Q7240361",
  quebec: "Q2911019",
  saskatchewan: "Q6578215",
  yukon: "Q12270260",
};

/**
 * Provincial parties by name (Wikidata English label or Wikipedia article
 * title, lower case), mapped to a family. `from`/`until` limit a mapping to
 * terms starting in that range (ISO dates).
 */
const PARTIES: Record<string, { family: ProvincialFamily; label: string; from?: string; until?: string }[]> = {};
function party(family: ProvincialFamily, label: string, names: string[], range: { from?: string; until?: string } = {}) {
  for (const n of [label, ...names]) (PARTIES[n.toLowerCase()] ??= []).push({ family, label, ...range });
}
// Liberal
party("lpc", "Ontario Liberal", ["Ontario Liberal Party"]);
party("lpc", "Quebec Liberal", ["Quebec Liberal Party", "Parti libéral du Québec"]);
party("lpc", "Nova Scotia Liberal", ["Nova Scotia Liberal Party"]);
party("lpc", "New Brunswick Liberal", ["New Brunswick Liberal Association", "New Brunswick Liberal Party"]);
party("lpc", "Manitoba Liberal", ["Manitoba Liberal Party"]);
party("lpc", "BC Liberal", ["British Columbia Liberal Party"], { until: "1991-01-01" });
party("lpc", "PEI Liberal", ["Prince Edward Island Liberal Party"]);
party("lpc", "Alberta Liberal", ["Alberta Liberal Party"]);
party("lpc", "Saskatchewan Liberal", ["Saskatchewan Liberal Party", "Saskatchewan Progress Party", "Saskatchewan Progress  Party"]);
party("lpc", "Newfoundland and Labrador Liberal", ["Liberal Party of Newfoundland and Labrador"]);
party("lpc", "Yukon Liberal", ["Yukon Liberal Party"]);
// Conservative
party("cpc", "Ontario PC", ["Progressive Conservative Party of Ontario", "Ontario Conservative Party"]);
party("cpc", "Quebec Conservative", ["Conservative Party of Quebec", "Conservative Party of Quebec (historical)"]);
party("cpc", "Nova Scotia PC", ["Progressive Conservative Association of Nova Scotia"]);
party("cpc", "New Brunswick PC", ["Progressive Conservative Party of New Brunswick"]);
party("cpc", "Manitoba PC", ["Progressive Conservative Party of Manitoba"]);
party("cpc", "BC Conservative", ["Conservative Party of British Columbia"]);
party("cpc", "PEI PC", ["Progressive Conservative Party of Prince Edward Island"]);
party("cpc", "Alberta PC", ["Progressive Conservative Association of Alberta"]);
party("cpc", "Saskatchewan PC", ["Progressive Conservative Party of Saskatchewan"]);
party("cpc", "Newfoundland and Labrador PC", ["Progressive Conservative Party of Newfoundland and Labrador"]);
party("cpc", "Yukon PC", ["Yukon Progressive Conservative Party"]);
party("cpc", "Yukon Party", ["Yukon Party"]);
party("cpc", "United Conservative", ["United Conservative Party"]);
// Centre-right coalition
party("coalition", "BC Liberal", ["British Columbia Liberal Party", "BC United"], { from: "1991-01-01" });
party("coalition", "Saskatchewan Party", ["Saskatchewan Party"]);
// Farmer / Progressive
party("progressive", "United Farmers of Ontario", ["United Farmers of Ontario"]);
party("progressive", "United Farmers of Alberta", ["United Farmers of Alberta"]);
party("progressive", "Manitoba Progressive", ["Progressive Party of Manitoba", "Liberal-Progressive Party", "Liberal-Progressive"]);
// Social Credit
party("socred", "Alberta Social Credit", ["Alberta Social Credit Party"]);
party("socred", "BC Social Credit", ["British Columbia Social Credit Party"]);
// CCF / NDP
party("ndp", "Ontario NDP", ["Ontario New Democratic Party"]);
party("ndp", "Manitoba NDP", ["New Democratic Party of Manitoba", "Co-operative Commonwealth Federation (Manitoba Section)"]);
party("ndp", "BC NDP", ["British Columbia New Democratic Party"]);
party("ndp", "Saskatchewan NDP", ["Saskatchewan New Democratic Party"]);
party("ndp", "Saskatchewan CCF", ["Co-operative Commonwealth Federation", "Saskatchewan Co-operative Commonwealth Federation"]);
party("ndp", "Alberta NDP", ["Alberta New Democratic Party"]);
party("ndp", "Nova Scotia NDP", ["Nova Scotia New Democratic Party"]);
party("ndp", "Yukon NDP", ["Yukon New Democratic Party"]);
// Quebec
party("sovereigntist", "Parti Québécois", ["Parti Québécois"]);
party("autonomist", "Union Nationale", ["Union Nationale", "Union nationale"]);
party("autonomist", "Coalition Avenir Québec", ["Coalition Avenir Québec"]);

/**
 * Before about 1950, provincial and federal parties were closely tied, and
 * Wikidata often records only the federal one. For terms starting before 1950
 * with no provincial party on record, the federal party is used.
 */
const FEDERAL_PROXY: Record<string, { family: ProvincialFamily; label: string }> = {
  "liberal party of canada": { family: "lpc", label: "Liberal" },
  "conservative party of canada": { family: "cpc", label: "Conservative" },
  "liberal-conservative party": { family: "cpc", label: "Liberal-Conservative" },
};

/** Where the rules above give the wrong answer. Keyed by Wikidata English label, with the reason. */
const PARTY_OVERRIDES: Record<string, { family: ProvincialFamily; label: string; why: string }> = {
  "Ujjal Dosanjh": {
    family: "ndp",
    label: "BC NDP",
    why: "Ujjal Dosanjh was premier as leader of the BC NDP; Wikidata lists only his later federal party",
  },
  "Stuart Garson": {
    family: "progressive",
    label: "Manitoba Liberal-Progressive",
    why: "Stuart Garson led Manitoba's Liberal-Progressive coalition government; Wikidata lists only the federal Liberals",
  },
};

/**
 * Non-partisan periods: consensus government (Northwest Territories since its
 * modern premiers, Nunavut), and the years before party lines formed in
 * British Columbia (before 1903) and the old North-West Territories.
 */
function nonpartisan(slug: string, start: string): boolean {
  if (slug === "northwest-territories" || slug === "nunavut") return true;
  if (slug === "british-columbia" && start < "1903-06-01") return true;
  return false;
}

// ---------------------------------------------------------------------------
// Wikidata

const offices = Object.values(OFFICES).map((q) => `wd:${q}`).join(" ");
const termRows = await sparql(`
  SELECT ?office ?p ?pLabel ?article ?start ?sp ?end ?ep WHERE {
    VALUES ?office { ${offices} }
    ?p p:P39 ?st. ?st ps:P39 ?office.
    FILTER NOT EXISTS { ?st wikibase:rank wikibase:DeprecatedRank }
    OPTIONAL { ?st pqv:P580 [ wikibase:timeValue ?start; wikibase:timePrecision ?sp ] }
    OPTIONAL { ?st pqv:P582 [ wikibase:timeValue ?end; wikibase:timePrecision ?ep ] }
    OPTIONAL { ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
  }`);
const partyRows = await sparql(`
  SELECT DISTINCT ?p ?partyLabel ?ps ?pe WHERE {
    VALUES ?office { ${offices} }
    ?p p:P39/ps:P39 ?office.
    ?p p:P102 ?s. ?s ps:P102 ?party.
    FILTER NOT EXISTS { ?s wikibase:rank wikibase:DeprecatedRank }
    OPTIONAL { ?s pq:P580 ?ps } OPTIONAL { ?s pq:P582 ?pe }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
  }`);
const day = (iso?: string) => (iso ? iso.slice(0, 10) : null);

// ---------------------------------------------------------------------------
// Wikipedia infoboxes of every premier

const titles = [...new Set(termRows.map((r) => r.article).filter(Boolean))].map((u) =>
  decodeURIComponent(u!.replace("https://en.wikipedia.org/wiki/", "")).replace(/_/g, " "),
);
const pages = new Map<string, string>();
for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50);
  const res = await mediawiki<{
    query: { normalized?: { from: string; to: string }[]; pages: { title: string; revisions?: { slots: { main: { content: string } } }[] }[] };
  }>(API, { action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: batch.join("|") });
  const norm = new Map((res.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const p of res.query.pages) {
    const content = p.revisions?.[0]?.slots.main.content;
    if (content) pages.set(norm.get(p.title) ?? p.title, content);
  }
}
console.log(`Wikipedia: read ${pages.size} of ${titles.length} premiers' articles`);

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** "May 2, 1986", "2 May 1986", "{{Start date|1986|5|2}}" → "1986-05-02". Null if not a full date. */
function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = plain(
    rewriteTemplates(clean(raw), (tp) => {
      const n = tp.name.toLowerCase();
      if (/^(start|end) date/.test(n) || n === "dts" || n === "date") {
        const [y, m, d] = tp.args;
        if (y && m && d && /^\d{4}$/.test(y)) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      return undefined;
    }),
  );
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(t);
  if (m && MONTHS.includes(m[1]!.toLowerCase())) return `${m[3]}-${String(MONTHS.indexOf(m[1]!.toLowerCase()) + 1).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
  m = /(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/.exec(t);
  if (m && MONTHS.includes(m[2]!.toLowerCase())) return `${m[3]}-${String(MONTHS.indexOf(m[2]!.toLowerCase()) + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
}

interface WpTerm {
  start: string | null;
  end: string | null;
}
/** Terms as premier of `name` in a premier's infobox, plus the parties it links to. */
function wikipediaTerms(title: string, provinceName: string): { terms: WpTerm[]; parties: string[] } {
  const page = pages.get(title);
  if (!page) return { terms: [], parties: [] };
  let box: Record<string, string>;
  try {
    box = infobox(page, "officeholder");
  } catch {
    try {
      box = infobox(page, "politician");
    } catch {
      return { terms: [], parties: [] };
    }
  }
  // "Premier of X" or "12th Premier of X", but not "Deputy Premier of X".
  const office = new RegExp(`^(\\d+(st|nd|rd|th) )?(Premier|Government Leader) of (the )?${provinceName}$`, "i");
  const terms: WpTerm[] = [];
  for (const [k, v] of Object.entries(box)) {
    const m = /^office(\d*)$/.exec(k);
    const officeText = plain(rewriteTemplates(clean(v), () => "")).replace(/\s*\(.*\)$/, "");
    if (!m || !office.test(officeText)) continue;
    const n = m[1];
    terms.push({ start: parseDate(box[`term_start${n}`]), end: parseDate(box[`term_end${n}`]) });
  }
  // Party links: [[Target|text]] → target.
  const parties = [...(box.party ?? "").matchAll(/\[\[([^\]|]+)/g)].map((m) => m[1]!.trim());
  return { terms, parties };
}

// ---------------------------------------------------------------------------
// Merge

interface Term {
  name: string;
  qid: string;
  start: string;
  end: string | null;
  party: string;
  family: ProvincialFamily;
  source: string;
}

const provinceData = JSON.parse(await readFile(resolve(DATA, "wikidata/provinces.json"), "utf8")) as {
  provinces: { slug: string; name: string; joined: string; type: string; premier: { name: string; qid: string; party: string | null; since: string | null } | null }[];
};
const today = new Date().toISOString().slice(0, 10);
const notes: string[] = [];
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * The party of each premier's government as Wikipedia's "List of premiers of
 * …" pages give it ({{Canadian first minister list}} rows), the first choice
 * for a term's party: it's recorded per term, where Wikidata's P102 is a
 * person's memberships over a whole career. Short labels, mapped here.
 */
const LIST_PARTY: Record<string, { family: ProvincialFamily; label: string; from?: string; until?: string }[]> = {
  liberal: [
    { family: "lpc", label: "Liberal", until: "1991-01-01" },
    { family: "lpc", label: "Liberal", from: "1991-01-01" },
  ],
  "parti national": [{ family: "lpc", label: "Parti national (Liberal)" }],
  conservative: [{ family: "cpc", label: "Conservative" }],
  "conservative (historical)": [{ family: "cpc", label: "Conservative" }],
  "liberal-conservative": [{ family: "cpc", label: "Liberal-Conservative" }],
  pc: [{ family: "cpc", label: "Progressive Conservative" }],
  ucp: [{ family: "cpc", label: "United Conservative" }],
  yukon: [{ family: "cpc", label: "Yukon Party" }],
  ndp: [{ family: "ndp", label: "NDP" }],
  progressive: [{ family: "progressive", label: "Progressive" }],
  "liberal-progressive": [{ family: "progressive", label: "Liberal-Progressive" }],
  "united farmers": [{ family: "progressive", label: "United Farmers" }],
  "social credit": [{ family: "socred", label: "Social Credit" }],
  pq: [{ family: "sovereigntist", label: "Parti Québécois" }],
  un: [{ family: "autonomist", label: "Union Nationale" }],
  caq: [{ family: "autonomist", label: "Coalition Avenir Québec" }],
  "non-partisan": [{ family: "nonpartisan", label: "Non-partisan" }],
  confederation: [{ family: "other", label: "Confederation (pro-Confederation coalition)" }],
  "anti-confederation": [{ family: "other", label: "Anti-Confederation" }],
};
// In British Columbia, "Liberal" from 1991 is the rebuilt free-enterprise BC Liberal Party.
const listParty = (slug: string, label: string, start: string) => {
  const key = plain(clean(label)).toLowerCase();
  if (key === "liberal" && slug === "british-columbia" && start >= "1991-01-01") return { family: "coalition" as const, label: "BC Liberal" };
  return LIST_PARTY[key]?.find((m) => (!m.from || start >= m.from) && (!m.until || start < m.until)) ?? null;
};

const LIST_SLUG = (slug: string) => `list-of-premiers-of-${slug === "northwest-territories" ? "the-northwest-territories" : slug}`;
const listRows = new Map<string, { title: string; name: string; party: string; start: string | null; end: string | null }[]>();
for (const p of PROVINCES) {
  let page: string;
  try {
    page = await readFile(resolve(ROOT, "grounding/wikipedia", `${LIST_SLUG(p.slug)}.wiki`), "utf8");
  } catch {
    fail(`grounding/wikipedia/${LIST_SLUG(p.slug)}.wiki is missing: run pnpm grounding --only wikipedia`);
  }
  listRows.set(
    p.slug,
    templateCalls(page, "Canadian first minister list").map((f) => ({
      title: /\[\[([^\]|]+)/.exec(f.name ?? "")?.[1]?.trim() ?? "",
      name: plain(clean(f.name ?? "")),
      party: f.party ?? "",
      start: parseDate(f.term_start),
      end: parseDate(f.term_end),
    })),
  );
}

function fromList(slug: string, title: string | undefined, name: string, start: string) {
  const rows = listRows.get(slug) ?? [];
  const near = rows
    .filter((r) => r.start && Math.abs(daysBetween(r.start, start)) <= 45)
    .sort((a, b) => Math.abs(daysBetween(a.start!, start)) - Math.abs(daysBetween(b.start!, start)));
  const row = near.find((r) => r.title === title || r.title.endsWith(name.split(" ").at(-1)!)) ?? (near.length === 1 ? near[0] : undefined);
  return row ? listParty(slug, row.party, start) : null;
}

function choosePartyFor(
  slug: string,
  qid: string,
  name: string,
  start: string,
  wpParties: string[],
  title?: string,
): { family: ProvincialFamily; label: string } | null {
  if (nonpartisan(slug, start))
    return { family: "nonpartisan", label: slug === "british-columbia" || start < "1905-09-01" ? "Non-partisan" : "Consensus government" };
  const o = PARTY_OVERRIDES[name];
  if (o) return o;
  const listed = fromList(slug, title, name, start);
  if (listed) return listed;
  const inRange = (m: { from?: string; until?: string }) => (!m.from || start >= m.from) && (!m.until || start < m.until);
  const lookup = (name: string) => PARTIES[name.toLowerCase()]?.find(inRange);
  // Wikidata memberships covering the term start, then undated ones.
  const wd = partyRows.filter((r) => r.p === qid);
  const covering = wd.filter((r) => (!r.ps || day(r.ps)! <= start) && (!r.pe || day(r.pe)! > start) && (r.ps || r.pe));
  const undated = wd.filter((r) => !r.ps && !r.pe);
  const fromWd = (rows: typeof wd) => [...new Set(rows.map((r) => lookup(r.partyLabel ?? "")).filter((x) => x))];
  for (const rows of [covering, undated]) {
    const found = fromWd(rows);
    if (found.length === 1) return found[0]!;
    if (found.length > 1) {
      // Several provincial parties and no dates: Wikipedia's infobox (which
      // lists the party as premier first) decides.
      const wp = wpParties.map(lookup).find((x) => x && found.includes(x));
      if (wp) return wp;
      return found[0]!;
    }
  }
  const wp = wpParties.map(lookup).find((x) => x);
  if (wp) return wp;
  if (start < "1950-01-01") {
    const proxy = [...wd.map((r) => r.partyLabel ?? ""), ...wpParties].map((n) => FEDERAL_PROXY[n.toLowerCase()]).find((x) => x);
    if (proxy) return proxy;
  }
  return null;
}

const unresolved: string[] = [];
const provinces = [];
for (const prov of PROVINCES) {
  const info = provinceData.provinces.find((p) => p.slug === prov.slug) ?? fail(`provinces.json has no ${prov.slug}`);
  // Newfoundland was renamed Newfoundland and Labrador in 2001; older infoboxes use the old name.
  const officeName = prov.slug === "newfoundland-and-labrador" ? "Newfoundland( and Labrador)?" : prov.name;
  const rows = termRows.filter((r) => r.office === OFFICES[prov.slug]);
  if (!rows.length) fail(`${prov.name}: no premiers on Wikidata`);

  // Wikidata terms, with Wikipedia filling missing or imprecise dates.
  const raw: { name: string; qid: string; start: string | null; end: string | null; src: string; title?: string }[] = [];
  const usedWp = new Set<string>();
  for (const r of rows) {
    const title = r.article ? decodeURIComponent(r.article.replace("https://en.wikipedia.org/wiki/", "")).replace(/_/g, " ") : undefined;
    const wp = title ? wikipediaTerms(title, officeName).terms : [];
    let start = r.start && Number(r.sp) >= 11 ? day(r.start) : null;
    let end = r.end && Number(r.ep) >= 11 ? day(r.end) : null;
    let src = "Wikidata";
    // The Wikipedia term that best matches this one.
    const near = (a: string | null, b: string | null) => (a && b ? Math.abs(daysBetween(a, b)) : Infinity);
    const match = wp
      .map((t, i) => ({ t, i, d: Math.min(near(t.start, start ?? (r.start ? day(r.start) : null)), near(t.end, end ?? (r.end ? day(r.end) : null))) }))
      .sort((a, b) => a.d - b.d)[0];
    const exact = start || end ? match && match.d < 400 : match && wp.length === 1;
    if (match && exact) {
      usedWp.add(`${r.p}#${match.i}`);
      if (!start && match.t.start) [start, src] = [match.t.start, "Wikidata + Wikipedia"];
      if (!end && match.t.end && r.end !== undefined) [end, src] = [match.t.end, "Wikidata + Wikipedia"];
      if (!end && !r.end && match.t.end) [end, src] = [match.t.end, "Wikidata + Wikipedia"];
      if (start && match.t.start && Math.abs(daysBetween(start, match.t.start)) > 31)
        notes.push(`${prov.name}, ${r.pLabel}: Wikidata says the term began ${start}, Wikipedia ${match.t.start}. Using Wikidata.`);
    }
    raw.push({ name: r.pLabel!, qid: r.p!, start, end, src, title });
  }
  // Terms on Wikipedia that Wikidata doesn't have (a second term, say).
  for (const r of rows) {
    const title = r.article ? decodeURIComponent(r.article.replace("https://en.wikipedia.org/wiki/", "")).replace(/_/g, " ") : undefined;
    if (!title) continue;
    wikipediaTerms(title, officeName).terms.forEach((t, i) => {
      if (usedWp.has(`${r.p}#${i}`) || !t.start) return;
      if (raw.some((x) => x.qid === r.p && x.start && Math.abs(daysBetween(x.start, t.start!)) < 400)) return;
      raw.push({ name: r.pLabel!, qid: r.p!, start: t.start, end: t.end, src: "Wikipedia", title });
      usedWp.add(`${r.p}#${i}`);
    });
  }
  // Terms in Wikipedia's list of premiers that fall where neither source above
  // has anyone (Wikidata has the person but no dates, or not the person at all).
  const overlapDays = (a: { start: string | null; end: string | null }, s: string, e: string) => {
    if (!a.start) return 0;
    const lo = a.start > s ? a.start : s;
    const hi = (a.end ?? today) < e ? (a.end ?? today) : e;
    return Math.max(0, daysBetween(lo, hi));
  };
  for (const row of listRows.get(prov.slug) ?? []) {
    if (!row.start || !row.end || row.end <= info.joined) continue;
    const len = daysBetween(row.start, row.end);
    const covered = raw.reduce((n, t) => n + overlapDays(t, row.start!, row.end!), 0);
    if (covered >= len / 2) continue;
    const wd = rows.find((r) => r.article && decodeURIComponent(r.article.replace("https://en.wikipedia.org/wiki/", "")).replace(/_/g, " ") === row.title);
    // Drop the dateless Wikidata record of the same person, now that we have dates.
    const dateless = raw.findIndex((t) => !t.start && !t.end && (t.qid === wd?.p || t.title === row.title));
    if (dateless >= 0) raw.splice(dateless, 1);
    raw.push({ name: wd?.pLabel ?? row.name, qid: wd?.p ?? "", start: row.start, end: row.end, src: "Wikipedia list of premiers", title: row.title });
  }

  // Order, drop what we can't place, clip to when the province joined.
  let terms = raw
    .filter((t) => t.start || t.end)
    .sort((a, b) => { const ka = (a.start ?? a.end)!, kb = (b.start ?? b.end)!; return ka !== kb ? (ka < kb ? -1 : 1) : (a.start ? 1 : 0) - (b.start ? 1 : 0); });
  // A missing start takes the previous term's end; a missing end, the next term's start.
  terms.forEach((t, i) => {
    if (!t.start && i > 0) t.start = terms[i - 1]!.end;
    if (!t.end && i < terms.length - 1) t.end = terms.slice(i + 1).find((n) => n.start)?.start ?? null;
  });
  for (const t of raw.filter((t) => !t.start && !t.end)) notes.push(`${prov.name}, ${t.name}: no dates on Wikidata or Wikipedia; left out.`);
  // Only the last term may be open-ended; an earlier one with no end we can place is dropped.
  terms = terms.filter((t, i) => t.start && (t.end || i === terms.length - 1) && (t.end ?? today) > info.joined);
  for (const t of terms) if (t.start! < info.joined) t.start = info.joined;

  // The same person recorded twice for one term (two statements with slightly different dates): merge.
  terms = terms.filter((t, i) => {
    const prev = terms[i - 1];
    if (!prev || prev.qid !== t.qid || (prev.end && t.start! > prev.end)) return true;
    if (!prev.end || (t.end && t.end > prev.end)) prev.end = t.end;
    notes.push(`${prov.name}, ${t.name}: two overlapping records of one term, merged.`);
    return false;
  });
  // Overlaps: the later term starts when the earlier one ended.
  for (let i = 1; i < terms.length; i++) {
    const prev = terms[i - 1]!;
    const t = terms[i]!;
    if (prev.end === null) {
      prev.end = t.start;
      notes.push(`${prov.name}, ${prev.name}: no end date; ended when ${t.name} took office.`);
    }
    if (t.start! < prev.end!) {
      const overlap = daysBetween(t.start!, prev.end!);
      if (overlap > 366) fail(`${prov.name}: ${prev.name} and ${t.name} overlap by ${overlap} days`);
      notes.push(`${prov.name}: ${t.name}'s term started ${t.start} on record, before ${prev.name}'s ended (${prev.end}); using ${prev.end}.`);
      t.start = prev.end;
    }
  }

  // The current premier, from provinces.json when Wikidata is behind.
  const cur = info.premier;
  const last = terms.at(-1)!;
  if (cur && last.qid !== cur.qid) {
    if (!cur.since) fail(`${prov.name}: current premier ${cur.name} has no start date`);
    // Drop anyone Wikidata shows starting after the current premier, and close the term before.
    terms = terms.filter((t) => t.start! < cur.since!);
    const before = terms.at(-1)!;
    if (!before.end || before.end > cur.since) before.end = cur.since;
    terms.push({ name: cur.name, qid: cur.qid, start: cur.since, end: null, src: "provinces.json (Wikipedia infobox)" });
    notes.push(`${prov.name}: Wikidata is behind; ${cur.name} added as premier from ${cur.since} (src/data/wikidata/provinces.json).`);
  } else if (cur && last.end !== null) {
    last.end = null;
  }

  // Parties.
  const out: Term[] = terms.map((t) => {
    const wpParties = t.title ? wikipediaTerms(t.title, officeName).parties : [];
    let chosen = choosePartyFor(prov.slug, t.qid, t.name, t.start!, wpParties, t.title);
    if (!chosen && cur && t.qid === cur.qid && cur.party) chosen = PARTIES[cur.party.toLowerCase()]?.[0] ?? null;
    if (!chosen) {
      const wd = partyRows.filter((r) => r.p === t.qid).map((r) => r.partyLabel);
      unresolved.push(`${prov.name}, ${t.name} (${t.qid}, from ${t.start}): Wikidata [${wd.join("; ")}], Wikipedia [${wpParties.join("; ")}]`);
      chosen = { family: "other", label: "?" };
    }
    return { name: t.name, qid: t.qid, start: t.start!, end: t.end, party: chosen.label, family: chosen.family, source: t.src };
  });

  // Gaps with no premier on record.
  const gaps: { start: string; end: string }[] = [];
  let cursor = info.joined;
  for (const t of out) {
    if (t.start > cursor) gaps.push({ start: cursor, end: t.start });
    cursor = t.end ?? today;
  }
  provinces.push({ slug: prov.slug, name: prov.name, type: info.type, joined: info.joined, terms: out, gaps });
}

if (unresolved.length) fail(`No party family for:\n  ${unresolved.join("\n  ")}\nAdd the party to PARTIES or the premier to PARTY_OVERRIDES.`);

// Report gaps. Long ones are expected only where there was no elected premier
// (the territories before responsible government), so they're listed.
for (const p of provinces) {
  for (const g of p.gaps) {
    const days = daysBetween(g.start, g.end);
    if (days > 60) console.log(`  gap: ${p.name} ${g.start} → ${g.end} (${days} days)`);
  }
}
for (const n of notes) console.log(`  note: ${n}`);

const changed = await writeDataset(
  OUT,
  {
    source: "Wikidata: holders of each \"Premier of …\" position (P39) with dates and party (P102); English Wikipedia premiers' infoboxes for missing dates and terms",
    url: "https://query.wikidata.org/",
    urls: ["https://query.wikidata.org/", "https://en.wikipedia.org/wiki/List_of_current_Canadian_first_ministers"],
    licence: "CC0 1.0 (Wikidata); CC BY-SA 4.0 (Wikipedia)",
    query: `P39 in {${Object.values(OFFICES).join(", ")}} with P580/P582 (day precision); P102 for party`,
    script: "scripts/data/premiers.ts",
    notes: [
      "Each term's family follows src/lib/party-families.ts. Gaps are periods with no premier on record: before responsible government in the territories, or brief changeovers.",
      ...Object.values(PARTY_OVERRIDES).map((o) => `Party override: ${o.why}.`),
      ...notes,
    ],
  },
  { provinces },
);
console.log(`${changed ? "✓ wrote" : "= unchanged"} ${OUT.replace(ROOT + "/", "")}`);
