import { describe, expect, it } from "vitest";
import { classify, cleanUrl, collectSources, linksInText } from "../../src/lib/sources.ts";

describe("linksInText", () => {
  it("finds markdown links with line numbers and the unverified marker", () => {
    const md = "Intro\nSee [the Act](https://laws-lois.justice.gc.ca/eng/acts/E-2.01/) and [x](term:riding).\n[y](https://lop.parl.ca/a) <!-- unverified link -->";
    expect(linksInText(md, "md")).toEqual([
      { url: "https://laws-lois.justice.gc.ca/eng/acts/E-2.01/", line: 2, unverified: false },
      { url: "https://lop.parl.ca/a", line: 3, unverified: true },
    ]);
  });

  it("keeps balanced parentheses in URLs", () => {
    expect(linksInText("[LG](https://en.wikipedia.org/wiki/Lieutenant_governor_(Canada)).", "md")[0]?.url).toBe(
      "https://en.wikipedia.org/wiki/Lieutenant_governor_(Canada)",
    );
    expect(linksInText("source: (see https://en.wikipedia.org/wiki/A_(b))", "yaml")[0]?.url).toBe("https://en.wikipedia.org/wiki/A_(b)");
  });

  it("ignores bare URLs in markdown prose", () => {
    expect(linksInText("Go to https://example.ca today.", "md")).toEqual([]);
  });

  it("finds any URL in YAML values but not in comments", () => {
    const yaml = '# e.g. https://example.ca/format\nsource: "Standing Orders: https://www.ourcommons.ca/procedure/standing-orders/chap13-e.html"\nurl: https://a.ca/b';
    expect(linksInText(yaml, "yaml").map((l) => [l.url, l.line])).toEqual([
      ["https://www.ourcommons.ca/procedure/standing-orders/chap13-e.html", 2],
      ["https://a.ca/b", 3],
    ]);
  });

  it("drops trailing sentence punctuation", () => {
    expect(cleanUrl("https://a.ca/b.")).toBe("https://a.ca/b");
    expect(cleanUrl("https://a.ca/b.html")).toBe("https://a.ca/b.html");
  });
});

describe("classify", () => {
  it("sorts status codes", () => {
    expect(classify("https://a.ca/", 200)).toBe("ok");
    expect(classify("https://a.ca/", 404)).toBe("broken");
    expect(classify("https://a.ca/", 410)).toBe("broken");
    expect(classify("https://a.ca/", 403)).toBe("blocked");
    expect(classify("https://a.ca/", 429)).toBe("blocked");
    expect(classify("https://a.ca/", 500)).toBe("error");
    expect(classify("https://a.ca/", null)).toBe("error");
  });

  it("treats a redirect to another page as moved, but not http→https, www or a trailing slash", () => {
    expect(classify("http://a.ca/x", 200, "https://www.a.ca/x/")).toBe("ok");
    expect(classify("https://a.ca/x", 200, "https://a.ca/en/x")).toBe("moved");
  });
});

describe("collectSources", () => {
  const links = collectSources();

  it("collects the site's cited links, deduplicated", () => {
    expect(links.length).toBeGreaterThan(100);
    expect(new Set(links.map((l) => l.url)).size).toBe(links.length);
  });

  it("includes sources from facts.yaml and the entity YAML", () => {
    const files = new Set(links.flatMap((l) => l.refs.map((r) => r.file)));
    expect(files.has("content/facts.yaml")).toBe(true);
    expect([...files].some((f) => f.startsWith("content/entities/"))).toBe(true);
  });
});
