/**
 * The entity registry: one identity for each thing the site talks about.
 * See ARCHITECTURE.md, "The semantic layer".
 *
 *   person:<slug>        derived from src/data/wikidata/*.json, plus content/entities/people.yaml
 *   org:<slug>           content/entities/institutions.yaml
 *   doc:<slug>           content/entities/documents.yaml
 *   doc:<slug>/s<NN>     a section, nested under its document in documents.yaml
 *   case:<slug>          content/entities/cases.yaml
 *   event:<slug>         content/entities/events.yaml
 *   term:<slug>          content/glossary/<slug>.en.md (see glossaryTermSources below)
 *
 * Plain Node on purpose (node:fs and yaml only, no `astro:` imports): the
 * markdown plugins load it from the Astro config, scripts/validate.ts loads it
 * under tsx, and tests load it under vitest. Everything is read once and
 * memoised; call resetEntities() to re-read (tests, long-running processes).
 *
 * Problems in the YAML (unknown fields, wrong types, duplicate ids, references
 * to unknown entities) throw one error listing every problem with its file and
 * id. Checks that need the list of site pages (`page` targets, event modules)
 * live in checkEntityPages(), which scripts/validate.ts calls.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { checkTerms, firstSentence, readTermFiles } from "./glossary-terms";
import { slugify } from "./ids";
import { fromRoot } from "./project-root";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const ENTITY_TYPES = ["person", "org", "doc", "case", "event", "term"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
/** A full entity id: `type:slug`, or `doc:slug/sNN` for a document section. */
export const ENTITY_ID_RE = new RegExp(`^(${ENTITY_TYPES.join("|")}):(${SLUG})(?:/(s${SLUG}))?$`);
/**
 * A markdown link whose destination starts with an entity type prefix:
 * `[text](type:slug)` or `[](type:slug)`. Group 1 is the destination.
 * Used by scripts/validate.ts to scan the markdown source.
 */
export const ENTITY_LINK_RE = new RegExp(`\\]\\(((?:${ENTITY_TYPES.join("|")}):[^)\\s]*)\\)`, "g");

export const isEntityType = (t: string): t is EntityType => (ENTITY_TYPES as readonly string[]).includes(t);

interface EntityBase {
  /** `type:slug` (or `doc:slug/sNN`). */
  id: string;
  type: EntityType;
  /** The part after `type:`. */
  slug: string;
  name: string;
  /** A shorter name for tight spaces ("Byng" for "Julian Byng, 1st Viscount Byng of Vimy"). */
  short?: string;
  aliases: string[];
  /** One line, plain text or inline markdown. */
  summary?: string;
  /** Explicit home: a site path, optionally with `#anchor`. */
  page?: string;
  /** An external reference (the official text of a document, say). */
  url?: string;
  /** The canonical home: `page` when given, otherwise the type's default. */
  href: string;
  /** Where it was defined, relative to the project root. */
  source: string;
}

export type Office = "pm" | "gg" | "monarch" | "chief-justice" | "premier";

/** One stint in an office, from the Wikidata datasets. */
export interface Role {
  office: Office;
  /** For federal offices: the holder's number (24 for the 24th Prime Minister). */
  ordinal?: number;
  /** For premiers: the province or territory slug. */
  province?: string;
  start: string;
  end: string | null;
}

export interface Person extends EntityBase {
  type: "person";
  qid?: string;
  /** Offices held, newest last within each office; empty for people.yaml-only people. */
  roles: Role[];
}

export interface Org extends EntityBase {
  type: "org";
  people: string[];
  entities: string[];
}

export interface Doc extends EntityBase {
  type: "doc";
  parent?: undefined;
  year?: number;
  /** Ids of its sections, in file order. */
  sections: string[];
  entities: string[];
}

export interface DocSection extends EntityBase {
  type: "doc";
  /** The document id (`doc:charter`). */
  parent: string;
  /** The section number as written: "33", "92A", "91(24)". */
  n: string;
  /** What the section is about ("Notwithstanding clause"). */
  title?: string;
}

export interface Case extends EntityBase {
  type: "case";
  year: number;
  citation?: string;
  /** Document or section ids the case turns on (`doc:charter/s1`). */
  sections: string[];
  /** One line (inline markdown): what the court decided. */
  holding: string;
  /** Free text shown as the case's label, as on the landmark-cases table ("s. 2(b), s. 33"). */
  tag?: string;
  /** Short subject, as in the landmark-cases headings ("freedom of religion"). */
  topic?: string;
  people: string[];
  entities: string[];
}

/** A page an event links to; `label` defaults to the page's title. */
export interface EventPage {
  page: string;
  label?: string;
}

export interface Event extends EntityBase {
  type: "event";
  /** As written: "1926", "1926-06" or "1926-06-28". */
  date: string;
  year: number;
  end?: string;
  endYear?: number;
  title: string;
  /** Inline markdown: what happened. */
  text: string;
  /** An era id from the `eras` list in events.yaml. */
  era: string;
  /** A module key ("crown"); defaults to the module of the first `/learn/…` page. */
  module?: string;
  pages: EventPage[];
  people: string[];
  entities: string[];
}

export interface Term extends EntityBase {
  type: "term";
}

export type Entity = Person | Org | Doc | DocSection | Case | Event | Term;

export interface Era {
  id: string;
  title: string;
}

/** Where each type's YAML lives. */
export const ENTITY_FILES = {
  person: "content/entities/people.yaml",
  org: "content/entities/institutions.yaml",
  doc: "content/entities/documents.yaml",
  case: "content/entities/cases.yaml",
  event: "content/entities/events.yaml",
} as const;

/** The datasets people are derived from, highest priority first (it picks the name and home). */
const PEOPLE_SOURCES: { office: Office; file: string; key: string; home: (r: Role) => string }[] = [
  { office: "pm", file: "src/data/wikidata/prime-ministers.json", key: "primeMinisters", home: (r) => `/prime-ministers#pm-${r.ordinal}` },
  { office: "gg", file: "src/data/wikidata/governors-general.json", key: "governorsGeneral", home: (r) => `/governors-general#gg-${r.ordinal}` },
  // Monarchs and chief justices are listed, one row each, on /governors-general.
  { office: "monarch", file: "src/data/wikidata/monarchs.json", key: "monarchs", home: (r) => `/governors-general#monarch-${r.ordinal}` },
  { office: "chief-justice", file: "src/data/wikidata/chief-justices.json", key: "chiefJustices", home: (r) => `/governors-general#cj-${r.ordinal}` },
  { office: "premier", file: "src/data/wikidata/premiers.json", key: "provinces", home: (r) => `/provinces/${r.province}` },
];

// ---------------------------------------------------------------------------
// Small validation helpers
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

class Problems {
  list: string[] = [];
  add(file: string, id: string | undefined, message: string) {
    this.list.push(`${file}: ${id ? `${id}: ` : ""}${message}`);
  }
}

const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads typed fields from one YAML record, reporting problems against its file and id. */
class Fields {
  constructor(
    private raw: Raw,
    private file: string,
    private id: string | undefined,
    private problems: Problems,
    allowed: string[],
  ) {
    for (const key of Object.keys(raw)) {
      if (!allowed.includes(key)) problems.add(file, id, `unknown field "${key}" (allowed: ${allowed.join(", ")})`);
    }
  }
  private bad(key: string, want: string) {
    this.problems.add(this.file, this.id, `"${key}" must be ${want}`);
  }
  str(key: string, required = false): string | undefined {
    const v = this.raw[key];
    if (v === undefined || v === null) {
      if (required) this.problems.add(this.file, this.id, `missing required field "${key}"`);
      return undefined;
    }
    if (typeof v === "number") return String(v);
    if (typeof v !== "string" || v.trim() === "") return this.bad(key, "a non-empty string"), undefined;
    return v.trim();
  }
  num(key: string, required = false): number | undefined {
    const v = this.raw[key];
    if (v === undefined || v === null) {
      if (required) this.problems.add(this.file, this.id, `missing required field "${key}"`);
      return undefined;
    }
    if (typeof v !== "number" || !Number.isInteger(v)) return this.bad(key, "a whole number"), undefined;
    return v;
  }
  strs(key: string): string[] {
    const v = this.raw[key];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || x.trim() === "")) {
      this.bad(key, "a list of strings");
      return [];
    }
    return v.map((x: string) => x.trim());
  }
  page(key: string, required = false): string | undefined {
    const v = this.str(key, required);
    if (v !== undefined && !/^\/[^\s]*$/.test(v)) return this.bad(key, 'a site path starting with "/" (e.g. "/learn/crown#oaths")'), undefined;
    return v;
  }
  url(key: string): string | undefined {
    const v = this.str(key);
    if (v !== undefined && !/^https?:\/\/\S+$/.test(v)) return this.bad(key, "an http(s) URL"), undefined;
    return v;
  }
  /** A year (1926) or an ISO date ("1926", "1926-06", "1926-06-28"). */
  date(key: string, required = false): { date: string; year: number } | undefined {
    const v = this.raw[key];
    if (v === undefined || v === null) {
      if (required) this.problems.add(this.file, this.id, `missing required field "${key}"`);
      return undefined;
    }
    // YAML parses an unquoted 1926-06-28 as a string with the default schema, but be safe with Dates.
    const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    const m = s.match(/^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/);
    if (!m) return this.bad(key, 'a year (1926) or an ISO date ("1926-06" or "1926-06-28")'), undefined;
    return { date: s, year: Number(m[1]) };
  }
}

const COMMON = ["id", "name", "short", "aliases", "summary", "page", "url"];

function readYaml(rel: string, problems: Problems): unknown {
  const path = fromRoot(rel);
  if (!existsSync(path)) return undefined;
  try {
    return parse(readFileSync(path, "utf8"));
  } catch (e) {
    problems.add(rel, undefined, `YAML error: ${(e as Error).message}`);
    return undefined;
  }
}

function readList(rel: string, problems: Problems, value: unknown = readYaml(rel, problems)): Raw[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    problems.add(rel, undefined, "must be a list of entries");
    return [];
  }
  return value.filter((entry, i) => {
    if (isObj(entry)) return true;
    problems.add(rel, undefined, `entry ${i + 1} is not a mapping`);
    return false;
  });
}

/** Checks the `id` field of a YAML entry: a bare slug (the file gives the type). */
function slugOf(raw: Raw, rel: string, problems: Problems, index: number): string | undefined {
  const id = raw.id;
  if (typeof id !== "string" || !new RegExp(`^${SLUG}$`).test(id)) {
    problems.add(rel, `entry ${index + 1}`, `"id" must be a lowercase slug like "house-of-commons" (got ${JSON.stringify(id)})`);
    return undefined;
  }
  return id;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

interface Registry {
  byId: Map<string, Entity>;
  eras: Era[];
  /** Notes worth printing (slug collisions resolved deterministically). */
  notes: string[];
}

let registry: Registry | undefined;

/** Drops the memoised registry, so the next call re-reads every file. */
export function resetEntities(): void {
  registry = undefined;
}

/**
 * The glossary terms that become `term:` entities: one per file in
 * content/glossary/<slug>.en.md (src/lib/glossary-terms.ts reads and checks
 * them). The summary is the definition's first sentence; an alias
 * ("alias_of") takes its target's.
 */
export function glossaryTermSources(): {
  terms: { slug: string; name: string; aliases: string[]; summary?: string; source: string }[];
  problems: string[];
} {
  const { terms, problems } = readTermFiles();
  problems.push(...checkTerms(terms));
  const bySlug = new Map(terms.map((t) => [t.slug, t]));
  return {
    terms: terms.map((t) => {
      const body = t.aliasOf ? (bySlug.get(t.aliasOf)?.body ?? "") : t.body;
      return { slug: t.slug, name: t.term, aliases: t.aliases, summary: body ? firstSentence(body) : undefined, source: t.source };
    }),
    problems,
  };
}

interface DerivedPerson {
  qid: string;
  name: string;
  roles: Role[];
  /** Index into PEOPLE_SOURCES of the highest-priority office held. */
  rank: number;
}

function derivePeople(problems: Problems): DerivedPerson[] {
  const byQid = new Map<string, DerivedPerson>();
  PEOPLE_SOURCES.forEach(({ office, file, key }, rank) => {
    const path = fromRoot(file);
    if (!existsSync(path)) {
      problems.add(file, undefined, "dataset is missing");
      return;
    }
    const data = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const add = (qid: string, name: string, role: Role) => {
      const person = byQid.get(qid);
      if (person) person.roles.push(role);
      else byQid.set(qid, { qid, name, roles: [role], rank });
    };
    if (office === "premier") {
      for (const prov of data[key] as { slug: string; terms: { name: string; qid: string; start: string; end: string | null }[] }[]) {
        for (const t of prov.terms) add(t.qid, t.name, { office, province: prov.slug, start: t.start, end: t.end });
      }
    } else {
      for (const h of data[key] as { ordinal: number; name: string; qid: string; terms: { start: string; end: string | null }[] }[]) {
        for (const t of h.terms) add(h.qid, h.name, { office, ordinal: h.ordinal, start: t.start, end: t.end });
      }
    }
  });
  return [...byQid.values()];
}

/** The home of a derived person: their highest-priority office, latest stint. */
function personHome(p: { roles: Role[] }): string {
  for (const source of PEOPLE_SOURCES) {
    const roles = p.roles.filter((r) => r.office === source.office);
    if (roles.length) return source.home(roles.at(-1)!);
  }
  throw new Error("person without roles");
}

function load(): Registry {
  const problems = new Problems();
  const byId = new Map<string, Entity>();
  const notes: string[] = [];
  const put = (e: Entity) => {
    const existing = byId.get(e.id);
    if (existing) problems.add(e.source, e.id, `duplicate id (also defined in ${existing.source})`);
    else byId.set(e.id, e);
  };

  // --- People -------------------------------------------------------------
  const peopleFile = ENTITY_FILES.person;
  const overrides = new Map<string, { raw: Raw; slug: string; index: number }>();
  const extraPeople: { raw: Raw; slug: string }[] = [];
  readList(peopleFile, problems).forEach((raw, i) => {
    const slug = slugOf(raw, peopleFile, problems, i);
    if (!slug) return;
    if (typeof raw.qid === "string") overrides.set(raw.qid, { raw, slug, index: i });
    else extraPeople.push({ raw, slug });
  });

  const derived = derivePeople(problems).sort(
    (a, b) => a.rank - b.rank || (a.roles[0]?.start ?? "").localeCompare(b.roles[0]?.start ?? "") || a.qid.localeCompare(b.qid),
  );
  const taken = new Set<string>([...overrides.values()].map((o) => o.slug).concat(extraPeople.map((p) => p.slug)));
  for (const p of derived) {
    const override = overrides.get(p.qid);
    let slug = override?.slug;
    if (!slug) {
      const base = slugify(p.name, 80);
      slug = base;
      if (taken.has(slug)) {
        // Same name, different person: the higher-priority (then earlier) one keeps the
        // plain slug; this one gets the year they first took office, or failing that
        // their Wikidata id. people.yaml can rename either (qid + id).
        const firstYear = p.roles.map((r) => r.start).sort()[0]?.slice(0, 4);
        slug = firstYear && !taken.has(`${base}-${firstYear}`) ? `${base}-${firstYear}` : `${base}-${p.qid.toLowerCase()}`;
        notes.push(`person:${base} is taken; ${p.name} (${p.qid}) is person:${slug}`);
      }
    }
    taken.add(slug);
    const person: Person = {
      id: `person:${slug}`,
      type: "person",
      slug,
      name: p.name,
      aliases: [],
      qid: p.qid,
      roles: p.roles,
      href: personHome(p),
      source: PEOPLE_SOURCES[p.rank]!.file,
    };
    if (override) {
      const f = new Fields(override.raw, peopleFile, `person:${slug}`, problems, [...COMMON, "qid"]);
      person.name = f.str("name") ?? person.name;
      person.short = f.str("short");
      person.aliases = f.strs("aliases");
      person.summary = f.str("summary");
      person.page = f.page("page");
      person.url = f.url("url");
      person.href = person.page ?? person.href;
      person.source = peopleFile;
      overrides.delete(p.qid);
    }
    put(person);
  }
  for (const [qid, { slug }] of overrides) {
    problems.add(peopleFile, `person:${slug}`, `qid ${qid} matches no one in the Wikidata datasets; drop "qid" to add a new person`);
  }
  for (const { raw, slug } of extraPeople) {
    const id = `person:${slug}`;
    const f = new Fields(raw, peopleFile, id, problems, COMMON);
    const page = f.page("page", true);
    put({
      id,
      type: "person",
      slug,
      name: f.str("name", true) ?? slug,
      short: f.str("short"),
      aliases: f.strs("aliases"),
      summary: f.str("summary"),
      page,
      url: f.url("url"),
      roles: [],
      href: page ?? "/",
      source: peopleFile,
    });
  }

  // --- Institutions -------------------------------------------------------
  const orgFile = ENTITY_FILES.org;
  readList(orgFile, problems).forEach((raw, i) => {
    const slug = slugOf(raw, orgFile, problems, i);
    if (!slug) return;
    const id = `org:${slug}`;
    const f = new Fields(raw, orgFile, id, problems, [...COMMON, "people", "entities"]);
    const page = f.page("page", true);
    put({
      id,
      type: "org",
      slug,
      name: f.str("name", true) ?? slug,
      short: f.str("short"),
      aliases: f.strs("aliases"),
      summary: f.str("summary"),
      page,
      url: f.url("url"),
      people: f.strs("people"),
      entities: f.strs("entities"),
      href: page ?? "/",
      source: orgFile,
    });
  });

  // --- Documents and their sections ---------------------------------------
  const docFile = ENTITY_FILES.doc;
  readList(docFile, problems).forEach((raw, i) => {
    const slug = slugOf(raw, docFile, problems, i);
    if (!slug) return;
    const id = `doc:${slug}`;
    const f = new Fields(raw, docFile, id, problems, [...COMMON, "year", "sections", "entities"]);
    const page = f.page("page", true);
    const name = f.str("name", true) ?? slug;
    const doc: Doc = {
      id,
      type: "doc",
      slug,
      name,
      short: f.str("short"),
      aliases: f.strs("aliases"),
      summary: f.str("summary"),
      page,
      url: f.url("url"),
      year: f.num("year"),
      sections: [],
      entities: f.strs("entities"),
      href: page ?? "/",
      source: docFile,
    };
    put(doc);
    const sections = raw.sections;
    if (sections !== undefined && !Array.isArray(sections)) problems.add(docFile, id, '"sections" must be a list');
    readList(docFile, problems, Array.isArray(sections) ? sections : []).forEach((s) => {
      const n = typeof s.n === "number" ? String(s.n) : s.n;
      if (typeof n !== "string" || !/^[0-9]+[A-Z]?(\.[0-9]+)?(\([0-9a-z]+\))*$/.test(n)) {
        problems.add(docFile, id, `section "n" must be a section number like 33, "92A" or "91(24)" (got ${JSON.stringify(s.n)})`);
        return;
      }
      const sSlug = `s${slugify(n.replace(/[()]/g, " "))}`;
      const sid = `${id}/${sSlug}`;
      const sf = new Fields(s, docFile, sid, problems, ["n", "name", "short", "aliases", "title", "summary", "page", "url"]);
      const sPage = sf.page("page");
      doc.sections.push(sid);
      put({
        id: sid,
        type: "doc",
        slug: `${slug}/${sSlug}`,
        parent: id,
        n,
        name: sf.str("name") ?? `section ${n}`,
        short: sf.str("short") ?? `s. ${n}`,
        aliases: sf.strs("aliases"),
        title: sf.str("title"),
        summary: sf.str("summary"),
        page: sPage,
        url: sf.url("url") ?? doc.url,
        href: sPage ?? doc.href,
        source: docFile,
      });
    });
  });

  // --- Cases --------------------------------------------------------------
  const caseFile = ENTITY_FILES.case;
  readList(caseFile, problems).forEach((raw, i) => {
    const slug = slugOf(raw, caseFile, problems, i);
    if (!slug) return;
    const id = `case:${slug}`;
    const f = new Fields(raw, caseFile, id, problems, [...COMMON, "year", "citation", "sections", "holding", "tag", "topic", "people", "entities"]);
    const page = f.page("page");
    put({
      id,
      type: "case",
      slug,
      name: f.str("name", true) ?? slug,
      short: f.str("short"),
      aliases: f.strs("aliases"),
      summary: f.str("summary"),
      page,
      url: f.url("url"),
      year: f.num("year", true) ?? 0,
      citation: f.str("citation"),
      sections: f.strs("sections"),
      holding: f.str("holding", true) ?? "",
      tag: f.str("tag"),
      topic: f.str("topic"),
      people: f.strs("people"),
      entities: f.strs("entities"),
      href: page ?? `/learn/charter/landmark-cases#${slug}`,
      source: caseFile,
    });
  });

  // --- Events -------------------------------------------------------------
  const eventFile = ENTITY_FILES.event;
  const eventsYaml = readYaml(eventFile, problems);
  const eras: Era[] = [];
  let eventList: Raw[] = [];
  if (eventsYaml !== undefined && eventsYaml !== null) {
    if (!isObj(eventsYaml)) problems.add(eventFile, undefined, 'must be a mapping with "eras" and "events" lists');
    else {
      for (const key of Object.keys(eventsYaml)) {
        if (key !== "eras" && key !== "events") problems.add(eventFile, undefined, `unknown top-level key "${key}" (allowed: eras, events)`);
      }
      readList(eventFile, problems, eventsYaml.eras ?? []).forEach((raw, i) => {
        const slug = slugOf(raw, eventFile, problems, i);
        if (!slug) return;
        const f = new Fields(raw, eventFile, `era ${slug}`, problems, ["id", "title"]);
        if (eras.some((e) => e.id === slug)) problems.add(eventFile, `era ${slug}`, "duplicate era id");
        eras.push({ id: slug, title: f.str("title", true) ?? slug });
      });
      eventList = readList(eventFile, problems, eventsYaml.events ?? []);
    }
  }
  eventList.forEach((raw, i) => {
    const slug = slugOf(raw, eventFile, problems, i);
    if (!slug) return;
    const id = `event:${slug}`;
    const f = new Fields(raw, eventFile, id, problems, [...COMMON, "title", "date", "end", "text", "era", "module", "pages", "people", "entities"]);
    const when = f.date("date", true);
    const end = f.date("end");
    if (when && end && end.date < when.date) problems.add(eventFile, id, '"end" is before "date"');
    const pages: EventPage[] = [];
    const rawPages = raw.pages;
    if (rawPages !== undefined && !Array.isArray(rawPages)) problems.add(eventFile, id, '"pages" must be a list');
    for (const p of Array.isArray(rawPages) ? rawPages : []) {
      if (typeof p === "string" && /^\/\S*$/.test(p)) pages.push({ page: p });
      else if (isObj(p) && typeof p.page === "string" && /^\/\S*$/.test(p.page) && Object.keys(p).every((k) => k === "page" || k === "label") && (p.label === undefined || typeof p.label === "string")) {
        pages.push({ page: p.page, label: p.label as string | undefined });
      } else problems.add(eventFile, id, `each of "pages" must be a site path or { page, label } (got ${JSON.stringify(p)})`);
    }
    const page = f.page("page");
    const title = f.str("title", true) ?? slug;
    put({
      id,
      type: "event",
      slug,
      name: f.str("name") ?? title,
      short: f.str("short"),
      aliases: f.strs("aliases"),
      summary: f.str("summary"),
      page,
      url: f.url("url"),
      date: when?.date ?? "0000",
      year: when?.year ?? 0,
      end: end?.date,
      endYear: end?.year,
      title,
      text: f.str("text", true) ?? "",
      era: f.str("era", true) ?? "",
      module: f.str("module"),
      pages,
      people: f.strs("people"),
      entities: f.strs("entities"),
      href: page ?? `/timeline#${slug}`,
      source: eventFile,
    });
  });

  // --- Glossary terms -----------------------------------------------------
  const glossary = glossaryTermSources();
  for (const message of glossary.problems) problems.add(message.split(": ")[0]!, undefined, message.slice(message.indexOf(": ") + 2));
  for (const t of glossary.terms) {
    put({ id: `term:${t.slug}`, type: "term", slug: t.slug, name: t.name, aliases: t.aliases, summary: t.summary, href: `/glossary#${t.slug}`, source: t.source });
  }

  // --- Cross-references ---------------------------------------------------
  const ref = (e: Entity, field: string, ids: string[], want?: EntityType) => {
    for (const target of ids) {
      const hit = byId.get(target);
      if (!hit) problems.add(e.source, e.id, `${field}: unknown entity "${target}"${suggest(target, byId)}`);
      else if (want && hit.type !== want) problems.add(e.source, e.id, `${field}: "${target}" is not a ${want}`);
    }
  };
  const eraIds = new Set(eras.map((e) => e.id));
  for (const e of byId.values()) {
    if (e.type === "org") {
      ref(e, "people", e.people, "person");
      ref(e, "entities", e.entities);
    } else if (e.type === "doc" && "sections" in e) {
      ref(e, "entities", e.entities);
    } else if (e.type === "case") {
      ref(e, "sections", e.sections, "doc");
      ref(e, "people", e.people, "person");
      ref(e, "entities", e.entities);
    } else if (e.type === "event") {
      ref(e, "people", e.people, "person");
      ref(e, "entities", e.entities);
      if (e.era && !eraIds.has(e.era)) problems.add(e.source, e.id, `era: unknown era "${e.era}" (known: ${[...eraIds].join(", ") || "none"})`);
      if (e.module && !/^[a-z0-9-]+$/.test(e.module)) problems.add(e.source, e.id, `module: "${e.module}" must be a module key like "crown"`);
    }
  }

  if (problems.list.length) {
    throw new Error(`Entity registry has ${problems.list.length} problem(s):\n  ${problems.list.join("\n  ")}`);
  }
  return { byId, eras, notes };
}

function registryOrLoad(): Registry {
  registry ??= load();
  return registry;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/** ` (did you mean "event:king-byng-affair"?)`, or "" when nothing is close. */
function suggest(id: string, byId: Map<string, Entity>): string {
  const type = id.split(":")[0];
  const candidates = [...byId.keys()].filter((k) => k.startsWith(`${type}:`));
  const pool = candidates.length ? candidates : [...byId.keys()];
  const slug = id.slice(id.indexOf(":") + 1);
  let best: string | undefined;
  let bestScore = Infinity;
  for (const k of pool) {
    const kSlug = k.slice(k.indexOf(":") + 1);
    const score = kSlug.includes(slug) || slug.includes(kSlug) ? Math.abs(kSlug.length - slug.length) * 0.25 : distance(slug, kSlug);
    if (score < bestScore) [best, bestScore] = [k, score];
  }
  return best && bestScore <= Math.max(3, slug.length / 2) ? ` (did you mean "${best}"?)` : "";
}

export function allEntities(): Entity[] {
  return [...registryOrLoad().byId.values()];
}

export function hasEntity(id: string): boolean {
  return registryOrLoad().byId.has(id);
}

/** The entity with this id. Throws, with a suggestion, if there is none. */
export function getEntity(id: string): Entity {
  const { byId } = registryOrLoad();
  const e = byId.get(id);
  if (e) return e;
  if (!ENTITY_ID_RE.test(id)) {
    throw new Error(`"${id}" is not an entity id: expected type:slug with type one of ${ENTITY_TYPES.join(", ")} (sections: doc:slug/sNN)`);
  }
  throw new Error(`Unknown entity "${id}"${suggest(id, byId)}`);
}

/** The entity's canonical home: a site path, maybe with `#anchor`. */
export const hrefFor = (id: string): string => getEntity(id).href;

/** The entity's display name. */
export const labelFor = (id: string): string => getEntity(id).name;

/** The timeline eras declared in events.yaml, in order. */
export const eras = (): Era[] => registryOrLoad().eras;

/** Notes about how ids were assigned (slug collisions), for scripts/validate.ts. */
export const entityNotes = (): string[] => registryOrLoad().notes;

/**
 * A short hash of every id with its home and label. The markdown plugins
 * carry it, so Astro's content cache is dropped whenever an entity link would
 * render differently (see astro.config.ts).
 */
export function entityDigest(): string {
  const h = createHash("sha1");
  for (const e of allEntities()) h.update(`${e.id}\t${e.href}\t${e.name}\n`);
  return h.digest("hex").slice(0, 12);
}

/**
 * Checks that need the list of site paths: every `page` (entities, event
 * `pages`) points at a real page, and every event `module` is a module.
 * `validPaths` are site paths without the leading slash ("learn/crown",
 * "" for the home page). Returns problems as "file: id: message" strings.
 */
export function checkEntityPages(validPaths: Set<string>): string[] {
  const out: string[] = [];
  const check = (e: Entity, field: string, page: string | undefined) => {
    if (!page) return;
    const path = page.replace(/[#?].*$/, "").replace(/^\/|\/$/g, "");
    if (!validPaths.has(path)) out.push(`${e.source}: ${e.id}: ${field}: no page at "${page}"`);
  };
  for (const e of allEntities()) {
    check(e, "page", e.page);
    if (e.type === "event") {
      for (const p of e.pages) check(e, "pages", p.page);
      if (e.module && !validPaths.has(`learn/${e.module}`)) out.push(`${e.source}: ${e.id}: module: no module "learn/${e.module}"`);
    }
  }
  return out;
}
