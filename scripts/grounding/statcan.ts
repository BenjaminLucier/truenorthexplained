/**
 * Demographic series from Statistics Canada open data (Open Government
 * Licence – Canada). Each table is downloaded as the full-table CSV zip,
 * filtered to what the site needs, and written to src/data/statcan/*.json.
 *
 *   population.json   census counts 1851–1971 (17-10-0067) and July 1
 *                     estimates 1971–today (17-10-0009), Canada and each
 *                     province and territory
 *   immigration.json  immigrants admitted per year: calendar years 1852–1970
 *                     (17-10-0063), then July–June years from 1971/72
 *                     (17-10-0008), with a rate per 1,000 people
 *   age.json          median age and the shares aged 0–14 and 65+, July 1,
 *                     1971–today (17-10-0005)
 */
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { unzipSync } from "fflate";
import { parse } from "csv-parse";
import { politeFetch } from "./http.ts";
import { DATA, stamp, writeDataset, type FileEntry, type Manifest } from "./util.ts";

const OUT = resolve(DATA, "statcan");
const LICENCE = "Open Government Licence – Canada";
const LICENCE_URL = "https://www.statcan.gc.ca/en/reference/licence";

export const GEOS: { slug: string; name: string }[] = [
  { slug: "canada", name: "Canada" },
  { slug: "newfoundland-and-labrador", name: "Newfoundland and Labrador" },
  { slug: "prince-edward-island", name: "Prince Edward Island" },
  { slug: "nova-scotia", name: "Nova Scotia" },
  { slug: "new-brunswick", name: "New Brunswick" },
  { slug: "quebec", name: "Quebec" },
  { slug: "ontario", name: "Ontario" },
  { slug: "manitoba", name: "Manitoba" },
  { slug: "saskatchewan", name: "Saskatchewan" },
  { slug: "alberta", name: "Alberta" },
  { slug: "british-columbia", name: "British Columbia" },
  { slug: "yukon", name: "Yukon" },
  { slug: "northwest-territories", name: "Northwest Territories" },
  { slug: "nunavut", name: "Nunavut" },
];
const slugOf = new Map(GEOS.map((g) => [g.name, g.slug]));
/**
 * Before Nunavut was created in 1999, StatCan reports the old, larger
 * territory as "Northwest Territories including Nunavut". We file those
 * figures under northwest-territories and say so in the dataset notes.
 */
slugOf.set("Northwest Territories including Nunavut", "northwest-territories");

const tableUrl = (pid: string) => `https://www150.statcan.gc.ca/n1/tbl/csv/${pid}-eng.zip`;
const tablePage = (pid: string) => `https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=${pid}01`;
const tableId = (pid: string) => `${pid.slice(0, 2)}-${pid.slice(2, 4)}-${pid.slice(4, 8)}-01`;

type Rec = Record<string, string>;

/** Downloads a full-table CSV and streams it through `keep`, collecting only matching rows. */
async function table(pid: string, keep: (r: Rec) => boolean): Promise<Rec[]> {
  const res = await politeFetch(tableUrl(pid));
  const zip = unzipSync(new Uint8Array(await res.arrayBuffer()), { filter: (f) => f.name === `${pid}.csv` });
  const csv = zip[`${pid}.csv`];
  if (!csv) throw new Error(`${pid}.csv not found in the zip`);
  const out: Rec[] = [];
  const parser = Readable.from([Buffer.from(csv)]).pipe(parse({ columns: true, bom: true, relax_quotes: true }));
  for await (const r of parser as AsyncIterable<Rec>) if (keep(r)) out.push(r);
  console.log(`  · ${tableId(pid)}: ${out.length} rows kept`);
  return out;
}

/** The value in persons (or the unit), applying the scalar factor ("thousands" has SCALAR_ID 3). */
const value = (r: Rec) =>
  r.VALUE === "" || r.VALUE === undefined ? null : Number(r.VALUE) * 10 ** Number(r.SCALAR_ID ?? 0);
type Point = { year: number; value: number };
const sortPoints = (xs: Point[]) => xs.sort((a, b) => a.year - b.year);

function bySlug(rows: Rec[], year: (r: Rec) => number): Record<string, Point[]> {
  const out: Record<string, Point[]> = Object.fromEntries(GEOS.map((g) => [g.slug, [] as Point[]]));
  for (const r of rows) {
    const slug = slugOf.get(r.GEO!);
    const v = value(r);
    if (!slug || v === null) continue;
    out[slug]!.push({ year: year(r), value: v });
  }
  for (const k of Object.keys(out)) sortPoints(out[k]!);
  return out;
}

export async function runStatcan(manifest: Manifest): Promise<void> {
  console.log("Statistics Canada: downloading tables…");

  // --- Population ---------------------------------------------------------
  const census = await table("17100067", (r) => r.Estimates === "Population");
  const quarterly = await table("17100009", (r) => r.REF_DATE!.endsWith("-07-01"));
  const estimates = bySlug(quarterly, (r) => Number(r.REF_DATE!.slice(0, 4)));
  const censusBySlug = bySlug(census, (r) => Number(r.REF_DATE));
  const latestEstimate = Math.max(...(estimates.canada ?? []).map((p) => p.year));

  // --- Immigration --------------------------------------------------------
  const historical = await table("17100063", () => true);
  const components = await table("17100008", (r) => r.GEO === "Canada" && r["Components of population growth"] === "Immigrants");
  const histPop = new Map(
    historical.filter((r) => r.Estimates === "Estimated population").map((r) => [Number(r.REF_DATE), value(r)!]),
  );
  const julyPop = new Map((estimates.canada ?? []).map((p) => [p.year, p.value]));
  const immigration: { year: number; period: string; immigrants: number; per1000: number | null }[] = [];
  for (const r of historical) {
    if (r.Estimates !== "Immigrant arrivals") continue;
    const year = Number(r.REF_DATE);
    if (year >= 1971) continue; // From 1971/72 the components table takes over.
    const pop = histPop.get(year);
    const n = value(r)!;
    immigration.push({ year, period: String(year), immigrants: n, per1000: pop ? round(n / (pop / 1000), 1) : null });
  }
  for (const r of components) {
    const year = Number(r.REF_DATE!.slice(0, 4)); // "1971/1972" → 1971 (July 1971 to June 1972)
    const n = value(r);
    if (n === null) continue;
    const pop = julyPop.get(year);
    immigration.push({ year, period: r.REF_DATE!, immigrants: n, per1000: pop ? round(n / (pop / 1000), 1) : null });
  }
  immigration.sort((a, b) => a.year - b.year);

  // --- Age ----------------------------------------------------------------
  const wanted = new Set(["All ages", "Median age", "0 to 14 years", "65 years and older"]);
  const ages = await table("17100005", (r) => r.Gender === "Total - gender" && wanted.has(r["Age group"]!));
  const ageSeries = (group: string) =>
    bySlug(
      ages.filter((r) => r["Age group"] === group),
      (r) => Number(r.REF_DATE),
    );
  const total = ageSeries("All ages");
  const share = (group: string) => {
    const part = ageSeries(group);
    return Object.fromEntries(
      Object.entries(part).map(([slug, pts]) => {
        const tot = new Map(total[slug]!.map((p) => [p.year, p.value]));
        return [slug, pts.filter((p) => tot.get(p.year)).map((p) => ({ year: p.year, value: round((100 * p.value) / tot.get(p.year)!, 1) }))];
      }),
    );
  };

  // --- Write --------------------------------------------------------------
  const files: [string, Record<string, unknown>, Record<string, unknown>][] = [
    [
      "population",
      {
        source: `Statistics Canada, tables ${tableId("17100067")} (census, 1851–1971) and ${tableId("17100009")} (estimates)`,
        url: tablePage("17100009"),
        urls: [tablePage("17100067"), tablePage("17100009")],
        licence: LICENCE,
        licenceUrl: LICENCE_URL,
        notes: [
          "census: population counted by each census, 1851–1971, in that census's boundaries. Newfoundland joined in 1949.",
          "estimates: July 1 population estimates, 1946 (1951 for the territories) to the latest year. Estimates adjust for people the census missed, so they run a little higher than census counts.",
          "Before 1999, figures for the Northwest Territories include what is now Nunavut.",
        ],
        script: "scripts/grounding/statcan.ts",
      },
      { geos: GEOS, latestYear: latestEstimate, census: censusBySlug, estimates },
    ],
    [
      "immigration",
      {
        source: `Statistics Canada, tables ${tableId("17100063")} (1852–1970) and ${tableId("17100008")} (1971/72 on)`,
        url: tablePage("17100008"),
        urls: [tablePage("17100063"), tablePage("17100008")],
        licence: LICENCE,
        licenceUrl: LICENCE_URL,
        notes: [
          "Immigrants are people granted permanent residence (\"landed immigrants\"). Temporary residents such as students and workers are not counted.",
          "Up to 1970: calendar years. From 1971/1972: years running July 1 to June 30, labelled by the year they start.",
          "per1000: immigrants per 1,000 people, using the estimated population for that year (July 1 from 1971).",
        ],
        script: "scripts/grounding/statcan.ts",
      },
      { canada: immigration },
    ],
    [
      "age",
      {
        source: `Statistics Canada, table ${tableId("17100005")}: population estimates on July 1, by age and gender`,
        url: tablePage("17100005"),
        licence: LICENCE,
        licenceUrl: LICENCE_URL,
        notes: [
          "Shares are percentages of the total population on July 1.",
          "Before 1999, figures for the Northwest Territories include what is now Nunavut.",
        ],
        script: "scripts/grounding/statcan.ts",
      },
      { geos: GEOS, medianAge: ageSeries("Median age"), share0to14: share("0 to 14 years"), share65plus: share("65 years and older") },
    ],
  ];

  for (const [name, meta, data] of files) {
    const changed = await writeDataset(resolve(OUT, `${name}.json`), meta as never, data);
    console.log(`  ${changed ? "✓" : "="} src/data/statcan/${name}.json`);
    const sha = createHash("sha1").update(JSON.stringify(data)).digest("hex");
    manifest.statcan[name] = stamp<FileEntry>(manifest.statcan[name], { file: `src/data/statcan/${name}.json`, sha1: sha }, (o) => o.sha1 === sha);
  }

  // Sanity checks on things we know.
  const can = (estimates.canada ?? []).find((p) => p.year === 2021)?.value ?? 0;
  if (can < 38_000_000 || can > 39_000_000) throw new Error(`Canada's July 2021 estimate looks wrong: ${can}`);
  const peak = immigration.find((p) => p.year === 1913)?.immigrants ?? 0;
  if (peak < 380_000) throw new Error(`1913 immigration looks wrong: ${peak}`);
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
