/**
 * `pnpm data:demographics`: census series for the demographics page, from
 * Statistics Canada open data (Open Government Licence – Canada).
 *
 *   src/data/demographics/language.json       English, French and other mother
 *                                             tongues, 1951–2021 (15-10-0031)
 *   src/data/demographics/immigrant-origins.json
 *                                             immigrants living in Canada in 2021,
 *                                             by region of birth and when they
 *                                             arrived (98-10-0302)
 *   src/data/demographics/urban-rural.json    urban and rural population,
 *                                             1871–1971 (17-10-0068) and 2021
 *                                             (98-10-0008)
 *   src/data/demographics/indigenous.json     First Nations, Métis and Inuit,
 *                                             2011, 2016 and 2021 (98-10-0292)
 *   src/data/demographics/age-pyramid.json    population by five-year age group
 *                                             and gender, July 1, now and 50
 *                                             years earlier (17-10-0005)
 *
 * Small tables come as full-table CSV zips. Large ones are read cell by cell
 * through the Web Data Service (WDS), which serves any cube by coordinate.
 * Every dataset is cross-checked (totals add up, known values land in range)
 * and the script stops with an error if anything is off.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { strFromU8, unzipSync } from "fflate";
import { politeFetch } from "../grounding/http.ts";

const OUT = resolve(import.meta.dirname, "../../src/data/demographics");
const LICENCE = "Open Government Licence – Canada";
const LICENCE_URL = "https://www.statcan.gc.ca/en/reference/licence";
const WDS = "https://www150.statcan.gc.ca/t1/wds/rest";
const today = new Date().toISOString().slice(0, 10);

const tableId = (pid: string) => `${pid.slice(0, 2)}-${pid.slice(2, 4)}-${pid.slice(4, 8)}-01`;
const tablePage = (pid: string) => `https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=${pid}01`;
const meta = (pids: string[], title: string, notes: string[]) => ({
  source: `Statistics Canada, ${pids.length > 1 ? "tables" : "table"} ${pids.map(tableId).join(" and ")}: ${title}`,
  url: tablePage(pids[0]!),
  urls: pids.map(tablePage),
  licence: LICENCE,
  licenceUrl: LICENCE_URL,
  fetched: today,
  notes,
  script: "scripts/data/demographics.ts",
});

function check(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(`Cross-check failed: ${message}`);
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

type Row = Record<string, string>;
/** A full-table CSV from www150 as rows keyed by column name. */
async function table(pid: string): Promise<{ header: string[]; rows: Row[]; raw: string[][] }> {
  const res = await politeFetch(`https://www150.statcan.gc.ca/n1/tbl/csv/${pid}-eng.zip`);
  const zip = unzipSync(new Uint8Array(await res.arrayBuffer()), { filter: (f) => f.name === `${pid}.csv` });
  const csv = zip[`${pid}.csv`];
  if (!csv) throw new Error(`${pid}.csv not in the zip`);
  const raw = parse(strFromU8(csv), { bom: true, relax_column_count: true, relax_quotes: true, skip_empty_lines: true }) as string[][];
  const header = raw[0]!;
  const rows = raw.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
  console.log(`  · ${tableId(pid)}: ${rows.length} rows`);
  return { header, rows, raw: raw.slice(1) };
}

/** Values from a cube by coordinate (member ids per dimension), via WDS. Returns coordinate → (ref year → value). */
async function cells(pid: string, coords: string[], latestN = 1): Promise<Map<string, Map<number, number>>> {
  const pad = (c: string) => [...c.split("."), ...Array(10).fill("0")].slice(0, 10).join(".");
  const out = new Map<string, Map<number, number>>();
  for (let i = 0; i < coords.length; i += 100) {
    const body = coords.slice(i, i + 100).map((c) => ({ productId: Number(pid), coordinate: pad(c), latestN }));
    const res = await politeFetch(`${WDS}/getDataFromCubePidCoordAndLatestNPeriods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { status: string; object: { coordinate: string; vectorDataPoint: { refPer: string; value: number | null }[] } }[];
    // Answers don't come back in request order, so match them by coordinate.
    // A cell the cube doesn't have (an empty combination) comes back FAILED and
    // stays absent; `one` decides whether that's allowed.
    const short = new Map(coords.slice(i, i + 100).map((c) => [pad(c), c]));
    for (const r of json) {
      if (r.status !== "SUCCESS") continue;
      const key = short.get(r.object.coordinate);
      if (!key) throw new Error(`WDS ${pid}: unexpected coordinate ${r.object.coordinate}`);
      const series = new Map<number, number>();
      for (const p of r.object.vectorDataPoint) if (p.value !== null) series.set(Number(p.refPer.slice(0, 4)), p.value);
      out.set(key, series);
    }
  }
  console.log(`  · ${tableId(pid)}: ${coords.length} series via WDS`);
  return out;
}
const one = (m: Map<string, Map<number, number>>, c: string, year?: number, optional = false) => {
  const s = m.get(c);
  if (!s?.size && optional) return 0;
  if (!s?.size) throw new Error(`No value for ${c}`);
  const v = year === undefined ? [...s.values()].at(-1) : s.get(year);
  if (v === undefined) throw new Error(`No value for ${c} in ${year}`);
  return v;
};

async function write(name: string, data: object) {
  await mkdir(OUT, { recursive: true });
  const path = resolve(OUT, `${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
  console.log(`  ✓ src/data/demographics/${name}.json`);
}

// ---------------------------------------------------------------------------
// Language: mother tongue, 1951–2021
// ---------------------------------------------------------------------------
console.log("Mother tongue");
{
  const { rows } = await table("15100031");
  const GEOS = [
    { slug: "canada", name: "Canada" },
    { slug: "quebec", name: "Quebec" },
    { slug: "new-brunswick", name: "New Brunswick" },
    { slug: "ontario", name: "Ontario" },
  ];
  // "Distributed": people who reported more than one mother tongue are shared
  // out among them, so English + French + other = 100%.
  const keep = rows.filter((r) => r["Multiple responses"] === "Distributed");
  const val = (geo: string, year: string, tongue: string, stat: "Number" | "Percentage") => {
    const r = keep.find((x) => x.GEO === geo && x.REF_DATE === year && x["Mother tongue"] === tongue && x.Statistics === stat);
    if (!r || r.VALUE === "") throw new Error(`No ${stat} for ${tongue}, ${geo}, ${year}`);
    return Number(r.VALUE);
  };
  const years = [...new Set(keep.map((r) => r.REF_DATE!))].sort();
  check(years[0] === "1951" && years.length >= 11, `census years ${years.join(",")}`);
  const series = GEOS.map((g) => ({
    ...g,
    points: years.map((y) => {
      const total = val(g.name, y, "Total, mother tongue", "Number");
      const english = val(g.name, y, "English", "Number");
      const french = val(g.name, y, "French", "Number");
      const other = val(g.name, y, "Non-official language", "Number");
      check(near(english + french + other, total, total * 0.002), `${g.name} ${y}: parts add to the total`);
      const pc = (n: number) => round((100 * n) / total);
      check(near(pc(french), val(g.name, y, "French", "Percentage"), 0.15), `${g.name} ${y}: French % matches StatCan's`);
      return { year: Number(y), total, english, french, other, englishPct: pc(english), frenchPct: pc(french), otherPct: pc(other) };
    }),
  }));
  const qc2021 = series.find((s) => s.slug === "quebec")!.points.at(-1)!;
  check(qc2021.frenchPct > 70 && qc2021.frenchPct < 85, `Quebec French 2021 = ${qc2021.frenchPct}`);
  const ca1951 = series[0]!.points[0]!;
  check(ca1951.frenchPct > 27 && ca1951.frenchPct < 31, `Canada French 1951 = ${ca1951.frenchPct}`);
  await write("language", {
    _meta: meta(["15100031"], "population by mother tongue and geography, 1951 to 2021", [
      "Mother tongue: the first language learned at home in childhood and still understood.",
      "People who reported more than one mother tongue are distributed among the languages they reported (StatCan's 'Distributed' series), so English, French and other languages add to 100%.",
      "Newfoundland and Labrador is included in Canada from 1951. Figures are census counts, each in its own year's boundaries.",
    ]),
    series,
  });
}

// ---------------------------------------------------------------------------
// Immigrants by region of birth and period of immigration (2021 Census)
// ---------------------------------------------------------------------------
console.log("Immigrants by region of birth");
{
  const PID = "98100302";
  // Dimensions: geography, citizenship, age, gender, statistic, place of birth, immigrant status/period.
  const REGIONS = [
    { key: "europe", name: "Europe", ids: [77] },
    { key: "asia", name: "Asia", ids: [199] },
    { key: "americas", name: "The Americas", ids: [17] },
    { key: "africa", name: "Africa", ids: [135] },
    { key: "other", name: "Oceania and other", ids: [256, 285, 290] },
  ];
  const PERIODS = [
    { id: 4, label: "Before 1980" },
    { id: 5, label: "1980 to 1990" },
    { id: 6, label: "1991 to 2000" },
    { id: 7, label: "2001 to 2010" },
    { id: 9, label: "2011 to 2015" },
    { id: 10, label: "2016 to 2021" },
  ];
  const coord = (pob: number, period: number) => `1.1.1.1.1.${pob}.${period}`;
  const wanted = [
    ...REGIONS.flatMap((r) => r.ids.flatMap((pob) => [3, ...PERIODS.map((p) => p.id)].map((per) => coord(pob, per)))),
    ...[3, ...PERIODS.map((p) => p.id)].map((per) => coord(16, per)), // born outside Canada: the total
  ];
  const data = await cells(PID, wanted);
  // "Other" places of birth are tiny and some periods have no cell at all; the totals check still applies.
  const count = (r: (typeof REGIONS)[number], per: number) => r.ids.reduce((n, pob) => n + one(data, coord(pob, per), undefined, r.key === "other"), 0);
  const periods = PERIODS.map((p) => {
    const total = one(data, coord(16, p.id));
    const byRegion = Object.fromEntries(REGIONS.map((r) => [r.key, count(r, p.id)]));
    const sum = Object.values(byRegion).reduce((a, b) => a + b, 0);
    check(near(sum, total, total * 0.01), `${p.label}: regions add to the total (${sum} vs ${total})`);
    return { label: p.label, total, ...byRegion };
  });
  const all = one(data, coord(16, 3));
  check(all > 8_000_000 && all < 9_000_000, `immigrants in 2021 = ${all}`);
  const periodSum = periods.reduce((n, p) => n + p.total, 0);
  check(near(periodSum, all, all * 0.01), "periods add to all immigrants");
  const recent = periods.at(-1)!;
  check((recent as unknown as Record<string, number>).asia! > (recent as unknown as Record<string, number>).europe!, "recent immigrants: Asia ahead of Europe");
  await write("immigrant-origins", {
    _meta: meta([PID], "immigrant status and period of immigration by place of birth (2021 Census, 25% sample)", [
      "Immigrants living in Canada on census day in 2021, by when they first became permanent residents and where they were born. People who arrived long ago and have since died or left are not counted, so earlier periods are smaller than the number who actually came.",
      "Counts of people born outside Canada with immigrant status. Non-permanent residents are excluded.",
      "'Oceania and other' combines Oceania, Antarctica and adjacent islands, and other places of birth.",
      "Counts are rounded by Statistics Canada and come from the long-form (25% sample) questionnaire.",
    ]),
    regions: REGIONS.map(({ key, name }) => ({ key, name })),
    periods,
    total: all,
  });
}

// ---------------------------------------------------------------------------
// Urban and rural population
// ---------------------------------------------------------------------------
console.log("Urban and rural");
{
  const hist = await table("17100068");
  const years = [...new Set(hist.rows.map((r) => r.REF_DATE!))].sort();
  const get = (y: string, what: string) => Number(hist.rows.find((r) => r.REF_DATE === y && r.Population === what && r.GEO === "Canada")!.VALUE);
  const points = years.map((y) => {
    const total = get(y, "Total population");
    const urban = get(y, "Urban population");
    const rural = get(y, "Rural population");
    check(near(urban + rural, total, 2), `${y}: urban + rural = total`);
    return { year: Number(y), total, urban, rural, urbanPct: round((100 * urban) / total), definition: "urban" as const };
  });
  check(points[0]!.year === 1871 && points.at(-1)!.year === 1971, "historical table covers 1871 to 1971");

  const now = await table("98100008");
  const col = (re: RegExp) => {
    const i = now.header.findIndex((h) => re.test(h));
    if (i < 0) throw new Error(`98-10-0008: no column ${re}`);
    return i;
  };
  const row = now.raw.find((r) => r[1] === "Canada");
  if (!row) throw new Error("98-10-0008: no Canada row");
  const year = Number(row[0]);
  const total = Number(row[col(/Total population \[1\]/)]);
  const urban = Number(row[col(/Total population centre size groups/)]);
  const rural = Number(row[col(/Total rural population/)]);
  check(near(urban + rural, total, 2), `${year}: population centres + rural = total`);
  check(total > 36_000_000 && total < 38_000_000, `${year} census total = ${total}`);
  points.push({ year, total, urban, rural, urbanPct: round((100 * urban) / total), definition: "population-centre" as never });
  check(points.at(-1)!.urbanPct > 75 && points.at(-1)!.urbanPct < 90, "2021 urban share in range");

  await write("urban-rural", {
    _meta: {
      ...meta(["17100068", "98100008"], "urban and rural population, 1871–1971 and 2021", [
        "1871–1971: Statistics Canada's historical series of the urban and rural population, each census using its own definition of urban (from 1951, places of 1,000 or more people and a density of at least 400 per km², plus incorporated towns and cities of earlier censuses).",
        "2021: people living in population centres (at least 1,000 people and 400 per km²) against rural areas. Statistics Canada replaced 'urban area' with 'population centre' in 2011; the two are defined in nearly the same way.",
        "No open table on www150 gives the 1976–2016 censuses on the same basis, so the series has a gap. The www12 census pages that hold them can't be read by scripts.",
      ]),
    },
    points,
  });
}

// ---------------------------------------------------------------------------
// Indigenous population, 2011–2021
// ---------------------------------------------------------------------------
console.log("Indigenous population");
{
  const PID = "98100292";
  // Dimensions: geography, gender, age, statistic, Indigenous identity.
  const GEOS: [number, string, string][] = [
    [1, "canada", "Canada"],
    [2, "newfoundland-and-labrador", "Newfoundland and Labrador"],
    [7, "prince-edward-island", "Prince Edward Island"],
    [10, "nova-scotia", "Nova Scotia"],
    [16, "new-brunswick", "New Brunswick"],
    [24, "quebec", "Quebec"],
    [54, "ontario", "Ontario"],
    [98, "manitoba", "Manitoba"],
    [105, "saskatchewan", "Saskatchewan"],
    [115, "alberta", "Alberta"],
    [133, "british-columbia", "British Columbia"],
    [162, "yukon", "Yukon"],
    [164, "northwest-territories", "Northwest Territories"],
    [166, "nunavut", "Nunavut"],
  ];
  const STATS: [number, number][] = [
    [1, 2021],
    [2, 2016],
    [3, 2011],
  ];
  const IDS = [
    { id: 1, key: "total" },
    { id: 2, key: "indigenous" },
    { id: 4, key: "firstNations" },
    { id: 5, key: "metis" },
    { id: 6, key: "inuit" },
    { id: 7, key: "multiple" },
    { id: 8, key: "otherIndigenous" },
  ];
  const coord = (geo: number, stat: number, ident: number) => `${geo}.1.1.${stat}.${ident}`;
  const ages = [1, 2, 3, 4, 5, 6, 7, 8];
  const coords = [
    ...GEOS.flatMap(([g]) => STATS.flatMap(([s]) => IDS.map((i) => coord(g, s, i.id)))),
    // Canada by age group, 2021, for Indigenous and non-Indigenous people.
    ...ages.flatMap((a) => [2, 9].map((ident) => `1.1.${a}.1.${ident}`)),
  ];
  const data = await cells(PID, coords);
  const places = GEOS.map(([g, slug, name]) => ({
    slug,
    name,
    censuses: STATS.map(([s, year]) => {
      // The two small residual groups are suppressed in a few places and years; the sum check still applies.
      const v = Object.fromEntries(IDS.map((i) => [i.key, one(data, coord(g, s, i.id), undefined, i.id >= 7)])) as Record<string, number>;
      const parts = v.firstNations! + v.metis! + v.inuit! + v.multiple! + v.otherIndigenous!;
      check(near(parts, v.indigenous!, Math.max(60, v.indigenous! * 0.002)), `${name} ${year}: groups add to the Indigenous total`);
      return { year, ...v, sharePct: round((100 * v.indigenous!) / v.total!, 1) } as { year: number; sharePct: number } & Record<string, number>;
    }),
  }));
  const ca = places[0]!.censuses[0]!;
  check(ca.year === 2021 && ca.indigenous! > 1_750_000 && ca.indigenous! < 1_850_000, `Indigenous 2021 = ${ca.indigenous}`);
  const nu = places.find((p) => p.slug === "nunavut")!.censuses[0]!;
  check(nu.sharePct > 80, `Nunavut Indigenous share = ${nu.sharePct}`);
  const AGE_LABELS = ["All ages", "0 to 14", "15 to 24", "25 to 34", "35 to 44", "45 to 54", "55 to 64", "65 and older"];
  const byAge = ages.slice(1).map((a, i) => ({
    age: AGE_LABELS[i + 1]!,
    indigenous: one(data, `1.1.${a}.1.2`),
    nonIndigenous: one(data, `1.1.${a}.1.9`),
  }));
  check(near(byAge.reduce((n, r) => n + r.indigenous, 0), one(data, "1.1.1.1.2"), 200), "Indigenous age groups add up");
  await write("indigenous", {
    _meta: meta([PID], "Indigenous identity population by gender and age (2011, 2016 and 2021)", [
      "Indigenous identity: people who identified as First Nations, Métis or Inuk (Inuit), as reported in the census long-form questionnaire (25% sample).",
      "2011 figures come from the National Household Survey, which was voluntary, so they're less comparable than 2016 and 2021.",
      "Growth between censuses comes partly from births and partly from more people identifying as Indigenous over time, and from changes in which reserves took part in the census.",
      "'multiple' is people who reported more than one Indigenous identity; 'otherIndigenous' is Indigenous responses not included elsewhere.",
    ]),
    places,
    ageGroups2021: byAge,
  });
}

// ---------------------------------------------------------------------------
// Population pyramid: July 1 estimates by age and gender
// ---------------------------------------------------------------------------
console.log("Age pyramid");
{
  const PID = "17100005";
  const AGES: [number, string][] = [
    [7, "0–4"], [13, "5–9"], [19, "10–14"], [25, "15–19"], [31, "20–24"], [37, "25–29"], [43, "30–34"],
    [49, "35–39"], [55, "40–44"], [61, "45–49"], [67, "50–54"], [73, "55–59"], [79, "60–64"], [85, "65–69"],
    [86, "70–74"], [87, "75–79"], [88, "80–84"], [89, "85–89"], [90, "90+"], // 90+ is the oldest group available for every year
  ];
  // Dimensions: geography (1 = Canada), gender (1 total, 2 men+, 3 women+), age group.
  const coords = [...AGES.flatMap(([a]) => [`1.2.${a}`, `1.3.${a}`]), "1.1.1", "1.1.105"];
  const data = await cells(PID, coords, 70);
  const latest = Math.max(...data.get("1.1.1")!.keys());
  const then = latest - 50;
  const years = [then, latest].map((year) => {
    const groups = AGES.map(([a, label]) => ({ age: label, men: one(data, `1.2.${a}`, year), women: one(data, `1.3.${a}`, year) }));
    const total = one(data, "1.1.1", year);
    const sum = groups.reduce((n, g) => n + g.men + g.women, 0);
    check(near(sum, total, total * 0.001), `${year}: age groups add to the total (${sum} vs ${total})`);
    return { year, total, medianAge: one(data, "1.1.105", year), groups };
  });
  check(years[0]!.total > 20_000_000 && years[0]!.total < 25_000_000, `${then} total`);
  check(years[1]!.medianAge > years[0]!.medianAge + 5, "median age rose");
  await write("age-pyramid", {
    _meta: meta([PID], "population estimates on July 1, by age and gender", [
      `Population on July 1 of ${then} and ${latest}, by five-year age group.`,
      "Statistics Canada's gender categories: 'Men+' includes men and boys plus some non-binary people, and 'Women+' includes women and girls plus the rest of non-binary people. Estimates before 2021 are by sex, carried into these categories by Statistics Canada.",
      "Estimates for recent years are preliminary and are revised as later data arrive.",
    ]),
    years,
  });
}
