import { describe, expect, it } from "vitest";
import { splitWidgets } from "../../src/lib/widgets";

describe("splitWidgets", () => {
  it("returns plain HTML as one chunk, and nothing for blank input", () => {
    expect(splitWidgets("<p>Just text</p>")).toEqual([{ kind: "html", html: "<p>Just text</p>" }]);
    expect(splitWidgets("")).toEqual([]);
    expect(splitWidgets("  \n ")).toEqual([]);
  });

  it("splits at a placeholder and drops the paragraph wrapped round it", () => {
    const html = '<p>Intro</p>\n<p><tn-widget name="bill-steps"></tn-widget></p>\n<p>After</p>';
    expect(splitWidgets(html)).toEqual([
      { kind: "html", html: "<p>Intro</p>\n" },
      { kind: "widget", name: "bill-steps", props: {} },
      { kind: "html", html: "\n<p>After</p>" },
    ]);
  });

  it("passes other attributes as camel-cased string props, without the data- prefix, unescaped", () => {
    const html = '<tn-widget name="power-sorter" data-set="federalism" data-foo-bar="x &amp; &quot;y&quot;"></tn-widget>';
    expect(splitWidgets(html)).toEqual([{ kind: "widget", name: "power-sorter", props: { set: "federalism", fooBar: 'x & "y"' } }]);
  });

  it("passes wrapped markup as a trimmed `content` prop", () => {
    const html = '<tn-widget name="timeline" data-group-by="module">\n<h2>Era</h2>\n<ul><li>x</li></ul>\n</tn-widget>';
    expect(splitWidgets(html)).toEqual([
      { kind: "widget", name: "timeline", props: { groupBy: "module", content: "<h2>Era</h2>\n<ul><li>x</li></ul>" } },
    ]);
  });

  it("handles several placeholders in order", () => {
    const html = '<tn-widget name="a"></tn-widget><p>Between</p><tn-widget name="b" data-x="1"></tn-widget>';
    expect(splitWidgets(html).map((c) => (c.kind === "widget" ? c.name : c.html))).toEqual(["a", "<p>Between</p>", "b"]);
  });

  it("fails on a placeholder without a name", () => {
    expect(() => splitWidgets('<tn-widget data-set="x"></tn-widget>')).toThrow(/without a name/);
  });
});
