/**
 * Structured reference datasets from Wikidata (CC0), via the SPARQL endpoint.
 * Writes src/data/wikidata/*.json, each with a `_meta` block and stable,
 * sorted output. Known Wikidata gaps are patched by the documented OVERRIDES
 * below, and sanity checks fail the run if the counts look wrong.
 */
import { resolve } from "node:path";
import { mediawiki, politeFetch } from "./http.ts";
import { DATA, byKey, stamp, writeDataset, type Manifest, type FileEntry } from "./util.ts";

const ENDPOINT = "https://query.wikidata.org/sparql";
const OUT = resolve(DATA, "wikidata");
const LICENCE = "CC0 1.0 (Wikidata)";

type Row = Record<string, string | undefined>;

/** Runs a SPARQL query and returns rows of plain strings (entity URIs reduced to QIDs). */
export async function sparql(query: string): Promise<Row[]> {
  const res = await politeFetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/sparql-results+json" },
    body: new URLSearchParams({ query }).toString(),
  });
  const json = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } };
  return json.results.bindings.map((b) =>
    Object.fromEntries(
      Object.entries(b).map(([k, v]) => [k, v.value.replace(/^http:\/\/www\.wikidata\.org\/entity\//, "")]),
    ),
  );
}

const day = (iso?: string) => (iso ? iso.slice(0, 10) : null);
const num = (s?: string) => (s === undefined ? null : Number(s));

// ---------------------------------------------------------------------------
// Overrides: every place we knowingly depart from (or add to) Wikidata.
// ---------------------------------------------------------------------------

/**
 * Federal parties a prime minister could belong to while in office, mapped to
 * a display name and a colour family. Any other party Wikidata lists for a PM
 * (provincial parties, or parties from before or after their time as PM) is
 * ignored. The colour families use the modern party tokens:
 *
 * - Liberal → party-lpc.
 * - Liberal-Conservative (1867–1873 label of Macdonald's coalition), the
 *   historical Conservative Party (1867–1942), the Unionist Party (Borden's
 *   1917 wartime coalition of Conservatives and pro-conscription Liberals,
 *   led and dominated by Conservatives), the Progressive Conservative Party
 *   (1942–2003) and today's Conservative Party (2003–) → party-cpc, because
 *   each is a direct predecessor of the next on the centre-right.
 */
export const PARTIES: Record<string, { name: string; family: "lpc" | "cpc" }> = {
  Q138345: { name: "Liberal", family: "lpc" },
  Q1538184: { name: "Liberal-Conservative", family: "cpc" },
  Q909827: { name: "Conservative", family: "cpc" },
  Q1686042: { name: "Unionist", family: "cpc" },
  Q1292617: { name: "Progressive Conservative", family: "cpc" },
  Q488523: { name: "Conservative", family: "cpc" },
};

/**
 * The four founding provinces have no start date on Canada's "contains
 * administrative territorial entity" (P150) statements. They joined at
 * Confederation, 1 July 1867 (Constitution Act, 1867, s. 5).
 */
const JOINED_AT_CONFEDERATION = new Set(["Q1904", "Q176", "Q1952", "Q1965"]);

/**
 * Candidate largest cities. Wikidata has no "largest city" property, and a
 * query over every municipality times out, so we list the plausible
 * contenders by English Wikipedia title and let Wikidata's latest population
 * figures pick the winner.
 */
const CITY_CANDIDATES: Record<string, string[]> = {
  alberta: ["Calgary", "Edmonton"],
  "british-columbia": ["Vancouver", "Surrey, British Columbia"],
  manitoba: ["Winnipeg", "Brandon, Manitoba"],
  "new-brunswick": ["Moncton", "Saint John, New Brunswick", "Fredericton"],
  "newfoundland-and-labrador": ["St. John's, Newfoundland and Labrador", "Conception Bay South"],
  "northwest-territories": ["Yellowknife", "Hay River"],
  "nova-scotia": ["Halifax, Nova Scotia", "Cape Breton Regional Municipality"],
  nunavut: ["Iqaluit", "Rankin Inlet"],
  ontario: ["Toronto", "Ottawa"],
  "prince-edward-island": ["Charlottetown", "Summerside, Prince Edward Island"],
  quebec: ["Montreal", "Quebec City"],
  saskatchewan: ["Saskatoon", "Regina, Saskatchewan"],
  yukon: ["Whitehorse", "Dawson City"],
};

/**
 * Wikidata's head-of-government (P6) statements often lag an election by
 * weeks or months. So the current premier is cross-checked against the
 * infobox of the English Wikipedia page for the office ("Premier of
 * Ontario"), which is updated within hours. When they disagree, Wikipedia
 * wins, and the dataset records what Wikidata said in `premier.check`.
 */
const premierOffice = (name: string) =>
  `Premier of ${name === "Northwest Territories" ? "the Northwest Territories" : name}`;

/** Territories with consensus government: premiers are chosen by MLAs and sit as independents. */
const CONSENSUS = new Set(["Q2007", "Q2023"]);

export const PROVINCES: { slug: string; qid: string; name: string }[] = [
  { slug: "alberta", qid: "Q1951", name: "Alberta" },
  { slug: "british-columbia", qid: "Q1973", name: "British Columbia" },
  { slug: "manitoba", qid: "Q1948", name: "Manitoba" },
  { slug: "new-brunswick", qid: "Q1965", name: "New Brunswick" },
  { slug: "newfoundland-and-labrador", qid: "Q2003", name: "Newfoundland and Labrador" },
  { slug: "northwest-territories", qid: "Q2007", name: "Northwest Territories" },
  { slug: "nova-scotia", qid: "Q1952", name: "Nova Scotia" },
  { slug: "nunavut", qid: "Q2023", name: "Nunavut" },
  { slug: "ontario", qid: "Q1904", name: "Ontario" },
  { slug: "prince-edward-island", qid: "Q1978", name: "Prince Edward Island" },
  { slug: "quebec", qid: "Q176", name: "Quebec" },
  { slug: "saskatchewan", qid: "Q1989", name: "Saskatchewan" },
  { slug: "yukon", qid: "Q2009", name: "Yukon" },
];
const TERRITORIES = new Set(["Q2007", "Q2023", "Q2009"]);

// ---------------------------------------------------------------------------
// Officeholders
// ---------------------------------------------------------------------------

/** The English Wikipedia title without its disambiguator ("R. B. Bennett"), else the Wikidata label. */
const displayName = (label: string, article?: string) =>
  article ? decodeURIComponent(article.replace(/^.*\/wiki\//, "")).replace(/_/g, " ").replace(/ \([^)]*\)$/, "") : label;

const ENWIKI = `OPTIONAL { ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/> }`;

interface Term {
  start: string;
  end: string | null;
}
interface Holder {
  ordinal: number;
  name: string;
  qid: string;
  wikipedia: string | null;
  terms: Term[];
}

/** People who held a position (P39), with every term, numbered by their first term. */
async function holders(position: string, since?: string): Promise<Holder[]> {
  const rows = await sparql(`
    SELECT ?p ?pLabel ?start ?end ?article WHERE {
      ?p p:P39 ?st. ?st ps:P39 wd:${position}; pq:P580 ?start.
      FILTER NOT EXISTS { ?st wikibase:rank wikibase:DeprecatedRank }
      OPTIONAL { ?st pq:P582 ?end }
      ${ENWIKI}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,mul". }
    }`);
  const people = new Map<string, Holder>();
  for (const r of rows) {
    const start = day(r.start)!;
    if (since && start < since) continue;
    const h = people.get(r.p!) ?? { ordinal: 0, name: displayName(r.pLabel!, r.article), qid: r.p!, wikipedia: r.article ?? null, terms: [] };
    if (!h.terms.some((t) => t.start === start)) h.terms.push({ start, end: day(r.end) });
    people.set(r.p!, h);
  }
  const list = [...people.values()];
  for (const h of list) h.terms.sort(byKey((t) => t.start));
  list.sort(byKey((h) => h.terms[0]!.start));
  list.forEach((h, i) => (h.ordinal = i + 1));
  return list;
}

interface PmTerm extends Term {
  parties: string[];
}
interface PrimeMinister extends Omit<Holder, "terms"> {
  terms: PmTerm[];
  parties: string[];
}

async function primeMinisters(): Promise<PrimeMinister[]> {
  const base = await holders("Q839078");
  const rows = await sparql(`
    SELECT ?p ?party ?ps ?pe WHERE {
      ?p p:P39 ?pst. ?pst ps:P39 wd:Q839078.
      ?p p:P102 ?s. ?s ps:P102 ?party.
      FILTER NOT EXISTS { ?s wikibase:rank wikibase:DeprecatedRank }
      OPTIONAL { ?s pq:P580 ?ps } OPTIONAL { ?s pq:P582 ?pe }
      OPTIONAL { ?party wdt:P571 ?inc }
    }`);
  const partyDates = await sparql(`
    SELECT ?party ?inc ?dis WHERE {
      VALUES ?party { ${Object.keys(PARTIES).map((q) => `wd:${q}`).join(" ")} }
      OPTIONAL { ?party wdt:P571 ?inc } OPTIONAL { ?party wdt:P576 ?dis }
    }`);
  const life = new Map(partyDates.map((r) => [r.party!, { inc: day(r.inc) ?? "0000", dis: day(r.dis) ?? "9999" }]));
  const memberships = new Map<string, { party: string; from: string; to: string }[]>();
  for (const r of rows) {
    if (!PARTIES[r.party!]) continue;
    const list = memberships.get(r.p!) ?? [];
    const m = { party: r.party!, from: day(r.ps) ?? "0000", to: day(r.pe) ?? "9999" };
    if (!list.some((x) => x.party === m.party && x.from === m.from)) list.push(m);
    memberships.set(r.p!, list);
  }
  return base.map((h) => {
    const terms = h.terms.map((t) => {
      const end = t.end ?? "9999";
      const parties = (memberships.get(h.qid) ?? [])
        .filter((m) => {
          const l = life.get(m.party)!;
          // Statement dates are often year-only (YYYY-01-01), so compare by year.
          const overlaps = m.from.slice(0, 4) <= end.slice(0, 4) && m.to.slice(0, 4) >= t.start.slice(0, 4);
          const existed = l.inc.slice(0, 4) <= end.slice(0, 4) && l.dis >= t.start;
          return overlaps && existed;
        })
        .sort(byKey((m) => `${m.from}|${m.party}`))
        .map((m) => PARTIES[m.party]!.name);
      return { ...t, parties: [...new Set(parties)] };
    });
    const parties = [...new Set(terms.flatMap((t) => t.parties))];
    if (!parties.length) throw new Error(`No federal party found for PM ${h.name}; add it to PARTIES`);
    return { ...h, terms, parties };
  });
}

// ---------------------------------------------------------------------------
// Provinces and territories
// ---------------------------------------------------------------------------

/** Reads `incumbent` and `incumbent_since` from the infobox of an office's Wikipedia page. */
export async function wikipediaIncumbent(office: string): Promise<{ title: string; qid: string; since: string | null } | null> {
  const API = "https://en.wikipedia.org/w/api.php";
  const res = await mediawiki<{ query: { pages: { revisions?: { slots: { main: { content: string } } }[] }[] } }>(API, {
    action: "query",
    titles: office,
    redirects: "1",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
  });
  const text = res.query.pages[0]?.revisions?.[0]?.slots.main.content ?? "";
  const link = text.match(/^\s*\|\s*incumbent\s*=\s*\[\[([^\]|#]+)/m)?.[1]?.trim();
  if (!link) return null;
  const sinceRaw = text
    .match(/^\s*\|\s*incumbent_?since\s*=\s*(.+)$/m)?.[1]
    ?.replace(/\{\{\s*nobold\s*\|([^}]*)\}\}/i, "$1")
    .replace(/<[^>]+>|\[\[|\]\]/g, "")
    .trim();
  const parsed = sinceRaw ? new Date(`${sinceRaw} UTC`) : null;
  const since = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
  const props = await mediawiki<{ query: { pages: { pageprops?: { wikibase_item?: string } }[] } }>(API, {
    action: "query",
    titles: link,
    redirects: "1",
    prop: "pageprops",
    ppprop: "wikibase_item",
  });
  const qid = props.query.pages[0]?.pageprops?.wikibase_item;
  return qid ? { title: link, qid, since } : null;
}

/**
 * Keeps census figures when there are any: values tagged as census (P459 =
 * Q39825), or dated 1 January of a census year (1871, 1881 … 2016, 2021), since Wikidata
 * sometimes tags those with a more specific item. Mid-census estimates are only a fallback.
 */
function censusFirst<T extends { date: string; method?: string }>(rows: T[]): T[] {
  const isCensus = (r: T) => r.method === "Q39825" || (Number(r.date.slice(0, 4)) % 5 === 1 && r.date.slice(5) === "01-01");
  const census = rows.filter(isCensus);
  return census.length ? census : rows;
}

async function provinces() {
  const values = PROVINCES.map((p) => `wd:${p.qid}`).join(" ");
  const core = await sparql(`
    SELECT ?p ?cap ?capLabel ?area ?flag ?article WHERE {
      VALUES ?p { ${values} }
      OPTIONAL { ?p wdt:P36 ?cap }
      OPTIONAL { ?p wdt:P2046 ?area }
      OPTIONAL { ?p wdt:P41 ?flag }
      ${ENWIKI}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,mul". }
    }`);
  const joined = await sparql(`
    SELECT ?p ?start WHERE { wd:Q16 p:P150 ?s. ?s ps:P150 ?p. VALUES ?p { ${values} } OPTIONAL { ?s pq:P580 ?start } }`);
  const pops = await sparql(`
    SELECT ?p ?pop ?date ?rank ?method WHERE {
      VALUES ?p { ${values} }
      ?p p:P1082 ?s. ?s ps:P1082 ?pop; pq:P585 ?date; wikibase:rank ?rank.
      FILTER(?rank != wikibase:DeprecatedRank)
      OPTIONAL { ?s pq:P459 ?method }
    }`);
  const heads = await sparql(`
    SELECT ?p ?hog ?hogLabel ?start ?end WHERE {
      VALUES ?p { ${values} }
      ?p p:P6 ?s. ?s ps:P6 ?hog.
      FILTER NOT EXISTS { ?s wikibase:rank wikibase:DeprecatedRank }
      OPTIONAL { ?s pq:P580 ?start } OPTIONAL { ?s pq:P582 ?end }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,mul". }
    }`);
  // Cross-check: the incumbent named on each "Premier of …" Wikipedia page.
  const offices = await Promise.all(PROVINCES.map((p) => wikipediaIncumbent(premierOffice(p.name))));
  const premierQids = [...new Set([...heads.map((h) => h.hog!), ...offices.flatMap((o) => (o ? [o.qid] : []))])];
  const labels = new Map(
    (
      await sparql(`
    SELECT ?hog ?hogLabel WHERE {
      VALUES ?hog { ${premierQids.map((q) => `wd:${q}`).join(" ")} }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,mul". }
    }`)
    ).map((r) => [r.hog!, r.hogLabel!]),
  );
  const partyRows = premierQids.length
    ? await sparql(`
    SELECT ?hog ?party ?partyLabel ?start ?end WHERE {
      VALUES ?hog { ${premierQids.map((q) => `wd:${q}`).join(" ")} }
      ?hog p:P102 ?s. ?s ps:P102 ?party.
      FILTER NOT EXISTS { ?s wikibase:rank wikibase:DeprecatedRank }
      OPTIONAL { ?s pq:P580 ?start } OPTIONAL { ?s pq:P582 ?end }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,mul". }
    }`)
    : [];
  const cityTitles = Object.values(CITY_CANDIDATES).flat();
  const cities = await sparql(`
    SELECT ?article ?city ?cityLabel ?pop ?date ?method WHERE {
      VALUES ?article { ${cityTitles.map((t) => `<https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_")).replace(/%2C/g, ",").replace(/'/g, "%27")}>`).join(" ")} }
      ?article schema:about ?city.
      ?city p:P1082 ?s. ?s ps:P1082 ?pop; pq:P585 ?date.
      OPTIONAL { ?s pq:P459 ?method }
      FILTER NOT EXISTS { ?s wikibase:rank wikibase:DeprecatedRank }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,mul". }
    }`);

  /** Latest-dated value; ties broken by preferred rank, then the larger figure (stable). */
  const latest = <T extends { date: string; rank?: string; value: number }>(xs: T[]) =>
    [...xs].sort((a, b) =>
      a.date !== b.date
        ? a.date < b.date
          ? 1
          : -1
        : (b.rank?.endsWith("PreferredRank") ? 1 : 0) - (a.rank?.endsWith("PreferredRank") ? 1 : 0) || b.value - a.value,
    )[0];

  return PROVINCES.map((prov) => {
    const c = core.filter((r) => r.p === prov.qid);
    const one = (k: string) => [...new Set(c.map((r) => r[k]).filter(Boolean))].sort()[0];
    // Prefer the latest census figure so every province is measured the same way.
    const popRows = pops
      .filter((r) => r.p === prov.qid)
      .map((r) => ({ value: Number(r.pop), date: day(r.date)!, rank: r.rank, method: r.method }));
    const pop = latest(censusFirst(popRows));
    const joinedRow = joined.find((r) => r.p === prov.qid && r.start);
    const joinedDate = joinedRow ? day(joinedRow.start) : JOINED_AT_CONFEDERATION.has(prov.qid) ? "1867-07-01" : null;

    // Current premier: a P6 statement without an end date, latest start wins…
    const wd = heads
      .filter((h) => h.p === prov.qid && !h.end)
      .sort((a, b) => ((a.start ?? "") < (b.start ?? "") ? 1 : -1))[0];
    // …unless the Wikipedia page for the office names someone else.
    const wp = offices[PROVINCES.indexOf(prov)];
    const qid = wp?.qid ?? wd?.hog;
    let premier = null as null | {
      name: string;
      qid: string;
      party: string | null;
      since: string | null;
      check: { wikidata: string | null; wikidataSince: string | null; agrees: boolean };
    };
    if (qid) {
      const parties = partyRows
        .filter((r) => r.hog === qid && !r.end)
        .sort((a, b) => ((a.start ?? "") < (b.start ?? "") ? 1 : -1));
      const wdSince = wd ? day(wd.start) : null;
      const since = wp?.since ?? (wd?.hog === qid ? wdSince : null);
      const agrees = wd?.hog === qid && (wp?.since == null || wp.since === wdSince);
      if (!agrees)
        console.log(
          `  note: ${prov.name} premier: Wikidata says ${wd ? labels.get(wd.hog!) : "nobody"} (${wdSince}); Wikipedia says ${labels.get(qid)} (${since}). Using Wikipedia.`,
        );
      premier = {
        name: labels.get(qid) ?? qid,
        qid,
        party: CONSENSUS.has(prov.qid) ? null : (parties[0]?.partyLabel ?? null),
        since,
        check: { wikidata: wd ? (labels.get(wd.hog!) ?? null) : null, wikidataSince: wdSince, agrees },
      };
    }

    const candidates = CITY_CANDIDATES[prov.slug]!.map((title) => {
      const rows = cities.filter(
        (r) => decodeURIComponent(r.article!.replace("https://en.wikipedia.org/wiki/", "")).replace(/_/g, " ") === title,
      );
      const best = latest(
        censusFirst(rows.map((r) => ({ value: Number(r.pop), date: day(r.date)!, name: r.cityLabel!, qid: r.city!, method: r.method }))),
      );
      return best;
    }).filter((x) => x !== undefined);
    const largest = candidates.sort((a, b) => b.value - a.value)[0];

    const flagUrl = one("flag");
    return {
      slug: prov.slug,
      name: prov.name,
      qid: prov.qid,
      type: TERRITORIES.has(prov.qid) ? "territory" : "province",
      capital: one("capLabel") ?? null,
      joined: joinedDate,
      areaKm2: num(one("area")),
      population: pop?.value ?? null,
      populationDate: pop?.date ?? null,
      largestCity: largest ? { name: largest.name, population: largest.value, date: largest.date } : null,
      flagFile: flagUrl ? decodeURIComponent(flagUrl.replace(/^.*Special:FilePath\//, "")) : null,
      premier,
      wikipedia: one("article") ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Census population history
// ---------------------------------------------------------------------------

async function populationHistory() {
  const geos = [{ slug: "canada", qid: "Q16", name: "Canada" }, ...PROVINCES];
  const rows = await sparql(`
    SELECT ?p ?pop ?date WHERE {
      VALUES ?p { ${geos.map((g) => `wd:${g.qid}`).join(" ")} }
      ?p p:P1082 ?s. ?s ps:P1082 ?pop; pq:P585 ?date; pq:P459 wd:Q39825.
      FILTER NOT EXISTS { ?s wikibase:rank wikibase:DeprecatedRank }
    }`);
  const series: Record<string, { year: number; population: number }[]> = {};
  for (const g of geos) {
    const byYear = new Map<number, number>();
    for (const r of rows.filter((x) => x.p === g.qid)) {
      const year = Number(r.date!.slice(0, 4));
      // Keep one figure per census year (the largest, so the choice is stable).
      byYear.set(year, Math.max(byYear.get(year) ?? 0, Number(r.pop)));
    }
    series[g.slug] = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, population]) => ({ year, population }));
  }
  return series;
}

// ---------------------------------------------------------------------------
// Sanity checks: fail loudly rather than publish something wrong.
// ---------------------------------------------------------------------------

function check(cond: boolean, message: string) {
  if (!cond) throw new Error(`Sanity check failed: ${message}`);
}

export async function runWikidata(manifest: Manifest): Promise<void> {
  console.log("Wikidata: querying…");
  const meta = (what: string, query: string) => ({
    source: `Wikidata: ${what}`,
    url: `https://query.wikidata.org/`,
    licence: LICENCE,
    query,
    script: "scripts/grounding/wikidata.ts",
  });

  const pms = await primeMinisters();
  check(pms.length >= 24, `expected at least 24 prime ministers, got ${pms.length}`);
  const carney = pms.find((p) => p.qid === "Q192533");
  check(carney?.ordinal === 24 && carney.terms[0]?.start === "2025-03-14", "Mark Carney should be the 24th PM, from 2025-03-14");
  check(pms.find((p) => p.qid === "Q128702")?.terms.length === 2, "Macdonald should have two terms");
  check(pms.find((p) => p.qid === "Q128633")?.terms.length === 3, "Mackenzie King should have three terms");
  check(pms.find((p) => p.qid === "Q8619")?.terms.length === 2, "Pierre Trudeau should have two terms");
  check(pms.filter((p) => p.terms.some((t) => t.end === null)).length === 1, "exactly one PM should be in office");

  const monarchs = await holders("Q14931511", "1867-07-01");
  check(monarchs.length >= 7 && monarchs[0]?.qid === "Q9439", `expected 7+ monarchs from Victoria, got ${monarchs.length}`);
  const ggs = await holders("Q390776", "1867-07-01");
  check(ggs.length >= 30 && ggs[0]?.qid === "Q333233", `expected 30+ governors general from Monck, got ${ggs.length}`);
  const cjs = await holders("Q1339242");
  check(cjs.length >= 18 && cjs[0]?.qid === "Q387532", `expected 18+ chief justices from Richards, got ${cjs.length}`);
  for (const [label, list] of [["monarch", monarchs], ["governor general", ggs], ["chief justice", cjs]] as const) {
    check(list.filter((h) => h.terms.some((t) => t.end === null)).length === 1, `exactly one ${label} should be in office`);
  }
  // The current holder of each federal office must match the office's Wikipedia infobox.
  for (const [office, list] of [
    ["Prime Minister of Canada", pms],
    ["Monarchy of Canada", monarchs],
    ["Governor General of Canada", ggs],
    ["Chief Justice of Canada", cjs],
  ] as const) {
    const wp = await wikipediaIncumbent(office);
    const current = (list as readonly { qid: string; name: string; terms: Term[] }[]).find((h) => h.terms.some((t) => t.end === null));
    if (wp) check(wp.qid === current?.qid, `${office}: Wikidata says ${current?.name}, Wikipedia says ${wp.title}`);
  }

  const provs = await provinces();
  for (const p of provs) {
    check(!!p.capital && !!p.joined && !!p.population && !!p.flagFile && !!p.largestCity, `incomplete data for ${p.name}: ${JSON.stringify(p)}`);
  }
  const history = await populationHistory();
  check((history.canada?.length ?? 0) >= 10, "expected 10+ census figures for Canada");

  const outputs: [string, string, string, Record<string, unknown>][] = [
    [
      "prime-ministers",
      "prime ministers of Canada",
      "P39 = Q839078 (Prime Minister of Canada) with P580/P582; P102 party, filtered to PARTIES",
      {
        parties: PARTIES,
        primeMinisters: pms,
      },
    ],
    ["monarchs", "monarchs of Canada since 1867", "P39 = Q14931511 (monarch of Canada)", { monarchs }],
    ["governors-general", "governors general of Canada since 1867", "P39 = Q390776 (Governor General of Canada)", { governorsGeneral: ggs }],
    ["chief-justices", "chief justices of Canada", "P39 = Q1339242 (Chief Justice of Canada)", { chiefJustices: cjs }],
    [
      "provinces",
      "provinces and territories of Canada",
      "P36 capital, P150 (on Q16) start = joined, P2046 area, P1082 population, P41 flag, P6 head of government, P102 party",
      { provinces: provs },
    ],
    [
      "population-history",
      "census populations of Canada and its provinces and territories",
      "P1082 with P585 point in time and P459 = Q39825 (census). Gaps are gaps in Wikidata.",
      { census: history },
    ],
  ];
  for (const [name, what, query, data] of outputs) {
    const file = resolve(OUT, `${name}.json`);
    const changed = await writeDataset(file, meta(what, query), data);
    console.log(`  ${changed ? "✓" : "="} src/data/wikidata/${name}.json`);
    const fingerprint = JSON.stringify(data);
    const sha = (await import("node:crypto")).createHash("sha1").update(fingerprint).digest("hex");
    manifest.wikidata[name] = stamp<FileEntry>(
      manifest.wikidata[name],
      { file: `src/data/wikidata/${name}.json`, sha1: sha },
      (o) => o.sha1 === sha,
    );
  }
}
