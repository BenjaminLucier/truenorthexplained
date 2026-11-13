/**
 * The entity registry (src/lib/entities.ts), loaded from small fixture trees
 * written to a temporary folder (setProjectRoot points the loaders there), and
 * then once against the real content with invariants only: the content is
 * edited all the time, so no totals are pinned here.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  ENTITY_ID_RE,
  ENTITY_LINK_RE,
  allEntities,
  checkEntityPages,
  entityDigest,
  entityNotes,
  eras,
  getEntity,
  hasEntity,
  hrefFor,
  labelFor,
  resetEntities,
  type Case,
  type DocSection,
  type Event,
  type Person,
} from "../../src/lib/entities";
import { setProjectRoot } from "../../src/lib/project-root";

// ---------------------------------------------------------------------------
// Fixture trees
// ---------------------------------------------------------------------------

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
afterEach(() => {
  setProjectRoot();
  resetEntities();
});

const term = (start: string, end: string | null) => ({ start, end });
interface PremierTerm {
  name: string;
  qid: string;
  start: string;
  end: string | null;
  party: string;
  family: string;
}

/** Minimal Wikidata datasets: a PM who was also a premier, two premiers with one name, a GG, a monarch, a chief justice. */
const WIKIDATA = {
  "prime-ministers.json": {
    primeMinisters: [
      { ordinal: 1, name: "John A. Macdonald", qid: "Q1", terms: [term("1867-07-01", "1873-11-05"), term("1878-10-17", "1891-06-06")] },
      { ordinal: 6, name: "Charles Tupper", qid: "Q6", terms: [term("1896-05-01", "1896-07-08")] },
    ],
  },
  "governors-general.json": { governorsGeneral: [{ ordinal: 12, name: "Julian Byng", qid: "Q12", terms: [term("1921-08-11", "1926-10-02")] }] },
  "monarchs.json": { monarchs: [{ ordinal: 1, name: "Queen Victoria", qid: "Q100", terms: [term("1867-07-01", "1901-01-22")] }] },
  "chief-justices.json": { chiefJustices: [{ ordinal: 1, name: "William Buell Richards", qid: "Q200", terms: [term("1875-09-30", "1879-01-10")] }] },
  "premiers.json": {
    provinces: [
      {
        slug: "nova-scotia",
        terms: <PremierTerm[]>[{ name: "Charles Tupper", qid: "Q6", start: "1864-05-11", end: "1867-07-04", party: "Conservative", family: "cpc" }],
      },
      {
        slug: "quebec",
        terms: <PremierTerm[]>[
          { name: "Daniel Johnson", qid: "Q301", start: "1966-06-16", end: "1968-09-26", party: "Union Nationale", family: "other" },
          { name: "Daniel Johnson", qid: "Q302", start: "1994-01-11", end: "1994-09-26", party: "Liberal", family: "lpc" },
        ],
      },
    ],
  },
};

const BASE: Record<string, string> = {
  "package.json": "{}",
  "content/entities/people.yaml": "",
  "content/entities/institutions.yaml": `
- id: senate
  name: Senate of Canada
  short: the Senate
  page: /learn/parliament/senate
  people: [person:john-a-macdonald]
  entities: [doc:constitution-act-1867/s17]
`,
  "content/entities/documents.yaml": `
- id: constitution-act-1867
  name: Constitution Act, 1867
  year: 1867
  page: /learn/constitution/constitution-act-1867
  url: https://laws-lois.justice.gc.ca/eng/const/page-1.html
  sections:
    - n: 17
      title: Parliament
      page: /learn/parliament#three-parts
    - n: "91(24)"
      title: Indians, and lands reserved for the Indians
    - n: 92A
- id: charter
  name: Canadian Charter of Rights and Freedoms
  page: /learn/charter
  sections:
    - n: 1
    - n: 33
      name: the notwithstanding clause
      short: s. 33 (notwithstanding)
`,
  "content/entities/cases.yaml": `
- id: r-v-oakes
  name: R. v. Oakes
  year: 1986
  holding: Set out the test for limits under s. 1
  sections: [doc:charter/s1]
- id: reference-re-secession
  name: Reference re Secession of Quebec
  year: 1998
  holding: Secession would need negotiation
  page: /learn/federalism/secession
`,
  "content/entities/events.yaml": `
eras:
  - id: early
    title: Early years
  - id: modern
    title: Modern Canada
events:
  - id: confederation
    title: Confederation
    date: 1867-07-01
    text: The Dominion is born.
    era: early
    people: [person:john-a-macdonald]
    pages:
      - /learn/constitution
      - page: /timeline#confederation
        label: The card
  - id: king-byng-affair
    title: The King–Byng affair
    name: King–Byng affair
    date: 1926-06
    end: 1926-07
    text: The Governor General refused a dissolution.
    era: modern
    module: crown
    people: [person:julian-byng]
    entities: [term:reserve-powers]
`,
  "content/glossary/reserve-powers.en.md": `---
term: Reserve powers
aliases: [reserve power]
---

Decisions the Governor General can make alone. They are rarely used.
`,
  "content/glossary/prerogative.en.md": `---
term: Prerogative
alias_of: reserve-powers
---
`,
};
for (const [file, data] of Object.entries(WIKIDATA)) BASE[`src/data/wikidata/${file}`] = JSON.stringify({ _meta: {}, ...data });

/** Writes the base tree with `changes` applied (null removes a file) and points the registry at it. */
function useFixture(changes: Record<string, string | null> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "tne-entities-"));
  dirs.push(root);
  for (const [file, text] of Object.entries({ ...BASE, ...changes })) {
    if (text === null) continue;
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  setProjectRoot(root);
  resetEntities();
  return root;
}

/** The registry's single load error, as a string ("" if it loads). */
function loadError(changes: Record<string, string | null>): string {
  useFixture(changes);
  try {
    allEntities();
    return "";
  } catch (e) {
    return (e as Error).message;
  }
}

// ---------------------------------------------------------------------------
// Ids and patterns
// ---------------------------------------------------------------------------

describe("ENTITY_ID_RE", () => {
  it("accepts type:slug and doc sections", () => {
    for (const id of ["person:john-a-macdonald", "org:senate", "doc:charter/s33", "doc:constitution-act-1867/s91-24", "case:r-v-oakes", "event:king-byng-affair", "term:reserve-powers"]) {
      expect(id).toMatch(ENTITY_ID_RE);
    }
  });
  it("rejects unknown types, capitals, spaces and stray slashes", () => {
    for (const id of ["place:ottawa", "person:John", "person:john a", "term:", "doc:charter/33", "doc:charter/s33/s1", "person:-x", "org:senate/s1x/"]) {
      expect(id).not.toMatch(ENTITY_ID_RE);
    }
  });
});

describe("ENTITY_LINK_RE", () => {
  const dests = (md: string) => [...md.matchAll(ENTITY_LINK_RE)].map((m) => m[1]);
  it("finds entity destinations, with or without link text", () => {
    expect(dests("the [reserve powers](term:reserve-powers) and [](event:king-byng-affair), under [s. 33](doc:charter/s33)")).toEqual([
      "term:reserve-powers",
      "event:king-byng-affair",
      "doc:charter/s33",
    ]);
  });
  it("ignores ordinary links and unknown prefixes", () => {
    expect(dests("[a](/learn/crown) [b](https://example.com) [c](mailto:x@y.z) [d](place:ottawa)")).toEqual([]);
  });
  it("captures malformed ids so the validator can report them", () => {
    expect(dests("[x](person:John_A)")).toEqual(["person:John_A"]);
  });
});

// ---------------------------------------------------------------------------
// Loading fixture data
// ---------------------------------------------------------------------------

describe("people derived from the Wikidata datasets", () => {
  it("homes a person at their highest office, latest stint", () => {
    useFixture();
    const jam = getEntity("person:john-a-macdonald") as Person;
    expect(jam).toMatchObject({ type: "person", name: "John A. Macdonald", qid: "Q1", href: "/prime-ministers#pm-1" });
    expect(jam.roles).toHaveLength(2);
    expect(hrefFor("person:julian-byng")).toBe("/governors-general#gg-12");
    expect(hrefFor("person:queen-victoria")).toBe("/governors-general#monarch-1");
    expect(hrefFor("person:william-buell-richards")).toBe("/governors-general#cj-1");
  });

  it("merges the same person across datasets by qid", () => {
    useFixture();
    const tupper = getEntity("person:charles-tupper") as Person;
    expect(tupper.href).toBe("/prime-ministers#pm-6");
    expect(tupper.source).toBe("src/data/wikidata/prime-ministers.json");
    expect(tupper.roles.map((r) => r.office).sort()).toEqual(["pm", "premier"]);
    expect(tupper.roles.find((r) => r.office === "premier")?.province).toBe("nova-scotia");
    expect(allEntities().filter((e) => e.type === "person" && e.name === "Charles Tupper")).toHaveLength(1);
  });

  it("gives the later of two same-named people the year they took office, and notes it", () => {
    useFixture();
    expect(getEntity("person:daniel-johnson")).toMatchObject({ qid: "Q301", href: "/provinces/quebec" });
    expect(getEntity("person:daniel-johnson-1994")).toMatchObject({ qid: "Q302" });
    expect(entityNotes()).toEqual(["person:daniel-johnson is taken; Daniel Johnson (Q302) is person:daniel-johnson-1994"]);
  });

  it("lets the higher office keep the plain slug, whoever came first", () => {
    // A premier in 1850 and a (later) PM with the same name: the PM keeps the plain slug.
    const premiers = structuredClone(WIKIDATA["premiers.json"]);
    premiers.provinces[0]!.terms.push({ name: "John A. Macdonald", qid: "Q999", start: "1850-01-01", end: "1851-01-01", party: "x", family: "other" });
    useFixture({ "src/data/wikidata/premiers.json": JSON.stringify(premiers) });
    expect(getEntity("person:john-a-macdonald")).toMatchObject({ qid: "Q1" });
    expect(getEntity("person:john-a-macdonald-1850")).toMatchObject({ qid: "Q999", href: "/provinces/nova-scotia" });
  });

  it("falls back to the Wikidata id when the year is taken too", () => {
    const premiers = structuredClone(WIKIDATA["premiers.json"]);
    premiers.provinces[1]!.terms.push({ name: "Daniel Johnson", qid: "Q303", start: "1994-12-01", end: null, party: "x", family: "other" });
    useFixture({ "src/data/wikidata/premiers.json": JSON.stringify(premiers) });
    expect(hasEntity("person:daniel-johnson-1994")).toBe(true);
    expect(getEntity("person:daniel-johnson-q303")).toMatchObject({ qid: "Q303" });
  });

  it("applies people.yaml overrides by qid: rename, short, aliases, page", () => {
    useFixture({
      "content/entities/people.yaml": `
- qid: Q12
  id: lord-byng
  short: Lord Byng
  aliases: [Byng]
  page: /learn/crown/reserve-powers#byng
`,
      "content/entities/events.yaml": BASE["content/entities/events.yaml"]!.replace("person:julian-byng", "person:lord-byng"),
    });
    expect(hasEntity("person:julian-byng")).toBe(false);
    expect(getEntity("person:lord-byng")).toMatchObject({
      name: "Julian Byng",
      short: "Lord Byng",
      aliases: ["Byng"],
      href: "/learn/crown/reserve-powers#byng",
      source: "content/entities/people.yaml",
    });
  });

  it("adds people without a qid, who need a name and a page", () => {
    useFixture({ "content/entities/people.yaml": "- id: louis-riel\n  name: Louis Riel\n  page: /provinces/manitoba#riel\n" });
    expect(getEntity("person:louis-riel")).toMatchObject({ roles: [], href: "/provinces/manitoba#riel" });
    expect(loadError({ "content/entities/people.yaml": "- id: louis-riel\n" })).toMatch(/person:louis-riel: missing required field "page"[\s\S]*person:louis-riel: missing required field "name"/);
  });

  it("an extra person's slug pushes a derived namesake aside", () => {
    useFixture({ "content/entities/people.yaml": "- id: charles-tupper\n  name: Charles Tupper (the other one)\n  page: /about\n" });
    expect(getEntity("person:charles-tupper")).toMatchObject({ href: "/about" });
    expect(getEntity("person:charles-tupper-1864")).toMatchObject({ qid: "Q6" });
  });

  it("reports an override whose qid matches no one", () => {
    expect(loadError({ "content/entities/people.yaml": "- qid: Q404\n  id: nobody\n" })).toContain("qid Q404 matches no one");
  });

  it("reports a missing dataset", () => {
    expect(loadError({ "src/data/wikidata/monarchs.json": null })).toContain("src/data/wikidata/monarchs.json: dataset is missing");
  });
});

describe("institutions, documents and sections", () => {
  it("loads an org with its page as home", () => {
    useFixture();
    expect(getEntity("org:senate")).toMatchObject({ name: "Senate of Canada", short: "the Senate", href: "/learn/parliament/senate", people: ["person:john-a-macdonald"] });
  });

  it("nests sections under their document, with slugs from the number", () => {
    useFixture();
    const doc = getEntity("doc:constitution-act-1867");
    expect(doc).toMatchObject({ year: 1867, sections: ["doc:constitution-act-1867/s17", "doc:constitution-act-1867/s91-24", "doc:constitution-act-1867/s92a"] });
    const s9124 = getEntity("doc:constitution-act-1867/s91-24") as DocSection;
    expect(s9124).toMatchObject({
      parent: "doc:constitution-act-1867",
      n: "91(24)",
      name: "section 91(24)",
      short: "s. 91(24)",
      // No page or url of its own: the document's.
      href: "/learn/constitution/constitution-act-1867",
      url: "https://laws-lois.justice.gc.ca/eng/const/page-1.html",
    });
    expect(getEntity("doc:constitution-act-1867/s17").href).toBe("/learn/parliament#three-parts");
    expect(getEntity("doc:constitution-act-1867/s92a")).toMatchObject({ n: "92A", name: "section 92A" });
  });

  it("lets a section set its own name and short name", () => {
    useFixture();
    expect(getEntity("doc:charter/s33")).toMatchObject({ name: "the notwithstanding clause", short: "s. 33 (notwithstanding)", href: "/learn/charter" });
    expect(labelFor("doc:charter/s33")).toBe("the notwithstanding clause");
  });

  it("rejects bad section numbers and a non-list", () => {
    const docs = (sections: string) => ({ "content/entities/documents.yaml": `- id: d\n  name: D\n  page: /d\n  sections: ${sections}\n` });
    expect(loadError(docs('[{ n: "s33" }]'))).toContain('section "n" must be a section number');
    expect(loadError(docs("[{ n: 33, colour: red }]"))).toContain('doc:d/s33: unknown field "colour"');
    expect(loadError(docs("33"))).toContain('"sections" must be a list');
  });

  it("requires a page for orgs and docs", () => {
    expect(loadError({ "content/entities/institutions.yaml": "- id: crown\n  name: The Crown\n" })).toContain('org:crown: missing required field "page"');
    expect(loadError({ "content/entities/institutions.yaml": "- id: crown\n  name: The Crown\n  page: learn/crown\n" })).toContain('"page" must be a site path');
  });
});

describe("cases, events and eras", () => {
  it("homes a case on the landmark-cases page unless it sets a page", () => {
    useFixture();
    expect(getEntity("case:r-v-oakes")).toMatchObject({ year: 1986, href: "/learn/charter/landmark-cases#r-v-oakes", sections: ["doc:charter/s1"] });
    expect(hrefFor("case:reference-re-secession")).toBe("/learn/federalism/secession");
    expect((getEntity("case:r-v-oakes") as Case).holding).toBe("Set out the test for limits under s. 1");
  });

  it("requires a case's year and holding, and its sections to be documents", () => {
    expect(loadError({ "content/entities/cases.yaml": "- id: x\n  name: X\n" })).toMatch(/case:x: missing required field "year"[\s\S]*case:x: missing required field "holding"/);
    expect(loadError({ "content/entities/cases.yaml": "- id: x\n  name: X\n  year: 1990\n  holding: H\n  sections: [org:senate]\n" })).toContain('sections: "org:senate" is not a doc');
    expect(loadError({ "content/entities/cases.yaml": "- id: x\n  name: X\n  year: 19.5\n  holding: H\n" })).toContain('"year" must be a whole number');
  });

  it("loads events with their era, dates, pages and default name", () => {
    useFixture();
    const conf = getEntity("event:confederation") as Event;
    expect(conf).toMatchObject({ name: "Confederation", date: "1867-07-01", year: 1867, era: "early", href: "/timeline#confederation" });
    expect(conf.pages).toEqual([{ page: "/learn/constitution" }, { page: "/timeline#confederation", label: "The card" }]);
    const kb = getEntity("event:king-byng-affair") as Event;
    expect(kb).toMatchObject({ name: "King–Byng affair", title: "The King–Byng affair", date: "1926-06", end: "1926-07", endYear: 1926, module: "crown" });
    expect(eras()).toEqual([
      { id: "early", title: "Early years" },
      { id: "modern", title: "Modern Canada" },
    ]);
  });

  it("reports bad event fields", () => {
    const events = (event: string) => ({ "content/entities/events.yaml": `eras:\n  - id: e\n    title: E\nevents:\n  - id: x\n    title: X\n    text: T\n${event}` });
    expect(loadError(events("    date: 1926\n    era: nope\n"))).toContain('era: unknown era "nope" (known: e)');
    expect(loadError(events("    date: 1926-13\n    era: e\n"))).toContain('"date" must be a year');
    expect(loadError(events("    date: 1926\n    end: 1925\n    era: e\n"))).toContain('"end" is before "date"');
    expect(loadError(events("    date: 1926\n    era: e\n    pages: [learn/crown]\n"))).toContain('each of "pages" must be a site path');
    expect(loadError(events("    date: 1926\n    era: e\n    module: Crown Stuff\n"))).toContain('module: "Crown Stuff" must be a module key');
    expect(loadError(events("    era: e\n"))).toContain('event:x: missing required field "date"');
    expect(loadError({ "content/entities/events.yaml": "events: []\ntimeline: []\n" })).toContain('unknown top-level key "timeline"');
  });
});

describe("glossary terms", () => {
  it("makes each term file a term: entity homed on /glossary, summary = first sentence", () => {
    useFixture();
    expect(getEntity("term:reserve-powers")).toMatchObject({
      name: "Reserve powers",
      aliases: ["reserve power"],
      href: "/glossary#reserve-powers",
      summary: "Decisions the Governor General can make alone.",
      source: "content/glossary/reserve-powers.en.md",
    });
  });
  it("gives an alias its target's summary", () => {
    useFixture();
    expect(getEntity("term:prerogative")).toMatchObject({ href: "/glossary#prerogative", summary: "Decisions the Governor General can make alone." });
  });
  it("passes glossary problems through", () => {
    expect(loadError({ "content/glossary/prerogative.en.md": "---\nterm: Prerogative\nalias_of: nothing-here\n---\n" })).toContain('content/glossary/prerogative.en.md: alias_of: no term "nothing-here"');
  });
});

describe("validation across the registry", () => {
  it("reports unknown fields with the allowed list", () => {
    expect(loadError({ "content/entities/institutions.yaml": "- id: senate\n  name: Senate\n  page: /s\n  colour: red\n" })).toMatch(
      /content\/entities\/institutions\.yaml: org:senate: unknown field "colour" \(allowed: id, name, /,
    );
  });

  it("reports duplicate ids with both sources", () => {
    expect(loadError({ "content/entities/institutions.yaml": "- id: senate\n  name: A\n  page: /a\n- id: senate\n  name: B\n  page: /b\n" })).toContain(
      "org:senate: duplicate id (also defined in content/entities/institutions.yaml)",
    );
  });

  it("reports references to unknown or wrongly typed entities, with a suggestion", () => {
    const err = loadError({
      "content/entities/institutions.yaml": "- id: senate\n  name: S\n  page: /s\n  people: [org:senate, person:john-a-macdonld]\n  entities: [event:king-byng]\n",
    });
    expect(err).toContain('people: "org:senate" is not a person');
    expect(err).toContain('people: unknown entity "person:john-a-macdonld" (did you mean "person:john-a-macdonald"?)');
    expect(err).toContain('entities: unknown entity "event:king-byng" (did you mean "event:king-byng-affair"?)');
  });

  it("reports bad ids and non-list files", () => {
    expect(loadError({ "content/entities/institutions.yaml": "- id: The Senate\n  name: S\n  page: /s\n" })).toContain('"id" must be a lowercase slug');
    expect(loadError({ "content/entities/institutions.yaml": "senate: {}\n" })).toContain("content/entities/institutions.yaml: must be a list of entries");
    expect(loadError({ "content/entities/institutions.yaml": "- id: [\n" })).toContain("YAML error");
  });

  it("throws once, counting and listing every problem", () => {
    const err = loadError({
      "content/entities/institutions.yaml": "- id: a\n  name: A\n- id: b\n  name: B\n",
      "content/entities/cases.yaml": "- id: c\n  name: C\n  year: 1990\n",
    });
    expect(err).toMatch(/^Entity registry has 3 problem\(s\):\n {2}/);
    expect(err.split("\n")).toHaveLength(4);
  });

  it("treats missing YAML files as empty", () => {
    useFixture({
      "content/entities/people.yaml": null,
      "content/entities/institutions.yaml": null,
      "content/entities/cases.yaml": null,
      "content/entities/documents.yaml": null,
      "content/entities/events.yaml": null,
    });
    expect(allEntities().every((e) => e.type === "person" || e.type === "term")).toBe(true);
    expect(eras()).toEqual([]);
  });
});

describe("lookup", () => {
  it("getEntity throws for an unknown id, suggesting the nearest of the same type", () => {
    useFixture();
    expect(() => getEntity("case:r-v-okes")).toThrow('Unknown entity "case:r-v-okes" (did you mean "case:r-v-oakes"?)');
    expect(() => getEntity("term:reserve-power")).toThrow('(did you mean "term:reserve-powers"?)');
  });
  it("getEntity offers no suggestion when nothing is close", () => {
    useFixture();
    expect(() => getEntity("org:a-very-different-thing-entirely")).toThrow(/^Unknown entity "org:a-very-different-thing-entirely"$/);
  });
  it("getEntity explains a malformed id", () => {
    useFixture();
    expect(() => getEntity("Senate")).toThrow(/"Senate" is not an entity id: expected type:slug/);
    expect(() => getEntity("org:Senate")).toThrow(/is not an entity id/);
  });
  it("hasEntity, hrefFor and labelFor agree with getEntity", () => {
    useFixture();
    expect(hasEntity("org:senate")).toBe(true);
    expect(hasEntity("org:house")).toBe(false);
    expect(hrefFor("event:king-byng-affair")).toBe("/timeline#king-byng-affair");
    expect(labelFor("person:john-a-macdonald")).toBe("John A. Macdonald");
    expect(() => hrefFor("org:house")).toThrow(/Unknown entity/);
  });
  it("entityDigest changes when a name or home changes, and only then", () => {
    useFixture();
    const before = entityDigest();
    useFixture();
    expect(entityDigest()).toBe(before);
    useFixture({ "content/entities/institutions.yaml": BASE["content/entities/institutions.yaml"]!.replace("Senate of Canada", "The Senate") });
    expect(entityDigest()).not.toBe(before);
  });
});

describe("checkEntityPages", () => {
  it("reports pages, event pages and modules that don't exist; anchors are ignored", () => {
    useFixture();
    const valid = new Set(["learn/parliament/senate", "learn/constitution/constitution-act-1867", "learn/parliament", "learn/charter", "learn/federalism/secession", "learn/constitution", "timeline", "learn/crown"]);
    expect(checkEntityPages(valid)).toEqual([]);
    valid.delete("learn/crown");
    valid.delete("learn/constitution");
    valid.delete("learn/parliament");
    expect(checkEntityPages(valid).sort()).toEqual(
      [
        'content/entities/documents.yaml: doc:constitution-act-1867/s17: page: no page at "/learn/parliament#three-parts"',
        'content/entities/events.yaml: event:confederation: pages: no page at "/learn/constitution"',
        'content/entities/events.yaml: event:king-byng-affair: module: no module "learn/crown"',
      ].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// The real registry: invariants and well-known, stable ids
// ---------------------------------------------------------------------------

describe("the real registry", () => {
  it("loads, and every id is well formed with a site-path home", () => {
    const all = allEntities();
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(e.id).toMatch(ENTITY_ID_RE);
      expect(e.id).toBe(`${e.type}:${e.slug}`);
      expect(e.href, e.id).toMatch(/^\/\S*$/);
      expect(e.name.trim(), e.id).not.toBe("");
    }
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
  });

  it("has the well-known historical ids, with their homes", () => {
    expect(getEntity("person:john-a-macdonald")).toMatchObject({ href: "/prime-ministers#pm-1" });
    expect(getEntity("person:daniel-johnson")).toMatchObject({ href: "/provinces/quebec" });
    expect(hasEntity("person:daniel-johnson-1994")).toBe(true);
    expect(getEntity("event:king-byng-affair").type).toBe("event");
    expect(getEntity("case:r-v-oakes")).toMatchObject({ type: "case", year: 1986 });
    expect(getEntity("doc:charter/s33")).toMatchObject({ parent: "doc:charter", n: "33" });
    expect(hasEntity("doc:constitution-act-1867/s91-24")).toBe(true);
    expect(getEntity("term:reserve-powers").href).toBe("/glossary#reserve-powers");
  });

  it("lists every section under its document, and every section's parent exists", () => {
    for (const e of allEntities()) {
      if (e.type !== "doc") continue;
      if ("parent" in e && e.parent) expect(getEntity(e.parent).type).toBe("doc");
      else for (const s of (e as { sections: string[] }).sections) expect((getEntity(s) as DocSection).parent).toBe(e.id);
    }
  });

  it("puts every event in a declared era", () => {
    const ids = new Set(eras().map((e) => e.id));
    for (const e of allEntities()) if (e.type === "event") expect(ids.has(e.era), e.id).toBe(true);
  });
});
