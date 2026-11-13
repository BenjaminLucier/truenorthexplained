import { describe, expect, it } from "vitest";
import { slugify, uniqueId } from "../../src/lib/ids";
import { sitePathFromEntry } from "../../src/lib/paths";

describe("slugify", () => {
  it("makes lowercase ASCII words joined by hyphens", () => {
    expect(slugify("Votes vs seats, 2025")).toBe("votes-vs-seats-2025");
    expect(slugify("  --Hello, World!--  ")).toBe("hello-world");
  });

  it("drops accents rather than the letters", () => {
    expect(slugify("Québec: l'Assemblée nationale")).toBe("quebec-l-assemblee-nationale");
  });

  it("caps the length (40 by default) without leaving a trailing hyphen", () => {
    expect(slugify("a".repeat(50))).toBe("a".repeat(40));
    expect(slugify("one two three", 8)).toBe("one-two");
    expect(slugify("Québec: l'Assemblée nationale", 12)).toBe("quebec-l-ass");
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueId", () => {
  it("builds prefix-slug ids and numbers repeats within one render", () => {
    const astro = { locals: {} };
    expect(uniqueId(astro, "chart", "Votes vs seats, 2025")).toBe("chart-votes-vs-seats-2025");
    expect(uniqueId(astro, "chart", "Votes vs seats, 2025")).toBe("chart-votes-vs-seats-2025-2");
    expect(uniqueId(astro, "chart", "Votes vs seats, 2025")).toBe("chart-votes-vs-seats-2025-3");
    expect(uniqueId(astro, "chart")).toBe("chart");
    expect(uniqueId(astro, "chart", "!!!")).toBe("chart-2");
  });

  it("starts again for a new page render", () => {
    expect(uniqueId({ locals: {} }, "map", "Ridings")).toBe("map-ridings");
    expect(uniqueId({ locals: {} }, "map", "Ridings")).toBe("map-ridings");
  });
});

describe("sitePathFromEntry", () => {
  it("follows the documented examples", () => {
    expect(sitePathFromEntry("learn/03-parliament/senate.en.md")).toBe("learn/parliament/senate");
    expect(sitePathFromEntry("learn/03-parliament/index.en.md")).toBe("learn/parliament");
    expect(sitePathFromEntry("provinces/index.en.md")).toBe("provinces");
    expect(sitePathFromEntry("home.en.md")).toBe("home");
  });

  it("strips the order prefix only from learn modules", () => {
    expect(sitePathFromEntry("learn/00-big-picture/index.en.md")).toBe("learn/big-picture");
    expect(sitePathFromEntry("provinces/quebec.en.md")).toBe("provinces/quebec");
    expect(sitePathFromEntry("provinces/01-x.en.md")).toBe("provinces/01-x");
    expect(sitePathFromEntry("learn/index.en.md")).toBe("learn");
  });
});
