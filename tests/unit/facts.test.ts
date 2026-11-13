/**
 * The facts registry (src/lib/facts.ts): formatting and placeholders, and
 * invariants between the facts and the datasets they come from. Facts are
 * added all the time, so no totals are pinned.
 */
import { describe, expect, it } from "vitest";
import commons from "../../src/data/parliament/commons.json";
import seatAllocation from "../../src/data/parliament/seat-allocation.json";
import senate from "../../src/data/parliament/senate.json";
import ridings from "../../src/data/elections/2025/ridings.json";
import premiers from "../../src/data/wikidata/premiers.json";
import primeMinisters from "../../src/data/wikidata/prime-ministers.json";
import governorsGeneral from "../../src/data/wikidata/governors-general.json";
import monarchs from "../../src/data/wikidata/monarchs.json";
import chiefJustices from "../../src/data/wikidata/chief-justices.json";
import population from "../../src/data/population/provinces.json";
import { FACT_RE, allFacts, factKeysIn, formatFact, getFact, hasFact, ordinal, resolveFacts } from "../../src/lib/facts";

const SLUGS = [
  "newfoundland-and-labrador",
  "prince-edward-island",
  "nova-scotia",
  "new-brunswick",
  "quebec",
  "ontario",
  "manitoba",
  "saskatchewan",
  "alberta",
  "british-columbia",
  "yukon",
  "northwest-territories",
  "nunavut",
];
const value = (key: string) => getFact(key).value;

describe("formatFact", () => {
  it("groups numbers the en-CA way", () => {
    expect(formatFact({ value: 41798407, source: "x" })).toBe("41,798,407");
    expect(formatFact({ value: 343, source: "x" })).toBe("343");
    expect(formatFact({ value: 1234.5, source: "x" })).toBe("1,234.5");
  });
  it("leaves numbers bare with raw, and strings as they are", () => {
    expect(formatFact({ value: 41798407, source: "x" }, true)).toBe("41798407");
    expect(formatFact({ value: "2025", source: "x" })).toBe("2025");
    expect(formatFact({ value: "September 8, 2022", source: "x" }, true)).toBe("September 8, 2022");
  });
});

describe("ordinal", () => {
  it("handles 1st, 2nd, 3rd, the teens and the twenties", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 24, 101, 111, 112].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "24th", "101st", "111th", "112th",
    ]);
  });
});

describe("placeholders", () => {
  it("FACT_RE matches keys with optional spaces and |raw, and nothing malformed", () => {
    const keys = (s: string) => [...s.matchAll(FACT_RE)].map((m) => [m[1], m[2] ?? null]);
    expect(keys("{{commons.seats}} {{ commons.majority }} {{population.canada|raw}} {{ pm.since | raw }}")).toEqual([
      ["commons.seats", null],
      ["commons.majority", null],
      ["population.canada", "raw"],
      ["pm.since", "raw"],
    ]);
    expect(keys("{{Commons.Seats}} {{commons seats}} {commons.seats} {{}} {{.x}}")).toEqual([]);
  });

  it("resolveFacts replaces every placeholder, formatted or raw", () => {
    const seats = value("commons.seats") as number;
    expect(resolveFacts("The House has {{commons.seats}} seats; majority {{ commons.majority }}.")).toBe(
      `The House has ${seats.toLocaleString("en-CA")} seats; majority ${value("commons.majority")}.`,
    );
    const pop = value("population.canada") as number;
    expect(pop).toBeGreaterThan(1000);
    expect(resolveFacts("{{population.canada}} / {{population.canada|raw}}")).toBe(`${pop.toLocaleString("en-CA")} / ${pop}`);
  });

  it("resolveFacts passes through text without placeholders, and undefined", () => {
    expect(resolveFacts("No facts here {not one}.")).toBe("No facts here {not one}.");
    expect(resolveFacts(undefined)).toBeUndefined();
  });

  it("an unknown key throws, naming the key and nearby keys", () => {
    expect(() => resolveFacts("{{commons.seat}}")).toThrow(/Unknown fact "commons\.seat" \(known commons\.\* facts: .*commons\.seats/);
    expect(() => getFact("nothing.like.this")).toThrow(/Unknown fact "nothing\.like\.this" \(see content\/facts\.yaml/);
    expect(hasFact("commons.seat")).toBe(false);
  });

  it("factKeysIn lists keys, malformed ones included, without |raw", () => {
    expect(factKeysIn("{{commons.seats}} and {{ pm.name | raw }} and {{ Commons.Seats }} and {{}}")).toEqual(["commons.seats", "pm.name", "Commons.Seats", ""]);
    expect(factKeysIn("no placeholders { here }")).toEqual([]);
  });
});

describe("facts against their datasets", () => {
  it("commons.majority is floor(seats/2)+1", () => {
    const seats = value("commons.seats") as number;
    expect(value("commons.seats")).toBe(commons.seats);
    expect(value("commons.majority")).toBe(Math.floor(seats / 2) + 1);
  });

  it("commons.seats is the sum of the provinces' seats and the number of ridings", () => {
    const sum = SLUGS.reduce((n, s) => n + (value(`commons.seats.${s}`) as number), 0);
    expect(sum).toBe(value("commons.seats"));
    expect(value("ridings.count")).toBe(value("commons.seats"));
    expect(value("ridings.count")).toBe(ridings.ridings.length);
    expect(seatAllocation.total).toBe(value("commons.seats"));
  });

  it("senate.seats is the sum of the provinces' senate seats", () => {
    const sum = SLUGS.reduce((n, s) => n + (value(`senate.seats.${s}`) as number), 0);
    expect(sum).toBe(value("senate.seats"));
    expect(value("senate.seats")).toBe(senate.seats);
  });

  it("has a premier, party and start date for all 13 provinces and territories", () => {
    for (const slug of SLUGS) {
      for (const k of ["name", "party", "since"]) expect(String(value(`premier.${slug}.${k}`)).trim(), `premier.${slug}.${k}`).not.toBe("");
      const prov = premiers.provinces.find((p) => p.slug === slug)!;
      const open = prov.terms.filter((t) => t.end === null);
      expect(open).toHaveLength(1);
      expect(value(`premier.${slug}.name`)).toBe(open[0]!.name);
    }
  });

  it("each 'in office' fact names the holder whose term is still open", () => {
    const openHolder = (list: { name: string; ordinal: number; terms: { start: string; end: string | null }[] }[]) => {
      const open = list.filter((h) => h.terms.some((t) => t.end === null));
      expect(open).toHaveLength(1);
      return { ...open[0]!, since: open[0]!.terms.find((t) => t.end === null)!.start };
    };
    const pm = openHolder(primeMinisters.primeMinisters);
    expect(value("pm.name")).toBe(pm.name);
    expect(value("pm.ordinal")).toBe(ordinal(pm.ordinal));
    expect(value("pm.since")).toMatch(new RegExp(`, ${pm.since.slice(0, 4)}$`));
    for (const [key, list] of [
      ["gg", governorsGeneral.governorsGeneral],
      ["monarch", monarchs.monarchs],
      ["chief-justice", chiefJustices.chiefJustices],
    ] as const) {
      const h = openHolder(list as never);
      expect(value(`${key}.name`)).toBe(h.name);
      expect(value(`${key}.since-year`)).toBe(h.since.slice(0, 4));
      expect(value(`${key}.since`)).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    }
  });

  it("population facts match the latest estimate, and the provinces add up to Canada", () => {
    expect(value("population.canada")).toBe(population.canada);
    const sum = SLUGS.reduce((n, s) => n + (value(`population.${s}`) as number), 0);
    expect(sum).toBe(population.canada);
    expect(value("population.canada.rounded")).toMatch(/^\d+(\.\d+)? million$/);
    expect(value("population.yukon.rounded")).toMatch(/^\d{1,3},000$/);
  });

  it("every fact has a source, and keys are well formed", () => {
    for (const [key, fact] of allFacts()) {
      expect(key).toMatch(/^[a-z0-9][a-z0-9.-]*$/);
      expect(fact.source.trim(), key).not.toBe("");
      expect(["string", "number"]).toContain(typeof fact.value);
      if (typeof fact.value === "number") expect(Number.isFinite(fact.value), key).toBe(true);
    }
  });
});
