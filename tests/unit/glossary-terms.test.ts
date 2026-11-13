import { describe, expect, it } from "vitest";
import {
  checkTerms,
  compareTerms,
  displayTerm,
  firstSentence,
  letterOf,
  parseSee,
  parseTermFile,
  readTermFiles,
  splitFrontMatter,
  type TermFile,
} from "../../src/lib/glossary-terms";

const file = (front: string, body = "") => `---\n${front}\n---\n${body ? `\n${body}\n` : ""}`;

describe("splitFrontMatter", () => {
  it("parses the YAML and trims the body", () => {
    expect(splitFrontMatter("---\nterm: Writ\n---\n\nThe order.\n")).toEqual({ data: { term: "Writ" }, body: "The order." });
  });
  it("treats text without front matter as all body", () => {
    expect(splitFrontMatter("Just text\n")).toEqual({ data: undefined, body: "Just text" });
  });
});

describe("parseSee", () => {
  it("keeps paths in order, with anchors, and { page, label } items", () => {
    const { see, problems } = parseSee(["/learn/crown", "/learn/crown#oaths", { page: "/glossary#consensus-government", label: "Consensus government" }]);
    expect(problems).toEqual([]);
    expect(see).toEqual([
      { page: "/learn/crown" },
      { page: "/learn/crown#oaths" },
      { page: "/glossary#consensus-government", label: "Consensus government" },
    ]);
  });
  it("allows it to be missing", () => {
    expect(parseSee(undefined)).toEqual({ see: [], problems: [] });
  });
  it("rejects anything else", () => {
    expect(parseSee("/learn/crown").problems).toHaveLength(1);
    expect(parseSee(["learn/crown", { page: "/x" }, { page: "/x", label: "X", extra: 1 }]).problems).toHaveLength(3);
  });
});

describe("parseTermFile", () => {
  it("reads a definition with its see list; the slug comes from the file name", () => {
    const { term, problems } = parseTermFile(
      file("term: Royal assent\nsee:\n  - /learn/parliament/how-a-bill-becomes-law", "The final step. A bill becomes law."),
      "content/glossary/royal-assent.en.md",
    );
    expect(problems).toEqual([]);
    expect(term).toEqual({
      slug: "royal-assent",
      term: "Royal assent",
      aliases: [],
      aliasOf: undefined,
      see: [{ page: "/learn/parliament/how-a-bill-becomes-law" }],
      body: "The final step. A bill becomes law.",
      source: "content/glossary/royal-assent.en.md",
    });
  });

  it("reads an alias, which has no body or see list", () => {
    const { term, problems } = parseTermFile(file("term: PMO\nalias_of: prime-ministers-office"), "content/glossary/pmo.en.md");
    expect(problems).toEqual([]);
    expect(term?.aliasOf).toBe("prime-ministers-office");
    expect(term?.body).toBe("");
  });

  it("reports unknown fields, a missing term or body, an alias with a body, and more than one paragraph", () => {
    const msgs = (front: string, body = "", name = "x") => parseTermFile(file(front, body), `content/glossary/${name}.en.md`).problems;
    expect(msgs("term: X\ncolour: red", "Def.")).toEqual([expect.stringContaining('unknown field "colour"')]);
    expect(msgs("see: [/learn]", "Def.")).toEqual([expect.stringContaining('"term"')]);
    expect(msgs("term: X")).toEqual([expect.stringContaining("empty")]);
    expect(msgs("term: X\nalias_of: y", "Def.")).toEqual([expect.stringContaining("leave the body empty")]);
    expect(msgs("term: X\nalias_of: x")).toEqual([expect.stringContaining("itself")]);
    expect(msgs("term: X", "One.\n\nTwo.")).toEqual([expect.stringContaining("one paragraph")]);
    expect(msgs("term: X", "Def.", "Not_A_Slug")).toEqual([expect.stringContaining("file name")]);
  });
});

describe("checkTerms", () => {
  const t = (slug: string, extra: Partial<TermFile> = {}): TermFile => ({
    slug,
    term: slug,
    aliases: [],
    see: [],
    body: "Def.",
    source: `content/glossary/${slug}.en.md`,
    ...extra,
  });

  it("accepts aliases of real terms and see pages that exist", () => {
    const terms = [t("a", { see: [{ page: "/learn/crown#oaths" }, { page: "/glossary#b", label: "B" }] }), t("b"), t("c", { aliasOf: "a", body: "" })];
    expect(checkTerms(terms, new Set(["learn/crown", "glossary"]))).toEqual([]);
  });

  it("reports a missing alias target, an alias of an alias, duplicate slugs and missing pages or terms", () => {
    const terms = [
      t("a", { see: [{ page: "/nowhere" }, { page: "/glossary#zzz", label: "Z" }] }),
      t("a"),
      t("b", { aliasOf: "missing", body: "" }),
      t("c", { aliasOf: "d", body: "" }),
      t("d", { aliasOf: "a", body: "" }),
    ];
    const problems = checkTerms(terms, new Set(["glossary"]));
    expect(problems).toEqual([
      expect.stringContaining('duplicate slug "a"'),
      expect.stringContaining('no page at "/nowhere"'),
      expect.stringContaining('no glossary term "#zzz"'),
      expect.stringContaining('no term "missing"'),
      expect.stringContaining('"d" is itself an alias'),
    ]);
  });

  it("skips the page check without a list of pages", () => {
    expect(checkTerms([t("a", { see: [{ page: "/nowhere" }] })])).toEqual([]);
  });
});

describe("firstSentence", () => {
  it("stops at the first sentence end", () => {
    expect(firstSentence("A bill that passed. Also called a statute.")).toBe("A bill that passed.");
  });
  it("doesn't stop at abbreviations, initials or section numbers", () => {
    expect(firstSentence("*Vriend v. Alberta* (1998), where the court read it in. More.")).toBe("*Vriend v. Alberta* (1998), where the court read it in.");
    expect(firstSentence("A power (s. 92(14) of the Act) to run courts. It's why.")).toBe("A power (s. 92(14) of the Act) to run courts.");
    expect(firstSentence("Named for J. Smith, e.g. Jones. Next.")).toBe("Named for J. Smith, e.g. Jones.");
  });
  it("keeps closing quotes and emphasis with the sentence", () => {
    expect(firstSentence('Nicknamed "the late show." Next one.')).toBe('Nicknamed "the late show."');
  });
  it("returns the whole text when there's one sentence", () => {
    expect(firstSentence("Only one sentence here.")).toBe("Only one sentence here.");
  });
});

describe("letterOf, compareTerms and displayTerm", () => {
  it("files a term under its first letter or digit, accents dropped", () => {
    expect(letterOf("Métis")).toBe("M");
    expect(letterOf("Écoles")).toBe("E");
    expect(letterOf("*R v. Oakes*")).toBe("R");
    expect(letterOf("1982 Act")).toBe("1");
  });
  it("sorts alphabetically, ignoring case, with numbers by value", () => {
    expect(["Bill 101", "bill", "Bill 21", "Bill 96", "Band"].sort(compareTerms)).toEqual(["Band", "bill", "Bill 21", "Bill 96", "Bill 101"]);
  });
  it("makes quotes typographic, as markdown does", () => {
    expect(displayTerm("Prime Minister's Office")).toBe("Prime Minister’s Office");
    expect(displayTerm('The "notwithstanding" clause')).toBe("The “notwithstanding” clause");
    expect(displayTerm("King–Byng affair")).toBe("King–Byng affair");
  });
});

describe("the glossary files", () => {
  const { terms, problems } = readTermFiles();
  it("all parse, with consistent aliases", () => {
    expect(problems).toEqual([]);
    expect(checkTerms(terms)).toEqual([]);
    expect(terms.length).toBeGreaterThan(400);
  });
});
