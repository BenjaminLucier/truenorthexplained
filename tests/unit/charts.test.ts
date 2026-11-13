import { describe, expect, it } from "vitest";
import { areaPath, compact, formatValue, linePath, monthLabel, niceMax, niceTicks, pct, scale, tipRows } from "../../src/lib/charts";

describe("scale", () => {
  it("maps a domain linearly onto a range, including reversed ranges", () => {
    expect(scale(0, 10, 0, 100)(5)).toBe(50);
    expect(scale(0, 10, 100, 0)(2)).toBe(80);
    expect(scale(1867, 2027, 0, 1000)(1947)).toBe(500);
  });
  it("maps everything to the start of the range when the domain is empty", () => {
    expect(scale(5, 5, 0, 100)(7)).toBe(0);
  });
});

describe("niceTicks and niceMax", () => {
  it("picks round steps (1, 2, 2.5, 5 × 10ⁿ)", () => {
    expect(niceTicks(0, 100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(0, 7)).toEqual([0, 2, 4, 6]);
    expect(niceTicks(0, 1)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(0, 343)).toEqual([0, 100, 200, 300]);
  });
  it("starts at the first round value at or above the minimum", () => {
    expect(niceTicks(13, 97)).toEqual([25, 50, 75]);
  });
  it("returns just the minimum for an empty range", () => {
    expect(niceTicks(5, 5)).toEqual([5]);
  });
  it("niceMax is the smallest nice tick at or above the maximum", () => {
    expect(niceMax(100)).toBe(100);
    expect(niceMax(343)).toBe(400);
    expect(niceMax(0)).toBe(0);
  });
});

describe("paths", () => {
  it("linePath rounds to 0.1", () => {
    expect(linePath([[0, 0], [10.04, 20.06]])).toBe("M0.0 0.0L10.0 20.1");
  });
  it("areaPath closes the line down to the baseline", () => {
    expect(areaPath([[0, 10], [100, 20]], 50)).toBe("M0.0 10.0L100.0 20.0L100.0 50L0.0 50Z");
    expect(areaPath([], 50)).toBe("");
  });
  it("pct turns a 0–1000 x into a percentage", () => {
    expect(pct(500)).toBe("50.00%");
    expect(pct(123.4)).toBe("12.34%");
  });
});

describe("compact", () => {
  it("follows the documented examples", () => {
    expect(compact(40_000_000)).toBe("40M");
    expect(compact(750_000)).toBe("750K");
    expect(compact(2500)).toBe("2.5K");
  });
  it("leaves small numbers alone and keeps the sign", () => {
    expect(compact(999)).toBe("999");
    expect(compact(-2500)).toBe("-2.5K");
  });
  it("moves up a unit when rounding reaches it", () => {
    expect(compact(999_950)).toBe("1M");
    expect(compact(999_940)).toBe("999.9K");
  });
});

describe("tipRows", () => {
  it("serializes rows as the JSON <tn-chart> reads", () => {
    const attr = tipRows([["Seats", "122", "var(--tn-party-lpc)"], ["Note"]]);
    expect(attr).toBe('[["Seats","122","var(--tn-party-lpc)"],["Note"]]');
    expect(JSON.parse(attr)).toEqual([["Seats", "122", "var(--tn-party-lpc)"], ["Note"]]);
  });
});

describe("formatValue", () => {
  it("follows the documented examples", () => {
    expect(formatValue(-1.5, { suf: "%" })).toBe("−1.5%");
    expect(formatValue(2, { signed: true, suf: "%" })).toBe("+2.0%");
    expect(formatValue(12_000, { scale: 0.001, dp: 0, pre: "$", suf: " billion" })).toBe("$12 billion");
  });
  it("groups thousands en-CA style and puts the sign before the prefix", () => {
    expect(formatValue(-1_234_567.891, { dp: 2, pre: "$" })).toBe("−$1,234,567.89");
    expect(formatValue(1234.5, { dp: 0, pre: "$" })).toBe("$1,235");
  });
  it("gives no sign to values that round to zero", () => {
    expect(formatValue(-0.04, {})).toBe("0.0");
    expect(formatValue(0, { signed: true })).toBe("0.0");
    expect(formatValue(0.04, { signed: true })).toBe("0.0");
  });
});

describe("monthLabel", () => {
  it("names the month and keeps anything after it", () => {
    expect(monthLabel("1981-08")).toBe("August 1981");
    expect(monthLabel("2025-10 (latest)")).toBe("October 2025 (latest)");
    expect(monthLabel("2024-12")).toBe("December 2024");
  });
  it("passes anything else through", () => {
    expect(monthLabel("1981")).toBe("1981");
    expect(monthLabel("Q3 2024")).toBe("Q3 2024");
  });
});
