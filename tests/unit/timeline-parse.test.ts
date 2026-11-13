import { describe, expect, it } from "vitest";
import { anchorBase, charterGroups, groupForHref, parseTable, slugify, sortEras, textOf, uniqueIds } from "../../src/widgets/timeline/parse";

describe("textOf and slugify", () => {
  it("textOf strips tags, decodes entities and collapses spaces", () => {
    expect(textOf("<em>R. v. Oakes</em> &amp;\n  more &#39;here&#x27; &lt;x&gt;")).toBe("R. v. Oakes & more 'here' <x>");
  });
  it("slugify makes ASCII anchors", () => {
    expect(slugify("R. v. Oakes")).toBe("r-v-oakes");
    expect(slugify("Québec — 1980")).toBe("quebec-1980");
  });
});

describe("groupForHref", () => {
  it("uses the module for /learn pages and 'provinces' for province pages", () => {
    expect(groupForHref("/learn/crown/reserve-powers")).toBe("crown");
    expect(groupForHref("/learn/charter#oakes")).toBe("charter");
    expect(groupForHref("/provinces/quebec")).toBe("provinces");
    expect(groupForHref("/provinces")).toBe("provinces");
    expect(groupForHref("/provinces#map")).toBe("provinces");
  });
  it("ignores everything else", () => {
    expect(groupForHref("/provincesx")).toBeUndefined();
    expect(groupForHref("/timeline")).toBeUndefined();
    expect(groupForHref("https://example.org/learn/crown")).toBeUndefined();
  });
});

describe("anchor ids", () => {
  it("anchorBase uses the year and up to four words of the text, skipping filler and numbers", () => {
    expect(anchorBase({ year: 1926, text: "In the King–Byng affair, the Governor General refuses" })).toBe("event-1926-king-byng-affair-governor");
    expect(anchorBase({ year: 1985, text: "Section 15, the Charter&#39;s equality rights" })).toBe("event-1985-section-charter-equality-rights");
  });
  it("anchorBase prefers a title, then a tag, and takes up to six words from them", () => {
    expect(anchorBase({ year: 1986, title: "<em>R. v. Oakes</em>", tag: "s. 1", text: "Created the test" })).toBe("event-1986-r-v-oakes");
    expect(anchorBase({ year: 2022, tag: "Ontario", text: "Used it" })).toBe("event-2022-ontario");
    expect(anchorBase({ year: 1985, title: "R. v. Big M Drug Mart Ltd. and more", text: "" })).toBe("event-1985-r-v-big-m-drug-mart");
  });
  it("uniqueIds numbers repeats in order", () => {
    expect(uniqueIds(["event-1990-oka", "event-1990-x", "event-1990-oka", "event-1990-oka"])).toEqual([
      "event-1990-oka",
      "event-1990-x",
      "event-1990-oka-2",
      "event-1990-oka-3",
    ]);
  });
  it("sortEras sorts by year and keeps the authored order within a year", () => {
    const e = (year: number, text: string) => ({ id: "", year, yearLabel: String(year), text, groups: [], links: [] });
    const [era] = sortEras([{ events: [e(1990, "b"), e(1867, "a"), e(1990, "c")] }]);
    expect(era!.events.map((x) => x.text)).toEqual(["a", "b", "c"]);
  });
});

describe("parseTable", () => {
  const html = `<div class="table-wrap"><table>
<thead><tr><th>Year</th><th>Case</th><th>Main section</th><th>In one line</th></tr></thead>
<tbody>
<tr><td>1986</td><td><em>R. v. Oakes</em></td><td>s. 1, s. 11(d)</td><td>Created the test</td></tr>
<tr><td>1985</td><td><em>R. v. Big M Drug Mart</em></td><td>s. 2(a) religion</td><td>Sunday closing struck down</td></tr>
</tbody></table></div>`;

  it("picks columns by header (any case) and sorts rows by year", () => {
    const [era] = parseTable(html, { title: "case", text: "In one line", group: "Main section" }, charterGroups);
    expect(era!.events).toEqual([
      {
        id: "event-1985-r-v-big-m-drug-mart",
        year: 1985,
        endYear: undefined,
        yearLabel: "1985",
        title: "<em>R. v. Big M Drug Mart</em>",
        text: "Sunday closing struck down",
        tag: "s. 2(a) religion",
        groups: ["freedoms"],
        links: [],
      },
      {
        id: "event-1986-r-v-oakes",
        year: 1986,
        endYear: undefined,
        yearLabel: "1986",
        title: "<em>R. v. Oakes</em>",
        text: "Created the test",
        tag: "s. 1, s. 11(d)",
        groups: ["limits", "legal"],
        links: [],
      },
    ]);
  });

  it("reads year ranges, groups by the column's own values and numbers repeated anchors", () => {
    const table = `<table><thead><tr><th>Year</th><th>Jurisdiction</th><th>How</th></tr></thead><tbody>
<tr><td>1982–1987</td><td>Quebec</td><td>All its laws &amp; more</td></tr>
<tr><td>1988</td><td>Quebec</td><td>Signs</td></tr>
<tr><td>1988</td><td>Quebec</td><td>Again</td></tr>
</tbody></table>`;
    const [era] = parseTable(table, { text: "How", group: "Jurisdiction" }, (cell) => [slugify(cell)]);
    expect(era!.events.map((e) => [e.id, e.year, e.endYear, e.yearLabel, e.text, e.groups])).toEqual([
      ["event-1982-quebec", 1982, 1987, "1982–1987", "All its laws &amp; more", ["quebec"]],
      ["event-1988-quebec", 1988, undefined, "1988", "Signs", ["quebec"]],
      ["event-1988-quebec-2", 1988, undefined, "1988", "Again", ["quebec"]],
    ]);
  });

  it("fails clearly on a missing table or column", () => {
    expect(() => parseTable("<p>none</p>", {}, charterGroups)).toThrow(/no table found/);
    expect(() => parseTable(html, { title: "Nope" }, charterGroups)).toThrow(/no "Nope" column/);
  });
});

describe("charterGroups", () => {
  it("sorts section references into the parts of the Charter", () => {
    expect(charterGroups("s. 2(b), s. 33")).toEqual(["freedoms", "override"]);
    expect(charterGroups("s. 1")).toEqual(["limits"]);
    expect(charterGroups("s. 7, s. 7")).toEqual(["legal"]);
    expect(charterGroups("s. 14")).toEqual(["legal"]);
    expect(charterGroups("s. 15")).toEqual(["equality"]);
  });
  it("puts anything else under 'other'", () => {
    expect(charterGroups("(not a Charter case)")).toEqual(["other"]);
    expect(charterGroups("s. 3")).toEqual(["other"]);
  });
});
