import { describe, expect, it } from "vitest";
import { charterGroups, groupForHref, parseEraList, parseTable, slugify, textOf } from "../../src/widgets/timeline/parse";

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

describe("parseEraList", () => {
  const html = `<p>Intro without entries.</p>
<h2 id="confederation">Confederation</h2>
<ul>
<li><strong>1867</strong> — The British North America Act takes effect. <a href="/learn/constitution">Read more</a> · <a href="/provinces/ontario">Ontario</a></li>
<li><strong>1864</strong> — Charlottetown Conference. <a href="/learn/constitution/patriation-1982">More</a></li>
</ul>
<h2 id="modern">Modern era</h2>
<ul><li><strong>1982–1987</strong> – Patriation &amp; Meech.</li></ul>`;

  it("makes one era per heading, sorted by year, with text, links and groups", () => {
    const eras = parseEraList(html);
    expect(eras.map((e) => [e.id, e.title, e.events.map((x) => x.year)])).toEqual([
      ["confederation", "Confederation", [1864, 1867]],
      ["modern", "Modern era", [1982]],
    ]);
    const bna = eras[0]!.events[1]!;
    expect(bna).toEqual({
      id: "event-1867-british-north-america-act",
      year: 1867,
      endYear: undefined,
      yearLabel: "1867",
      text: "The British North America Act takes effect.",
      groups: ["constitution", "provinces"],
      links: [
        { href: "/learn/constitution", label: "Read more" },
        { href: "/provinces/ontario", label: "Ontario" },
      ],
    });
  });

  it("reads year ranges and keeps inline HTML in the text", () => {
    const range = parseEraList(html)[1]!.events[0]!;
    expect(range).toMatchObject({ year: 1982, endYear: 1987, yearLabel: "1982–1987", text: "Patriation &amp; Meech.", links: [], groups: [] });
    expect(range.id).toBe("event-1982-patriation-meech");
  });

  it("numbers repeated anchors", () => {
    const eras = parseEraList("<ul><li><strong>1990</strong> — Oka. </li><li><strong>1990</strong> — Oka.</li></ul>");
    expect(eras[0]!.events.map((e) => e.id)).toEqual(["event-1990-oka", "event-1990-oka-2"]);
  });

  it("rejects entries not written as **year** — text", () => {
    expect(() => parseEraList("<ul><li>No year here</li></ul>")).toThrow(/not in "\*\*year\*\* — text" form/);
    expect(() => parseEraList("<ul><li><strong>Long ago</strong> — Something</li></ul>")).toThrow(/has no year/);
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
