/**
 * Typed access to the public-money datasets from `pnpm data:money`
 * (src/data/money/*.json), plus the inflation adjustment the charts share.
 */
import financesJson from "../data/money/federal-finances.json";
import transfersJson from "../data/money/transfers.json";
import pricesJson from "../data/money/prices.json";
import ratesJson from "../data/money/interest-rates.json";
import { population as statcanPopulation } from "./reference";
import { PROVINCES, type ProvinceCode } from "./elections-constants";
import type { DatasetMeta } from "./reference";

export interface FiscalYear {
  year: number;
  label: string;
  source: "hsc" | "frt";
  revenue: number;
  expenses: number;
  balance: number;
  debt: number;
  revenueM?: number;
  expensesM?: number;
  balanceM?: number;
  debtM?: number;
}
export interface BudgetItem {
  key: string;
  label: string;
  value: number;
  group?: string;
}

export const finances = financesJson as unknown as {
  _meta: DatasetMeta;
  edition: string;
  years: FiscalYear[];
  latest: {
    year: number;
    label: string;
    population: number;
    revenue: { total: number; items: BudgetItem[]; omitted: BudgetItem[] };
    expenses: { total: number; items: BudgetItem[]; omitted: BudgetItem[] };
  };
};

export const transfers = transfersJson as unknown as {
  _meta: DatasetMeta;
  equalization: { years: string[]; provinces: Record<string, number[]>; total: number[] };
  latest: {
    year: number;
    label: string;
    provinces: { province: ProvinceCode; population: number; cht: number; cst: number; equalization: number; tff: number }[];
  };
};

export const prices = pricesJson as unknown as {
  _meta: DatasetMeta;
  cpi: { annual: { year: number; index: number }[]; latestMonth: { month: string; index: number }; latestYoY: number };
};

export const rates = ratesJson as unknown as {
  _meta: DatasetMeta;
  bankRate: { month: string; value: number }[];
  overnightTarget: { month: string; value: number }[];
  latestDecision: { date: string; value: number };
  targetBand: { from: string; low: number; mid: number; high: number }[];
};

// ---------------------------------------------------------------------------
// Inflation
// ---------------------------------------------------------------------------

const cpiByYear = new Map(prices.cpi.annual.map((p) => [p.year, p.index]));
/** The latest full calendar year of CPI: amounts compared across decades are in this year's dollars. */
export const BASE_YEAR = prices.cpi.annual.at(-1)!.year;
/** Price level for a year: the annual average, or the latest month for a year not yet complete. */
export const cpiFor = (year: number) => cpiByYear.get(year) ?? (year > BASE_YEAR ? prices.cpi.latestMonth.index : undefined);
/** Converts dollars of `year` into dollars of BASE_YEAR. */
export function toReal(amount: number, year: number): number {
  const c = cpiFor(year);
  if (!c) throw new Error(`No CPI for ${year}`);
  return (amount * cpiByYear.get(BASE_YEAR)!) / c;
}

// ---------------------------------------------------------------------------
// Population (July 1 estimates), for per-person figures
// ---------------------------------------------------------------------------

export function provincePopulation(code: ProvinceCode, year: number): number | undefined {
  return statcanPopulation.estimates[PROVINCES[code].slug]?.find((p) => p.year === year)?.value;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** 526412 ($ millions) → "$526.4 billion"; 860 → "$860 million". */
export function formatMillions(m: number, digits = 1): string {
  const sign = m < 0 ? "−" : "";
  const a = Math.abs(m);
  if (a >= 1000) return `${sign}$${(a / 1000).toLocaleString("en-CA", { minimumFractionDigits: digits, maximumFractionDigits: digits })} billion`;
  return `${sign}$${Math.round(a).toLocaleString("en-CA")} million`;
}
export const formatDollars = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-CA")}`;
/** A signed percentage with a true minus sign: "−1.2%". */
export const formatSignedPct = (n: number, digits = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}%`;
export const formatPct = (n: number, digits = 1) => `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}%`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-09" → "September 2026". */
export const formatMonth = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
/** "2026-10-29" → "October 29, 2026". */
export const formatDay = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
/** "2026-09" → 2026.67, the x position of a month on a year axis. */
export const monthX = (ym: string) => Number(ym.slice(0, 4)) + (Number(ym.slice(5, 7)) - 1) / 12;
