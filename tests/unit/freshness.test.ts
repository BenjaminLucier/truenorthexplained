/**
 * Freshness (src/lib/freshness.ts): date handling, dataset rules, the
 * watchlist and dated-phrase detection. The project report itself is only
 * checked for shape, since its contents change as data is refreshed.
 */
import { describe, expect, it } from "vitest";
import {
  DATASET_RULES,
  checkWatchlist,
  datasetAge,
  daysBetween,
  findDatedPhrases,
  freshnessReport,
  freshnessSummary,
  parseDate,
  ruleFor,
  watchStatus,
} from "../../src/lib/freshness";

const d = (s: string) => parseDate(s);

describe("parseDate", () => {
  it("reads full dates as that day", () => {
    expect(d("2026-06-08").toISOString().slice(0, 10)).toBe("2026-06-08");
  });
  it("reads a bare year or month as its last day", () => {
    expect(d("2025").toISOString().slice(0, 10)).toBe("2025-12-31");
    expect(d("2024-02").toISOString().slice(0, 10)).toBe("2024-02-29");
    expect(parseDate(1926).toISOString().slice(0, 10)).toBe("1926-12-31");
  });
  it("rejects non-dates", () => {
    expect(() => d("soon")).toThrow();
  });
});

describe("datasets", () => {
  it("matches specific files before their folders", () => {
    expect(ruleFor("src/data/wikidata/premiers.json")?.script).toBe("pnpm data:premiers");
    expect(ruleFor("src/data/wikidata/prime-ministers.json")?.script).toBe("pnpm grounding");
    expect(ruleFor("src/data/elections/history.json")?.script).toBe("pnpm data:election-history");
    expect(ruleFor("src/data/elections/2025/ridings.json")?.script).toBe("pnpm data:elections");
    expect(ruleFor("src/data/geo/treaties.topo.meta.json")?.script).toBe("pnpm data:treaties");
    expect(ruleFor("src/data/geo/ridings.topo.meta.json")?.script).toBe("pnpm data:geo");
  });
  it("flags a dataset only past its rule's age", () => {
    const now = d("2026-11-13");
    const max = ruleFor("src/data/wikidata/premiers.json")!.maxDays;
    const fetchedOk = new Date(now.getTime() - max * 86_400_000).toISOString().slice(0, 10);
    const fetchedOld = new Date(now.getTime() - (max + 1) * 86_400_000).toISOString().slice(0, 10);
    expect(datasetAge("src/data/wikidata/premiers.json", fetchedOk, now).stale).toBe(false);
    expect(datasetAge("src/data/wikidata/premiers.json", fetchedOld, now).stale).toBe(true);
  });
  it("covers every committed dataset that records a fetch date", () => {
    const r = freshnessReport(d("2026-11-13"));
    const uncovered = r.datasets.filter((x) => !x.rule).map((x) => x.path);
    expect(uncovered).toEqual([]);
    expect(DATASET_RULES.length).toBeGreaterThan(0);
  });
});

describe("watchlist", () => {
  const now = d("2026-11-13");
  it("sorts items into overdue, due, coming up and later", () => {
    expect(watchStatus({ checkBy: "2026-11-01" }, now)).toBe("overdue");
    expect(watchStatus({ checkBy: "2026-11-13" }, now)).toBe("due");
    expect(watchStatus({ checkBy: "2026-11-20" }, now)).toBe("upcoming");
    expect(watchStatus({ checkBy: "2027-03-01" }, now)).toBe("later");
  });
  it("reports missing fields, bad dates and duplicate ids", () => {
    const { errors } = checkWatchlist({
      items: [
        { id: "a", what: "x", checkBy: "2026-12-01", then: "y" },
        { id: "a", what: "x", checkBy: "2026-12-01", then: "y" },
        { id: "b", what: "x", checkBy: "next spring", then: "y" },
        { id: "c", what: "x", checkBy: "2026-12-01" },
      ],
    });
    expect(errors.some((e) => e.includes("duplicate id"))).toBe(true);
    expect(errors.some((e) => e.includes("isn't a date"))).toBe(true);
    expect(errors.some((e) => e.includes("`then` is required"))).toBe(true);
  });
  it("accepts the project's watchlist", () => {
    expect(freshnessReport(now).errors).toEqual([]);
  });
});

describe("dated phrases", () => {
  it("finds year, month-year and full-date forms with their line", () => {
    const text = "Intro.\nAs of 2025, there were 9.\nAs of June 2026, 10. As of November 13, 2026, 11.";
    const found = findDatedPhrases("x.md", text);
    expect(found.map((p) => [p.line, p.year])).toEqual([
      [2, 2025],
      [3, 2026],
      [3, 2026],
    ]);
  });
  it("ignores HTML comments", () => {
    expect(findDatedPhrases("x.md", "<!-- check: as of 2024 -->\nText.")).toEqual([]);
  });
});

describe("summary", () => {
  it("is one line naming the timeline", () => {
    const line = freshnessSummary(freshnessReport(d("2026-11-13")));
    expect(line.startsWith("Freshness: ")).toBe(true);
    expect(line).not.toContain("\n");
    expect(line).toContain("timeline");
  });
  it("counts days between dates", () => {
    expect(daysBetween(d("2026-11-13"), d("2026-11-20"))).toBe(7);
  });
});
