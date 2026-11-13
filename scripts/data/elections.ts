/**
 * `pnpm data:elections`: download election, Parliament and population data and
 * write the site's datasets.
 *
 *   src/data/elections/2025/ridings.json   every riding and candidate, 45th general election
 *   src/data/elections/2025/parties.json   party vote and seat totals, national and by province
 *   src/data/elections/2025/winners.json   compact per-riding winners keyed by FED number
 *   src/data/parliament/commons.json       current House of Commons members and vacancies
 *   src/data/parliament/senate.json        Senate seats by province and current senators
 *   src/data/parliament/seat-allocation.json  how the 343 Commons seats were allocated (2022)
 *   src/data/population/provinces.json     latest quarterly population estimates
 *
 * Sources: Elections Canada (official voting results, 2023 electoral district
 * boundaries, 2022 seat allocation), House of Commons open data, Senate of
 * Canada, Statistics Canada table 17-10-0009-01.
 *
 * The script cross-checks the sources against each other and fails loudly if
 * they disagree (district numbers, seat totals, constitutional Senate seats).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { unzipSync, strFromU8 } from "fflate";
import {
  PARTIES,
  PARTY_KEYS,
  PROVINCES,
  PROVINCE_CODES,
  majorityOf,
  provinceByName,
  type PartyKey,
  type ProvinceCode,
} from "../../src/lib/elections-constants.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const UA = "tne-data-scripts/1.0 (educational static site build script)";
const FETCHED = new Date().toISOString().slice(0, 10);
const OGL = "Open Government Licence – Canada (https://open.canada.ca/en/open-government-licence-canada)";

const EC_BASE = "https://www.elections.ca/res/rep/off/ovrGE45/62/data_donnees";
const URLS = {
  ecResultsHome: "https://www.elections.ca/res/rep/off/ovrGE45/home.html",
  ecProvinceSummary: `${EC_BASE}/table_tableau03.csv`,
  ecDistricts: `${EC_BASE}/table_tableau11.csv`,
  ecCandidates: `${EC_BASE}/table_tableau12.csv`,
  ecBoundaries: "https://www.elections.ca/res/cir/mapsCorner/edb/FederalElectoralDistricts_SHP.zip",
  ecBoundariesRecord: "https://open.canada.ca/data/en/dataset/18bf3ea7-1940-46ec-af52-9ba3f77ed708",
  ecAllocation: "https://www.redecoupage-redistribution-2022.ca/red/allo/index_e.aspx",
  commonsMembers: "https://www.ourcommons.ca/Members/en/search/csv",
  commonsMembersFr: "https://www.ourcommons.ca/Members/fr/search/csv",
  senateList: (lang: "en" | "fr") =>
    `https://sencanada.ca/umbraco/surface/SenatorsAjax/GetSenators?displayFor=senatorslist&Lang=${lang}`,
  senateStandings: "https://sencanada.ca/umbraco/surface/SenatorsAjax/GetSenators?displayFor=senatorsstandings&Lang=en",
  senatePage: "https://sencanada.ca/en/senators/",
  statcanTable: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901",
  statcanWds: "https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/17100009/en",
};

// ---------------------------------------------------------------------------
// Helpers

async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res;
    if (attempt >= 3) throw new Error(`GET ${url}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}
const getText = async (url: string) => (await get(url)).text();
const getBytes = async (url: string) => new Uint8Array(await (await get(url)).arrayBuffer());

function csv(text: string): Record<string, string>[] {
  return parse(text.replace(/^﻿/, ""), { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
}

/** Find a column by the start of its (bilingual) header. */
function col(row: Record<string, string>, prefix: string): string {
  const key = Object.keys(row).find((k) => k.startsWith(prefix));
  if (key === undefined) throw new Error(`No column starting "${prefix}" in ${Object.keys(row).join(" | ")}`);
  return row[key] ?? "";
}
const num = (s: string) => {
  const n = Number(s.replace(/[,\s]/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Not a number: "${s}"`);
  return n;
};
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const pct = (part: number, whole: number, d = 2) => (whole ? round((100 * part) / whole, d) : 0);

/** Elections Canada writes em dashes in names as "--". */
const dashes = (s: string) => s.replace(/\s*--\s*/g, "—");
/** Loose key for matching district names across sources. */
const nameKey = (s: string) =>
  dashes(s)
    .normalize("NFC")
    .replace(/[–—-]/g, "-")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const decodeEntities = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é")
    .replace(/&divide;/g, "÷")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

function province(name: string): ProvinceCode {
  const pr = provinceByName(name);
  if (!pr) throw new Error(`Unknown province "${name}"`);
  return pr.code;
}

const problems: string[] = [];
const warnings: string[] = [];
function check(ok: boolean, message: string) {
  if (!ok) problems.push(message);
}

async function write(path: string, data: unknown) {
  const file = resolve(ROOT, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 1) + "\n");
  console.log(`  wrote ${path}`);
}

/** Minimal dBASE reader: enough for the attribute table of a shapefile. */
function readDbf(bytes: Uint8Array): Record<string, string>[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);
  const fields: { name: string; length: number }[] = [];
  for (let off = 32; bytes[off] !== 0x0d; off += 32) {
    const name = strFromU8(bytes.subarray(off, off + 11)).replace(/\0.*$/, "");
    fields.push({ name, length: bytes[off + 16]! });
  }
  const decoder = new TextDecoder("utf-8");
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < count; i++) {
    let off = headerLength + i * recordLength;
    if (bytes[off] === 0x2a) continue; // deleted
    off += 1;
    const row: Record<string, string> = {};
    for (const f of fields) {
      row[f.name] = decoder.decode(bytes.subarray(off, off + f.length)).replace(/\s+/g, " ").trim();
      off += f.length;
    }
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Elections Canada: party labels used in the candidate table

/** Short affiliation labels as they appear after each candidate's name in table 12. */
const EC_LABELS: Record<string, PartyKey> = {
  "Liberal/Libéral": "lpc",
  "Conservative/Conservateur": "cpc",
  "Bloc Québécois/Bloc Québécois": "bq",
  "NDP-New Democratic Party/NPD-Nouveau Parti démocratique": "ndp",
  "Green Party/Parti Vert": "gpc",
  "People's Party - PPC/Parti populaire - PPC": "other",
  "Independent/Indépendant(e)": "other",
  "No Affiliation/Aucune appartenance": "other",
  "Marxist-Leninist/Marxiste-Léniniste": "other",
  "Christian Heritage Party/Parti de l'Héritage Chrétien": "other",
  "Parti Rhinocéros Party/Parti Rhinocéros Party": "other",
  "Communist/Communiste": "other",
  "Canadian Future Party/Parti Avenir Canadien": "other",
  "United Party of Canada (UP)/Parti Uni du Canada (UP)": "other",
  "Centrist/Centriste": "other",
  "Libertarian/Libertarien": "other",
  "Animal Protection Party/Parti Protection Animaux": "other",
  "Marijuana Party/Parti Marijuana": "other",
};
const LABELS_LONGEST_FIRST = Object.keys(EC_LABELS).sort((a, b) => b.length - a.length);

function splitCandidate(raw: string) {
  const s = raw.replace(/\s+/g, " ").trim();
  const label = LABELS_LONGEST_FIRST.find((l) => s.endsWith(" " + l));
  if (!label) throw new Error(`Unrecognized party label in candidate "${raw}". Add it to EC_LABELS.`);
  let name = s.slice(0, s.length - label.length).trim();
  const incumbent = name.endsWith("**");
  if (incumbent) name = name.slice(0, -2).trim();
  return { name, label, labelEn: label.split("/")[0]!, labelFr: label.split("/")[1] ?? label, party: EC_LABELS[label]!, incumbent };
}

/** House of Commons caucus short names. */
const CAUCUS: Record<string, PartyKey> = {
  Liberal: "lpc",
  Conservative: "cpc",
  "Bloc Québécois": "bq",
  NDP: "ndp",
  "Green Party": "gpc",
  Independent: "other",
};

/** Constitution Act, 1867, ss. 21–22 (as amended, including the Constitution Act, 1999 (Nunavut)). */
const SENATE_SEATS: Record<ProvinceCode, number> = {
  ON: 24, QC: 24, NS: 10, NB: 10, PE: 4, MB: 6, SK: 6, AB: 6, BC: 6, NL: 6, YT: 1, NT: 1, NU: 1,
};
const SENATE_DIVISION: Record<ProvinceCode, string> = {
  ON: "Ontario", QC: "Quebec", NS: "Maritimes", NB: "Maritimes", PE: "Maritimes",
  MB: "Western", SK: "Western", AB: "Western", BC: "Western", NL: "Newfoundland and Labrador",
  YT: "Territories", NT: "Territories", NU: "Territories",
};

// ---------------------------------------------------------------------------

console.log("Downloading…");
const [provinceCsv, districtCsv, candidateCsv, boundaryZip, allocationHtml, membersCsv, membersFrCsv, senateEn, senateFr, standingsHtml, wds] =
  await Promise.all([
    getText(URLS.ecProvinceSummary),
    getText(URLS.ecDistricts),
    getText(URLS.ecCandidates),
    getBytes(URLS.ecBoundaries),
    getText(URLS.ecAllocation),
    getText(URLS.commonsMembers),
    getText(URLS.commonsMembersFr),
    getText(URLS.senateList("en")),
    getText(URLS.senateList("fr")),
    getText(URLS.senateStandings),
    get(URLS.statcanWds).then((r) => r.json() as Promise<{ status: string; object: string }>),
  ]);
if (wds.status !== "SUCCESS") throw new Error(`Statistics Canada WDS: ${JSON.stringify(wds)}`);
const popZip = await getBytes(wds.object);
const resultsHome = await getText(URLS.ecResultsHome);
const resultsStatus = /Official Voting Results/i.test(resultsHome) ? "official" : "unknown";
check(resultsStatus === "official", "Elections Canada results page no longer says 'Official Voting Results'");

// ---------------------------------------------------------------------------
// Statistics Canada: population, latest quarter

const popFile = Object.entries(unzipSync(popZip, { filter: (f) => f.name === "17100009.csv" }))[0];
if (!popFile) throw new Error("17100009.csv missing from Statistics Canada zip");
const popRows = csv(strFromU8(popFile[1]));
const latest = popRows.reduce((m, r) => (r.REF_DATE! > m ? r.REF_DATE! : m), "");
const latestRows = popRows.filter((r) => r.REF_DATE === latest);
const canadaPop = num(latestRows.find((r) => r.GEO === "Canada")!.VALUE!);
/** PRUID per province, read from Statistics Canada's own DGUIDs (e.g. 2021A000235 → 35). */
const statcanPruid = new Map<ProvinceCode, string>();
const population = PROVINCE_CODES.map((code) => {
  const row = latestRows.find((r) => r.GEO === PROVINCES[code].en);
  if (!row) throw new Error(`No population for ${code} at ${latest}`);
  statcanPruid.set(code, row.DGUID!.slice(-2));
  check(row.DGUID!.slice(-2) === PROVINCES[code].pruid, `PRUID for ${code}: StatCan says ${row.DGUID}, constants say ${PROVINCES[code].pruid}`);
  return { province: code, population: num(row.VALUE!), share: pct(num(row.VALUE!), canadaPop, 3) };
});
check(
  population.reduce((s, r) => s + r.population, 0) === canadaPop,
  "Provincial populations don't add up to Canada's",
);

// ---------------------------------------------------------------------------
// Elections Canada: 2023 Representation Order districts (numbers and official names)

const dbfEntry = Object.entries(unzipSync(boundaryZip, { filter: (f) => f.name.toLowerCase().endsWith(".dbf") }))[0];
if (!dbfEntry) throw new Error("No .dbf in the boundary zip");
const dbfRows = readDbf(dbfEntry[1]);
const numField = Object.keys(dbfRows[0]!).find((k) => /NUM/i.test(k))!;
const enField = Object.keys(dbfRows[0]!).find((k) => /NAMEE|NOME?_?E/i.test(k) && !/F$/i.test(k)) ?? "ED_NAMEE";
const frField = Object.keys(dbfRows[0]!).find((k) => /NOMF|NAMEF/i.test(k))!;
const feds = new Map<number, { en: string; fr: string }>();
for (const r of dbfRows) feds.set(num(r[numField]!), { en: r[enField]!, fr: r[frField]! });
check(feds.size === 343, `Boundary file has ${feds.size} districts, expected 343`);

// ---------------------------------------------------------------------------
// Elections Canada: official results

const districtRows = csv(districtCsv);
const candidateRows = csv(candidateCsv);

interface Candidate {
  name: string;
  party: PartyKey;
  affiliationEn: string;
  affiliationFr: string;
  votes: number;
  share: number;
  elected: boolean;
  incumbent: boolean;
}
interface Riding {
  fed: number;
  nameEn: string;
  nameFr: string;
  province: ProvinceCode;
  population: number;
  electors: number;
  validVotes: number;
  rejectedBallots: number;
  totalVotes: number;
  turnout: number;
  candidates: Candidate[];
}

const ridings: Riding[] = districtRows.map((r) => {
  const fed = num(col(r, "Electoral District Number"));
  const official = feds.get(fed);
  const ecName = col(r, "Electoral District Name");
  check(!!official, `District ${fed} (${ecName}) is not in the 2023 Representation Order boundary file`);
  const [nameEn, nameFr = nameEn] = ecName.split("/").map((s) => dashes(s.trim())) as [string, string?];
  if (official && nameKey(nameEn) !== nameKey(official.en) && !official.en.includes(","))
    warnings.push(`District ${fed}: "${nameEn}" at the election, "${official.en}" in the current boundary file (renamed since)`);
  const code = province(col(r, "Province"));
  check(String(fed).slice(0, 2) === statcanPruid.get(code), `District ${fed} is in ${code}, but its prefix isn't StatCan's PRUID ${statcanPruid.get(code)}`);
  const electors = num(col(r, "Electors"));
  const totalVotes = num(col(r, "Total Ballots Cast"));
  return {
    fed,
    nameEn,
    nameFr,
    province: code,
    population: num(col(r, "Population")),
    electors,
    validVotes: num(col(r, "Valid Ballots")),
    rejectedBallots: num(col(r, "Rejected Ballots")),
    totalVotes,
    turnout: pct(totalVotes, electors, 1),
    candidates: [],
  };
});
const byFed = new Map(ridings.map((r) => [r.fed, r]));

/**
 * The district's name today. Parliament has renamed some districts since the election, and the
 * boundary file carries the new names. A few of its records repeat the name, comma-separated;
 * those fall back to the name at the election.
 */
function currentName(fed: number): { en: string; fr: string } {
  const b = feds.get(fed);
  const r = byFed.get(fed)!;
  if (!b || !b.en || !b.fr || b.en.includes(",") || b.fr.includes(",")) return { en: r.nameEn, fr: r.nameFr };
  return { en: b.en, fr: b.fr };
}
check(ridings.length === 343, `Results have ${ridings.length} districts, expected 343`);
for (const fed of feds.keys()) check(byFed.has(fed), `Boundary district ${fed} has no results`);

for (const r of candidateRows) {
  const fed = num(col(r, "Electoral District Number"));
  const riding = byFed.get(fed);
  if (!riding) throw new Error(`Candidate row for unknown district ${fed}`);
  const c = splitCandidate(col(r, "Candidate/"));
  riding.candidates.push({
    name: c.name,
    party: c.party,
    affiliationEn: c.labelEn,
    affiliationFr: c.labelFr,
    votes: num(col(r, "Votes Obtained")),
    share: num(col(r, "Percentage of Votes Obtained") || "0"),
    elected: col(r, "Majority/").trim() !== "",
    incumbent: c.incumbent,
  });
}
for (const r of ridings) {
  r.candidates.sort((a, b) => b.votes - a.votes);
  const elected = r.candidates.filter((c) => c.elected);
  check(elected.length === 1, `District ${r.fed} has ${elected.length} elected candidates`);
  check(elected[0] === r.candidates[0], `District ${r.fed}: the elected candidate doesn't have the most votes`);
  const sum = r.candidates.reduce((s, c) => s + c.votes, 0);
  check(sum === r.validVotes, `District ${r.fed}: candidate votes ${sum} ≠ valid ballots ${r.validVotes}`);
}

// Party totals, national and per province
type Tally = { party: PartyKey; votes: number; share: number; seats: number; seatShare: number; candidates: number };
function tally(list: Riding[]): { validVotes: number; seats: number; parties: Tally[] } {
  const validVotes = list.reduce((s, r) => s + r.validVotes, 0);
  const seats = list.length;
  const parties = PARTY_KEYS.map((party) => {
    const cands = list.flatMap((r) => r.candidates.filter((c) => c.party === party));
    const votes = cands.reduce((s, c) => s + c.votes, 0);
    const won = cands.filter((c) => c.elected).length;
    return { party, votes, share: pct(votes, validVotes), seats: won, seatShare: pct(won, seats), candidates: cands.length };
  });
  return { validVotes, seats, parties };
}
const provinceSummary = new Map(csv(provinceCsv).map((r) => [province(col(r, "Province")), r]));
const national = tally(ridings);
const nationalElectors = ridings.reduce((s, r) => s + r.electors, 0);
const nationalBallots = ridings.reduce((s, r) => s + r.totalVotes, 0);
const byProvince = PROVINCE_CODES.map((code) => {
  const list = ridings.filter((r) => r.province === code);
  const t = tally(list);
  const electors = list.reduce((s, r) => s + r.electors, 0);
  const totalVotes = list.reduce((s, r) => s + r.totalVotes, 0);
  const summary = provinceSummary.get(code);
  check(!!summary && num(col(summary, "Valid Ballots")) === t.validVotes, `${code}: district valid ballots don't match the province summary`);
  check(!!summary && num(col(summary, "Electors")) === electors, `${code}: district electors don't match the province summary`);
  return { province: code, electors, totalVotes, turnout: pct(totalVotes, electors, 1), ...t };
});

/** Votes for every affiliation, so "other" can be broken down. */
const affiliations = new Map<string, { en: string; fr: string; party: PartyKey; votes: number; seats: number; candidates: number }>();
for (const r of ridings)
  for (const c of r.candidates) {
    const a = affiliations.get(c.affiliationEn) ?? { en: c.affiliationEn, fr: c.affiliationFr, party: c.party, votes: 0, seats: 0, candidates: 0 };
    a.votes += c.votes;
    a.candidates += 1;
    if (c.elected) a.seats += 1;
    affiliations.set(c.affiliationEn, a);
  }

const ecMeta = (what: string, url: string) => ({
  source: `Elections Canada, Official Voting Results, 45th General Election (April 28, 2025): ${what}`,
  url,
  licence: `${OGL}. Elections Canada publishes its official voting results datasets under this licence on open.canada.ca.`,
  fetched: FETCHED,
  status: resultsStatus,
});

// ---------------------------------------------------------------------------
// House of Commons: current members

const memberRows = csv(membersCsv);
const frenchConstituency = new Map(csv(membersFrCsv).map((m) => [m["ID de la personne"]!, m.Circonscription!]));
/** Match by the name at the election and by the current name in the boundary file (some districts have been renamed since). */
const fedByName = new Map([
  ...[...feds].map(([fed, n]) => [nameKey(n.en), fed] as const),
  ...ridings.map((r) => [nameKey(r.nameEn), r.fed] as const),
]);
const members = memberRows.map((m) => {
  const caucus = m["Political Affiliation"]!;
  const party = CAUCUS[caucus];
  if (!party) throw new Error(`Unknown caucus "${caucus}". Add it to CAUCUS.`);
  const constituency = m.Constituency!;
  const fed = fedByName.get(nameKey(constituency));
  if (fed === undefined) throw new Error(`Can't match constituency "${constituency}" to a district number`);
  const code = province(m["Province / Territory"]!);
  check(byFed.get(fed)?.province === code, `${constituency}: province ${code} doesn't match district ${fed}`);
  return {
    personId: Number(m["Person ID"]),
    name: [m["Honorific Title"], m["First Name"], m["Last Name"]].filter(Boolean).join(" "),
    party,
    caucus,
    fed,
    constituency,
    constituencyFr: frenchConstituency.get(m["Person ID"]!) ?? currentName(fed).fr,
    province: code,
    since: (m["Start Date"] ?? "").slice(0, 10),
  };
});
members.sort((a, b) => a.fed - b.fed);
const seated = new Set(members.map((m) => m.fed));
check(seated.size === members.length, "Two current members share a constituency");
const vacancies = [...feds.keys()]
  .filter((fed) => !seated.has(fed))
  .sort((a, b) => a - b)
  .map((fed) => ({ fed, constituency: currentName(fed).en, constituencyFr: currentName(fed).fr, province: byFed.get(fed)!.province }));
const standing = Object.fromEntries(PARTY_KEYS.map((k) => [k, members.filter((m) => m.party === k).length])) as Record<PartyKey, number>;

// ---------------------------------------------------------------------------
// Senate

function senators(html: string) {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  if (!body) throw new Error("Senate list: no table body");
  return [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, tr]) => {
    const cells = [...tr!.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
    const order = (i: number) => decodeEntities(cells[i]?.[1]?.match(/data-order="([^"]*)"/)?.[1] ?? "");
    const search = (i: number) => cells[i]?.[1]?.match(/data-search="([^"]*)"/)?.[1] ?? "";
    return {
      name: order(0),
      affiliation: search(1).replace(/^aff-/, "").replace(/-$/, ""),
      province: province(order(2)),
    };
  });
}
function affiliationNames(html: string) {
  const group = html.match(/<optgroup label="[^"]*affiliation[^"]*">([\s\S]*?)<\/optgroup>/i)?.[1] ?? "";
  return new Map([...group.matchAll(/value="aff-([^"]+?)-?"[^>]*>([^<]*)</g)].map(([, code, label]) => [code!, decodeEntities(label!).trim()]));
}
function affiliationNamesFr(html: string) {
  const group = html.match(/<optgroup label="[^"]*(affiliation|appartenance)[^"]*">([\s\S]*?)<\/optgroup>/i)?.[2] ?? "";
  return new Map([...group.matchAll(/value="aff-([^"]+?)-?"[^>]*>([^<]*)</g)].map(([, code, label]) => [code!, decodeEntities(label!).trim()]));
}
const senateList = senators(senateEn);
const affEn = affiliationNames(senateEn);
const affFr = affiliationNamesFr(senateFr);
const standingsText = stripTags(standingsHtml);
const vacantMatch = standingsText.match(/Vacant seats (\d+)\s*(.*?)\s*TOTAL (\d+)/);
if (!vacantMatch) throw new Error(`Senate standings: can't read vacancies from "${standingsText}"`);
const senateVacant = new Map<ProvinceCode, number>();
for (const [, name, n] of vacantMatch[2]!.matchAll(/([A-Z][A-Za-z .]+?) \((\d+)\)/g)) senateVacant.set(province(name!), Number(n));
check(Number(vacantMatch[1]) === [...senateVacant.values()].reduce((s, n) => s + n, 0), "Senate vacancies by province don't add up");
check(Number(vacantMatch[3]) === 105, `Senate standings total is ${vacantMatch[3]}, expected 105`);
const senateAffiliations = [...affEn].map(([code, en]) => ({
  code,
  en,
  fr: affFr.get(code) ?? en,
  senators: senateList.filter((s) => s.affiliation === code).length,
}));
for (const s of senateList) check(affEn.has(s.affiliation), `Senator ${s.name}: unknown affiliation "${s.affiliation}"`);
for (const a of senateAffiliations) {
  const m = standingsText.match(new RegExp(`${a.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d+)`));
  check(!!m && Number(m[1]) === a.senators, `Senate: ${a.en} has ${a.senators} senators in the list but ${m?.[1]} in the standings`);
}
const senateSeats = PROVINCE_CODES.map((code) => {
  const sitting = senateList.filter((s) => s.province === code).length;
  const vacant = senateVacant.get(code) ?? 0;
  check(sitting + vacant === SENATE_SEATS[code], `Senate ${code}: ${sitting} senators + ${vacant} vacant ≠ ${SENATE_SEATS[code]} constitutional seats`);
  return { province: code, division: SENATE_DIVISION[code], seats: SENATE_SEATS[code], senators: sitting, vacant };
});

// ---------------------------------------------------------------------------
// Seat allocation (2022 redistribution)

const allocTable = allocationHtml.match(/<table[\s\S]*?<\/table>/)?.[0] ?? "";
let quotient = 0;
const allocation = [...allocTable.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  .map(([, tr]) => [...tr!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(([, c]) => stripTags(c!)))
  .filter((cells) => cells.length >= 2 && provinceByName(cells[0]!))
  .map((cells) => {
    const code = province(cells[0]!);
    const n = (s: string | undefined) => (s && /\d/.test(s) ? num(s) : 0);
    const rest = cells.slice(1);
    if (PROVINCES[code].territory) {
      // Territories: population, "n/a", total
      return { province: code, population2021: n(rest[0]), initial: 0, senatorialClause: 0, grandfatherClause: 0, representationRule: 0, total: n(rest.at(-1)) };
    }
    // Provinces: population, [electoral quotient, first row only, spanning the column], initial, senatorial, grandfather, representation rule, total
    if (rest.length === 7) quotient = n(rest.splice(1, 1)[0]);
    if (rest.length !== 6) throw new Error(`Seat allocation: unexpected row for ${code}: ${cells.join(" | ")}`);
    return {
      province: code,
      population2021: n(rest[0]),
      initial: n(rest[1]),
      senatorialClause: n(rest[2]),
      grandfatherClause: n(rest[3]),
      representationRule: n(rest[4]),
      total: n(rest[5]),
    };
  });
check(quotient > 100_000, `Seat allocation: electoral quotient not found (${quotient})`);
check(allocation.length === 13, `Seat allocation: parsed ${allocation.length} rows, expected 13`);
for (const a of allocation) {
  const seats = ridings.filter((r) => r.province === a.province).length;
  check(a.total === seats, `Seat allocation ${a.province}: ${a.total} seats, but ${seats} districts in the results`);
  if (!PROVINCES[a.province].territory)
    check(
      a.initial + a.senatorialClause + a.grandfatherClause + a.representationRule === a.total,
      `Seat allocation ${a.province}: parts don't add up to ${a.total}`,
    );
}

// ---------------------------------------------------------------------------

if (warnings.length) console.warn(`\n${warnings.length} warning(s):\n- ${warnings.join("\n- ")}\n`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

console.log("Writing…");
await write("src/data/elections/2025/ridings.json", {
  _meta: {
    ...ecMeta("tables 11 (voting results by electoral district) and 12 (candidates and their results)", URLS.ecResultsHome),
    urls: [URLS.ecDistricts, URLS.ecCandidates],
    notes:
      "District numbers are the 2023 Representation Order numbers. They were checked against Elections Canada's 2023 boundary file " +
      "and their first two digits against Statistics Canada's province codes (PRUID). " +
      "Statistics Canada's FED 2023 FEDUIDs use the same five-digit numbers. Names are Elections Canada's official English and French names (em dashes restored). totalVotes is all ballots cast, including rejected ballots; " +
      "turnout is totalVotes ÷ electors. Candidate share is Elections Canada's percentage of valid votes.",
    boundaries: { source: "Elections Canada, Federal Electoral District boundaries (2023)", url: URLS.ecBoundariesRecord, licence: OGL },
    renamed:
      "Names are as at the election. Where Parliament has since renamed a district, currentName holds the name in Elections Canada's current boundary file.",
  },
  ridings: ridings.map(({ fed, nameEn, nameFr, ...rest }) => {
    const now = currentName(fed);
    return { fed, nameEn, nameFr, ...(nameKey(now.en) !== nameKey(nameEn) ? { currentName: now } : {}), ...rest };
  }),
});

await write("src/data/elections/2025/parties.json", {
  _meta: {
    ...ecMeta("table 12 (candidates and their results), summed by party", URLS.ecCandidates),
    notes:
      "Parties are normalized to lpc, cpc, bq, ndp, gpc and other (every other party, independents and candidates with no affiliation). " +
      "share is the percentage of valid votes; seatShare is the percentage of the province's or country's seats.",
  },
  parties: PARTIES,
  national: {
    seats: national.seats,
    majority: majorityOf(national.seats),
    electors: nationalElectors,
    totalVotes: nationalBallots,
    validVotes: national.validVotes,
    turnout: pct(nationalBallots, nationalElectors, 1),
    parties: national.parties,
  },
  byProvince,
  affiliations: [...affiliations.values()]
    .sort((a, b) => b.votes - a.votes)
    .map((a) => ({ ...a, share: pct(a.votes, national.validVotes) })),
});

await write("src/data/elections/2025/winners.json", {
  _meta: {
    ...ecMeta("winners per electoral district, from tables 11 and 12", URLS.ecResultsHome),
    notes:
      "Keyed by FED number (2023 Representation Order; same as Statistics Canada FEDUID). name is the official English name, nameFr the French. " +
      "party is the winner's normalized party key. margin is the winner's lead over the runner-up in percentage points of valid votes; " +
      "marginVotes is the same lead in votes. turnout is the percentage of electors who cast a ballot.",
  },
  winners: ridings.map((r) => {
    const [first, second] = r.candidates;
    const marginVotes = first!.votes - (second?.votes ?? 0);
    return {
      fed: r.fed,
      name: r.nameEn,
      nameFr: r.nameFr,
      province: r.province,
      party: first!.party,
      winner: first!.name,
      margin: pct(marginVotes, r.validVotes, 1),
      marginVotes,
      turnout: r.turnout,
    };
  }),
});

await write("src/data/parliament/commons.json", {
  _meta: {
    source: "House of Commons of Canada, Members of Parliament (open data export)",
    url: URLS.commonsMembers,
    licence:
      "House of Commons: reproduction permitted provided it is accurate and not presented as official; not for commercial gain " +
      "(https://www.ourcommons.ca/en/important-notices)",
    fetched: FETCHED,
    notes:
      "The current standing, which changes with by-elections, resignations and floor-crossings. Kept separate from the 2025 election results. " +
      "Constituencies are matched to 2023 Representation Order district numbers by name. The Speaker is counted with their caucus.",
  },
  seats: feds.size,
  majority: majorityOf(feds.size),
  standing,
  vacant: vacancies.length,
  members,
  vacancies,
});

await write("src/data/parliament/senate.json", {
  _meta: {
    source: "Senate of Canada, Senators (list and standings)",
    url: URLS.senatePage,
    licence: "Senate of Canada; see https://sencanada.ca/en/important-notices/",
    fetched: FETCHED,
    notes:
      "Seats per province are fixed by the Constitution Act, 1867, ss. 21–22 (105 in all). The script checks that sitting senators plus " +
      "vacancies equal those numbers. Affiliation codes are the Senate's own.",
  },
  seats: 105,
  byProvince: senateSeats,
  affiliations: senateAffiliations,
  vacant: senateSeats.reduce((s, r) => s + r.vacant, 0),
  senators: senateList.sort((a, b) => a.name.localeCompare(b.name, "en")),
});

await write("src/data/parliament/seat-allocation.json", {
  _meta: {
    source: "Elections Canada, Federal electoral districts redistribution 2022: allocation of seats in the House of Commons",
    url: URLS.ecAllocation,
    licence: OGL,
    fetched: FETCHED,
    notes:
      "Seats per province used from the 2025 general election. Population is Statistics Canada's July 1, 2021 estimate, as used by " +
      "the Chief Electoral Officer. initial = population ÷ electoral quotient, rounded up. Then the senatorial clause (no province has fewer " +
      "MPs than senators, Constitution Act, 1867, s. 51A), the grandfather clause (no province has fewer seats than in the 43rd Parliament, " +
      "as amended in 2022) and the representation rule. Each territory has one seat.",
  },
  quotient,
  total: allocation.reduce((s, a) => s + a.total, 0),
  provinces: allocation,
});

await write("src/data/population/provinces.json", {
  _meta: {
    source: "Statistics Canada, Table 17-10-0009-01, Population estimates, quarterly",
    url: URLS.statcanTable,
    licence: `Statistics Canada Open Licence (${"https://www.statcan.gc.ca/en/terms-conditions/open-licence"}), which follows the ${OGL.split(" (")[0]}`,
    fetched: FETCHED,
    doi: "https://doi.org/10.25318/1710000901-eng",
  },
  refDate: latest,
  canada: canadaPop,
  provinces: population,
});

console.log(
  `\nDone. ${ridings.length} ridings, ${candidateRows.length} candidates (${resultsStatus} results); ` +
    `${members.length} MPs, ${vacancies.length} vacant; ${senateList.length} senators; population at ${latest}.`,
);
