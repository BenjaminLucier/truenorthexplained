import { describe, expect, it } from "vitest";
import {
  PROVINCES,
  PROVINCE_CODES,
  commons,
  formatDate,
  formatPct,
  majorityOf,
  nationalResult,
  ridings,
} from "../../src/lib/elections";
import { provinceByName } from "../../src/lib/elections-constants";
import {
  FEDERAL_FAMILIES,
  STACK,
  X0,
  X1,
  buildDate,
  electionBands,
  elections,
  governmentLabel,
  largest,
  ordinal,
  parliamentDays,
  pct,
  seatShare,
  xOf,
  xPct,
  years,
  type Election,
  type FederalFamily,
} from "../../src/lib/election-history";

describe("majorityOf", () => {
  it("is the smallest number of seats that is more than half", () => {
    expect(majorityOf(343)).toBe(172);
    expect(majorityOf(338)).toBe(170);
    expect(majorityOf(181)).toBe(91);
    expect(majorityOf(2)).toBe(2);
    expect(majorityOf(1)).toBe(1);
  });
});

describe("provinceByName", () => {
  it("matches English names, ignoring case, spacing and a French half after a slash", () => {
    expect(provinceByName("Quebec/Québec")?.code).toBe("QC");
    expect(provinceByName("  nova scotia ")?.code).toBe("NS");
    expect(provinceByName("Northwest Territories")?.code).toBe("NT");
    expect(provinceByName("Atlantis")).toBeUndefined();
  });
  it("covers every province code exactly once", () => {
    expect(Object.keys(PROVINCES)).toEqual([...PROVINCE_CODES]);
    for (const code of PROVINCE_CODES) expect(provinceByName(PROVINCES[code].en)?.code).toBe(code);
  });
});

describe("2025 election data", () => {
  it("every riding number starts with its province's code", () => {
    for (const r of ridings) expect(String(r.fed).startsWith(PROVINCES[r.province].pruid), `${r.fed} ${r.nameEn}`).toBe(true);
  });
  it("party seats add up to the House, and the majority line follows from it", () => {
    expect(nationalResult.parties.reduce((n, p) => n + p.seats, 0)).toBe(nationalResult.seats);
    expect(nationalResult.majority).toBe(majorityOf(nationalResult.seats));
    expect(commons.majority).toBe(majorityOf(commons.seats));
  });
  it("formats dates and percentages", () => {
    expect(formatDate("2026-07-01")).toBe("July 1, 2026");
    expect(formatPct(12.345)).toBe("12.3%");
    expect(formatPct(5, 0)).toBe("5%");
  });
});

describe("election history helpers", () => {
  it("ordinal", () => {
    const cases: [number, string][] = [
      [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"], [13, "13th"],
      [21, "21st"], [22, "22nd"], [43, "43rd"], [101, "101st"], [111, "111th"], [112, "112th"],
    ];
    for (const [n, s] of cases) expect(ordinal(n)).toBe(s);
  });

  it("pct keeps whole numbers whole", () => {
    expect(pct(47.25)).toBe("47.3%");
    expect(pct(50)).toBe("50%");
    expect(pct(33.333, 2)).toBe("33.33%");
  });

  it("years rounds to the nearest month", () => {
    expect(years(1522)).toBe("4 years, 2 months");
    expect(years(274)).toBe("9 months");
    expect(years(365)).toBe("1 year");
    expect(years(30)).toBe("1 month");
    expect(years(731)).toBe("2 years");
  });

  const fake = (seats: Partial<Record<FederalFamily, number>>, family: "lpc" | "cpc", houseSize = 100): Election =>
    ({
      seats: Object.fromEntries(FEDERAL_FAMILIES.map((f) => [f, seats[f] ?? 0])),
      houseSize,
      government: { party: "Liberal", family, type: "minority" },
    }) as unknown as Election;

  it("largest is the family with the most seats, ties going to the government", () => {
    expect(largest(fake({ lpc: 40, cpc: 50, ndp: 10 }, "lpc"))).toBe("cpc");
    expect(largest(fake({ lpc: 45, cpc: 45, ndp: 10 }, "cpc"))).toBe("cpc");
    expect(largest(fake({ lpc: 45, cpc: 45, ndp: 10 }, "lpc"))).toBe("lpc");
    expect(largest(fake({ lpc: 10, cpc: 10, bq: 80 }, "lpc"))).toBe("bq");
  });

  it("seatShare is a share of the seats filled", () => {
    expect(seatShare(fake({ lpc: 25 }, "lpc", 200), "lpc")).toBe(12.5);
  });

  it("governmentLabel", () => {
    expect(governmentLabel(fake({}, "lpc"))).toBe("Liberal minority");
  });

  it("the time axis runs from 1867 to the end of the current year", () => {
    expect(X0).toBe(1867);
    expect(X1).toBe(Number(buildDate.slice(0, 4)) + 1);
    expect(xOf(X0)).toBe(0);
    expect(xOf(X1)).toBe(1000);
    expect(xPct(500)).toBe("50.00%");
  });

  it("STACK lists every federal family once", () => {
    expect([...STACK].sort()).toEqual([...FEDERAL_FAMILIES].sort());
  });
});

describe("election history data", () => {
  it("is in order, numbered from 1", () => {
    elections.forEach((e, i) => expect(e.number).toBe(i + 1));
    for (let i = 1; i < elections.length; i++) expect(elections[i]!.date > elections[i - 1]!.date).toBe(true);
  });

  it("each election's seats add up, and its majority line and government type follow from them", () => {
    for (const e of elections) {
      const label = `${e.year}`;
      expect(Object.values(e.seats).reduce((a, b) => a + b, 0), label).toBe(e.houseSize);
      expect(e.majority, label).toBe(majorityOf(e.seatsInHouse));
      expect(e.government.seats, label).toBe(e.seats[e.government.family]);
      expect(e.government.type, label).toBe(e.government.seats >= e.majority ? "majority" : "minority");
    }
  });

  it("days to the next election match the dates, and the latest runs to today", () => {
    elections.forEach((e, i) => {
      const next = elections[i + 1];
      if (next) {
        expect(e.nextElection).toBe(next.date);
        expect(parliamentDays(e)).toBe(Math.round((Date.parse(next.date) - Date.parse(e.date)) / 86_400_000));
      } else {
        expect(e.daysToNext).toBeNull();
        expect(parliamentDays(e)).toBeGreaterThan(0);
      }
    });
  });

  it("hover bands tile the whole axis, each round its own election", () => {
    expect(electionBands[0]!.x0).toBe(0);
    expect(electionBands.at(-1)!.x1).toBe(1000);
    electionBands.forEach((b, i) => {
      expect(b.x0).toBeLessThan(b.xc);
      expect(b.xc).toBeLessThan(b.x1);
      if (i > 0) expect(b.x0).toBe(electionBands[i - 1]!.x1);
    });
  });
});

describe("election date labels", () => {
  it("are written month first, in site style", () => {
    const M = "(January|February|March|April|May|June|July|August|September|October|November|December)";
    const style = new RegExp(`^${M} \\d{1,2}(, \\d{4}| – ${M} \\d{1,2}, \\d{4})$`);
    for (const e of elections) {
      expect(e.dateLabel).toMatch(style);
      expect(e.dateLabel.endsWith(String(e.year))).toBe(true);
    }
    expect(elections.find((e) => e.year === 1874)?.dateLabel).toBe("January 22, 1874");
    expect(elections[0]?.dateLabel).toBe("August 7 – September 20, 1867");
  });
});
