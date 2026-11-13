/**
 * `pnpm data:election-history`: every federal general election since 1867.
 *
 *   src/data/elections/history.json
 *
 * For each election: date, House size, seats and vote share by party family,
 * the main parties' own results, turnout, the government that resulted
 * (party, prime minister, majority or minority) and the number of women
 * elected.
 *
 * Sources:
 * - Elections Canada, "Voter Turnout at Federal Elections and Referendums":
 *   dates, electors, ballots cast and turnout (fetched live); and "A History
 *   of the Vote in Canada", which each milestone in who could vote is
 *   checked against.
 * - English Wikipedia (CC BY-SA 4.0), from the grounding corpus
 *   (grounding/wikipedia/*.wiki, listed in grounding/sources.yaml):
 *   "List of Canadian federal elections" (seats by party family, prime
 *   minister), each election's own page (infobox: party results and vote
 *   shares) and "List of women elected to Canadian Parliament" (women elected).
 *   The script refreshes the corpus first through the grounding script's
 *   Wikipedia step; pass --offline to use the pages already on disk.
 *
 * Party families are defined in src/lib/party-families.ts.
 *
 * Cross-checks (the script fails if any is wrong): seats by family add up to
 * the House size in every election; the House size agrees across the list,
 * the election infobox and the majority threshold; the Liberal and
 * Conservative-family seats agree between the list and each infobox; the
 * governing party's share of seats matches the list's "ministry's command"
 * column; the prime minister and party match src/data/wikidata/prime-ministers.json;
 * turnout agrees between Elections Canada and Wikipedia to within 1.5 points;
 * women elected never exceed the House size; and the 2025 vote shares match
 * Elections Canada's official results in src/data/elections/2025/parties.json.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { politeFetch } from "../grounding/http.ts";
import { DATA, GROUNDING, ROOT, loadManifest, saveManifest, writeDataset } from "../grounding/util.ts";
import { runWikipedia } from "../grounding/wikipedia.ts";
import { FEDERAL_FAMILIES, FEDERAL_PARTY_KEYS, type FederalFamily } from "../../src/lib/party-families.ts";
import { cells, clean, infobox, plain, rewriteTemplates, tableRows } from "./wikitext.ts";

const OUT = resolve(DATA, "elections/history.json");
const WIKI = resolve(GROUNDING, "wikipedia");
const EC_TURNOUT = "https://www.elections.ca/content.aspx?section=ele&dir=turn&document=index&lang=e";
const wikiUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

const offline = process.argv.includes("--offline");

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Refresh the Wikipedia pages through the grounding script.

if (!offline) {
  const manifest = await loadManifest();
  await runWikipedia(manifest);
  manifest.runs.wikipedia = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  await saveManifest(manifest);
}
const wiki = async (slug: string) => {
  try {
    return await readFile(resolve(WIKI, `${slug}.wiki`), "utf8");
  } catch {
    fail(`grounding/wikipedia/${slug}.wiki is missing. Add the page to grounding/sources.yaml and run without --offline.`);
  }
};

// ---------------------------------------------------------------------------
// Elections Canada: turnout, dates.

interface EcRow {
  year: number;
  date: string;
  dateLabel: string;
  electors: number;
  ballots: number;
  turnout: number;
  turnoutNote?: string;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const int = (s: string) => {
  const n = Number(s.replace(/[,\s]/g, ""));
  if (!Number.isFinite(n)) fail(`Not a number: "${s}"`);
  return n;
};

async function electionsCanada(): Promise<{ rows: EcRow[]; footnotes: Map<number, string> }> {
  const html = await (await politeFetch(EC_TURNOUT)).text();
  const table = /<table[\s\S]*?<\/table>/.exec(html)?.[0] ?? fail("Elections Canada turnout page: no table");
  const footnotes = new Map<number, string>();
  for (const m of html.matchAll(/<p id="ftn(\d+)">([\s\S]*?)<\/p>/g)) {
    footnotes.set(Number(m[1]), text(m[2]!.replace(/<a[\s\S]*?<\/a>/, "")));
  }
  // Referendums (1898, 1942, 1992) carry footnote 2.
  if (!/^A referendum/.test(footnotes.get(2) ?? "")) fail("Elections Canada: footnote 2 should mark referendums");
  const refs = (cell: string) => [...cell.matchAll(/href="#ftn(\d+)"/g)].map((m) => Number(m[1]));
  const rows: EcRow[] = [];
  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]!);
    if (tds.length !== 5) continue;
    if (refs(tds[0]!).includes(2)) continue;
    const label = text(tds[0]!.replace(/<sup[\s\S]*?<\/sup>/g, ""));
    const m = /(\d{1,2}) (\w+) (\d{4})$/.exec(label);
    if (!m) fail(`Elections Canada: can't read date "${label}"`);
    const month = MONTHS.indexOf(m[2]!.toLowerCase());
    if (month < 0) fail(`Elections Canada: unknown month in "${label}"`);
    const year = Number(m[3]);
    const notes = refs(tds[4]!).map((n) => footnotes.get(n) ?? fail(`Elections Canada: missing footnote ${n}`));
    rows.push({
      year,
      date: `${year}-${String(month + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`,
      dateLabel: label.replace(/ - /g, " – "),
      electors: int(text(tds[2]!)),
      ballots: int(text(tds[3]!)),
      turnout: Number(text(tds[4]!.replace(/<sup[\s\S]*?<\/sup>/g, ""))),
      ...(notes.length ? { turnoutNote: notes.join(" ") } : {}),
    });
  }
  return { rows, footnotes };
}

const ec = await electionsCanada();
const ecRows = ec.rows;
if (ecRows.length !== 45) fail(`Elections Canada: expected 45 general elections, found ${ecRows.length}`);

// ---------------------------------------------------------------------------
// Wikipedia: List of Canadian federal elections.

const BG = "«bg:";
/** Template rewriting shared by every table: keeps the bits we read, drops the rest. */
function rewrite(t: { name: string; args: string[]; named: Record<string, string> }): string | undefined {
  const n = t.name.toLowerCase();
  if (n === "canadian party colour") {
    const [, key, mode] = t.args;
    if (mode === "name") return `«party:${key}»`;
    if (mode === "background") return `${BG}${key}» |`;
    return "";
  }
  if (n === "sortname") return `${t.args[0]} ${t.args[1]}`;
  if (n === "percentage bar") return t.args.find((a) => /^[\d.]+$/.test(a)) ?? "";
  if (n === "dts") return t.args.join(" ");
  if (n === "awrap" || n === "nowrap" || n === "abbr" || n === "smaller") return t.args[0] ?? "";
  if (n === "start date") return t.args.slice(0, 3).map((a, i) => (i ? a.padStart(2, "0") : a)).join("-");
  if (n === "start and end dates") return t.args.slice(3, 6).map((a, i) => (i ? a.padStart(2, "0") : a)).join("-");
  return undefined; // efn, notes, sort keys, arrows, colours…
}

interface ListRow {
  year: number;
  number: number;
  pm: string;
  govKey: string;
  columns: { main: number; extra: number }[];
  total: number;
  ministry: number;
  turnout: number;
}

const seatCell = (s: string) => {
  const t = plain(s).replace(/[–—-]/g, "");
  const nums = [...t.matchAll(/\+?\s*\d+/g)].map((m) => m[0].replace(/\s/g, ""));
  const main = nums.find((x) => !x.startsWith("+"));
  const extra = nums.find((x) => x.startsWith("+"));
  return { main: main ? Number(main) : 0, extra: extra ? Number(extra.slice(1)) : 0 };
};

const listPage = await wiki("list-of-canadian-federal-elections");
const listRows: ListRow[] = [];
{
  // The results table is the first sortable wikitable (the one before it is the legend).
  const at = listPage.indexOf("{| class=\"wikitable sortable");
  const rows = tableRows(listPage.slice(at), "{|");
  for (const raw of rows) {
    const rewritten = rewriteTemplates(clean(raw), rewrite);
    const head = /^!\s*(\d+)(?:st|nd|rd|th)\s*(?:<br\s*\/?>)?\s*(\d{4})/m.exec(rewritten);
    if (!head) continue;
    const govKey = /«bg:([^»]+)»/.exec(rewritten)?.[1] ?? fail(`List: no government colour for ${head[2]}`);
    const cs = cells(rewritten.replace(/«bg:[^»]*»\s*\|/g, ""));
    const headers = cs.map((c, i) => (c.header ? i : -1)).filter((i) => i >= 0);
    const totalAt = headers[1] ?? fail(`List: no total for ${head[2]}`);
    const seatCells = cs.slice(totalAt - 7, totalAt);
    listRows.push({
      year: Number(head[2]),
      number: Number(head[1]),
      pm: plain(cs[totalAt - 8]!.text),
      govKey,
      columns: seatCells.map((c) => seatCell(c.text)),
      total: Number(plain(cs[totalAt]!.text)),
      ministry: Number(plain(cs[totalAt + 1]!.text)),
      turnout: Number(plain(cs[totalAt + 2]!.text)),
    });
  }
}
if (listRows.length !== 45) fail(`List of Canadian federal elections: expected 45 rows, found ${listRows.length}`);

/**
 * Where the list table's columns go. The list groups some allied or
 * predecessor parties into the main columns as "+N" (or, for the Bloc and
 * NDP columns, in earlier years); we regroup them by our own families (see
 * src/lib/party-families.ts). Each "+N" is assigned by year so that a new
 * one fails the script instead of being guessed.
 */
const LIB_EXTRA: Record<number, { family: FederalFamily; who: string }> = {
  1926: { family: "progressive", who: "Liberal-Progressive" },
  1930: { family: "progressive", who: "Liberal-Progressive" },
  1945: { family: "other", who: "Independent Liberal" },
};

// ---------------------------------------------------------------------------
// Wikipedia: each election's infobox.

interface InfoParty {
  key: string;
  name: string;
  family: FederalFamily;
  seats: number;
  vote: number | null;
}

async function electionInfobox(year: number) {
  const box = infobox(await wiki(`${year}-canadian-federal-election`), "election");
  const parties: InfoParty[] = [];
  for (let i = 1; i <= 12; i++) {
    const rawParty = box[`party${i}`];
    if (!rawParty) continue;
    const party = rewriteTemplates(clean(rawParty), rewrite);
    const keys = [...party.matchAll(/«party:([^»]+)»/g)].map((m) => m[1]!);
    const key = keys[0] ?? plain(party);
    const info = FEDERAL_PARTY_KEYS[key] ?? fail(`${year}: unknown party "${key}" in infobox. Add it to FEDERAL_PARTY_KEYS.`);
    const seats = Number(plain(rewriteTemplates(clean(box[`seats${i}`] ?? ""), () => "")).replace(/[^\d].*$/, ""));
    const pctRaw = plain(rewriteTemplates(clean(box[`percentage${i}`] ?? ""), () => ""));
    const vote = pctRaw ? Number(pctRaw.replace(/%.*$/, "")) : null;
    if (!Number.isFinite(seats)) fail(`${year}: can't read seats for ${key}`);
    parties.push({ key, name: keys.length > 1 ? "Conservative and Liberal-Conservative" : info.name, family: info.family, seats, vote });
  }
  const house = Number(/^(\d+)/.exec(plain(clean(box.seats_for_election ?? "")))?.[1]);
  const majority = Number(plain(clean(box.majority_seats ?? "")).replace(/[^\d].*$/, "")) || null;
  return { parties, house, majority };
}

// ---------------------------------------------------------------------------
// Wikipedia: women elected.

const womenPage = await wiki("list-of-women-elected-to-canadian-parliament");
/**
 * The page counts women three ways, and they don't always agree:
 *  - the "Total" column of the proportion table;
 *  - the sum of that table's party columns;
 *  - the member tables: one row per woman per stint, with the dates she took
 *    and left office. A woman was elected at a general election if she was in
 *    office on polling day and stayed on after it (defeated members leave
 *    office the day before).
 * The figure at least two of them agree on is used. If all three differ by
 * three or fewer, the middle one is used (2019: 99, 97, 98); otherwise the run fails.
 */
const womenTable = new Map<number, { total: number; columns: number }>();
for (const raw of tableRows(womenPage, "== Proportion of women in the House ==")) {
  const row = rewriteTemplates(clean(raw), () => "");
  const year = /^\|\s*(\d{4})\s*$/m.exec(row)?.[1];
  if (!year) continue;
  const cs = cells(row).map((c) => plain(c.text));
  const num = (c: string) => Number(c.replace(/%/, ""));
  const groups = [0, 1, 2, 3].map((g) => cs.slice(1 + g * 3, 4 + g * 3)).filter((g) => g[0] !== "N/A");
  womenTable.set(Number(year), {
    total: num(cs.at(-3)!),
    columns: groups.reduce((s, g) => s + num(g[0]!), 0),
  });
}
const DTS = /\{\{dts\|([^}]+)\}\}/g;
const stints: { took: string; left: string | null }[] = [];
for (const marker of ["===First elected before 1993===", "===First elected 1993–2008===", "===First elected since 2011==="]) {
  for (const raw of tableRows(womenPage, marker)) {
    const dates = [...raw.matchAll(DTS)].map((m) => isoDate(m[1]!));
    if (!dates.length) continue; // A second row for a party change within the same stint.
    stints.push({ took: dates[0]!, left: dates[1] ?? null });
  }
}
if (stints.length < 300) fail(`Women elected: only ${stints.length} stints in the member tables`);
const womenNotes: string[] = [];
function womenElected(year: number, date: string): number {
  const t = womenTable.get(year) ?? fail(`${year}: no count of women elected`);
  const roster = stints.filter((s) => s.took <= date && (s.left === null || s.left > date)).length;
  const counts = [t.total, t.columns, roster];
  const sorted = [...counts].sort((a, b) => a - b);
  const agreed = counts.find((c, i) => counts.indexOf(c) !== i) ?? (sorted[2]! - sorted[0]! <= 3 ? sorted[1]! : undefined);
  if (agreed === undefined) fail(`Women elected, ${year}: total ${t.total}, party columns ${t.columns}, member tables ${roster}`);
  if (counts.some((c) => c !== agreed)) {
    womenNotes.push(
      `Women elected, ${year}: Wikipedia's proportion table gives a total of ${t.total} and party columns adding up to ${t.columns}; its member tables give ${roster}. ${agreed} is used.`,
    );
  }
  return agreed;
}
function isoDate(text: string): string {
  const parts = text.split("|").map((s) => s.trim());
  if (/^\d{4}$/.test(parts[0]!) && parts.length >= 3) return `${parts[0]}-${parts[1]!.padStart(2, "0")}-${parts[2]!.padStart(2, "0")}`;
  const m = /^(\w+) (\d{1,2}), (\d{4})$/.exec(parts[0]!) ?? fail(`Women elected: can't read date "${text}"`);
  const month = MONTHS.indexOf(m[1]!.toLowerCase());
  if (month < 0) fail(`Women elected: can't read date "${text}"`);
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Prime ministers (Wikidata) for the cross-check.

const pmData = JSON.parse(await readFile(resolve(DATA, "wikidata/prime-ministers.json"), "utf8")) as {
  parties: Record<string, { name: string; family: "lpc" | "cpc" }>;
  primeMinisters: { ordinal: number; name: string; terms: { start: string; end: string | null; parties: string[] }[] }[];
};
const pmFamily = new Map(Object.values(pmData.parties).map((p) => [p.name, p.family]));
function pmInOffice(date: string) {
  for (const pm of pmData.primeMinisters)
    for (const t of pm.terms) if (t.start <= date && (t.end === null || t.end >= date)) return { pm, term: t };
  return null;
}
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** The family of the governing party, from the list's colour key. */
const GOV_KEYS: Record<string, { party: string; family: "lpc" | "cpc" }> = {
  Liberal: { party: "Liberal", family: "lpc" },
  "Conservative (historical)": { party: "Conservative", family: "cpc" },
  Coalition: { party: "Unionist", family: "cpc" },
  PC: { party: "Progressive Conservative", family: "cpc" },
  Conservative: { party: "Conservative", family: "cpc" },
};

/** Context for results that are often described differently. Shown in the tooltip and table. */
const NOTES: Record<number, string> = {
  1867: "The House had 181 seats, but no member was returned for Kamouraska, where the election was called off after rioting, so 180 were filled. Many seats were won by acclamation, so vote shares are a rough guide.",
  1872: "Exactly half the seats. Contemporary party labels were loose, and Macdonald governed until the Pacific Scandal in 1873.",
  1917: "A wartime Unionist coalition of Conservatives and pro-conscription Liberals, led by Borden. Counted in the Conservative family.",
  1921: "Exactly the 118 seats needed for a majority. By-elections soon pushed the government in and out of minority.",
  1925: "The Conservatives won more seats, but King's Liberals stayed in office with Progressive support. This led to the King–Byng affair in 1926.",
  1926: "The Liberals had 116 seats; with 8 Liberal-Progressives, who usually voted with them, King had a working majority.",
  1945: "The Liberals had 118 seats, five short, but Independent Liberals gave King a working majority.",
};

// ---------------------------------------------------------------------------
// Build.

/**
 * Small disagreements between two Wikipedia tables (a seat or two, usually an
 * MP whose label differs between sources) are recorded in `_meta.notes`; the
 * list's figure is used. Anything bigger fails the run.
 */
const discrepancies: string[] = [];
function disagree(year: number, what: string, size: number) {
  if (size > 3) fail(`${year}: ${what}`);
  console.warn(`  ~ ${year}: ${what}`);
  discrepancies.push(`${year}: ${what}.`);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
// ---------------------------------------------------------------------------
// Elections Canada: milestones in who could vote, for the turnout chart.
// Each is checked against a sentence in "A History of the Vote in Canada"
// (2nd edition); if the page no longer says it, the run fails.

const HISTORY = (chapter: string) => `https://www.elections.ca/content.aspx?section=res&dir=his/${chapter}&document=index&lang=e`;
const MILESTONES = [
  {
    year: 1917,
    label: "Some women vote",
    detail: "Women in the armed forces and the female relatives of soldiers get the federal vote for the wartime election.",
    chapter: "chap2",
    evidence: "Female relatives of soldiers at the front get the right to vote through the Wartime Elections Act",
  },
  {
    year: 1921,
    label: "Women vote on equal terms",
    detail: "The first general election at which women vote under a universal franchise, after the 1918 and 1920 laws.",
    chapter: "chap2",
    evidence: "First federal election at which women vote under universal franchise",
  },
  {
    year: 1948,
    label: "Racial exclusions end",
    detail: "Parliament removes discrimination on the basis of race from the federal franchise, ending the exclusion of Japanese Canadians.",
    chapter: "chap3",
    evidence: "Voting restrictions on Japanese Canadians continued until 1948",
  },
  {
    year: 1960,
    label: "First Nations vote",
    detail: "First Nations people get the federal vote without having to give up their status under the Indian Act.",
    chapter: "chap3",
    evidence: "In 1960, First Nations people gained the right to vote at the federal level without any conditions",
  },
  {
    year: 1970,
    label: "Voting age 18",
    detail: "The voting age drops from 21 to 18, first used at the 1972 election: about two million new electors.",
    chapter: "chap3",
    evidence: "people between the ages of 18 and 20 got the vote in 1970 and used it for the first time in the 1972 election",
  },
  {
    year: 2002,
    label: "Prisoners vote",
    detail: "In Sauvé v. Canada the Supreme Court rules that the ban on voting by prisoners serving two years or more is unconstitutional.",
    chapter: "chap4",
    evidence: "Sauvé v. Canada (Chief Electoral Officer) in 2002",
  },
];
const milestones = [];
const chapters = new Map<string, string>();
for (const m of MILESTONES) {
  if (!chapters.has(m.chapter)) {
    const html = await (await politeFetch(HISTORY(m.chapter))).text();
    chapters.set(m.chapter, text(decode(html.replace(/&eacute;/g, "é").replace(/&mdash;|&ndash;/g, "–"))));
  }
  if (!chapters.get(m.chapter)!.includes(m.evidence)) fail(`A History of the Vote in Canada (${m.chapter}) no longer says: "${m.evidence}"`);
  milestones.push({ year: m.year, label: m.label, detail: m.detail, url: HISTORY(m.chapter) });
}

const blank = () => Object.fromEntries(FEDERAL_FAMILIES.map((f) => [f, 0])) as Record<FederalFamily, number>;

const elections = [];
for (const [i, row] of listRows.entries()) {
  const ecRow = ecRows[i]!;
  if (ecRow.year !== row.year) fail(`Elections Canada row ${i} is ${ecRow.year}, the list says ${row.year}`);
  if (row.number !== i + 1) fail(`List row ${i} is numbered ${row.number}`);
  const info = await electionInfobox(row.year);
  const house = row.total;

  // Seats by family.
  const seats = blank();
  const [lib, con, ndp, bloc, socred, prg, other] = row.columns as [typeof row.columns[0], ...typeof row.columns];
  seats.lpc += lib.main;
  if (lib.extra) {
    const to = LIB_EXTRA[row.year] ?? fail(`${row.year}: unexpected "+${lib.extra}" in the Liberal column. Classify it in LIB_EXTRA.`);
    seats[to.family] += lib.extra;
  }
  seats.cpc += con!.main + con!.extra;
  // Labour MPs (1921, 1930) sit in the NDP column of the list; they're "other" here.
  seats[row.year < 1935 ? "other" : "ndp"] += ndp!.main + ndp!.extra;
  // Anti-Confederation (1867) and Bloc populaire (1945) sit in the Bloc column.
  seats[row.year < 1993 ? "other" : "bq"] += bloc!.main + bloc!.extra;
  seats.socred += socred!.main + socred!.extra;
  seats.progressive += prg!.main + prg!.extra;
  seats.other += other!.main + other!.extra;
  // Greens are in "other" in the list; the infobox has their seats.
  const greenSeats = info.parties.filter((p) => p.family === "gpc").reduce((n, p) => n + p.seats, 0);
  seats.gpc += greenSeats;
  seats.other -= greenSeats;
  if (seats.other < 0) fail(`${row.year}: negative "other" seats after moving Greens`);

  // Cross-checks on seats. The list's columns must add up to its own total;
  // where they're off by a seat or two, "other" (independents and small
  // parties) takes up the difference, and the disagreement is recorded.
  const sum = Object.values(seats).reduce((a, b) => a + b, 0);
  if (sum !== house) {
    disagree(row.year, `the list's seat columns add up to ${sum}, but its total is ${house}; "other" adjusted by ${house - sum}`, Math.abs(sum - house));
    seats.other += house - sum;
    if (seats.other < 0) fail(`${row.year}: can't balance seats without negative "other"`);
  }
  if (info.house !== house) fail(`${row.year}: list says ${house} seats, infobox says ${info.house}`);
  const majority = Math.floor(house / 2) + 1;
  if (info.majority !== null && info.majority !== majority) fail(`${row.year}: infobox majority ${info.majority}, expected ${majority}`);
  const infoLib = info.parties.filter((p) => p.family === "lpc").reduce((n, p) => n + p.seats, 0);
  if (infoLib !== lib.main) disagree(row.year, `Liberal seats: ${lib.main} in the list, ${infoLib} in the election article's infobox`, Math.abs(infoLib - lib.main));
  const infoCon = info.parties.filter((p) => p.family === "cpc").reduce((n, p) => n + p.seats, 0);
  if (infoCon !== seats.cpc)
    disagree(row.year, `Conservative-family seats: ${seats.cpc} in the list, ${infoCon} in the election article's infobox`, Math.abs(infoCon - seats.cpc));

  // Votes by family, from the infobox. Parties not in the infobox are in "other".
  const vote = blank();
  for (const p of info.parties) if (p.vote !== null) vote[p.family] += p.vote;
  const listed = Object.values(vote).reduce((a, b) => a + b, 0);
  if (listed > 100.2) fail(`${row.year}: infobox vote shares add up to ${listed.toFixed(2)}%`);
  vote.other += Math.max(0, 100 - listed);
  for (const f of FEDERAL_FAMILIES) vote[f] = round1(vote[f]);

  // Government.
  const gov = GOV_KEYS[row.govKey] ?? fail(`${row.year}: unknown government colour "${row.govKey}"`);
  const govSeats = gov.family === "lpc" ? seats.lpc : seats.cpc;
  const ministry = round1((100 * govSeats) / house);
  if (Math.abs(ministry - row.ministry) > 0.15)
    fail(`${row.year}: government holds ${ministry}% of seats by our count, the list says ${row.ministry}%`);
  const type = govSeats >= majority ? "majority" : "minority";

  // Prime minister cross-check: whoever is in office 45 days after election day.
  const after = pmInOffice(addDays(ecRow.date, 45)) ?? fail(`${row.year}: no prime minister in office after the election`);
  const surname = row.pm.split(" ").at(-1)!;
  if (!after.pm.name.includes(surname)) fail(`${row.year}: list says ${row.pm}, Wikidata says ${after.pm.name}`);
  const pmFam = pmFamily.get(after.term.parties[0]!);
  if (pmFam !== gov.family) fail(`${row.year}: ${after.pm.name}'s party family is ${pmFam}, the list's government is ${gov.family}`);

  // Turnout cross-check. A bigger gap is allowed only where Elections Canada explains it in a footnote.
  if (Math.abs(ecRow.turnout - row.turnout) > 1.5) {
    if (!ecRow.turnoutNote) fail(`${row.year}: turnout ${ecRow.turnout}% (Elections Canada) vs ${row.turnout}% (Wikipedia)`);
    disagree(row.year, `turnout is ${ecRow.turnout}% at Elections Canada and ${row.turnout}% on Wikipedia; Elections Canada's footnote explains the adjustment, and its figure is used`, 0);
  }

  // Women.
  const w = row.year < 1921 ? 0 : womenElected(row.year, ecRow.date);
  if (w > house) fail(`${row.year}: ${w} women elected in a House of ${house}`);

  // Seats in the House, filled or not. Only 1867 differs: Kamouraska's election
  // was called off, so the list counts the 180 members returned. The article
  // gives the size of the first House; check it is one more.
  let seatsInHouse = house;
  if (row.year === 1867) {
    const first = /there were (\d+) MPs in the first House of Commons/.exec(await wiki("1867-canadian-federal-election"));
    seatsInHouse = Number(first?.[1] ?? fail("1867: the article no longer gives the size of the first House"));
    if (seatsInHouse !== house + 1) fail(`1867: ${seatsInHouse} seats in the first House, ${house} filled`);
  }

  elections.push({
    number: row.number,
    year: row.year,
    date: ecRow.date,
    dateLabel: ecRow.dateLabel,
    houseSize: house,
    seatsInHouse,
    majority,
    seats,
    vote,
    parties: info.parties
      .sort((a, b) => b.seats - a.seats || (b.vote ?? 0) - (a.vote ?? 0))
      .map((p) => ({ name: p.name, family: p.family, seats: p.seats, vote: p.vote })),
    turnout: ecRow.turnout,
    ...(ecRow.turnoutNote ? { turnoutNote: ecRow.turnoutNote } : {}),
    electors: ecRow.electors,
    ballots: ecRow.ballots,
    government: {
      party: gov.party,
      family: gov.family,
      primeMinister: after.pm.name,
      pmOrdinal: after.pm.ordinal,
      seats: govSeats,
      type,
    },
    women: w,
    ...(NOTES[row.year] ? { note: NOTES[row.year] } : {}),
  });
}

// Time to the next general election, for the majority/minority strip.
for (const [i, e] of elections.entries()) {
  const next = elections[i + 1];
  Object.assign(e, { nextElection: next ? next.date : null, daysToNext: next ? daysBetween(e.date, next.date) : null });
}

// 2025 against Elections Canada's official results.
{
  const official = JSON.parse(await readFile(resolve(DATA, "elections/2025/parties.json"), "utf8")) as {
    national: { parties: { party: string; share: number; seats: number }[] };
  };
  const e2025 = elections.at(-1)!;
  for (const p of official.national.parties) {
    if (p.party === "other") continue;
    const fam = p.party as FederalFamily;
    if (Math.abs(e2025.vote[fam] - p.share) > 0.1) fail(`2025 ${fam}: vote ${e2025.vote[fam]}% here, ${p.share}% official`);
    if (e2025.seats[fam] !== p.seats) fail(`2025 ${fam}: ${e2025.seats[fam]} seats here, ${p.seats} official`);
  }
}


const changed = await writeDataset(
  OUT,
  {
    source:
      "Elections Canada (turnout, electors, ballots, dates; A History of the Vote in Canada for milestones in who could vote); English Wikipedia: List of Canadian federal elections, each election's article, List of women elected to Canadian Parliament",
    url: EC_TURNOUT,
    urls: [
      EC_TURNOUT,
      wikiUrl("List of Canadian federal elections"),
      wikiUrl("List of women elected to Canadian Parliament"),
      wikiUrl("1867 Canadian federal election"),
      "https://www.elections.ca/content.aspx?section=res&dir=his&document=index&lang=e",
    ],
    licence: "Open Government Licence – Canada (Elections Canada); CC BY-SA 4.0 (Wikipedia)",
    script: "scripts/data/election-history.ts",
    notes: [
      "Turnout, electors and ballots cast are Elections Canada's figures. Dates are the last polling day.",
      "Seats by party family come from Wikipedia's list of federal elections, regrouped by the families in src/lib/party-families.ts. Green seats come from each election's infobox.",
      "Vote shares are the parties shown in each election's Wikipedia infobox, summed by family; everything else is in 'other'. Before about 1900 many seats were won by acclamation, so vote shares are less comparable.",
      "Majority: the governing party's own seats are at least half the House plus one. Allies (Liberal-Progressives in 1926, Independent Liberals in 1945) aren't counted.",
      "Women elected: the number of women elected at each general election, not counting by-elections, from Wikipedia's list, which counts them three ways; the figure two of them agree on is used. Women couldn't be elected to the House before 1919, so it's 0 before 1921.",
      ...discrepancies.map((d) => `Sources disagree, ${d}`),
      ...womenNotes,
      `Elections Canada footnote 1: ${ec.footnotes.get(1)}`,
    ],
  },
  { elections, milestones },
);
console.log(`${changed ? "✓ wrote" : "= unchanged"} ${OUT.replace(ROOT + "/", "")} (${elections.length} elections)`);
