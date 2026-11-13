/**
 * Population of each province at the latest general census, from Statistics Canada
 * table 98-10-0001-01. Used by the amending-formula widget: the 7/50 rule counts
 * "at least fifty per cent of the population of all the provinces" according to
 * "the then latest general census" (Constitution Act, 1982, s. 38(1)(b)).
 *
 * Run: pnpm data:population
 * Writes: src/data/province-population.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { strFromU8, unzipSync } from "fflate";

const SOURCE = "https://www150.statcan.gc.ca/n1/tbl/csv/98100001-eng.zip";
const OUT = new URL("../../src/data/province-population.json", import.meta.url);

/** Provinces from west to east, with the slugs used for /provinces pages. */
const PROVINCES = [
  { id: "british-columbia", geo: "British Columbia", abbr: "BC" },
  { id: "alberta", geo: "Alberta", abbr: "AB" },
  { id: "saskatchewan", geo: "Saskatchewan", abbr: "SK" },
  { id: "manitoba", geo: "Manitoba", abbr: "MB" },
  { id: "ontario", geo: "Ontario", abbr: "ON" },
  { id: "quebec", geo: "Quebec", abbr: "QC" },
  { id: "new-brunswick", geo: "New Brunswick", abbr: "NB" },
  { id: "nova-scotia", geo: "Nova Scotia", abbr: "NS" },
  { id: "prince-edward-island", geo: "Prince Edward Island", abbr: "PE" },
  { id: "newfoundland-and-labrador", geo: "Newfoundland and Labrador", abbr: "NL" },
] as const;

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
const csv = files["98100001.csv"];
if (!csv) throw new Error("98100001.csv missing from the zip");

const [header, ...rows] = parse(strFromU8(csv), { bom: true, relax_column_count: true, skip_empty_lines: true }) as string[][];
const col = header!.findIndex((h) => /: Population, \d{4}/.test(h));
if (col < 0) throw new Error("No population column in the census table");
const census = header![col]!.match(/Population, (\d{4})/)![1];

const provinces = PROVINCES.map((p) => {
  const row = rows.find((r) => r[1] === p.geo);
  if (!row) throw new Error(`No census row for ${p.geo}`);
  return { ...p, population: Number(row[col]) };
});

const data = {
  _meta: {
    source: `Statistics Canada, Table 98-10-0001-01 Population and dwelling counts (${census} Census)`,
    url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000101",
    licence: "Statistics Canada Open Licence",
    fetched: new Date().toISOString().slice(0, 10),
    census: Number(census),
  },
  provinces,
};

await mkdir(new URL(".", OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${provinces.length} provinces (${census} Census) to ${OUT.pathname}`);
