/**
 * The `facts` and `entityLinks` hast plugins (src/plugins/), run through
 * Sätteri with the site's markdown features, and inlineMarkdown() which wraps
 * them for one-line YAML text. Uses the real registry, with stable historical
 * ids only.
 */
import { markdownToHtml } from "satteri";
import { describe, expect, it } from "vitest";
import { entityLinks } from "../../src/plugins/entities";
import { facts } from "../../src/plugins/facts";
import { getFact } from "../../src/lib/facts";
import { inlineMarkdown } from "../../src/lib/inline-markdown";

const render = (md: string) =>
  markdownToHtml(md, { features: { attributes: true, rawHtml: true }, hastPlugins: [facts, entityLinks] }).html;

const seats = (getFact("commons.seats").value as number).toLocaleString("en-CA");

describe("entityLinks", () => {
  it("rewrites a term link to its glossary home and marks it", () => {
    expect(render("The [reserve powers](term:reserve-powers) exist.")).toContain(
      '<a href="/glossary#reserve-powers" data-entity="term:reserve-powers">reserve powers</a>',
    );
  });
  it("fills empty link text with the entity's name", () => {
    expect(render("Led by [](person:john-a-macdonald).")).toContain(
      '<a href="/prime-ministers#pm-1" data-entity="person:john-a-macdonald">John A. Macdonald</a>',
    );
  });
  it("handles document sections and cases", () => {
    const html = render("Under [s. 33](doc:charter/s33), see [](case:r-v-oakes).");
    expect(html).toContain('data-entity="doc:charter/s33"');
    expect(html).toMatch(/<a href="\/[^"]*" data-entity="case:r-v-oakes">R\. v\. Oakes<\/a>/);
  });
  it("leaves ordinary links alone", () => {
    const html = render("[a page](/learn/crown) and [a site](https://example.com) and [mail](mailto:a@b.ca)");
    expect(html).not.toContain("data-entity");
    expect(html).toContain('href="/learn/crown"');
  });
  it("throws on an unknown id, naming it and suggesting the closest", () => {
    expect(() => render("[x](event:king-byng-afair)")).toThrow(/entity link \[x\]\(event:king-byng-afair\): Unknown entity "event:king-byng-afair" \(did you mean "event:king-byng-affair"\?\)/);
  });
  it("throws on a malformed id with a known type prefix", () => {
    expect(() => render("[x](person:John_A)")).toThrow(/is not an entity id/);
  });
});

describe("facts", () => {
  it("resolves placeholders in a paragraph, with |raw", () => {
    const raw = String(getFact("population.canada").value);
    const html = render("The House has {{commons.seats}} seats and Canada {{population.canada|raw}} people.");
    expect(html).toContain(`The House has ${seats} seats`);
    expect(html).toContain(`Canada ${raw} people`);
  });
  it("resolves them in a blockquote, a list and link text", () => {
    const html = render(`> {{commons.seats}} in a quote\n\n- {{commons.majority}} in a list\n\n[{{commons.seats}} seats](/learn/parliament)`);
    expect(html).toContain(`<p>${seats} in a quote</p>`);
    expect(html).toContain(`<li>${getFact("commons.majority").value} in a list</li>`);
    expect(html).toContain(`>${seats} seats</a>`);
  });
  it("resolves them inside a mermaid block", () => {
    const html = render("```mermaid\ngraph TD\nA[{{commons.seats}} seats]\n```\n");
    expect(html).toContain(`A[${seats} seats]`);
    expect(html).not.toContain("{{");
  });
  it("leaves inline code and other code blocks alone", () => {
    const html = render("`{{commons.seats}}`\n\n```text\n{{commons.seats}}\n```\n\n```\n{{ nothing.real }}\n```\n");
    expect(html).toContain("<code>{{commons.seats}}</code>");
    expect(html).toContain('<code class="language-text">{{commons.seats}}');
    expect(html).toContain("{{ nothing.real }}");
  });
  it("throws on an unknown key", () => {
    expect(() => render("There are {{commons.seat}} seats.")).toThrow(/Unknown fact "commons\.seat"/);
    expect(() => render("```mermaid\ngraph TD\nA[{{commons.seat}}]\n```\n")).toThrow(/Unknown fact/);
  });
  it("throws on a malformed placeholder", () => {
    expect(() => render("There are {{ Commons.Seats }} seats.")).toThrow(/malformed fact placeholder \{\{ Commons\.Seats \}\}/);
    expect(() => render("Empty {{}} here.")).toThrow(/malformed fact placeholder/);
  });
  it("leaves single braces alone", () => {
    expect(render("A set {a, b} and {x}.")).toContain("A set {a, b} and {x}.");
  });
});

describe("inlineMarkdown", () => {
  it("renders one line without the paragraph, with facts, entity links and smart quotes", () => {
    const html = inlineMarkdown(`The "House" has {{commons.seats}} seats; see [](term:reserve-powers).`);
    expect(html).not.toMatch(/^<p>/);
    expect(html).toContain(`${seats} seats`);
    expect(html).toContain("“House”");
    expect(html).toContain('data-entity="term:reserve-powers"');
  });
  it("rejects block content", () => {
    expect(() => inlineMarkdown("One.\n\nTwo.")).toThrow(/block content/);
    expect(() => inlineMarkdown("- a list")).toThrow(/block content/);
  });
  it("returns the same result for the same input (cached)", () => {
    expect(inlineMarkdown("*hi*")).toBe(inlineMarkdown("*hi*"));
    expect(inlineMarkdown("*hi*")).toBe("<em>hi</em>");
  });
});
