import { describe, expect, it } from "vitest";
import { allEntities, eras, getEntity, type Case, type Entity, type Event } from "../../src/lib/entities";
import { inlineMarkdown } from "../../src/lib/inline-markdown";
import { eventsMentioning } from "../../src/lib/related";
import {
  caseEras,
  casesOnPage,
  eventEras,
  eventGroups,
  eventItem,
  legacyEraId,
  parseDate,
  type Lookup,
} from "../../src/widgets/timeline/entities";
import legacyAnchors from "./fixtures/timeline-legacy-anchors.json";

/** A minimal event entity; fields as the registry fills them in. */
const event = (over: Partial<Event>): Event => ({
  id: "event:x",
  type: "event",
  slug: "x",
  name: "X",
  aliases: [],
  href: "/timeline#x",
  source: "test",
  date: "1926",
  year: 1926,
  title: "X",
  text: "Something happened.",
  era: "a",
  pages: [],
  sources: [],
  people: [],
  entities: [],
  ...over,
});

const people: Record<string, Entity> = {
  "person:p": { id: "person:p", type: "person", slug: "p", name: "Pat Example", short: "Pat", aliases: [], href: "/prime-ministers#pm-1", source: "t", qid: "Q1", roles: [] },
  "case:c": {
    id: "case:c",
    type: "case",
    slug: "c",
    name: "R. v. C",
    aliases: [],
    href: "/learn/charter/landmark-cases#c",
    source: "t",
    year: 1990,
    holding: "Held",
    sections: [],
    people: [],
    entities: [],
  },
  "term:t": { id: "term:t", type: "term", slug: "t", name: "Term", aliases: [], href: "/glossary#t", source: "t" },
};
const fake: Lookup = {
  entity: (id) => people[id] ?? event({ id, slug: id.slice(6), title: `Title of ${id.slice(6)}` }),
  pageTitle: (path) => ({ "/learn/crown/reserve-powers": "Reserve powers", "/provinces/quebec": "Quebec" })[path],
  render: (md) => `[${md}]`,
};
const real: Lookup = { entity: getEntity, pageTitle: () => "Page", render: inlineMarkdown };

describe("parseDate", () => {
  it("keeps the precision written", () => {
    expect(parseDate("1926")).toEqual({ year: 1926, month: undefined, day: undefined, precision: "year" });
    expect(parseDate("1981-11")).toEqual({ year: 1981, month: 11, day: undefined, precision: "month" });
    expect(parseDate("1867-07-01")).toEqual({ year: 1867, month: 7, day: 1, precision: "day" });
  });
  it("rejects anything else", () => {
    expect(() => parseDate("July 1, 1867")).toThrow(/Not a year or ISO date/);
    expect(() => parseDate("67")).toThrow();
  });
});

describe("legacyEraId", () => {
  it("matches the heading ids the eras had as markdown headings", () => {
    expect(legacyEraId("Before Confederation (to 1866)")).toBe("before-confederation-to-1866");
    expect(legacyEraId("Building the country (1867–1923)")).toBe("building-the-country-18671923");
    expect(legacyEraId("Recent (2000–today)")).toBe("recent-2000today");
  });
});

describe("eventGroups", () => {
  it("puts the module first, then the groups of every page", () => {
    const pages = [{ page: "/provinces/quebec" }, { page: "/learn/law/courts" }, { page: "/learn/crown" }];
    expect(eventGroups({ pages, module: undefined })).toEqual(["law", "provinces", "crown"]);
    expect(eventGroups({ pages, module: "charter" })).toEqual(["charter", "provinces", "law", "crown"]);
    expect(eventGroups({ pages: [{ page: "/provinces/yukon" }], module: undefined })).toEqual(["provinces"]);
    expect(eventGroups({ pages: [], module: undefined })).toEqual([]);
  });
});

describe("eventItem", () => {
  it("maps an event entity to a card: slug id, year, title, text, page links, sources, people, related", () => {
    const item = eventItem(
      event({
        slug: "king-byng-affair",
        date: "1926-06",
        title: "The King–Byng <affair>",
        pages: [{ page: "/learn/crown/reserve-powers" }, { page: "/provinces/quebec#x", label: "Quebec today" }, { page: "/nowhere" }],
        sources: [{ label: "Library of Parliament", url: "https://lop.parl.ca/x" }],
        people: ["person:p"],
        entities: ["case:c", "event:other", "term:t"],
      }),
      fake,
    );
    expect(item).toEqual({
      id: "king-byng-affair",
      year: 1926,
      endYear: undefined,
      yearLabel: "1926",
      date: "1926-06",
      title: "The King–Byng &lt;affair&gt;",
      text: "[Something happened.]",
      groups: ["crown", "provinces"],
      links: [
        { href: "/learn/crown/reserve-powers", label: "Reserve powers" },
        { href: "/provinces/quebec#x", label: "Quebec today" },
        { href: "/nowhere", label: "/nowhere" },
      ],
      sources: [{ href: "https://lop.parl.ca/x", label: "Library of Parliament" }],
      people: [{ href: "/prime-ministers#pm-1", label: "Pat", name: "Pat Example", qid: "Q1" }],
      related: [
        { kind: "case", href: "/learn/charter/landmark-cases#c", label: "R. v. C" },
        { kind: "event", href: "#other", label: "Title of other" },
      ],
    });
  });
  it("shows a range only when the end year is later", () => {
    expect(eventItem(event({ endYear: 1926, end: "1926-07" }), fake)).toMatchObject({ yearLabel: "1926", endYear: undefined });
    expect(eventItem(event({ endYear: 1930, end: "1930" }), fake)).toMatchObject({ yearLabel: "1926–1930", endYear: 1930 });
  });
});

describe("eventEras", () => {
  const eraList = [
    { id: "a", title: "Era A (to 1900)" },
    { id: "empty", title: "Nothing here" },
    { id: "b", title: "b" },
  ];
  it("groups by era in era order, drops empty eras, sorts by year keeping file order, keeps old anchors", () => {
    const list = [
      event({ slug: "late", era: "a", year: 1890, text: "Later thing." }),
      event({ slug: "early", era: "a", year: 1800, text: "Early thing." }),
      event({ slug: "same", era: "b", year: 1950, text: "Same words." }),
      event({ slug: "same-again", era: "b", year: 1950, text: "Same words." }),
    ];
    const out = eventEras(list, eraList, fake);
    expect(out.map((e) => [e.id, e.anchors, e.title])).toEqual([
      ["a", ["era-a-to-1900"], "Era A (to 1900)"],
      ["b", [], "b"],
    ]);
    expect(out.flatMap((e) => e.events.map((x) => [x.id, x.anchors]))).toEqual([
      ["early", ["event-1800-early-thing"]],
      ["late", ["event-1890-later-thing"]],
      ["same", ["event-1950-same-words"]],
      ["same-again", ["event-1950-same-words-2"]],
    ]);
  });
  it("fails on an unknown era", () => {
    expect(() => eventEras([event({ era: "zzz" })], eraList, fake)).toThrow(/unknown era/);
  });
  it("keeps every anchor the markdown timeline had, in the same order (content/entities/events.yaml)", () => {
    const events = allEntities().filter((e): e is Event => e.type === "event");
    const out = eventEras(events, eras(), real);
    const anchors = out.flatMap((era) => era.events.map((e) => e.anchors?.[0] ?? e.id));
    expect(anchors).toEqual(legacyAnchors);
    // And every event's own id is its slug, its home on /timeline.
    expect(new Set(out.flatMap((era) => era.events.map((e) => e.id)))).toEqual(new Set(events.map((e) => e.slug)));
  });
});

describe("cases", () => {
  const cases = allEntities().filter((e): e is Case => e.type === "case");
  const page = "/learn/charter/landmark-cases";

  it("casesOnPage keeps the cases whose home is on the page, in file order", () => {
    const fakeCases = [
      { ...(people["case:c"] as Case), href: `${page}#c` },
      { ...(people["case:c"] as Case), id: "case:d", href: "/learn/indigenous/section-35#d" },
    ];
    expect(casesOnPage(fakeCases, `${page}/`).map((c) => c.id)).toEqual(["case:c"]);
  });

  it("caseEras makes one era of cards with derived ids, linked titles, holdings and Charter groups", () => {
    const [era] = caseEras(casesOnPage(cases, page), real, page);
    expect(era!.events.map((e) => [e.id, e.yearLabel, e.tag, e.groups])).toEqual([
      ["event-1985-r-v-big-m-drug-mart", "1985", "s. 2(a) religion", ["freedoms"]],
      ["event-1986-r-v-oakes", "1986", "s. 1, s. 11(d)", ["limits", "legal"]],
      ["event-1988-r-v-morgentaler", "1988", "s. 7", ["legal"]],
      ["event-1988-ford-v-quebec", "1988", "s. 2(b), s. 33", ["freedoms", "override"]],
      ["event-1998-vriend-v-alberta", "1998", "s. 15", ["equality"]],
      ["event-1998-reference-re-secession-quebec", "1998", "(not a Charter case)", ["other"]],
      ["event-2015-carter-v-canada", "2015", "s. 7", ["legal"]],
      ["event-2016-r-v-jordan", "2016", "s. 11(b)", ["legal"]],
    ]);
    const oakes = era!.events[1]!;
    expect(oakes.title).toBe('<a href="#r-v-oakes"><em>R. v. Oakes</em></a>');
    expect(oakes.text).toBe("Created the test for justifying limits on rights");
    // Smart punctuation, as on the page.
    expect(era!.events[4]!.text).toBe("Sexual orientation was “read into” Alberta’s human rights law");
  });

  it("a case homed elsewhere links to its full home", () => {
    const [era] = caseEras([people["case:c"] as Case], fake, "/elsewhere");
    expect(era!.events[0]!.title).toBe('<a href="/learn/charter/landmark-cases#c"><em>R. v. C</em></a>');
  });
});

describe("eventsMentioning", () => {
  const list = [
    event({ slug: "b", year: 1990, pages: [{ page: "/learn/crown/reserve-powers#x" }], people: ["person:p"] }),
    event({ slug: "a", year: 1900, pages: [{ page: "/provinces/quebec" }], entities: ["case:c"] }),
    event({ slug: "c", year: 1990, pages: [{ page: "/learn/crown/reserve-powers" }] }),
  ];
  it("matches a page id against `pages`, ignoring anchors, sorted by year", () => {
    expect(eventsMentioning(list, "learn/crown/reserve-powers").map((e) => e.slug)).toEqual(["b", "c"]);
    expect(eventsMentioning(list, "provinces/quebec").map((e) => e.slug)).toEqual(["a"]);
    expect(eventsMentioning(list, "learn/crown")).toEqual([]);
  });
  it("matches an entity id against `people` and `entities`", () => {
    expect(eventsMentioning(list, "person:p").map((e) => e.slug)).toEqual(["b"]);
    expect(eventsMentioning(list, "case:c").map((e) => e.slug)).toEqual(["a"]);
  });
});

describe("inlineMarkdown", () => {
  it("renders inline markdown like a content page: smart quotes, emphasis, entity links", () => {
    expect(inlineMarkdown(`*Calder* says "persons" can't`)).toBe("<em>Calder</em> says “persons” can’t");
    expect(inlineMarkdown("the [](case:r-v-oakes) case")).toBe(
      'the <a href="/learn/charter/landmark-cases#r-v-oakes" data-entity="case:r-v-oakes">R. v. Oakes</a> case',
    );
  });
  it("refuses block content", () => {
    expect(() => inlineMarkdown("one\n\ntwo")).toThrow(/block content/);
  });
});
