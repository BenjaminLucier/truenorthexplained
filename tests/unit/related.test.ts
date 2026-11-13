/** rankRelated() and eventsMentioning() from src/lib/related.ts, with hand-built maps. */
import { describe, expect, it } from "vitest";
import { RELATED_WEIGHTS, eventsMentioning, rankRelated, type MentioningEvent } from "../../src/lib/related";

const m = (o: Record<string, string[]>) => new Map(Object.entries(o));

describe("rankRelated scoring", () => {
  it("uses the documented weights", () => {
    expect(RELATED_WEIGHTS).toEqual({ linksToAbout: 3, sharedAbout: 2, aboutToLinks: 1 });
  });

  it("gives 3 for each entity P links to that Q is about", () => {
    const r = rankRelated({ pageId: "p", about: m({ q: ["a", "b"] }), links: m({ p: ["a", "b", "c"] }) });
    expect(r).toEqual([{ id: "q", score: 6, via: ["a", "b"] }]);
  });

  it("gives 2 for each entity both are about", () => {
    const r = rankRelated({ pageId: "p", about: m({ p: ["a"], q: ["a"] }), links: m({}) });
    expect(r).toEqual([{ id: "q", score: 2, via: ["a"] }]);
  });

  it("gives 1 for each entity P is about that Q links to", () => {
    const r = rankRelated({ pageId: "p", about: m({ p: ["a"] }), links: m({ q: ["a"] }) });
    expect(r).toEqual([{ id: "q", score: 1, via: ["a"] }]);
  });

  it("adds the three up for one entity, and orders `via` by points then id", () => {
    // Entity a: P links to it, both are about it, Q links to it → 3 + 2 + 1. Entity b: Q links to it, P is about it → 1.
    const r = rankRelated({
      pageId: "p",
      about: m({ p: ["a", "b"], q: ["a"] }),
      links: m({ p: ["a"], q: ["a", "b"] }),
    });
    expect(r).toEqual([{ id: "q", score: 7, via: ["a", "b"] }]);
  });

  it("does not count Q being about something P is only about (that is 'shared') twice, nor links to links", () => {
    const r = rankRelated({ pageId: "p", about: m({}), links: m({ p: ["a"], q: ["a"] }) });
    expect(r).toEqual([]);
  });

  it("counts repeated ids in a list once", () => {
    const r = rankRelated({ pageId: "p", about: m({ q: ["a", "a"] }), links: m({ p: ["a", "a"] }) });
    expect(r).toEqual([{ id: "q", score: 3, via: ["a"] }]);
  });
});

describe("rankRelated selection", () => {
  const about = m({ p: ["x"], q1: ["x"], q2: ["x"], q3: ["x"], q4: ["x"], q5: ["x"], q6: ["y"] });
  it("leaves out the page itself, excluded pages and pages scoring 0", () => {
    const ids = rankRelated({ pageId: "p", about, links: m({}), exclude: ["q2", "q4"] }).map((r) => r.id);
    expect(ids).toEqual(["q1", "q3", "q5"]);
    expect(ids).not.toContain("p");
    expect(ids).not.toContain("q6");
  });
  it("returns at most `limit` results, 4 by default", () => {
    expect(rankRelated({ pageId: "p", about, links: m({}) })).toHaveLength(4);
    expect(rankRelated({ pageId: "p", about, links: m({}), limit: 2 })).toHaveLength(2);
  });
  it("breaks ties by number of connecting entities, then by id, whatever the input order", () => {
    // z and y: score 3 each; z via one entity (3), y via three (1 each). a: also 3 via one entity.
    const input = {
      pageId: "p",
      about: m({ p: ["e1", "e2", "e3"], z: ["k"], a: ["k"] }),
      links: m({ p: ["k"], y: ["e1", "e2", "e3"] }),
    };
    const expected = ["y", "a", "z"];
    expect(rankRelated(input).map((r) => r.id)).toEqual(expected);
    const reversed = { ...input, about: new Map([...input.about].reverse()), links: new Map([...input.links].reverse()) };
    expect(rankRelated(reversed).map((r) => r.id)).toEqual(expected);
  });
  it("puts a higher score first", () => {
    const r = rankRelated({ pageId: "p", about: m({ p: ["a"], low: ["a"], high: ["b"] }), links: m({ p: ["b"] }) });
    expect(r.map((x) => [x.id, x.score])).toEqual([
      ["high", 3],
      ["low", 2],
    ]);
  });
  it("returns nothing for a page with no about or links", () => {
    expect(rankRelated({ pageId: "lonely", about: m({ q: ["a"] }), links: m({ q: ["a"] }) })).toEqual([]);
  });
});

describe("eventsMentioning", () => {
  const ev = (id: string, year: number, o: Partial<MentioningEvent> = {}) => ({ id, year, pages: [], people: [], entities: [], ...o });
  const events = [
    ev("late", 1982, { entities: ["doc:charter"], pages: [{ page: "/learn/charter#intro" }] }),
    ev("early", 1867, { people: ["person:john-a-macdonald"], pages: [{ page: "/" }] }),
    ev("same-year-1", 1926, { people: ["person:julian-byng"], entities: ["term:reserve-powers"] }),
    ev("same-year-2", 1926, { entities: ["person:julian-byng"], pages: [{ page: "/learn/crown/reserve-powers/" }] }),
  ];
  it("matches an entity id in people or entities, sorted by year, input order within a year", () => {
    expect(eventsMentioning(events, "person:julian-byng").map((e) => e.id)).toEqual(["same-year-1", "same-year-2"]);
    expect(eventsMentioning([...events].reverse(), "person:julian-byng").map((e) => e.id)).toEqual(["same-year-2", "same-year-1"]);
    expect(eventsMentioning(events, "doc:charter").map((e) => e.id)).toEqual(["late"]);
  });
  it("matches a page id against pages, ignoring anchors and slashes", () => {
    expect(eventsMentioning(events, "learn/charter").map((e) => e.id)).toEqual(["late"]);
    expect(eventsMentioning(events, "learn/crown/reserve-powers").map((e) => e.id)).toEqual(["same-year-2"]);
    expect(eventsMentioning(events, "/learn/crown/reserve-powers/").map((e) => e.id)).toEqual(["same-year-2"]);
  });
  it("treats 'home' as the root page", () => {
    expect(eventsMentioning(events, "home").map((e) => e.id)).toEqual(["early"]);
  });
  it("does not match a page by prefix, nor an entity by page", () => {
    expect(eventsMentioning(events, "learn/crown")).toEqual([]);
    expect(eventsMentioning(events, "term:charter")).toEqual([]);
  });
  it("does not modify its input", () => {
    const copy = [...events];
    eventsMentioning(events, "person:julian-byng");
    expect(events).toEqual(copy);
  });
});
