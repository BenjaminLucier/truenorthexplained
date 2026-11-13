/**
 * Typed access to the historical datasets: every federal general election
 * (src/data/elections/history.json, `pnpm data:election-history`) and every
 * provincial and territorial premier (src/data/wikidata/premiers.json,
 * `pnpm data:premiers`), plus small helpers shared by their charts.
 */
import historyData from "../data/elections/history.json";
import premierData from "../data/wikidata/premiers.json";
import type { DatasetMeta } from "./reference";
import { buildDate, formatDate, yearFraction } from "./reference";
import { FEDERAL, FEDERAL_FAMILIES, PROVINCIAL, type FederalFamily, type ProvincialFamily } from "./party-families";

export { FEDERAL, FEDERAL_FAMILIES, PROVINCIAL, type FederalFamily, type ProvincialFamily };

export interface Election {
  number: number;
  year: number;
  date: string;
  dateLabel: string;
  /** Seats filled at the election (the denominator for seat shares). */
  houseSize: number;
  /** Seats in the House, filled or not: 181 in 1867, when Kamouraska returned no one. */
  seatsInHouse: number;
  majority: number;
  seats: Record<FederalFamily, number>;
  vote: Record<FederalFamily, number>;
  parties: { name: string; family: FederalFamily; seats: number; vote: number | null }[];
  turnout: number;
  turnoutNote?: string;
  electors: number;
  ballots: number;
  government: {
    party: string;
    family: "lpc" | "cpc";
    primeMinister: string;
    pmOrdinal: number;
    seats: number;
    type: "majority" | "minority";
  };
  women: number;
  note?: string;
  nextElection: string | null;
  daysToNext: number | null;
}

export interface PremierTerm {
  name: string;
  qid: string;
  start: string;
  end: string | null;
  party: string;
  family: ProvincialFamily;
  source: string;
}

export interface ProvinceGovernments {
  slug: string;
  name: string;
  type: string;
  joined: string;
  terms: PremierTerm[];
  gaps: { start: string; end: string }[];
}

export const historyMeta = historyData._meta as DatasetMeta;
export const elections = historyData.elections as Election[];
/** Milestones in who could vote, each checked against Elections Canada's "A History of the Vote in Canada". */
export const milestones = historyData.milestones as { year: number; label: string; detail: string; url: string }[];
export const voteHistoryUrl = "https://www.elections.ca/content.aspx?section=res&dir=his&document=index&lang=e";
export const premiersMeta = premierData._meta as DatasetMeta;
export const provinceGovernments = premierData.provinces as ProvinceGovernments[];

export const ecTurnoutUrl = historyMeta.url;
export const wikiListUrl = "https://en.wikipedia.org/wiki/List_of_Canadian_federal_elections";

/** "1st", "22nd", "43rd". */
export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** Days from an election to the next one, or to today for the latest. */
export const parliamentDays = (e: Election) =>
  e.daysToNext ?? Math.round((Date.parse(`${buildDate}T00:00:00Z`) - Date.parse(`${e.date}T00:00:00Z`)) / 86_400_000);

/** Where an election (or anything dated) sits on a fractional-year axis. */
export const when = (iso: string) => yearFraction(iso);
export const today = yearFraction(buildDate);
export { buildDate, formatDate };

/** 47.25 → "47.3%"; whole numbers stay whole: 50 → "50%". */
export const pct = (v: number, d = 1) => `${Number(v.toFixed(d))}%`;

/** "Liberal majority", "Progressive Conservative minority". */
export const governmentLabel = (e: Election) => `${e.government.party} ${e.government.type}`;

/** Fixed bottom-to-top stacking for the seat chart: Liberals rise from the bottom, Conservatives hang from the top. */
export const STACK: FederalFamily[] = ["lpc", "progressive", "socred", "ndp", "bq", "gpc", "other", "cpc"];

/** Years as "4 years, 2 months" or "9 months". */
export function years(days: number): string {
  const months = Math.round(days / 30.4375);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} month${m === 1 ? "" : "s"}`;
  return m ? `${y} year${y === 1 ? "" : "s"}, ${m} month${m === 1 ? "" : "s"}` : `${y} year${y === 1 ? "" : "s"}`;
}

/** The family that won the most seats (ties: the governing family). */
export function largest(e: Election): FederalFamily {
  return FEDERAL_FAMILIES.reduce((a, b) => (e.seats[b] > e.seats[a] || (e.seats[b] === e.seats[a] && b === e.government.family) ? b : a));
}

// ---------------------------------------------------------------------------
// A shared time axis for the history charts: 1867 to the end of this year,
// mapped onto the 0–1000 plotting width of src/lib/charts.ts.

export const X0 = 1867;
// floor + 1 rather than ceil: on January 1 the fraction is whole, and ceil would end the axis today.
export const X1 = Math.floor(today) + 1;
export const xOf = (yearFrac: number) => ((yearFrac - X0) / (X1 - X0)) * 1000;
export const xOfDate = (iso: string) => xOf(yearFraction(iso));
export const X_TICKS = [1867, 1900, 1925, 1950, 1975, 2000, 2025];
/** "12.34%" for a 0–1000 x position, for HTML and outer-SVG placement. */
export const xPct = (x: number) => `${(x / 10).toFixed(2)}%`;

/** Share of the seats filled at the election, 0–100. */
export const seatShare = (e: Election, f: FederalFamily) => (100 * e.seats[f]) / e.houseSize;

/** Each election's x position, and the band around it that reaches halfway to its neighbours (the hover target). */
export const electionBands = elections.map((e, i) => {
  const xc = xOfDate(e.date);
  const prev = elections[i - 1];
  const next = elections[i + 1];
  return {
    xc,
    x0: prev ? (xOfDate(prev.date) + xc) / 2 : 0,
    x1: next ? (xOfDate(next.date) + xc) / 2 : 1000,
  };
});
