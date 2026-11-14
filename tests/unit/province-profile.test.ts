/**
 * The pure calculations and takeaway sentences behind the province "In
 * numbers" profiles (src/lib/province-profile.ts), with hand-built inputs and
 * edge cases, then the real datasets for all 13 provinces and territories.
 *
 * The rule under test: a takeaway says only what its inputs show.
 */
import { describe, expect, it } from "vitest";
import {
  averagePerPerson,
  electionTakeaway,
  equalizationSummary,
  equalizationTakeaway,
  governmentRuns,
  joinList,
  languageTakeaway,
  longestRun,
  numberWord,
  people,
  perPerson,
  perSeatComparison,
  pct,
  plural,
  populationShares,
  populationTakeaway,
  populationTrend,
  possessive,
  premiersTakeaway,
  ridingsTakeaway,
  round3,
  seatSources,
  shareWords,
  sortParties,
  spelledOut,
  transfersTakeaway,
  treatiesTakeaway,
  trendTakeaway,
  voteShare,
  winnerPct,
  withArticle,
  type PartyResult,
  type PremierTermLite,
  type RidingRow,
  type TransferRow,
} from "../../src/lib/province-profile";
import { PROVINCES, PROVINCE_CODES } from "../../src/lib/elections-constants";
import { provinceProfile } from "../../src/widgets/province-profile/data";

// ---------------------------------------------------------------------------
// Wording helpers
// ---------------------------------------------------------------------------

describe("wording helpers", () => {
  it("withArticle and possessive", () => {
    expect(withArticle("Ontario")).toBe("Ontario");
    expect(withArticle("Northwest Territories")).toBe("the Northwest Territories");
    expect(possessive("Ontario")).toBe("Ontario's");
    expect(possessive("Northwest Territories")).toBe("the Northwest Territories'");
    expect(possessive("Nunavut")).toBe("Nunavut's");
    expect(possessive("Yukon")).toBe("Yukon's");
  });
  it("joinList, without a serial comma", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b"])).toBe("a and b");
    expect(joinList(["a", "b", "c"])).toBe("a, b and c");
  });
  it("numberWord spells one to nine, spelledOut to twenty", () => {
    expect([0, 1, 9, 10, 12].map(numberWord)).toEqual(["zero", "one", "nine", "10", "12"]);
    expect([1, 10, 13, 20, 21, 1500].map(spelledOut)).toEqual(["one", "ten", "thirteen", "twenty", "21", "1,500"]);
  });
  it("pct: one decimal, two under 1%, with no '1.00%' at the boundary", () => {
    expect(pct(38.94)).toBe("38.9%");
    expect(pct(1.2)).toBe("1.2%");
    expect(pct(0.44)).toBe("0.44%");
    expect(pct(0.994)).toBe("0.99%");
    expect(pct(0.996)).toBe("1.0%");
    expect(pct(1)).toBe("1.0%");
    expect(pct(0)).toBe("0.0%");
    expect(pct(100)).toBe("100.0%");
  });
  it("plural", () => {
    expect(plural(1, "seat")).toBe("1 seat");
    expect(plural(0, "seat")).toBe("0 seats");
    expect(plural(1200, "vote")).toBe("1,200 votes");
    expect(plural(2, "treaty", "treaties")).toBe("2 treaties");
  });
  it("round3 and people", () => {
    expect(round3(133281)).toBe(133000);
    expect(round3(45747)).toBe(45700);
    expect(round3(999)).toBe(999);
    expect(people(16262121)).toBe("16.3 million");
    expect(people(2_000_000)).toBe("2 million");
    expect(people(552462)).toBe("552,000");
    expect(people(43091)).toBe("43,100");
    // Rounds up to a million: say so in millions.
    expect(people(999_700)).toBe("1 million");
  });
  it("shareWords", () => {
    expect(shareWords(99.5)).toBe("almost all");
    expect(shareWords(0.4)).toBe("less than 1%");
    expect(shareWords(14.6)).toBe("about 15%");
  });
});

// ---------------------------------------------------------------------------
// 1. Population and seats
// ---------------------------------------------------------------------------

describe("populationShares and populationTakeaway", () => {
  const ontario = populationShares({ name: "Ontario", population: 16_000_000, canadaPopulation: 40_000_000, seats: 120, totalSeats: 343 });

  it("computes shares, people per seat and the strict entitlement", () => {
    expect(ontario.popShare).toBeCloseTo(40);
    expect(ontario.seatShare).toBeCloseTo((100 * 120) / 343);
    expect(ontario.perSeat).toBeCloseTo(16_000_000 / 120);
    expect(ontario.avgPerSeat).toBeCloseTo(40_000_000 / 343);
    expect(ontario.ratio).toBeCloseTo(ontario.perSeat / ontario.avgPerSeat);
    expect(ontario.strictSeats).toBeCloseTo(0.4 * 343);
  });
  it("throws on zero seats or population", () => {
    expect(() => populationShares({ name: "X", population: 1, canadaPopulation: 0, seats: 1, totalSeats: 343 })).toThrow();
    expect(() => populationShares({ name: "X", population: 1, canadaPopulation: 10, seats: 0, totalSeats: 343 })).toThrow();
  });
  it("perSeatComparison", () => {
    // The average is given to three significant figures.
    expect(perSeatComparison(1.09, 121900)).toBe("9% more than the national average of 122,000");
    expect(perSeatComparison(0.65, 121_740)).toBe("35% fewer than the national average of 122,000");
    expect(perSeatComparison(1.02, 45_747)).toBe("close to the national average of 45,700");
  });
  it("writes the many-seat sentence", () => {
    expect(populationTakeaway(ontario)).toBe(
      "Ontario has 40.0% of Canada's people and 35.0% of the seats in the House of Commons (120 of 343); each of its MPs represents about 133,000 people, 14% more than the national average of 117,000.",
    );
  });
  it("writes a one-seat territory with 'one' and the article", () => {
    const nt = populationShares({ name: "Northwest Territories", population: 45_000, canadaPopulation: 40_000_000, seats: 1, totalSeats: 343 });
    expect(populationTakeaway(nt)).toBe(
      "The Northwest Territories has 0.11% of Canada's people and one of the 343 seats in the House of Commons (0.29%); its one MP represents about 45,000 people, 61% fewer than the national average of 117,000.",
    );
  });
});

describe("seatSources", () => {
  const row = (initial: number, senatorialClause: number, grandfatherClause: number, representationRule = 0) => ({
    initial,
    senatorialClause,
    grandfatherClause,
    representationRule,
    total: initial + senatorialClause + grandfatherClause + representationRule,
  });
  it("lists every source in one list, as documented", () => {
    expect(seatSources(row(5, 1, 1), false)).toBe("Of its 7 seats, 5 come from its population, 1 from the senatorial clause and 1 from the grandfather clause.");
    expect(seatSources(row(2, 2, 0), false)).toBe("Of its 4 seats, 2 come from its population and 2 from the senatorial clause.");
    expect(seatSources(row(10, 0, 1, 2), false)).toBe("Of its 13 seats, 10 come from its population, 1 from the grandfather clause and 2 from the representation rule.");
  });
  it("says when no guarantee adds any, and the territories' rule", () => {
    expect(seatSources(row(122, 0, 0), false)).toBe("All 122 of its seats come from its population; no constitutional guarantee adds any.");
    expect(seatSources(row(1, 0, 0), true)).toBe("Each territory has one seat, whatever its population.");
  });
});

describe("populationTrend and trendTakeaway", () => {
  const canada = [
    { year: 1951, value: 14_000_000 },
    { year: 2026, value: 41_000_000 },
  ];
  it("finds first, last and peak whatever the order, with shares", () => {
    const t = populationTrend(
      [
        { year: 2026, value: 550_000 },
        { year: 1951, value: 360_000 },
        { year: 1992, value: 580_000 },
      ],
      canada,
    )!;
    expect(t.first.year).toBe(1951);
    expect(t.last.year).toBe(2026);
    expect(t.peak).toEqual({ year: 1992, value: 580_000 });
    expect(t.shareFirst).toBeCloseTo((100 * 360_000) / 14_000_000);
    expect(populationTrend([], canada)).toBeNull();
  });
  it("leaves shares out when Canada has no value that year", () => {
    const t = populationTrend([{ year: 1991, value: 38_700 }, { year: 2026, value: 45_900 }], canada)!;
    expect(t.shareFirst).toBeNull();
    expect(trendTakeaway("Northwest Territories", t)).toBe("The Northwest Territories' population grew from 38,700 in 1991 to 45,900 in 2026.");
  });
  it("mentions a peak only if it came before the last year and is at least 2% above it", () => {
    const t = populationTrend([{ year: 1951, value: 360_000 }, { year: 1992, value: 580_000 }, { year: 2026, value: 550_000 }], canada)!;
    expect(trendTakeaway("Newfoundland and Labrador", t)).toBe(
      "Newfoundland and Labrador's population grew from 360,000 in 1951 to 550,000 in 2026, after peaking at 580,000 in 1992, and its share of Canada's fell from 2.6% to 1.3%.",
    );
    const small = populationTrend([{ year: 1951, value: 360_000 }, { year: 1992, value: 555_000 }, { year: 2026, value: 550_000 }], canada)!;
    expect(trendTakeaway("X", small)).not.toContain("peaking");
  });
  it("says fell, held, and stayed", () => {
    const fell = populationTrend([{ year: 1951, value: 900_000 }, { year: 2026, value: 800_000 }], [])!;
    // The first year being the highest is not a "peak" to mention.
    expect(trendTakeaway("X", fell)).toBe("X's population fell from 900,000 in 1951 to 800,000 in 2026.");
    const held = populationTrend([{ year: 1951, value: 100_000 }, { year: 2026, value: 100_500 }], [{ year: 1951, value: 1e7 }, { year: 2026, value: 1e7 }])!;
    expect(trendTakeaway("X", held)).toBe("X's population held at about 101,000 from 1951 to 2026, and its share of Canada's stayed at 1.0%.");
  });
  it("never says it grew between two figures that print the same", () => {
    // +1.1%, but both are "4.6 million".
    const t = populationTrend([{ year: 1951, value: 4_600_000 }, { year: 2026, value: 4_649_000 }], [])!;
    const s = trendTakeaway("X", t);
    expect(s).not.toMatch(/grew from 4\.6 million in 1951 to 4\.6 million/);
    expect(s).toBe("X's population held at about 4.6 million from 1951 to 2026.");
  });
  it("handles a one-point series", () => {
    const t = populationTrend([{ year: 2026, value: 50_000 }], [])!;
    expect(trendTakeaway("Yukon", t)).toBe("Yukon's population was 50,000 in 2026.");
  });
  // With endpoints within 1% but a peak well above both, it rose and came back down: not "held".
  it("does not say 'held' when the population rose and fell in between", () => {
    const t = populationTrend([{ year: 1951, value: 1_000_000 }, { year: 1990, value: 1_300_000 }, { year: 2026, value: 1_005_000 }], [])!;
    expect(trendTakeaway("X", t)).not.toContain("held at about");
    expect(trendTakeaway("X", t)).toBe("X's population rose from 1 million in 1951 to 1.3 million in 1990, then fell back to about 1 million in 2026.");
  });
});

// ---------------------------------------------------------------------------
// 2. The 2025 federal election
// ---------------------------------------------------------------------------

const party = (p: PartyResult["party"], votes: number, share: number, seats: number): PartyResult => ({ party: p, votes, share, seats });

describe("sortParties", () => {
  it("drops parties with no votes or seats, sorts by seats then votes, 'other' last", () => {
    const sorted = sortParties([party("other", 9000, 30, 2), party("gpc", 0, 0, 0), party("ndp", 500, 5, 0), party("cpc", 4000, 40, 1), party("lpc", 5000, 50, 1)]);
    expect(sorted.map((p) => p.party)).toEqual(["lpc", "cpc", "ndp", "other"]);
  });
});

describe("electionTakeaway", () => {
  it("writes the usual sentence, with the remaining seat winners", () => {
    expect(electionTakeaway("Ontario", [party("lpc", 100, 49.2, 70), party("cpc", 90, 43.8, 52)], 122)).toBe(
      "The Liberals won 70 of Ontario's 122 seats with 49.2% of the vote; the Conservatives won 52 with 43.8%.",
    );
    expect(electionTakeaway("Quebec", [party("lpc", 100, 42.6, 44), party("bq", 60, 27.6, 22), party("cpc", 50, 23, 11), party("ndp", 10, 4, 1)], 78)).toBe(
      "The Liberals won 44 of Quebec's 78 seats with 42.6% of the vote; the Bloc Québécois won 22 with 27.6%, the Conservatives 11 and the NDP 1.",
    );
    expect(electionTakeaway("Manitoba", [party("cpc", 100, 46.4, 7), party("lpc", 90, 40.7, 6), party("ndp", 30, 10, 1)], 14)).toBe(
      "The Conservatives won 7 of Manitoba's 14 seats with 46.4% of the vote; the Liberals won 6 with 40.7% and the NDP 1.",
    );
  });
  it("writes a sweep", () => {
    expect(electionTakeaway("Prince Edward Island", [party("lpc", 50, 57.6, 4), party("cpc", 30, 35, 0)], 4)).toBe(
      "The Liberals won all 4 of Prince Edward Island's seats, with 57.6% of the vote.",
    );
  });
  it("says 'all' only when the one seat-winning party won every seat", () => {
    const s = electionTakeaway("X", [party("lpc", 50, 57.6, 3), party("cpc", 30, 35, 0)], 4);
    expect(s).not.toContain("all");
    expect(s).toBe("The Liberals won 3 of X's 4 seats, with 57.6% of the vote.");
  });
  it("writes a one-seat territory with the lead in points", () => {
    expect(electionTakeaway("Northwest Territories", [party("lpc", 7000, 53.5, 1), party("cpc", 4300, 33.3, 0), party("ndp", 1000, 8, 0)], 1)).toBe(
      "The Northwest Territories' one seat went to the Liberals, who won 53.5% of the vote, 20.2 points ahead of the Conservatives.",
    );
  });
  it("gives a near-tie in one seat in votes, never '0.0 points'", () => {
    const s = electionTakeaway("Nunavut", [party("ndp", 3001, 37.31, 1), party("lpc", 3000, 37.3, 0)], 1);
    expect(s).not.toContain("0.0 points");
    expect(s).toBe("Nunavut's one seat went to the NDP, who won 37.3% of the vote, 1 vote ahead of the Liberals.");
  });
  it("writes a one-seat race with a single candidate party", () => {
    expect(electionTakeaway("Yukon", [party("lpc", 7000, 100, 1)], 1)).toBe("Yukon's one seat went to the Liberals, who won 100.0% of the vote.");
  });
  it("writes a tie for most seats without naming a winner", () => {
    expect(electionTakeaway("X", [party("lpc", 100, 45, 5), party("cpc", 110, 48, 5)], 10)).toBe(
      "The Conservatives and the Liberals each won 5 of X's 10 seats, with 48.0% and 45.0% of the vote.",
    );
  });
  it("says when the seat leader lost the popular vote", () => {
    expect(electionTakeaway("X", [party("lpc", 100, 40, 6), party("cpc", 120, 48, 4)], 10)).toBe(
      "The Liberals won 6 of X's 10 seats with 40.0% of the vote; the Conservatives won 4 with 48.0%. The Conservatives won more votes but fewer seats.",
    );
  });
  it("puts 'other candidates' first when they won the most seats", () => {
    const s = electionTakeaway("X", [party("lpc", 100, 30, 1), party("other", 200, 60, 3)], 4);
    expect(s).toBe("Other candidates won 3 of X's 4 seats with 60.0% of the vote; the Liberals won 1 with 30.0%.");
  });
  it("says there are no results when nobody won a seat", () => {
    expect(electionTakeaway("X", [], 4)).toBe("There are no 2025 results for X in the data.");
    expect(electionTakeaway("Northwest Territories", [party("lpc", 1, 1, 0)], 1)).toBe("There are no 2025 results for the Northwest Territories in the data.");
  });
});

describe("ridingsTakeaway", () => {
  const riding = (name: string, marginVotes: number, margin: number, winnerShare: number): RidingRow => ({ fed: 1, name, party: "lpc", winner: "W", margin, marginVotes, winnerShare });

  it("names the closest race, with points from 0.1", () => {
    expect(ridingsTakeaway([riding("A", 533, 1.1, 48), riding("B", 2000, 8, 55), riding("C", 5000, 20, 60)])).toBe(
      "The closest race was A, decided by 533 votes (1.1 points); one of the three winners had less than half the votes.",
    );
  });
  it("handles a 1-vote margin: singular, and no '0.0 points'", () => {
    expect(ridingsTakeaway([riding("Terrebonne", 1, 0.002, 40), riding("B", 2000, 8, 55)])).toBe(
      "The closest race was Terrebonne, decided by 1 vote; one of the two winners had less than half the votes.",
    );
  });
  it("names every race tied for closest; points only when they share them", () => {
    expect(ridingsTakeaway([riding("A", 10, 0.5, 51), riding("B", 10, 0.5, 52), riding("C", 99, 3, 60)])).toBe(
      "The closest races were A and B, each decided by 10 votes (0.5 points); every winner had more than half the votes.",
    );
    const s = ridingsTakeaway([riding("A", 10, 0.5, 51), riding("B", 10, 0.2, 52)]);
    expect(s).toBe("The closest races were A and B, each decided by 10 votes; every winner had more than half the votes.");
  });
  it("says when no winner had a majority, and uses digits from 10", () => {
    expect(ridingsTakeaway([riding("A", 10, 0.5, 40), riding("B", 20, 1, 45)])).toBe(
      "The closest race was A, decided by 10 votes (0.5 points); no winner had more than half the votes.",
    );
    const many = Array.from({ length: 12 }, (_, i) => riding(`R${i}`, 100 + i, 1 + i, i < 11 ? 45 : 60));
    expect(ridingsTakeaway(many)).toContain("11 of the 12 winners had less than half the votes");
  });
  it("handles no rows", () => {
    expect(ridingsTakeaway([])).toBe("There are no riding results in the data.");
  });
  // A winner with exactly half is neither "more than" nor "less than" half.
  it("does not call exactly half 'more than half'", () => {
    const s = ridingsTakeaway([riding("A", 10, 0.5, 50), riding("B", 20, 1, 60)]);
    expect(s).not.toContain("every winner had more than half");
    expect(s).toBe("The closest race was A, decided by 10 votes (0.5 points); every winner had at least half the votes.");
    // Just under half counts as less than half, even though it rounds to 50.0%.
    expect(ridingsTakeaway([riding("A", 10, 0.5, voteShare(31_095, 62_240)), riding("B", 20, 1, 60)])).toContain("one of the two winners had less than half the votes");
  });
  it("prints a winner's share so it never reads 50.0% unless it is exactly half", () => {
    expect(winnerPct(voteShare(31_095, 62_240))).toBe("49.96%");
    expect(winnerPct(voteShare(33_437, 66_811))).toBe("50.05%");
    expect(winnerPct(voteShare(21_988, 43_969))).toBe("50.01%");
    expect(winnerPct(50)).toBe("50.0%");
    expect(winnerPct(58.6)).toBe("58.6%");
  });
});

// ---------------------------------------------------------------------------
// 3. Transfers and equalization
// ---------------------------------------------------------------------------

const tr = (province: TransferRow["province"], population: number, cht: number, cst: number, equalization: number, tff: number): TransferRow => ({ province, population, cht, cst, equalization, tff });

describe("perPerson and averagePerPerson", () => {
  it("turns $ millions into dollars per person, with a total", () => {
    expect(perPerson(tr("QC", 1_000_000, 1000, 500, 1500, 0))).toEqual({ province: "QC", cht: 1000, cst: 500, equalization: 1500, tff: 0, total: 3000 });
  });
  it("throws without a population", () => {
    expect(() => perPerson(tr("QC", 0, 1, 1, 1, 0))).toThrow(/no population/);
  });
  it("weights the average by population", () => {
    const avg = averagePerPerson([tr("ON", 3_000_000, 3000, 0, 0, 0), tr("PE", 1_000_000, 3000, 0, 1000, 0)]);
    expect(avg.cht).toBeCloseTo(1500);
    expect(avg.equalization).toBeCloseTo(250);
    expect(avg.total).toBeCloseTo(1750);
  });
});

describe("transfersTakeaway", () => {
  const mine = (equalization: number, tff = 0) => ({ province: "QC" as const, cht: 1300, cst: 500, equalization, tff, total: 1800 + equalization + tff });
  it("with equalization", () => {
    expect(transfersTakeaway("Quebec", false, "2026-27", mine(1520), 2440)).toBe(
      "In 2026-27, Quebec gets about $3,320 per person in major federal transfers, $1,520 of it equalization, compared with an average of $2,440 across the provinces.",
    );
  });
  it("without equalization", () => {
    expect(transfersTakeaway("Alberta", false, "2026-27", mine(0), 2440)).toBe(
      "In 2026-27, Alberta gets about $1,800 per person in major federal transfers, all of it health and social transfers with no equalization, compared with an average of $2,440 across the provinces.",
    );
  });
  it("for a territory", () => {
    expect(transfersTakeaway("Northwest Territories", true, "2026-27", mine(0, 40_600), 2440)).toBe(
      "In 2026-27, the Northwest Territories gets about $42,400 per person in major federal transfers, $40,600 of it through Territorial Formula Financing; territories don't receive equalization, and the average across the provinces is $2,440.",
    );
  });
});

describe("equalizationSummary and equalizationTakeaway", () => {
  const years = ["2020-21", "2021-22", "2022-23", "2023-24", "2024-25"];
  const h = (paid: number[]) => ({ years, paid });

  it("summarises a history", () => {
    expect(equalizationSummary(h([0, 5, 5, 0, 5]))).toEqual({ years: 5, received: 3, first: "2021-22", last: "2024-25", now: true, since: "2024-25" });
    expect(equalizationSummary(h([0, 0, 0, 0, 0]))).toEqual({ years: 5, received: 0, first: null, last: null, now: false, since: null });
    expect(equalizationSummary({ years: [], paid: [] })).toMatchObject({ years: 0, received: 0, now: false });
  });
  it("never", () => {
    expect(equalizationTakeaway("Alberta", h([0, 0, 0, 0, 0]))).toBe("Alberta has not received equalization in any year since 2020-21.");
  });
  it("every year", () => {
    expect(equalizationTakeaway("Quebec", h([1, 1, 1, 1, 1]))).toBe("Quebec has received equalization in every one of the 5 years from 2020-21 to 2024-25.");
  });
  it("none now", () => {
    expect(equalizationTakeaway("Saskatchewan", h([5, 5, 0, 0, 0]))).toBe(
      "Saskatchewan has received equalization in 2 of the 5 years since 2020-21, most recently in 2021-22; it receives none in 2024-25.",
    );
  });
  it("an unbroken run to now that started later", () => {
    expect(equalizationTakeaway("Ontario", h([0, 0, 5, 5, 5]))).toBe(
      "Ontario first received equalization in 2022-23, and has received it in 3 of the 5 years since 2020-21, including every year since 2022-23.",
    );
  });
  it("again in the latest year after a gap", () => {
    expect(equalizationTakeaway("Newfoundland and Labrador", h([5, 0, 0, 0, 5]))).toBe(
      "Newfoundland and Labrador has received equalization in 2 of the 5 years since 2020-21; it receives it again in 2024-25, after 3 years without it.",
    );
    expect(equalizationTakeaway("X", h([5, 5, 0, 0, 5]))).toContain("after 2 years without it");
    expect(equalizationTakeaway("X", h([0, 5, 0, 0, 5]))).toBe(
      "X first received equalization in 2021-22, and has received it in 2 of the 5 years since 2020-21; it receives it again in 2024-25, after 2 years without it.",
    );
  });
  it("does not say 'again' for a first payment in the latest year", () => {
    const s = equalizationTakeaway("Alberta", h([0, 0, 0, 0, 5]));
    expect(s).not.toContain("again");
    expect(s).toBe("Alberta first received equalization in 2024-25, and has received it in 1 of the 5 years since 2020-21.");
  });
  it("a single year of data, and none at all", () => {
    expect(equalizationTakeaway("X", { years: ["2024-25"], paid: [5] })).toBe("X received equalization in 2024-25.");
    expect(equalizationTakeaway("Northwest Territories", { years: [], paid: [] })).toBe("There is no equalization data for the Northwest Territories.");
  });
});

// ---------------------------------------------------------------------------
// 4. Premiers
// ---------------------------------------------------------------------------

const pt = (name: string, start: string, end: string | null, party: string, family = party.toLowerCase()): PremierTermLite => ({ name, qid: `Q-${name}`, start, end, party, family });

describe("governmentRuns and longestRun", () => {
  const terms = [
    pt("A", "1900-01-01", "1910-01-01", "Liberal"),
    pt("B", "1910-01-01", "1920-01-01", "Liberal"),
    pt("C", "1920-06-01", "1925-01-01", "Conservative"),
    // A caretaker gap of under 400 days doesn't break a run.
    pt("D", "1925-06-01", "1930-01-01", "Conservative"),
    pt("E", "1932-01-01", "1940-01-01", "Conservative"),
    pt("F", "1940-01-01", null, "Independent", "nonpartisan"),
  ];
  it("merges consecutive terms of one party, breaks on 400+ day gaps, drops non-partisan runs", () => {
    expect(governmentRuns(terms, "2026-01-01")).toEqual([
      { family: "liberal", party: "Liberal", start: "1900-01-01", end: "1920-01-01", n: 2 },
      { family: "conservative", party: "Conservative", start: "1920-06-01", end: "1930-01-01", n: 2 },
      { family: "conservative", party: "Conservative", start: "1932-01-01", end: "1940-01-01", n: 1 },
    ]);
  });
  it("picks the longest run, the earliest on a tie, an open run counting to today", () => {
    const runs = governmentRuns(terms, "2026-01-01");
    expect(longestRun(runs, "2026-01-01")?.start).toBe("1900-01-01");
    expect(longestRun([], "2026-01-01")).toBeUndefined();
    const tie = [
      { family: "a", party: "A", start: "1900-01-01", end: "1910-01-01", n: 1 },
      { family: "b", party: "B", start: "1950-01-01", end: "1960-01-01", n: 1 },
    ];
    expect(longestRun(tie, "2026-01-01")?.party).toBe("A");
    expect(longestRun([...tie, { family: "c", party: "C", start: "2010-01-01", end: null, n: 1 }], "2026-01-01")?.party).toBe("C");
  });
});

describe("premiersTakeaway", () => {
  it("names a finished longest run", () => {
    const terms = [pt("A", "1943-08-17", "1960-01-01", "Progressive Conservative"), pt("B", "1960-01-01", "1985-06-26", "Progressive Conservative"), pt("C", "1985-06-26", null, "Liberal")];
    expect(premiersTakeaway("Ontario", false, terms, "2026-11-13")).toBe(
      "Ontario has had three premiers since 1943; the longest unbroken run by one party was 41 years of Progressive Conservative government, from 1943 to 1985.",
    );
  });
  it("names the current run when it is the longest, with '1 year' singular", () => {
    expect(premiersTakeaway("X", false, [pt("A", "2025-01-01", null, "NDP")], "2026-03-01")).toBe(
      "X has had one premier since 2025; the longest unbroken run by one party is the current one, 1 year of NDP government since 2025.",
    );
  });
  it("counts people, not terms, and uses the territorial noun", () => {
    const again = [pt("A", "2000-01-01", "2004-01-01", "Yukon Party"), pt("B", "2004-01-01", "2010-01-01", "Liberal"), pt("A", "2010-01-01", null, "Yukon Party")];
    expect(premiersTakeaway("Yukon", true, again, "2026-01-01")).toMatch(/^Yukon has had two premiers and government leaders since 2000;/);
  });
  it("consensus government: no party runs", () => {
    const terms = [pt("A", "1999-04-01", "2008-01-01", "Non-partisan (consensus government)", "nonpartisan"), pt("B", "2008-01-01", null, "Non-partisan (consensus government)", "nonpartisan")];
    expect(premiersTakeaway("Nunavut", true, terms, "2026-01-01")).toBe(
      "Nunavut has had two premiers and government leaders since 1999, none of them leading a party government; today's government works by consensus.",
    );
  });
  it("leaves the run out under a year, and handles no data", () => {
    expect(premiersTakeaway("X", false, [pt("A", "2026-01-01", null, "Liberal")], "2026-06-01")).toBe("X has had one premier since 2026.");
    expect(premiersTakeaway("Northwest Territories", true, [], "2026-01-01")).toBe("There are no premiers for the Northwest Territories in the data.");
  });
});

// ---------------------------------------------------------------------------
// 5. Treaties
// ---------------------------------------------------------------------------

describe("treatiesTakeaway", () => {
  it("one treaty, singular throughout", () => {
    expect(treatiesTakeaway("Prince Edward Island", ["historic"], 93)).toBe("One treaty area overlaps Prince Edward Island, a historic treaty; it covers about 93% of its land.");
    expect(treatiesTakeaway("X", ["modern"], 20)).toBe(
      "One treaty area overlaps X, a modern treaty; it covers about 20% of its land, and the rest is outside every treaty area in the dataset.",
    );
  });
  it("several, all one kind or mixed", () => {
    expect(treatiesTakeaway("Ontario", Array(7).fill("historic"), 99.5)).toBe("Seven treaty areas overlap Ontario, all of them historic; together they cover almost all of its land.");
    expect(treatiesTakeaway("X", ["modern", "modern"], 17)).toBe(
      "Two treaty areas overlap X, all of them modern; together they cover about 17% of its land, and the rest is outside every treaty area in the dataset.",
    );
    expect(treatiesTakeaway("Yukon", ["historic", ...Array(12).fill("modern")], 92)).toBe(
      "Thirteen treaty areas overlap Yukon, one historic and 12 modern; together they cover about 92% of its land.",
    );
  });
  it("none, and the article", () => {
    expect(treatiesTakeaway("Northwest Territories", [], 0)).toBe("No treaty area in the federal dataset overlaps the Northwest Territories.");
    expect(treatiesTakeaway("Northwest Territories", ["modern"], 0.4)).toContain("overlaps the Northwest Territories, a modern treaty; it covers less than 1% of its land");
  });
});

// ---------------------------------------------------------------------------
// 6. Language
// ---------------------------------------------------------------------------

describe("languageTakeaway", () => {
  const p = (year: number, englishPct: number, frenchPct: number, otherPct: number) => ({ year, englishPct, frenchPct, otherPct });
  it("names the main language and the biggest mover among the others", () => {
    expect(languageTakeaway("Quebec", [p(2021, 7.5, 76.3, 15), p(1951, 13.8, 82.5, 3.7)])).toBe(
      "In 2021, French was the mother tongue of 76.3% of people in Quebec, down from 82.5% in 1951; other languages rose from 3.7% to 15.0%.",
    );
  });
  it("says 'about the same' and leaves out a mover under half a point", () => {
    expect(languageTakeaway("X", [p(1951, 80, 10, 10), p(2021, 80.2, 9.8, 10)])).toBe("In 2021, English was the mother tongue of 80.2% of people in X, about the same as the 80.0% of 1951.");
  });
  it("words 'other languages' properly when they are the main group", () => {
    expect(languageTakeaway("Nunavut", [p(2001, 25, 1.5, 73.5), p(2021, 30, 1.5, 68.5)])).toBe(
      "In 2021, languages other than English and French were the mother tongue of 68.5% of people in Nunavut, down from 73.5% in 2001; English rose from 25.0% to 30.0%.",
    );
  });
  it("is null without two points", () => {
    expect(languageTakeaway("X", [])).toBeNull();
    expect(languageTakeaway("X", [p(2021, 1, 1, 98)])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The real datasets, all 13
// ---------------------------------------------------------------------------

describe("province profiles from the real datasets", () => {
  const profiles = PROVINCE_CODES.map((c) => provinceProfile(PROVINCES[c].slug));

  it("seats sum to the House and population shares to 100%", () => {
    const seats = profiles.reduce((n, p) => n + p.population.seats, 0);
    expect(seats).toBe(profiles[0]!.population.totalSeats);
    expect(seats).toBe(343);
    expect(profiles.reduce((n, p) => n + p.population.popShare, 0)).toBeCloseTo(100, 6);
    expect(profiles.reduce((n, p) => n + p.population.seatShare, 0)).toBeCloseTo(100, 6);
    for (const p of profiles) {
      const a = p.population.allocation;
      // Territories have their one seat by statute; the rows' parts are all 0.
      if (!p.territory) expect(a.initial + a.senatorialClause + a.grandfatherClause + a.representationRule, p.slug).toBe(a.total);
      expect(p.election.result.seats, p.slug).toBe(p.population.seats);
      expect(p.election.parties.reduce((n, x) => n + x.seats, 0), p.slug).toBe(p.population.seats);
    }
  });

  it("territories have one seat and no riding list; provinces have one row per seat", () => {
    for (const p of profiles) {
      if (p.territory) {
        expect(p.population.seats, p.slug).toBe(1);
        expect(p.election.ridingsTakeaway, p.slug).toBeNull();
      } else {
        expect(p.election.ridings, p.slug).toHaveLength(p.population.seats);
        expect(p.election.ridingsTakeaway, p.slug).not.toBeNull();
      }
    }
  });

  it("every takeaway is a clean sentence: no NaN, undefined, Infinity, double spaces or zero counts", () => {
    for (const p of profiles) {
      const texts = [
        p.population.takeaway,
        p.population.seatSources,
        p.population.trendTakeaway,
        p.election.takeaway,
        p.election.ridingsTakeaway,
        p.transfers.takeaway,
        p.transfers.equalization?.takeaway,
        p.premiers.takeaway,
        p.treaties.takeaway,
        p.language?.takeaway,
      ].filter((t): t is string => typeof t === "string");
      expect(texts.length, p.slug).toBeGreaterThanOrEqual(7);
      for (const t of texts) {
        expect(t, p.slug).not.toMatch(/NaN|undefined|null|Infinity|\[object|\s{2}|\s[.,;]|\b0 (seats|votes|years|premiers)\b|−\$|\$-|\b1 (seats|votes|years)\b|\b1\.00%/);
        expect(t, p.slug).toMatch(/^[A-Z].*[.]$/);
        expect(t, p.slug).not.toMatch(/ and [^;,.]* and [^;,.]* and /);
      }
      expect(p.population.takeaway.startsWith(p.slug === "northwest-territories" ? "The Northwest Territories" : p.name), p.slug).toBe(true);
    }
  });

  it("transfers are positive and the territories get no equalization history", () => {
    for (const p of profiles) {
      expect(p.transfers.mine.total, p.slug).toBeGreaterThan(0);
      if (p.territory) expect(p.transfers.equalization, p.slug).toBeNull();
      else expect(p.transfers.equalization?.years.length, p.slug).toBe(p.transfers.equalization?.paid.length);
    }
  });

  it("treaty overlaps are sane shares", () => {
    for (const p of profiles) {
      expect(p.treaties.covered, p.slug).toBeGreaterThanOrEqual(0);
      expect(p.treaties.covered, p.slug).toBeLessThanOrEqual(100);
      for (const t of p.treaties.treaties) {
        expect(t.shareOfProvince, p.slug).toBeGreaterThan(0);
        expect(t.shareOfProvince, p.slug).toBeLessThanOrEqual(100.0001);
        expect(t.shareOfTreaty, p.slug).toBeLessThanOrEqual(100.0001);
      }
    }
  });
});
