/**
 * The numbers behind each province and territory page's "In numbers" profile
 * (src/widgets/province-profile), and the one-sentence takeaway written for
 * each chart.
 *
 * Two layers:
 *
 * - **Pure functions** (`populationShares`, `populationTakeaway`,
 *   `electionTakeaway`, `treatyOverlaps`…) take plain values and return plain
 *   values. They never read a dataset themselves, so they can be unit-tested
 *   with made-up inputs, including the awkward ones: a territory with one seat,
 *   a province that never received equalization, a tie, a missing series.
 * - **`provinceProfile(slug)`** gathers this province's slice of the committed
 *   datasets (through the typed accessors in reference.ts, elections.ts,
 *   money.ts and election-history.ts) and runs the pure functions over it.
 *
 * No `astro:` imports: this runs under Astro, tsx and vitest alike.
 *
 * Takeaways follow one rule: say only what the numbers show. Where a
 * comparison is too close to call, they say so instead of picking a side.
 */
import { geoBounds, geoConicConformal, type GeoProjection } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { PARTIES, PROVINCES, PROVINCE_CODES, type PartyKey, type ProvinceCode } from "./elections-constants";

// ---------------------------------------------------------------------------
// Wording helpers
// ---------------------------------------------------------------------------

/** "the Northwest Territories", but plain "Ontario". */
export const withArticle = (name: string) => (/^Northwest Territories$/.test(name) ? `the ${name}` : name);
/** Sentence-initial form of `withArticle`. */
export const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Ontario's", "the Northwest Territories'". */
export const possessive = (name: string) => `${withArticle(name)}${name.endsWith("s") ? "'" : "'s"}`;

/** "a", "a and b", "a, b and c". */
export function joinList(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** 41798407 → "41,798,407". */
export const num = (n: number) => Math.round(n).toLocaleString("en-CA");
/** Rounds to 3 significant figures for "about" statements: 133,281 → "133,000"; 45,747 → "45,700". */
export function round3(n: number): number {
  if (Math.abs(n) < 1000) return Math.round(n);
  const mag = 10 ** (Math.floor(Math.log10(Math.abs(n))) - 2);
  return Math.round(n / mag) * mag;
}
export const about = (n: number) => num(round3(n));
/** A percentage with one decimal, or two under 1%: 38.9%, 0.29%. */
export const pct = (v: number) => `${v.toFixed(Math.abs(v) < 0.995 && v !== 0 ? 2 : 1)}%`;
/**
 * A share of the vote for a riding winner, from the raw votes: 31,095 of 62,240 → 49.96…
 * Use this rather than Elections Canada's one-decimal share whenever the 50% line matters,
 * since a published "50.0" can be just under or just over half.
 */
export const voteShare = (votes: number, validVotes: number) => (validVotes > 0 ? (100 * votes) / validVotes : 0);
/**
 * A winner's share with one decimal, or more when one decimal would print "50.0%" for a share
 * that is not exactly half, so the figure never contradicts "less than" or "more than half": 49.96%, 50.05%, 50.0%.
 */
export function winnerPct(v: number): string {
  let d = 1;
  while (d < 6 && v !== 50 && Number(v.toFixed(d)) === 50) d++;
  return `${v.toFixed(d)}%`;
}
/** "1 seat", "4 seats". */
export const plural = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;
/** "$1,234". */
export const dollars = (n: number) => `${n < 0 ? "−" : ""}$${num(Math.abs(n))}`;
/** 16262121 → "16.3 million"; 552462 → "552,000"; 43091 → "43,100". */
export function people(n: number): string {
  if (round3(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} million`;
  return about(n);
}

// ---------------------------------------------------------------------------
// 1. Population and seats
// ---------------------------------------------------------------------------

export interface PopulationSharesInput {
  name: string;
  population: number;
  canadaPopulation: number;
  seats: number;
  totalSeats: number;
}

export interface PopulationShares extends PopulationSharesInput {
  /** Share of Canada's population, 0–100. */
  popShare: number;
  /** Share of House seats, 0–100. */
  seatShare: number;
  /** People per MP here, and across Canada. */
  perSeat: number;
  avgPerSeat: number;
  /** perSeat ÷ avgPerSeat. */
  ratio: number;
  /** Seats the province would have if every seat were shared strictly by today's population (unrounded). */
  strictSeats: number;
}

export function populationShares(d: PopulationSharesInput): PopulationShares {
  if (d.seats <= 0 || d.totalSeats <= 0 || d.canadaPopulation <= 0) throw new Error(`populationShares: bad input for ${d.name}`);
  const perSeat = d.population / d.seats;
  const avgPerSeat = d.canadaPopulation / d.totalSeats;
  return {
    ...d,
    popShare: (100 * d.population) / d.canadaPopulation,
    seatShare: (100 * d.seats) / d.totalSeats,
    perSeat,
    avgPerSeat,
    ratio: perSeat / avgPerSeat,
    strictSeats: (d.population / d.canadaPopulation) * d.totalSeats,
  };
}

/** How far people-per-MP sits from the national average, in words. */
export function perSeatComparison(ratio: number, avg: number): string {
  const diff = Math.round(100 * Math.abs(ratio - 1));
  const avgText = `the national average of ${about(avg)}`;
  if (diff < 3) return `close to ${avgText}`;
  return `${diff}% ${ratio > 1 ? "more" : "fewer"} than ${avgText}`;
}

/** "Ontario has 38.9% of Canada's people and 35.6% of the seats in the House of Commons; each of its MPs represents about 133,000 people, 9% more than the national average of 121,900." */
export function populationTakeaway(s: PopulationShares): string {
  const who = capitalized(withArticle(s.name));
  const seats =
    s.seats === 1
      ? `one of the ${num(s.totalSeats)} seats in the House of Commons (${pct(s.seatShare)})`
      : `${pct(s.seatShare)} of the seats in the House of Commons (${s.seats} of ${num(s.totalSeats)})`;
  const mps = s.seats === 1 ? "its one MP represents" : "each of its MPs represents";
  return `${who} has ${pct(s.popShare)} of Canada's people and ${seats}; ${mps} about ${about(s.perSeat)} people, ${perSeatComparison(s.ratio, s.avgPerSeat)}.`;
}

export interface SeatAllocationRow {
  initial: number;
  senatorialClause: number;
  grandfatherClause: number;
  representationRule: number;
  total: number;
}

/** "Of its 7 seats, 5 come from its population, 1 from the senatorial clause and 1 from the grandfather clause." */
export function seatSources(a: SeatAllocationRow, territory: boolean): string {
  if (territory) return "Each territory has one seat, whatever its population.";
  const parts = [
    a.senatorialClause > 0 && `${a.senatorialClause} from the senatorial clause`,
    a.grandfatherClause > 0 && `${a.grandfatherClause} from the grandfather clause`,
    a.representationRule > 0 && `${a.representationRule} from the representation rule`,
  ].filter((p): p is string => Boolean(p));
  if (parts.length === 0) return `All ${a.total} of its seats come from its population; no constitutional guarantee adds any.`;
  return `Of its ${a.total} seats, ${joinList([`${a.initial} come from its population`, ...parts])}.`;
}

export interface YearValue {
  year: number;
  value: number;
}

export interface PopulationTrend {
  first: YearValue;
  last: YearValue;
  peak: YearValue;
  /** Share of Canada's population in the first and last year, 0–100 (null if Canada has no value that year). */
  shareFirst: number | null;
  shareLast: number | null;
}

/** First, last and peak of a population series, with its share of Canada's at both ends. Null for an empty series. */
export function populationTrend(series: YearValue[], canada: YearValue[]): PopulationTrend | null {
  const pts = [...series].sort((a, b) => a.year - b.year);
  const first = pts[0];
  const last = pts.at(-1);
  if (!first || !last) return null;
  const peak = pts.reduce((a, b) => (b.value >= a.value ? b : a));
  const ca = new Map(canada.map((p) => [p.year, p.value]));
  const share = (p: YearValue) => {
    const c = ca.get(p.year);
    return c ? (100 * p.value) / c : null;
  };
  return { first, last, peak, shareFirst: share(first), shareLast: share(last) };
}

/** "Ontario's population grew from 4.6 million in 1951 to 16.3 million in 2026, and its share of Canada's rose from 33.2% to 38.9%." */
export function trendTakeaway(name: string, t: PopulationTrend): string {
  const who = capitalized(possessive(name));
  if (t.first.year === t.last.year) return `${who} population was ${people(t.last.value)} in ${t.last.year}.`;
  const change = t.last.value - t.first.value;
  const same = Math.abs(change) / t.first.value < 0.01 || people(t.first.value) === people(t.last.value);
  // A peak worth mentioning: between the first and latest years, and at least 2% above the latest.
  const peaked = t.peak.year > t.first.year && t.peak.year < t.last.year && t.peak.value >= t.last.value * 1.02;
  let s: string;
  if (same && peaked) {
    // Back where it started, but not flat: say it rose and came back down.
    s = `${who} population rose from ${people(t.first.value)} in ${t.first.year} to ${people(t.peak.value)} in ${t.peak.year}, then fell back to about ${people(t.last.value)} in ${t.last.year}`;
  } else if (same) {
    s = `${who} population held at about ${people(t.last.value)} from ${t.first.year} to ${t.last.year}`;
  } else {
    s = `${who} population ${change > 0 ? "grew" : "fell"} from ${people(t.first.value)} in ${t.first.year} to ${people(t.last.value)} in ${t.last.year}`;
    if (peaked) s += `, after peaking at ${people(t.peak.value)} in ${t.peak.year}`;
  }
  if (t.shareFirst !== null && t.shareLast !== null) {
    const a = pct(t.shareFirst);
    const b = pct(t.shareLast);
    if (a === b) s += `, and its share of Canada's stayed at ${b}`;
    else s += `, and its share of Canada's ${t.shareLast > t.shareFirst ? "rose" : "fell"} from ${a} to ${b}`;
  }
  return `${s}.`;
}

// ---------------------------------------------------------------------------
// 2. The 2025 federal election
// ---------------------------------------------------------------------------

/** Plural names for sentences: "the Liberals won…". */
export const PARTY_PLURAL: Record<PartyKey, string> = {
  lpc: "the Liberals",
  cpc: "the Conservatives",
  bq: "the Bloc Québécois",
  ndp: "the NDP",
  gpc: "the Greens",
  other: "other candidates",
};

export interface PartyResult {
  party: PartyKey;
  votes: number;
  /** Percentage of valid votes. */
  share: number;
  seats: number;
}

/** Parties that ran, most seats first, then most votes; "other" always last. */
export function sortParties<T extends PartyResult>(parties: T[]): T[] {
  return parties
    .filter((p) => p.votes > 0 || p.seats > 0)
    .sort((a, b) => Number(a.party === "other") - Number(b.party === "other") || b.seats - a.seats || b.votes - a.votes);
}

/**
 * "The Liberals won 69 of Ontario's 122 seats with 49.0% of the vote; the Conservatives won 53 with 43.8%."
 * Handles one-seat territories, sweeps, ties and a seat winner that lost the popular vote.
 */
export function electionTakeaway(name: string, parties: PartyResult[], totalSeats: number): string {
  const ranked = sortParties(parties);
  // By seats, then votes: here "other" is not sent last, since it may have won the most.
  const winners = ranked.filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats || b.votes - a.votes);
  const byVotes = [...ranked].sort((a, b) => b.votes - a.votes);
  const top = winners[0];
  if (!top || totalSeats <= 0) return `There are no 2025 results for ${withArticle(name)} in the data.`;
  const who = (p: PartyResult) => PARTY_PLURAL[p.party];
  const voteOf = (p: PartyResult) => `${pct(p.share)} of the vote`;

  if (totalSeats === 1) {
    const second = byVotes.find((p) => p !== top);
    // Under 0.05 points the gap would print as "0.0 points": give it in votes.
    const gap = second ? top.share - second.share : 0;
    const lead = !second ? "" : gap >= 0.05 ? `, ${gap.toFixed(1)} points ahead of ${who(second)}` : `, ${plural(top.votes - second.votes, "vote")} ahead of ${who(second)}`;
    return `${capitalized(possessive(name))} one seat went to ${who(top)}, who won ${voteOf(top)}${lead}.`;
  }
  if (winners.length === 1 && top.seats === totalSeats) {
    return `${capitalized(who(top))} won all ${totalSeats} of ${possessive(name)} seats, with ${voteOf(top)}.`;
  }
  const second = winners[1];
  if (!second) return `${capitalized(who(top))} won ${top.seats} of ${possessive(name)} ${totalSeats} seats, with ${voteOf(top)}.`;
  let s: string;
  if (second.seats === top.seats) {
    s = `${capitalized(who(top))} and ${who(second)} each won ${top.seats} of ${possessive(name)} ${totalSeats} seats, with ${pct(top.share)} and ${pct(second.share)} of the vote`;
  } else {
    s = `${capitalized(who(top))} won ${top.seats} of ${possessive(name)} ${totalSeats} seats with ${voteOf(top)}; ${who(second)} won ${second.seats} with ${pct(second.share)}`;
  }
  const rest = winners.slice(2);
  const restText = rest.map((p) => `${who(p)} ${p.seats}`);
  if (restText.length === 1) s += ` and ${restText[0]}`;
  else if (restText.length > 1) s += `, ${joinList(restText)}`;
  // Say so when the party with the most seats did not win the most votes.
  const voteLeader = byVotes[0];
  if (second.seats !== top.seats && voteLeader && voteLeader !== top && voteLeader.votes > top.votes) {
    s += `. ${capitalized(who(voteLeader))} won more votes but fewer seats`;
  }
  return `${s}.`;
}

export interface RidingRow {
  fed: number;
  name: string;
  party: PartyKey;
  winner: string;
  /** Points of valid votes between first and second. */
  margin: number;
  marginVotes: number;
  /** The winner's share of valid votes, unrounded (see voteShare): 50% means exactly half. */
  winnerShare: number;
  /** The runner-up's party, if there was one. */
  second?: PartyKey;
}

/** "The closest race was Terrebonne, decided by 1 vote; 12 of the 78 winners had less than half the votes." */
export function ridingsTakeaway(rows: RidingRow[]): string {
  if (rows.length === 0) return "There are no riding results in the data.";
  const minVotes = Math.min(...rows.map((r) => r.marginVotes));
  const closest = rows.filter((r) => r.marginVotes === minVotes);
  const pts = closest[0]!.margin;
  // With several races on the same vote margin, give points only if they share them too.
  const samePts = closest.every((r) => r.margin.toFixed(1) === pts.toFixed(1));
  const by = `decided by ${plural(minVotes, "vote")}${pts >= 0.1 && samePts ? ` (${pts.toFixed(1)} points)` : ""}`;
  const race =
    closest.length === 1
      ? `The closest race was ${closest[0]!.name}, ${by}`
      : `The closest races were ${joinList(closest.map((r) => r.name))}, each ${by}`;
  // Decided on the unrounded share: exactly half is neither "more than" nor "less than" half.
  const minority = rows.filter((r) => r.winnerShare < 50).length;
  const exactlyHalf = rows.some((r) => r.winnerShare === 50);
  const half =
    minority === 0
      ? `every winner had ${exactlyHalf ? "at least" : "more than"} half the votes`
      : minority === rows.length
        ? `no winner had more than half the votes`
        : `${numberWord(minority)} of the ${numberWord(rows.length)} winners had less than half the votes`;
  return `${race}; ${half}.`;
}

// ---------------------------------------------------------------------------
// 3. Transfers and equalization
// ---------------------------------------------------------------------------

export interface TransferRow {
  province: ProvinceCode;
  population: number;
  /** $ millions. */
  cht: number;
  cst: number;
  equalization: number;
  tff: number;
}

export interface PerPerson {
  province: ProvinceCode;
  cht: number;
  cst: number;
  equalization: number;
  tff: number;
  total: number;
}

export function perPerson(r: TransferRow): PerPerson {
  if (r.population <= 0) throw new Error(`perPerson: no population for ${r.province}`);
  const pp = (m: number) => (m * 1e6) / r.population;
  const out = { province: r.province, cht: pp(r.cht), cst: pp(r.cst), equalization: pp(r.equalization), tff: pp(r.tff) };
  return { ...out, total: out.cht + out.cst + out.equalization + out.tff };
}

/** Population-weighted average per person over a group of rows (all provinces, say). */
export function averagePerPerson(rows: TransferRow[]): Omit<PerPerson, "province"> {
  const people = rows.reduce((n, r) => n + r.population, 0);
  const avg = (k: "cht" | "cst" | "equalization" | "tff") => (rows.reduce((n, r) => n + r[k], 0) * 1e6) / people;
  const out = { cht: avg("cht"), cst: avg("cst"), equalization: avg("equalization"), tff: avg("tff") };
  return { ...out, total: out.cht + out.cst + out.equalization + out.tff };
}

/**
 * "In 2026-27, Quebec gets about $3,300 per person in major federal transfers, $1,500 of it equalization,
 * compared with an average of $2,300 across the provinces."
 */
export function transfersTakeaway(name: string, territory: boolean, yearLabel: string, mine: PerPerson, provinceAvg: number): string {
  const who = withArticle(name);
  const head = `In ${yearLabel}, ${who} gets about ${dollars(round3(mine.total))} per person in major federal transfers`;
  if (territory) {
    return `${head}, ${dollars(round3(mine.tff))} of it through Territorial Formula Financing; territories don't receive equalization, and the average across the provinces is ${dollars(round3(provinceAvg))}.`;
  }
  const avg = `compared with an average of ${dollars(round3(provinceAvg))} across the provinces`;
  if (mine.equalization > 0) {
    return `${head}, ${dollars(round3(mine.equalization))} of it equalization, ${avg}.`;
  }
  return `${head}, all of it health and social transfers with no equalization, ${avg}.`;
}

export interface EqualizationHistory {
  /** Fiscal-year labels, oldest first ("1957-58"). */
  years: string[];
  /** $ millions as paid, per year (0 = none). */
  paid: number[];
}

export interface EqualizationSummary {
  years: number;
  received: number;
  first: string | null;
  last: string | null;
  /** Receiving in the latest year. */
  now: boolean;
  /** Start of the unbroken run that reaches the latest year, if receiving now. */
  since: string | null;
}

export function equalizationSummary(h: EqualizationHistory): EqualizationSummary {
  const idx = h.paid.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
  const n = h.paid.length;
  const now = n > 0 && (h.paid[n - 1] ?? 0) > 0;
  let start = n - 1;
  if (now) while (start > 0 && (h.paid[start - 1] ?? 0) > 0) start--;
  return {
    years: n,
    received: idx.length,
    first: idx.length ? h.years[idx[0]!]! : null,
    last: idx.length ? h.years[idx.at(-1)!]! : null,
    now,
    since: now ? h.years[start]! : null,
  };
}

/** "Quebec has received equalization in every one of the 70 years since 1957-58." */
export function equalizationTakeaway(name: string, h: EqualizationHistory): string {
  const s = equalizationSummary(h);
  const who = capitalized(withArticle(name));
  const begin = h.years[0];
  const latest = h.years.at(-1);
  if (!begin || !latest) return `There is no equalization data for ${withArticle(name)}.`;
  if (s.received === 0) return `${who} has not received equalization in any year since ${begin}.`;
  if (s.years === 1) return `${who} received equalization in ${latest}.`;
  if (s.received === s.years) return `${who} has received equalization in every one of the ${s.years} years from ${begin} to ${latest}.`;
  const firstTime = s.first !== begin ? `${who} first received equalization in ${s.first}, and has received it` : `${who} has received equalization`;
  const count = `${firstTime} in ${s.received} of the ${s.years} years since ${begin}`;
  if (s.now) {
    return s.since === begin || s.since === null
      ? `${count}.`
      : s.since === latest && s.received > 1
        ? `${count}; it receives it again in ${latest}, after ${gapBefore(h)}.`
        : s.since === latest
          ? `${count}.`
          : `${count}, including every year since ${s.since}.`;
  }
  return `${count}, most recently in ${s.last}; it receives none in ${latest}.`;
}

/** "3 years without it" before the latest year's payment. */
function gapBefore(h: EqualizationHistory): string {
  let k = 0;
  for (let i = h.paid.length - 2; i >= 0 && !(h.paid[i]! > 0); i--) k++;
  return k === 0 ? "receiving it the year before" : `${plural(k, "year")} without it`;
}

// ---------------------------------------------------------------------------
// 4. Premiers
// ---------------------------------------------------------------------------

export interface PremierTermLite {
  name: string;
  qid: string;
  start: string;
  end: string | null;
  party: string;
  family: string;
}

export interface GovernmentRun {
  family: string;
  party: string;
  start: string;
  end: string | null;
  /** Premiers (terms) in the run. */
  n: number;
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Consecutive terms of the same party merged into runs. A gap of under 400
 * days between terms (a caretaker, a vacancy) doesn't break a run.
 * Non-partisan terms are left out.
 */
export function governmentRuns(terms: PremierTermLite[], today: string): GovernmentRun[] {
  const out: GovernmentRun[] = [];
  for (const t of terms) {
    const last = out.at(-1);
    if (last && last.family === t.family && last.party === t.party && dayDiff(last.end ?? today, t.start) < 400) {
      last.end = t.end;
      last.n++;
    } else out.push({ family: t.family, party: t.party, start: t.start, end: t.end, n: 1 });
  }
  return out.filter((r) => r.family !== "nonpartisan");
}

/** The longest run by days (the earliest, on a tie), or undefined if there are none. */
export function longestRun(runs: GovernmentRun[], today: string): GovernmentRun | undefined {
  return runs.reduce<GovernmentRun | undefined>((a, b) => (!a || dayDiff(b.start, b.end ?? today) > dayDiff(a.start, a.end ?? today) ? b : a), undefined);
}

/** Whole years in a run. */
export const runYears = (r: { start: string; end: string | null }, today: string) => Math.floor(dayDiff(r.start, r.end ?? today) / 365.25);

/**
 * "Ontario has had 26 premiers since 1867; the longest unbroken run by one party was 42 years of
 * Progressive Conservative government, from 1943 to 1985."
 */
export function premiersTakeaway(name: string, territory: boolean, terms: PremierTermLite[], today: string): string {
  const who = capitalized(withArticle(name));
  const first = terms[0];
  if (!first) return `There are no premiers for ${withArticle(name)} in the data.`;
  const people = new Set(terms.map((t) => t.qid)).size;
  const noun = territory ? (people === 1 ? "premier or government leader" : "premiers and government leaders") : people === 1 ? "premier" : "premiers";
  const head = `${who} has had ${numberWord(people)} ${noun} since ${first.start.slice(0, 4)}`;
  const runs = governmentRuns(terms, today);
  const best = longestRun(runs, today);
  if (!best) {
    const current = terms.at(-1)!;
    return `${head}, none of them leading a party government${current.end === null && /consensus/i.test(current.party) ? "; today's government works by consensus" : ""}.`;
  }
  const yrs = runYears(best, today);
  if (yrs < 1) return `${head}.`;
  const span = best.end === null ? `since ${best.start.slice(0, 4)}` : `from ${best.start.slice(0, 4)} to ${best.end.slice(0, 4)}`;
  return best.end === null
    ? `${head}; the longest unbroken run by one party is the current one, ${plural(yrs, "year")} of ${best.party} government ${span}.`
    : `${head}; the longest unbroken run by one party was ${plural(yrs, "year")} of ${best.party} government, ${span}.`;
}

// ---------------------------------------------------------------------------
// 5. Treaty areas
// ---------------------------------------------------------------------------

type PolyFeature = Feature<Polygon | MultiPolygon, any>;

interface Ring {
  xy: Float64Array;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface Shape {
  rings: Ring[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A Lambert conformal conic in kilometres (Statistics Canada's parallels): planar maths in km. */
export function kmProjection(): GeoProjection {
  return geoConicConformal().parallels([49, 77]).rotate([91.866667, 0]).scale(6371).translate([0, 0]);
}

function shapeOf(f: PolyFeature, project: GeoProjection): Shape {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings: Ring[] = [];
  for (const poly of polys)
    for (const ring of poly) {
      const xy = new Float64Array(ring.length * 2);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      ring.forEach((pt, i) => {
        const [x, y] = project(pt as [number, number])!;
        xy[2 * i] = x;
        xy[2 * i + 1] = y;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      });
      rings.push({ xy, x0, y0, x1, y1 });
    }
  return {
    rings,
    x0: Math.min(...rings.map((r) => r.x0)),
    y0: Math.min(...rings.map((r) => r.y0)),
    x1: Math.max(...rings.map((r) => r.x1)),
    y1: Math.max(...rings.map((r) => r.y1)),
  };
}

/** Even-odd point in polygon over every ring, so holes and islands just work. */
function inside(s: Shape, x: number, y: number): boolean {
  if (x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) return false;
  let c = false;
  for (const r of s.rings) {
    if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
    const p = r.xy;
    const n = p.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = p[2 * i + 1]!;
      const yj = p[2 * j + 1]!;
      if (yi > y !== yj > y && x < ((p[2 * j]! - p[2 * i]!) * (y - yi)) / (yj - yi) + p[2 * i]!) c = !c;
    }
  }
  return c;
}

export interface TreatyOverlap<P> {
  props: P;
  /** km² of the treaty area inside the province (approximate). */
  areaKm2: number;
  /** Share of the province's land inside this treaty area, 0–100. */
  shareOfProvince: number;
  /** Share of the treaty area that lies in this province, 0–100. */
  shareOfTreaty: number;
}

export interface TreatyOverlapResult<P> {
  /** Treaty areas that overlap the province, largest overlap first. */
  treaties: TreatyOverlap<P>[];
  /** Share of the province's land inside at least one of them, 0–100. */
  covered: number;
  /** Treaty areas that only touch the province along its border, left out. */
  edgeOnly: P[];
  /** The province's land area (km², approximate). */
  provinceKm2: number;
}

/**
 * Which treaty areas overlap a province, worked out by sampling: the boundary
 * data has no province field. Points are laid on a grid (in km, on a Lambert
 * conformal conic) over each treaty, and over the province for its coverage.
 *
 * Treaty areas and province outlines were simplified separately, so their
 * shared borders don't line up exactly: a treaty that ends at a provincial
 * border can show a thin sliver on the far side. A sample therefore only
 * counts for the province when it lies at least `edgeKm` inside it, and a
 * treaty is listed only when at least `minKm2` of it is that far inside (or,
 * for small treaties, at least half of it is in the province at all).
 * Results are approximate: within a few per cent for large areas.
 */
export function treatyOverlaps<P>(
  province: PolyFeature,
  treaties: { feature: PolyFeature; props: P }[],
  { edgeKm = 10, minKm2 = 300, samples = 9000 } = {},
): TreatyOverlapResult<P> {
  const proj = kmProjection();
  const prov = shapeOf(province, proj);
  const deep = (x: number, y: number) =>
    inside(prov, x + edgeKm, y) && inside(prov, x - edgeKm, y) && inside(prov, x, y + edgeKm) && inside(prov, x, y - edgeKm);

  // Province land area and a grid for coverage.
  const pStep = Math.sqrt(((prov.x1 - prov.x0) * (prov.y1 - prov.y0)) / (samples * 2));
  const provPts: [number, number][] = [];
  for (let x = prov.x0 + pStep / 2; x < prov.x1; x += pStep) for (let y = prov.y0 + pStep / 2; y < prov.y1; y += pStep) if (inside(prov, x, y)) provPts.push([x, y]);
  const provinceKm2 = provPts.length * pStep * pStep;

  const found: { props: P; shape: Shape; areaKm2: number; shareOfTreaty: number }[] = [];
  const edgeOnly: P[] = [];
  for (const t of treaties) {
    // Cheap reject on lon/lat bounds first.
    const [[w, s], [e, n]] = geoBounds(t.feature);
    const [[pw, ps], [pe, pn]] = geoBounds(province);
    if (w > pe || e < pw || s > pn || n < ps) continue;
    const shape = shapeOf(t.feature, proj);
    if (shape.x0 > prov.x1 || shape.x1 < prov.x0 || shape.y0 > prov.y1 || shape.y1 < prov.y0) continue;
    const step = Math.sqrt(((shape.x1 - shape.x0) * (shape.y1 - shape.y0)) / samples);
    let inT = 0;
    let inP = 0;
    let inDeep = 0;
    for (let x = shape.x0 + step / 2; x < shape.x1; x += step)
      for (let y = shape.y0 + step / 2; y < shape.y1; y += step) {
        if (!inside(shape, x, y)) continue;
        inT++;
        if (!inside(prov, x, y)) continue;
        inP++;
        if (deep(x, y)) inDeep++;
      }
    if (inP === 0) continue;
    const cell = step * step;
    const deepKm2 = inDeep * cell;
    const keep = deepKm2 >= minKm2 || (inT > 0 && inP / inT >= 0.5);
    if (keep) found.push({ props: t.props, shape, areaKm2: inP * cell, shareOfTreaty: (100 * inP) / Math.max(inT, 1) });
    else edgeOnly.push(t.props);
  }

  // Coverage of the province, by its own grid.
  let anyIn = 0;
  const hits = new Map<number, number>();
  for (const [x, y] of provPts) {
    let any = false;
    found.forEach((f, i) => {
      if (inside(f.shape, x, y)) {
        any = true;
        hits.set(i, (hits.get(i) ?? 0) + 1);
      }
    });
    if (any) anyIn++;
  }
  const result = found.map((f, i) => ({
    props: f.props,
    areaKm2: f.areaKm2,
    // Small treaties can fall between the province grid's points: use the treaty's own area then.
    shareOfProvince: (hits.get(i) ?? 0) > 0 ? (100 * hits.get(i)!) / provPts.length : (100 * f.areaKm2) / provinceKm2,
    shareOfTreaty: f.shareOfTreaty,
  }));
  result.sort((a, b) => b.areaKm2 - a.areaKm2);
  return { treaties: result, covered: (100 * anyIn) / Math.max(provPts.length, 1), edgeOnly, provinceKm2 };
}

/** A rounded share for text: "about 15%", "less than 1%", "almost all". */
export function shareWords(v: number): string {
  if (v >= 99) return "almost all";
  if (v < 1) return "less than 1%";
  return `about ${Math.round(v)}%`;
}

/**
 * "Seven treaty areas overlap Ontario, all of them historic; together they cover almost all of its land."
 */
export function treatiesTakeaway(name: string, eras: ("historic" | "modern")[], covered: number): string {
  const who = withArticle(name);
  const n = eras.length;
  if (n === 0) return `No treaty area in the federal dataset overlaps ${who}.`;
  const h = eras.filter((e) => e === "historic").length;
  const m = n - h;
  const kinds =
    m === 0
      ? n === 1
        ? "a historic treaty"
        : "all of them historic"
      : h === 0
        ? n === 1
          ? "a modern treaty"
          : "all of them modern"
        : `${numberWord(h)} historic and ${numberWord(m)} modern`;
  const count = n === 1 ? `One treaty area overlaps ${who}, ${kinds}` : `${capitalized(spelledOut(n))} treaty areas overlap ${who}, ${kinds}`;
  const cover = shareWords(covered);
  const of = cover === "almost all" ? "almost all of its land" : `${cover} of its land`;
  const tail = covered < 50 ? `; ${n === 1 ? "it covers" : "together they cover"} ${of}, and the rest is outside every treaty area in the dataset` : `; ${n === 1 ? "it covers" : "together they cover"} ${of}`;
  return `${count}${tail}.`;
}

/** "one" to "nine", then digits (Canadian Press style). */
export const numberWord = (n: number) => ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][n] ?? num(n);
/** Spelled out to twenty, for the start of a sentence. */
export const spelledOut = (n: number) =>
  n < 10
    ? numberWord(n)
    : (["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"][n - 10] ?? num(n));

// ---------------------------------------------------------------------------
// 6. Language
// ---------------------------------------------------------------------------

export interface LanguagePoint {
  year: number;
  englishPct: number;
  frenchPct: number;
  otherPct: number;
}

export const LANGUAGES = [
  { key: "englishPct", label: "English" },
  { key: "frenchPct", label: "French" },
  { key: "otherPct", label: "Other languages" },
] as const;

/**
 * "In 2021, French was the mother tongue of 76.3% of people in Quebec, down from 82.5% in 1951;
 * other languages rose from 3.7% to 15.0%." Null when there is no series.
 */
export function languageTakeaway(name: string, points: LanguagePoint[]): string | null {
  const pts = [...points].sort((a, b) => a.year - b.year);
  const a = pts[0];
  const b = pts.at(-1);
  if (!a || !b || a === b) return null;
  const langs = LANGUAGES.map((l) => ({ ...l, from: a[l.key], to: b[l.key], d: b[l.key] - a[l.key] }));
  const main = langs.reduce((x, y) => (y.to > x.to ? y : x));
  const mover = langs.filter((l) => l !== main).reduce((x, y) => (Math.abs(y.d) > Math.abs(x.d) ? y : x));
  const lower = (l: (typeof langs)[number]) => (l.key === "otherPct" ? "other languages" : l.label);
  const trend = Math.abs(main.d) < 0.5 ? `about the same as the ${pct(main.from)} of ${a.year}` : `${main.d > 0 ? "up" : "down"} from ${pct(main.from)} in ${a.year}`;
  const moved =
    Math.abs(mover.d) < 0.5
      ? ""
      : `; ${lower(mover)} ${mover.d > 0 ? "rose" : "fell"} from ${pct(mover.from)} to ${pct(mover.to)}`;
  const subject = main.key === "otherPct" ? "languages other than English and French were" : `${main.label} was`;
  return `In ${b.year}, ${subject} the mother tongue of ${pct(main.to)} of people in ${withArticle(name)}, ${trend}${moved}.`;
}

// ---------------------------------------------------------------------------
// Province lookups
// ---------------------------------------------------------------------------

export const codeForSlug = (slug: string): ProvinceCode | undefined => PROVINCE_CODES.find((c) => PROVINCES[c].slug === slug);
export { PARTIES };
