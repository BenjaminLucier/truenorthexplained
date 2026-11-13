import { describe, expect, it } from "vitest";
import {
  BASE_YEAR,
  cpiFor,
  formatDay,
  formatDollars,
  formatMillions,
  formatMonth,
  formatPct,
  formatSignedPct,
  monthX,
  prices,
  provincePopulation,
  toReal,
} from "../../src/lib/money";
import {
  buildDate,
  formatDate,
  formatDuration,
  formatNumber,
  formatPeople,
  inOffice,
  partyFamily,
  provinceBySlug,
  termDays,
  totalDays,
  yearFraction,
} from "../../src/lib/reference";

describe("money formatting", () => {
  it("formatMillions follows the documented examples", () => {
    expect(formatMillions(526_412)).toBe("$526.4 billion");
    expect(formatMillions(860)).toBe("$860 million");
  });
  it("formatMillions uses a true minus, and switches to billions once rounding reaches one", () => {
    expect(formatMillions(-526_412)).toBe("−$526.4 billion");
    expect(formatMillions(526_412, 0)).toBe("$526 billion");
    expect(formatMillions(999.6)).toBe("$1.0 billion");
    expect(formatMillions(999.4)).toBe("$999 million");
    expect(formatMillions(-0.3)).toBe("$0 million");
  });
  it("formatDollars rounds to whole dollars", () => {
    expect(formatDollars(1234.5)).toBe("$1,235");
    expect(formatDollars(-1234.4)).toBe("−$1,234");
    expect(formatDollars(-0.4)).toBe("$0");
  });
  it("percentages use a true minus, and no sign once rounded to zero", () => {
    expect(formatSignedPct(-1.2)).toBe("−1.2%");
    expect(formatSignedPct(2)).toBe("+2.0%");
    expect(formatSignedPct(0)).toBe("0.0%");
    expect(formatSignedPct(-0.04)).toBe("0.0%");
    expect(formatPct(-1.25, 2)).toBe("−1.25%");
    expect(formatPct(3.14159)).toBe("3.1%");
    expect(formatPct(-0.04)).toBe("0.0%");
  });
  it("months and days", () => {
    expect(formatMonth("2026-09")).toBe("September 2026");
    expect(formatDay("2026-10-29")).toBe("October 29, 2026");
    expect(formatDay("2026-01-05")).toBe("January 5, 2026");
    expect(monthX("2026-01")).toBe(2026);
    expect(monthX("2026-09")).toBeCloseTo(2026.67, 2);
  });
});

describe("inflation", () => {
  it("BASE_YEAR is the latest full year of CPI, and its dollars are unchanged", () => {
    expect(BASE_YEAR).toBe(prices.cpi.annual.at(-1)!.year);
    expect(toReal(100, BASE_YEAR)).toBeCloseTo(100, 9);
  });
  it("scales by the ratio of price levels", () => {
    const first = prices.cpi.annual[0]!;
    expect(toReal(100, first.year)).toBeCloseTo((100 * cpiFor(BASE_YEAR)!) / first.index, 9);
    expect(toReal(100, first.year)).toBeGreaterThan(100);
  });
  it("uses the latest month for a year not yet complete, and refuses years without data", () => {
    expect(cpiFor(BASE_YEAR + 1)).toBe(prices.cpi.latestMonth.index);
    expect(() => toReal(100, 1800)).toThrow(/No CPI for 1800/);
  });
  it("finds a province's population for a year", () => {
    expect(provincePopulation("ON", 2021)).toBeGreaterThan(14_000_000);
    expect(provincePopulation("ON", 1800)).toBeUndefined();
  });
});

describe("terms in office", () => {
  it("counts days between the dates", () => {
    expect(termDays({ start: "2019-01-01", end: "2020-01-01" })).toBe(365);
    expect(termDays({ start: "2020-01-01", end: "2021-01-01" })).toBe(366);
    expect(termDays({ start: "1979-06-04", end: "1980-03-03" })).toBe(273);
  });
  it("runs an open term to the build date", () => {
    expect(buildDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(termDays({ start: buildDate, end: null })).toBe(0);
    expect(inOffice({ terms: [{ start: "2000-01-01", end: "2001-01-01" }, { start: "2005-01-01", end: null }] })).toBe(true);
    expect(inOffice({ terms: [{ start: "2000-01-01", end: "2001-01-01" }] })).toBe(false);
  });
  it("totals several terms", () => {
    expect(totalDays([{ start: "2019-01-01", end: "2020-01-01" }, { start: "2020-01-01", end: "2021-01-01" }])).toBe(731);
    expect(totalDays([])).toBe(0);
  });
});

describe("formatDuration", () => {
  it("uses days under about three months", () => {
    expect(formatDuration(1)).toBe("1 day");
    expect(formatDuration(69)).toBe("69 days");
    expect(formatDuration(91)).toBe("91 days");
  });
  it("uses whole years and months after that, never rounding up", () => {
    expect(formatDuration(92)).toBe("3 months");
    expect(formatDuration(273)).toBe("8 months"); // Joe Clark: June 4, 1979 to March 3, 1980
    expect(formatDuration(366)).toBe("1 year");
    expect(formatDuration(400)).toBe("1 year, 1 month");
    expect(formatDuration(3141)).toBe("8 years, 7 months");
    expect(formatDuration(1461)).toBe("4 years");
  });
});

describe("dates", () => {
  it("formatDate writes long and Canadian Press short forms", () => {
    expect(formatDate("1926-09-25")).toBe("September 25, 1926");
    expect(formatDate("1926-09-25", "short")).toBe("Sept. 25, 1926");
    expect(formatDate("2025-08-07", "short")).toBe("Aug. 7, 2025");
    expect(formatDate("2026-03-01", "short")).toBe("March 1, 2026");
  });
  it("yearFraction places a date within its year", () => {
    expect(yearFraction("2024-01-01")).toBe(2024);
    expect(yearFraction("2024-07-01")).toBeCloseTo(2024 + 182 / 366, 12);
    expect(yearFraction("2023-07-02")).toBeCloseTo(2023 + 182 / 365, 12);
  });
});

describe("numbers of people", () => {
  it("follows the documented examples", () => {
    expect(formatNumber(41_798_407)).toBe("41,798,407");
    expect(formatPeople(41_798_407)).toBe("41.8 million");
    expect(formatPeople(774_000)).toBe("774,000");
  });
  it("rounds to thousands below a million and trims trailing zeros above", () => {
    expect(formatPeople(774_400)).toBe("774,000");
    expect(formatPeople(1_250_000)).toBe("1.25 million");
    expect(formatPeople(2_000_000)).toBe("2 million");
    expect(formatPeople(40_000_000)).toBe("40 million");
    expect(formatPeople(999_600)).toBe("1 million");
    expect(formatPeople(999_400)).toBe("999,000");
  });
});

describe("reference lookups", () => {
  it("maps a prime minister's party to a colour family, and fails on an unknown party", () => {
    expect(partyFamily({ start: "1896-07-11", end: "1911-10-06", parties: ["Liberal"] })).toBe("lpc");
    expect(partyFamily({ start: "1984-09-17", end: "1993-06-25", parties: ["Progressive Conservative"] })).toBe("cpc");
    expect(() => partyFamily({ start: "2000-01-01", end: null, parties: ["Rhinoceros"] })).toThrow(/No colour family/);
  });
  it("finds provinces by slug", () => {
    expect(provinceBySlug("quebec")?.name).toBe("Quebec");
    expect(provinceBySlug("atlantis")).toBeUndefined();
  });
});
