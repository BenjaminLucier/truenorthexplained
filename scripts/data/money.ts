/**
 * Public money, transfers to provinces, interest rates and prices.
 *
 * Run: pnpm data:money
 * Writes:
 *   src/data/money/federal-finances.json  revenue, expenses, balance and debt as a share of
 *     GDP, 1926-27 to the latest year, and the latest year's revenue and spending by category
 *   src/data/money/transfers.json         equalization by province since 1957-58, and the
 *     latest year's major transfers (CHT, CST, equalization, TFF) with population
 *   src/data/money/prices.json            consumer price index since 1914
 *   src/data/money/interest-rates.json    the Bank Rate since 1935 and the target for the overnight
 *     rate since 1996
 *
 * Sources (Open Government Licence – Canada, except the Bank of Canada's own terms of use):
 *   - Finance Canada, Fiscal Reference Tables (latest edition's Excel workbook), 1966-67 on
 *   - Statistics Canada, Historical Statistics of Canada (11-516-X), series H1-18, H19-34,
 *     H35-51 and F14-32, for 1926-27 to 1965-66
 *   - Finance Canada, Historical Transfer Tables (open.canada.ca)
 *   - Statistics Canada tables 18-10-0005-01 (annual CPI) and 18-10-0004-01 (monthly CPI, via
 *     the Web Data Service)
 *   - Bank of Canada Valet API
 *
 * Every step cross-checks what it reads and throws if something doesn't add up.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { strFromU8, unzipSync } from "fflate";
import { politeFetch, getJson } from "../grounding/http.ts";
import { readXlsx, type Cell } from "./xlsx.ts";
import { PROVINCE_CODES, type ProvinceCode } from "../../src/lib/elections-constants.ts";

const OUT = new URL("../../src/data/money/", import.meta.url);
const LICENCE = "Open Government Licence – Canada";
const LICENCE_URL = "https://open.canada.ca/en/open-government-licence-canada";
const fetched = new Date().toISOString().slice(0, 10);

const problems: string[] = [];
/** Records a failed cross-check; the script throws at the end if any failed. */
function check(ok: boolean, message: string) {
  if (!ok) problems.push(message);
}
const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const round = (n: number, d = 1) => Number(n.toFixed(d));
const num = (v: Cell | string | undefined): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = v.replace(/[,\s$]/g, "");
  if (s === "" || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
};
const text = async (url: string, encoding: "utf-8" | "latin1" = "utf-8") =>
  new TextDecoder(encoding).decode(await (await politeFetch(url)).arrayBuffer());
const bytes = async (url: string) => new Uint8Array(await (await politeFetch(url)).arrayBuffer());
/** "1966-67" → 1966; "1999-00" → 1999. */
const fyStart = (label: string) => Number(label.slice(0, 4));
const fyLabel = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;

// ---------------------------------------------------------------------------
// 1. Finance Canada: Fiscal Reference Tables
// ---------------------------------------------------------------------------

const FRT_INDEX = "https://www.canada.ca/en/department-finance/services/publications/fiscal-reference-tables";
let frtYear = new Date().getFullYear();
let frtPage = "";
for (; frtYear >= 2023; frtYear--) {
  try {
    frtPage = await text(`${FRT_INDEX}/${frtYear}.html`);
    if (/frt-trf-\d\d-eng\.xlsx/.test(frtPage)) break;
  } catch {
    // Not published yet; try the year before.
  }
}
const xlsxPath = frtPage.match(/href="([^"]*frt-trf-\d\d-eng\.xlsx)"/)?.[1];
if (!xlsxPath) throw new Error("Could not find the Fiscal Reference Tables workbook");
const frtEdition = frtPage.match(/<h1[^>]*>\s*Fiscal Reference Tables ([^<]+?)\s*</)?.[1] ?? String(frtYear);
const frtUrl = new URL(xlsxPath, "https://www.canada.ca").href;
const wb = readXlsx(await bytes(frtUrl));
console.log(`Fiscal Reference Tables ${frtEdition}: ${wb.sheetNames.length} sheets`);

/** A table's rows keyed by fiscal year, with the header text of each column. */
function frtTable(prefix: RegExp) {
  const name = wb.sheetNames.find((n) => prefix.test(n));
  if (!name) throw new Error(`No sheet matching ${prefix}`);
  const rows = wb.sheet(name);
  const headerEnd = rows.findIndex((r) => typeof r[0] === "string" && /^\d{4}-\d{2}$/.test(r[0]));
  if (headerEnd < 0) throw new Error(`No year rows in sheet ${name}`);
  const headers: string[] = [];
  for (const r of rows.slice(0, headerEnd)) {
    r.forEach((c, i) => {
      if (typeof c === "string" && c.trim()) headers[i] = `${headers[i] ?? ""} ${c.trim()}`.trim();
    });
  }
  const byYear = new Map<number, (number | null)[]>();
  for (const r of rows.slice(headerEnd)) {
    if (typeof r[0] !== "string" || !/^\d{4}-\d{2}$/.test(r[0])) continue;
    byYear.set(fyStart(r[0]), r.map((c) => num(c)));
  }
  /** Column index whose header matches. */
  const col = (re: RegExp) => {
    const i = headers.findIndex((h, j) => j > 0 && h && re.test(h));
    if (i < 0) throw new Error(`No column matching ${re} in ${name}: ${JSON.stringify(headers)}`);
    return i;
  };
  return { name, byYear, col, headers };
}

const t1 = frtTable(/^1 - Fiscal transactions$/);
const t2 = frtTable(/^2 - Fiscal transactions % GDP/);
const t3 = frtTable(/^3 - Revenues$/);
const t6 = frtTable(/^6 - Other Taxes/);
const t7 = frtTable(/^7 - Expenses$/);
const t10 = frtTable(/^10 - Major Transfers to Persons/);
const t11 = frtTable(/^11-MajorTransfersGov/);

// Table 1 and 2 share a layout: revenues, program expenses, public debt charges,
// (balance before actuarial losses), net actuarial losses, budgetary balance, …, accumulated deficit.
const fiscalCols = (t: ReturnType<typeof frtTable>) => ({
  revenue: t.col(/^Revenues/),
  program: t.col(/^Program/),
  charges: t.col(/debt charges/),
  actuarial: t.col(/^Net actuarial/),
  balance: t.col(/^Budgetary surplus or deficit \(-\)$/),
  debt: t.col(/^Accumulated deficit$/),
});
const c1 = fiscalCols(t1);
const c2 = fiscalCols(t2);

interface FiscalYear {
  year: number;
  label: string;
  source: "hsc" | "frt";
  revenue: number;
  expenses: number;
  balance: number;
  /** Accumulated deficit (FRT) or gross direct debt less sinking funds (HSC). */
  debt: number;
  /** Dollar figures, millions (FRT years only). */
  revenueM?: number;
  expensesM?: number;
  balanceM?: number;
  debtM?: number;
}
const frtYears: FiscalYear[] = [];
for (const [year, r] of t2.byYear) {
  const m = t1.byYear.get(year);
  if (!m) throw new Error(`Table 1 is missing ${fyLabel(year)}`);
  const revenue = r[c2.revenue]!;
  const expenses = r[c2.program]! + r[c2.charges]! + (r[c2.actuarial] ?? 0);
  const balance = r[c2.balance]!;
  const debt = r[c2.debt]!;
  const revenueM = m[c1.revenue]!;
  const expensesM = m[c1.program]! + m[c1.charges]! + (m[c1.actuarial] ?? 0);
  const balanceM = m[c1.balance]!;
  // Revenue minus expenses is the balance, in dollars exactly and in % of GDP to rounding.
  check(close(revenueM - expensesM, balanceM, 2), `FRT ${fyLabel(year)}: revenue − expenses ≠ balance ($M)`);
  check(close(revenue - expenses, balance, 0.25), `FRT ${fyLabel(year)}: revenue − expenses ≠ balance (% GDP)`);
  // Implied GDP from each column should agree.
  const gdp1 = revenueM / (revenue / 100);
  const gdp2 = m[c1.debt]! / (debt / 100);
  check(Math.abs(gdp1 / gdp2 - 1) < 0.02, `FRT ${fyLabel(year)}: implied GDP differs between revenue and debt (${gdp1} vs ${gdp2})`);
  frtYears.push({
    year,
    label: fyLabel(year),
    source: "frt",
    revenue: round(revenue),
    expenses: round(expenses),
    balance: round(balance),
    debt: round(debt),
    revenueM,
    expensesM,
    balanceM,
    debtM: m[c1.debt]!,
  });
}
frtYears.sort((a, b) => a.year - b.year);
check(frtYears[0]?.year === 1966, `FRT should start in 1966-67, starts ${frtYears[0]?.label}`);
const latestFy = frtYears.at(-1)!;
console.log(`  ${frtYears.length} years, ${frtYears[0]!.label} to ${latestFy.label}`);

// Latest year: revenue by source and expenses by category.
function latestRow(t: ReturnType<typeof frtTable>) {
  const r = t.byYear.get(latestFy.year);
  if (!r) throw new Error(`${t.name} has no ${latestFy.label} row`);
  return (re: RegExp) => r[t.col(re)] ?? 0;
}
const rev = latestRow(t3);
const oth = latestRow(t6);
const exp = latestRow(t7);
const tp = latestRow(t10);
const tg = latestRow(t11);

const revenueItems = [
  { key: "pit", label: "Personal income tax", value: rev(/^Personal income tax/) },
  { key: "cit", label: "Corporate income tax", value: rev(/^Corporate income tax/) },
  { key: "gst", label: "Goods and Services Tax (GST)", value: oth(/^Goods and Services Tax/) },
  { key: "ei", label: "Employment Insurance premiums", value: rev(/^Employment Insurance/) },
  { key: "nonres", label: "Non-resident income tax", value: rev(/^Non- resident/) },
  {
    key: "duties",
    label: "Customs, energy and other taxes",
    value: oth(/Customs/) + oth(/^Energy/) + oth(/^Other$/) + oth(/^Sales tax/),
  },
  { key: "pollution", label: "Pollution pricing proceeds", value: rev(/^Pollution pricing/) },
  { key: "other", label: "Other revenue (Crown corporations, fees, investments)", value: rev(/^Other revenues/) },
];
const revenueTotal = rev(/^Total revenues/);
check(close(revenueItems.reduce((n, i) => n + i.value, 0), revenueTotal, 2), "Revenue items don't add up to total revenues");
check(close(oth(/^Total other/), oth(/^Goods and/) + oth(/Customs/) + oth(/^Energy/) + oth(/^Other$/) + oth(/^Sales tax/), 2), "Table 6 doesn't add up");
check(revenueTotal === latestFy.revenueM, "Table 3 total revenues ≠ Table 1 revenues");

const expenseItems = [
  { key: "elderly", group: "persons", label: "Old Age Security and other benefits for seniors", value: tp(/^Old Age Security/) },
  { key: "children", group: "persons", label: "Canada Child Benefit", value: tp(/Children/) },
  { key: "ei", group: "persons", label: "Employment Insurance", value: tp(/^Employment Insurance/) },
  {
    key: "persons-other",
    group: "persons",
    label: "Other transfers to persons",
    value: tp(/^Total$/) - tp(/^Old Age Security/) - tp(/Children/) - tp(/^Employment Insurance/),
  },
  { key: "health-social", group: "governments", label: "Canada Health Transfer and Canada Social Transfer", value: tg(/^Canada Health and Social/) },
  { key: "fiscal", group: "governments", label: "Equalization and Territorial Formula Financing", value: tg(/^Fiscal arrangements/) },
  {
    key: "gov-other",
    group: "governments",
    label: "Child care and other transfers to governments",
    value: tg(/^Total$/) - tg(/^Canada Health and Social/) - tg(/^Fiscal arrangements/),
  },
  { key: "pollution", group: "pollution", label: "Pollution pricing proceeds returned", value: exp(/^Pollution pricing/) },
  { key: "direct", group: "direct", label: "Direct program spending (departments, defence, agencies)", value: exp(/^Direct/) + exp(/^Net actuarial/) },
  { key: "debt", group: "debt", label: "Interest on the debt (public debt charges)", value: exp(/^Public debt charges/) },
];
const expenseTotal = exp(/^Total expenses/);
check(close(expenseItems.reduce((n, i) => n + i.value, 0), expenseTotal, 2), "Expense items don't add up to total expenses");
check(close(exp(/^Major transfers to persons/), tp(/^Total$/), 2), "Table 10 total ≠ Table 7 transfers to persons");
check(close(exp(/^Major transfers to provinces/), tg(/^Total$/), 2), "Table 11 total ≠ Table 7 transfers to governments");
check(expenseTotal === latestFy.expensesM, "Table 7 total expenses ≠ Table 1 expenses");

// ---------------------------------------------------------------------------
// 2. Statistics Canada: Historical Statistics of Canada, 1926 to 1965
// ---------------------------------------------------------------------------

const HSC = "https://www150.statcan.gc.ca/n1/pub/11-516-x";
/** Reads an HSC CSV into series-number → year → value (millions). */
async function hscSeries(path: string, wanted: number[]) {
  const rows = parse(await text(`${HSC}/${path}`, "latin1"), { relax_column_count: true }) as string[][];
  // The row of series numbers tells which column holds which series.
  const numRow = rows.find((r) => wanted.every((w) => r.includes(String(w))));
  if (!numRow) throw new Error(`No series-number row with ${wanted} in ${path}`);
  const out = new Map<number, Map<number, number>>(wanted.map((w) => [w, new Map()]));
  for (const r of rows) {
    const year = Number(r[1]);
    if (!/^\d{4}$/.test(r[1] ?? "") || year < 1867) continue;
    for (const w of wanted) {
      const v = num(r[numRow.indexOf(String(w))]);
      if (v !== null) out.get(w)!.set(year, v);
    }
  }
  return out;
}
const revenueH = (await hscSeries("sectionh/H1_18-eng.csv", [11, 18])).get(18)!;
const expenseH = (await hscSeries("sectionh/H19_34-eng.csv", [29, 34])).get(34)!;
const debtH = (await hscSeries("sectionh/H35_51-eng.csv", [46, 50])).get(46)!;
const gnp = (await hscSeries("sectionf/F14_32-eng.csv", [14, 32])).get(32)!;
check(gnp.get(1945) === 11863, `HSC F32 1945 GNE should be 11,863, got ${gnp.get(1945)}`);

/** GDP for a fiscal year starting April 1 of `y`: 9 months of y and 3 of y+1. */
const fyGnp = (y: number) => 0.75 * gnp.get(y)! + 0.25 * gnp.get(y + 1)!;
const hscYears: FiscalYear[] = [];
for (let y = 1926; y <= 1965; y++) {
  const r = revenueH.get(y);
  const e = expenseH.get(y);
  const d = debtH.get(y);
  if (r === undefined || e === undefined || d === undefined || !gnp.get(y + 1)) throw new Error(`HSC data missing for ${y}`);
  const g = fyGnp(y);
  hscYears.push({
    year: y,
    label: fyLabel(y),
    source: "hsc",
    revenue: round((100 * r) / g),
    expenses: round((100 * e) / g),
    balance: round((100 * (r - e)) / g),
    debt: round((100 * d) / g),
  });
}
// Overlap check: the 1966 HSC figures against FRT 1966-67, both as a share of GDP.
const overlap = {
  revenue: [round((100 * revenueH.get(1966)!) / fyGnp(1966)), frtYears[0]!.revenue],
  expenses: [round((100 * expenseH.get(1966)!) / fyGnp(1966)), frtYears[0]!.expenses],
};
check(close(overlap.revenue[0]!, overlap.revenue[1]!, 1.5), `HSC and FRT revenue disagree in 1966 by more than 1.5 points: ${overlap.revenue}`);
check(close(overlap.expenses[0]!, overlap.expenses[1]!, 1.5), `HSC and FRT expenses disagree in 1966 by more than 1.5 points: ${overlap.expenses}`);
console.log(`Historical Statistics: ${hscYears.length} years; 1966 overlap revenue ${overlap.revenue}, expenses ${overlap.expenses}`);

// ---------------------------------------------------------------------------
// 3. Finance Canada: Historical Transfer Tables
// ---------------------------------------------------------------------------

const HTT_ID = "4eee1558-45b7-4484-9336-e692897d393f";
const HTT_PAGE = `https://open.canada.ca/data/en/dataset/${HTT_ID}`;
const pkg = await getJson<{ result: { resources: { name: string; name_translated?: { en?: string }; language: string[]; url: string }[]; license_title: string } }>(
  `https://open.canada.ca/data/api/action/package_show?id=${HTT_ID}`,
);
check(/Open Government Licence/.test(pkg.result.license_title), `Transfer tables licence changed: ${pkg.result.license_title}`);
const resource = (re: RegExp) => {
  const r = pkg.result.resources.find((x) => x.language.includes("en") && re.test(x.name_translated?.en ?? x.name));
  if (!r) throw new Error(`No transfer table matching ${re}`);
  return r.url;
};
/** A transfer table: fiscal year → province code → $ millions (or thousands of people). */
async function transferTable(re: RegExp) {
  const url = resource(re);
  const rows = parse(await text(url), { relax_column_count: true, bom: true }) as string[][];
  const header = rows.find((r) => r[0] === "Year");
  if (!header) throw new Error(`No header row in ${url}`);
  const idx = (code: string) => header.findIndex((h) => h === code || (code === "AB" && h === "AL"));
  const totalIdx = header.indexOf("Total Provinces");
  const out = new Map<number, Record<ProvinceCode, number> & { totalProvinces: number }>();
  for (const r of rows) {
    if (!/^\d{4}-\d{2}$/.test(r[0] ?? "")) continue;
    const vals = Object.fromEntries(PROVINCE_CODES.map((c) => [c, num(r[idx(c)]) ?? 0])) as Record<ProvinceCode, number>;
    out.set(fyStart(r[0]!), { ...vals, totalProvinces: num(r[totalIdx]) ?? 0 });
  }
  const title = rows.find((r) => r[0]?.trim())?.[0]?.trim() ?? "";
  return { url, rows: out, title };
}
const provinces10 = PROVINCE_CODES.slice(0, 10);
const eq = await transferTable(/^Equalization Entitlements \(1957/);
const eqRecent = await transferTable(/^Equalization Entitlements \(1981/);
const cht = await transferTable(/^Canada Health Transfer \(Cash/);
const cst = await transferTable(/^Canada Social Transfer \(Cash/);
const tff = await transferTable(/^Territorial Formula Financing/);
const pop = await transferTable(/^Population for Federal Major Transfers/);

const eqYears = [...eq.rows.keys()].filter((y) => provinces10.some((c) => eq.rows.get(y)![c] > 0)).sort((a, b) => a - b);
check(eqYears[0] === 1957, `Equalization should start in 1957-58, starts ${eqYears[0]}`);
for (const y of eqYears) {
  const r = eq.rows.get(y)!;
  const sum = provinces10.reduce((n, c) => n + r[c], 0);
  check(close(sum, r.totalProvinces, 3), `Equalization ${fyLabel(y)}: provinces sum to ${sum}, total says ${r.totalProvinces}`);
  const other = eqRecent.rows.get(y);
  if (other && other.totalProvinces > 0) {
    for (const c of provinces10) check(close(other[c], r[c], 1), `Equalization ${fyLabel(y)} ${c}: the two Finance tables disagree (${other[c]} vs ${r[c]})`);
  }
}
const eqLatest = eqYears.at(-1)!;
const transferYear = [...cht.rows.keys()].filter((y) => cht.rows.get(y)!.totalProvinces > 0).sort((a, b) => a - b).at(-1)!;
check(eqLatest === transferYear, `Latest equalization year (${eqLatest}) ≠ latest CHT year (${transferYear})`);
const latestTransfers = PROVINCE_CODES.map((code) => {
  const people = pop.rows.get(transferYear)?.[code];
  if (!people) throw new Error(`No transfer population for ${code} in ${fyLabel(transferYear)}`);
  return {
    province: code,
    population: people * 1000,
    cht: cht.rows.get(transferYear)![code],
    cst: cst.rows.get(transferYear)![code],
    equalization: eq.rows.get(transferYear)![code],
    tff: tff.rows.get(transferYear)?.[code] ?? 0,
  };
});
// The CHT and CST are equal per person: every province should be within 5% of the national figure.
for (const key of ["cht", "cst"] as const) {
  const total = latestTransfers.reduce((n, p) => n + p[key], 0);
  const people = latestTransfers.reduce((n, p) => n + p.population, 0);
  const avg = (total * 1e6) / people;
  for (const p of latestTransfers.filter((x) => provinces10.includes(x.province as (typeof provinces10)[number]))) {
    const per = (p[key] * 1e6) / p.population;
    check(Math.abs(per / avg - 1) < 0.05, `${key} per person for ${p.province} (${per.toFixed(0)}) is not within 5% of the average (${avg.toFixed(0)})`);
  }
}
console.log(`Transfers: equalization ${fyLabel(eqYears[0]!)} to ${fyLabel(eqLatest)}; latest major transfers ${fyLabel(transferYear)}`);

// ---------------------------------------------------------------------------
// 4. Statistics Canada: consumer price index
// ---------------------------------------------------------------------------

const CPI_ANNUAL_VECTOR = "v41693271"; // 18-10-0005-01, Canada, all-items, 2002=100
const CPI_MONTHLY_VECTOR = 41690973; // 18-10-0004-01, Canada, all-items, 2002=100, not seasonally adjusted
const cpiZip = unzipSync(await bytes("https://www150.statcan.gc.ca/n1/tbl/csv/18100005-eng.zip"), { filter: (f) => f.name === "18100005.csv" });
const cpiCsv = cpiZip["18100005.csv"];
if (!cpiCsv) throw new Error("18100005.csv missing from the zip");
const cpiRows = parse(strFromU8(cpiCsv), { columns: true, bom: true }) as Record<string, string>[];
const cpiAnnual = cpiRows
  .filter((r) => r.VECTOR === CPI_ANNUAL_VECTOR && r.VALUE)
  .map((r) => ({ year: Number(r.REF_DATE), index: Number(r.VALUE) }))
  .sort((a, b) => a.year - b.year);
check(cpiAnnual[0]?.year === 1914, `Annual CPI should start in 1914, starts ${cpiAnnual[0]?.year}`);
cpiAnnual.forEach((p, i) => i && check(p.year === cpiAnnual[i - 1]!.year + 1, `Annual CPI has a gap before ${p.year}`));
check(cpiAnnual.find((p) => p.year === 2002)?.index === 100, "CPI should be 100 in 2002 (2002=100)");

const wds = await getJson<{ status: string; object: { vectorDataPoint: { refPer: string; value: number }[] } }[]>(
  "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods",
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify([{ vectorId: CPI_MONTHLY_VECTOR, latestN: 36 }]) },
);
if (wds[0]?.status !== "SUCCESS") throw new Error("WDS CPI request failed");
const months = wds[0].object.vectorDataPoint.map((p) => ({ month: p.refPer.slice(0, 7), index: p.value }));
const cpiLatestMonth = months.at(-1)!;
// The annual average is the mean of the 12 months: check the last full year.
const lastAnnual = cpiAnnual.at(-1)!;
const ofYear = months.filter((m) => m.month.startsWith(String(lastAnnual.year)));
if (ofYear.length === 12) {
  const mean = ofYear.reduce((n, m) => n + m.index, 0) / 12;
  check(close(mean, lastAnnual.index, 0.1), `Monthly CPI for ${lastAnnual.year} averages ${mean.toFixed(2)}, annual table says ${lastAnnual.index}`);
} else {
  problems.push(`Expected 12 months of CPI for ${lastAnnual.year}, got ${ofYear.length}`);
}
// Year-over-year change in the latest month.
const yearAgo = months.find((m) => m.month === `${Number(cpiLatestMonth.month.slice(0, 4)) - 1}${cpiLatestMonth.month.slice(4)}`);
if (!yearAgo) throw new Error("No CPI for a year before the latest month");
console.log(`CPI: ${cpiAnnual[0]!.year}–${lastAnnual.year} annual, latest month ${cpiLatestMonth.month} (${cpiLatestMonth.index})`);

// ---------------------------------------------------------------------------
// 5. Bank of Canada: Valet API
// ---------------------------------------------------------------------------

const VALET = "https://www.bankofcanada.ca/valet";
type Valet = { observations: ({ d: string } & Record<string, { v: string } | string>)[]; seriesDetail: Record<string, { label: string; description: string }> };
async function valet(series: string, query = "") {
  const j = await getJson<Valet>(`${VALET}/observations/${series}/json${query}`);
  return j.observations
    .map((o) => ({ d: o.d, v: Number((o[series] as { v: string } | undefined)?.v) }))
    .filter((o) => Number.isFinite(o.v));
}
const bankRate = (await valet("V122530")).map((o) => ({ month: o.d.slice(0, 7), value: o.v }));
const overnight = (await valet("STATIC_ATABLE_V39079")).map((o) => ({ month: o.d.slice(0, 7), value: o.v }));
const decisions = await valet("B114039");
const daily = await valet("V39079", "?recent=1");
check(bankRate[0]?.month === "1935-03" || bankRate[0]?.month === "1935-01", `Bank Rate should start in 1935, starts ${bankRate[0]?.month}`);
check(overnight[0]?.month === "1996-01", `Overnight target (end of month) should start in 1996, starts ${overnight[0]?.month}`);
const lastDecision = decisions.at(-1)!;
check(daily[0]?.v === lastDecision.v, `Latest daily target (${daily[0]?.v}) ≠ latest decision (${lastDecision.v})`);
// Since 1996 the Bank Rate has been the top of the operating band, a quarter point above the target.
const bandChecks = overnight.filter((o) => o.month >= "2001-01");
const bankByMonth = new Map(bankRate.map((b) => [b.month, b.value]));
const offBand = bandChecks.filter((o) => bankByMonth.has(o.month) && !close(bankByMonth.get(o.month)! - o.value, 0.25, 0.001));
check(offBand.length <= bandChecks.length * 0.1, `Bank Rate is not target + 0.25 in ${offBand.length} of ${bandChecks.length} months since 2001`);
console.log(`Bank of Canada: Bank Rate ${bankRate[0]!.month}–${bankRate.at(-1)!.month}, overnight target ${overnight[0]!.month}–${overnight.at(-1)!.month}, latest decision ${lastDecision.d} ${lastDecision.v}%`);

/**
 * The inflation-control target, from the Bank of Canada's history of the framework
 * (https://www.bankofcanada.ca/rates/indicators/key-variables/inflation-control-target/
 * and the 1991 joint announcement): introduced February 1991 with a path of 3% by
 * the end of 1992, 2.5% by mid-1994 and 2% by the end of 1995, each with a band of
 * one percentage point either side. The 2% midpoint has been renewed every five
 * years since. These are policy settings, not statistics, so they're recorded here.
 */
const targetBand = [
  { from: "1992-12", low: 2, mid: 3, high: 4 },
  { from: "1994-06", low: 1.5, mid: 2.5, high: 3.5 },
  { from: "1995-12", low: 1, mid: 2, high: 3 },
];

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

if (problems.length) {
  console.error(`\n${problems.length} cross-check(s) failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const write = async (file: string, data: unknown) => {
  await writeFile(new URL(file, OUT), JSON.stringify(data, null, 1) + "\n");
  console.log(`Wrote src/data/money/${file}`);
};
const frtPageUrl = `${FRT_INDEX}/${frtYear}.html`;
/** Items under $100 million (a rounding error at this scale) are listed separately, not drawn. */
const significant = (i: { value: number }) => Math.abs(i.value) >= 100;
const fyPopRow = pop.rows.get(latestFy.year);
if (!fyPopRow) throw new Error(`No population for ${latestFy.label}`);
const fyPopulation = PROVINCE_CODES.reduce((n, c) => n + fyPopRow[c], 0) * 1000;

await write("federal-finances.json", {
  _meta: {
    source: `Finance Canada, Fiscal Reference Tables (${frtEdition}), tables 1–3, 6, 7, 10 and 11; Statistics Canada, Historical Statistics of Canada (11-516-X), series H1-18, H19-34, H35-51 and F14-32`,
    url: frtPageUrl,
    urls: [frtPageUrl, frtUrl, `${HSC}/sectionh/4057752-eng.htm`, `${HSC}/sectionf/4057751-eng.htm`],
    licence: LICENCE,
    licenceUrl: LICENCE_URL,
    fetched,
    script: "scripts/data/money.ts",
    notes: [
      "Fiscal years run April 1 to March 31; year 1966 is 1966-67.",
      "1966-67 on: Finance Canada, Fiscal Reference Tables, Table 2 (per cent of GDP) and Table 1 (millions). Expenses are program expenses plus public debt charges plus net actuarial losses. Debt is the accumulated deficit, the federal debt as Finance Canada reports it.",
      "Finance Canada notes that data from 1983-84 on are not directly comparable with earlier years, because of the move to full accrual accounting.",
      "1926-27 to 1965-66: Historical Statistics of Canada, budgetary revenue (H18), budgetary expenditure (H34) and total net direct debt, less sinking funds (H46), divided by gross national expenditure (F32) for the fiscal year (three quarters of the calendar year it starts in, one quarter of the next). These are cash-basis public accounts figures; the debt measure is gross debt, not the accumulated deficit, so it runs higher than the later series.",
      "Latest-year breakdown: transfers to other governments are net of the Quebec Abatement (a reduction in Quebec's transfers in return for tax room). Direct program spending includes net actuarial losses on public sector pensions and benefits.",
      `Overlap check, 1966: revenue ${overlap.revenue[0]}% (historical) vs ${overlap.revenue[1]}% (FRT); expenses ${overlap.expenses[0]}% vs ${overlap.expenses[1]}%.`,
    ],
  },
  edition: frtEdition,
  years: [...hscYears, ...frtYears],
  latest: {
    year: latestFy.year,
    label: latestFy.label,
    /** Finance Canada's population for the same fiscal year (from the transfer tables). */
    population: fyPopulation,
    revenue: { total: revenueTotal, items: revenueItems.filter(significant), omitted: revenueItems.filter((i) => !significant(i)) },
    expenses: { total: expenseTotal, items: expenseItems.filter(significant), omitted: expenseItems.filter((i) => !significant(i)) },
  },
});

await write("transfers.json", {
  _meta: {
    source: "Finance Canada, Historical Transfer Tables: 1980 to present (equalization from 1957-58, Canada Health Transfer, Canada Social Transfer, Territorial Formula Financing, population)",
    url: HTT_PAGE,
    urls: [HTT_PAGE, eq.url, cht.url, cst.url, tff.url, pop.url],
    licence: LICENCE,
    licenceUrl: LICENCE_URL,
    fetched,
    script: "scripts/data/money.ts",
    notes: [
      "Millions of dollars, not adjusted for inflation. Equalization includes payments and additional amounts, as in Finance Canada's table; it excludes Total Transfer Protection (2010-11 to 2013-14) and the 2009-10 transition adjustment to Nova Scotia.",
      "CHT and CST are the cash components. Population is the figure Finance Canada uses to allocate the transfers.",
    ],
  },
  equalization: {
    years: eqYears.map(fyLabel),
    provinces: Object.fromEntries(provinces10.map((c) => [c, eqYears.map((y) => eq.rows.get(y)![c])])),
    total: eqYears.map((y) => eq.rows.get(y)!.totalProvinces),
  },
  latest: { year: transferYear, label: fyLabel(transferYear), provinces: latestTransfers },
});

await write("prices.json", {
  _meta: {
    source: "Statistics Canada, tables 18-10-0005-01 (Consumer Price Index, annual average) and 18-10-0004-01 (monthly)",
    url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000501",
    urls: ["https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000501", "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401"],
    licence: LICENCE,
    licenceUrl: LICENCE_URL,
    fetched,
    script: "scripts/data/money.ts",
    notes: ["All-items CPI, Canada, 2002=100. Annual averages from 1914; the latest month is not seasonally adjusted."],
  },
  cpi: {
    annual: cpiAnnual,
    latestMonth: cpiLatestMonth,
    latestYoY: round((100 * (cpiLatestMonth.index - yearAgo.index)) / yearAgo.index),
  },
});

await write("interest-rates.json", {
  _meta: {
    source: "Bank of Canada, Valet API: Bank Rate (V122530) and target for the overnight rate (V39079, end of month and decision dates)",
    url: "https://www.bankofcanada.ca/rates/interest-rates/canadian-interest-rates/",
    urls: [
      "https://www.bankofcanada.ca/valet/observations/V122530/json",
      "https://www.bankofcanada.ca/valet/observations/STATIC_ATABLE_V39079/json",
      "https://www.bankofcanada.ca/rates/indicators/key-variables/inflation-control-target/",
    ],
    licence: "Bank of Canada terms of use (free use with attribution)",
    licenceUrl: "https://www.bankofcanada.ca/terms/",
    fetched,
    script: "scripts/data/money.ts",
    notes: [
      "Bank Rate: monthly, from 1935. Since February 1996 it has been the top of the Bank's operating band, a quarter point above the target for the overnight rate.",
      "Target for the overnight rate: end of month, from January 1996. It is the Bank of Canada's policy interest rate.",
      "Inflation-control target bands are policy settings from the Bank of Canada, recorded in the script.",
    ],
  },
  bankRate,
  overnightTarget: overnight,
  latestDecision: { date: lastDecision.d, value: lastDecision.v },
  targetBand,
});
