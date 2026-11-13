/**
 * Glossary term files: content/glossary/<slug>.en.md, one per term.
 * See ARCHITECTURE.md, "Glossary".
 *
 *   ---
 *   term: Royal assent            # the term as shown (required)
 *   aliases: [assent]             # other names (optional)
 *   alias_of: other-slug          # a pure cross-reference: no body, no see (optional)
 *   see:                          # the pages that explain it, in order (optional)
 *     - /learn/parliament/how-a-bill-becomes-law
 *     - page: /glossary#consensus-government   # { page, label } when the link text
 *       label: Consensus government            # isn't the page's title
 *   ---
 *
 *   The definition: one paragraph of normal markdown (entity links, {{facts}}).
 *
 * Plain Node (node:fs and yaml, no `astro:` imports), like src/lib/entities.ts:
 * the entity registry reads term names from here, and scripts/validate.ts and
 * the unit tests use the parser and checks. On the Astro side the same files
 * are the `glossary` collection (src/content.config.ts).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { fromRoot } from "./project-root";

export const GLOSSARY_DIR = "content/glossary";
export const TERM_FIELDS = ["term", "aliases", "alias_of", "see"] as const;

/** A page a term sends the reader to. `label` defaults to the page's title. */
export interface SeeLink {
  page: string;
  label?: string;
}

export interface TermFile {
  slug: string;
  term: string;
  aliases: string[];
  /** For a pure cross-reference ("See Officers of Parliament"): the target's slug. */
  aliasOf?: string;
  see: SeeLink[];
  /** The definition, as markdown (empty for an alias). */
  body: string;
  /** Path relative to the project root. */
  source: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SITE_PATH_RE = /^\/[^\s]*$/;

/** `content/glossary/royal-assent.en.md` → `royal-assent`. */
export const slugFromFile = (file: string): string => file.replace(/^.*\//, "").replace(/\.en\.md$/, "");

/** Splits `---\nyaml\n---\nbody` into the parsed front matter and the trimmed body. */
export function splitFrontMatter(text: string): { data: unknown; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
  if (!m) return { data: undefined, body: text.trim() };
  return { data: parse(m[1]!), body: m[2]!.trim() };
}

/** Normalises a `see` list: each item a site path or `{ page, label }`. */
export function parseSee(value: unknown): { see: SeeLink[]; problems: string[] } {
  const see: SeeLink[] = [];
  const problems: string[] = [];
  if (value === undefined || value === null) return { see, problems };
  if (!Array.isArray(value)) return { see, problems: ['"see" must be a list'] };
  for (const item of value) {
    if (typeof item === "string" && SITE_PATH_RE.test(item)) see.push({ page: item });
    else if (
      typeof item === "object" &&
      item !== null &&
      typeof item.page === "string" &&
      SITE_PATH_RE.test(item.page) &&
      typeof item.label === "string" &&
      item.label.trim() !== "" &&
      Object.keys(item).every((k) => k === "page" || k === "label")
    ) {
      see.push({ page: item.page, label: item.label.trim() });
    } else problems.push(`each of "see" must be a site path like "/learn/crown" or { page, label } (got ${JSON.stringify(item)})`);
  }
  return { see, problems };
}

/** Parses one term file. Problems are messages without the file name. */
export function parseTermFile(text: string, source: string): { term?: TermFile; problems: string[] } {
  const problems: string[] = [];
  const slug = slugFromFile(source);
  if (!SLUG_RE.test(slug)) problems.push(`file name must be a lowercase slug like "royal-assent.en.md"`);
  let parsed: { data: unknown; body: string };
  try {
    parsed = splitFrontMatter(text);
  } catch (e) {
    return { problems: [`YAML error: ${(e as Error).message}`] };
  }
  const { data, body } = parsed;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return { problems: ["front matter missing (expected at least `term:`)"] };
  const raw = data as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!(TERM_FIELDS as readonly string[]).includes(key)) problems.push(`unknown field "${key}" (allowed: ${TERM_FIELDS.join(", ")})`);
  }
  const term = typeof raw.term === "string" ? raw.term.trim() : "";
  if (!term) problems.push('"term" must be a non-empty string');
  const aliases = raw.aliases ?? [];
  if (!Array.isArray(aliases) || aliases.some((a) => typeof a !== "string" || a.trim() === "")) problems.push('"aliases" must be a list of strings');
  let aliasOf: string | undefined;
  if (raw.alias_of !== undefined) {
    if (typeof raw.alias_of !== "string" || !SLUG_RE.test(raw.alias_of)) problems.push('"alias_of" must be the slug of another term');
    else aliasOf = raw.alias_of;
  }
  const { see, problems: seeProblems } = parseSee(raw.see);
  problems.push(...seeProblems);
  if (aliasOf) {
    if (body) problems.push('an alias ("alias_of") has no definition of its own: leave the body empty');
    if (see.length) problems.push('an alias ("alias_of") has no "see" list: the target\'s applies');
    if (aliasOf === slug) problems.push('"alias_of" points at itself');
  } else if (!body) problems.push("the definition (the body) is empty");
  if (/\n\s*\n/.test(body)) problems.push("the definition must be one paragraph");
  return {
    term: { slug, term, aliases: Array.isArray(aliases) ? aliases.map((a) => String(a).trim()) : [], aliasOf, see, body, source },
    problems,
  };
}

/**
 * Checks across terms: duplicate slugs, `alias_of` pointing at a missing term
 * or at another alias, and (with `validPaths`, site paths without the leading
 * slash) `see` pages that don't exist.
 */
export function checkTerms(terms: TermFile[], validPaths?: Set<string>): string[] {
  const out: string[] = [];
  const bySlug = new Map<string, TermFile>();
  for (const t of terms) {
    const other = bySlug.get(t.slug);
    if (other) out.push(`${t.source}: duplicate slug "${t.slug}" (also ${other.source})`);
    else bySlug.set(t.slug, t);
  }
  for (const t of terms) {
    if (t.aliasOf) {
      const target = bySlug.get(t.aliasOf);
      if (!target) out.push(`${t.source}: alias_of: no term "${t.aliasOf}"`);
      else if (target.aliasOf) out.push(`${t.source}: alias_of: "${t.aliasOf}" is itself an alias (of "${target.aliasOf}"); point at that instead`);
    }
    if (!validPaths) continue;
    for (const { page } of t.see) {
      const [path, anchor] = page.split("#");
      const id = path!.replace(/^\/|\/$/g, "");
      if (!validPaths.has(id)) out.push(`${t.source}: see: no page at "${page}"`);
      else if (id === "glossary" && anchor && !bySlug.has(anchor)) out.push(`${t.source}: see: no glossary term "#${anchor}"`);
    }
  }
  return out;
}

/** Reads every term file, in file-name order. */
export function readTermFiles(): { terms: TermFile[]; problems: string[] } {
  const dir = fromRoot(GLOSSARY_DIR);
  if (!existsSync(dir)) return { terms: [], problems: [] };
  const terms: TermFile[] = [];
  const problems: string[] = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".en.md")).sort()) {
    const source = `${GLOSSARY_DIR}/${name}`;
    const { term, problems: p } = parseTermFile(readFileSync(fromRoot(source), "utf8"), source);
    problems.push(...p.map((m) => `${source}: ${m}`));
    if (term) terms.push(term);
  }
  return { terms, problems };
}

const ABBREVIATIONS = new Set(["v", "vs", "s", "ss", "st", "mr", "mrs", "ms", "dr", "jr", "sr", "no", "e.g", "i.e", "c", "ca"]);

/**
 * The first sentence of a definition (inline markdown), for the term's entity
 * summary. A sentence ends at `.`, `!` or `?` (plus closing quotes, brackets or
 * emphasis) followed by a space and a capital, unless the word before the dot is
 * an abbreviation ("v.", "s.", "e.g.") or a single letter (an initial).
 */
export function firstSentence(markdown: string): string {
  const text = markdown.replace(/\s+/g, " ").trim();
  const re = /([.!?])["'”’)\]*_]*(?= ["'“‘(*_]*[A-Z])/g;
  for (const m of text.matchAll(re)) {
    if (m[1] === ".") {
      const word = text.slice(0, m.index).match(/([A-Za-z.]+)$/)?.[1] ?? "";
      if (word.length === 1 || ABBREVIATIONS.has(word.toLowerCase())) continue;
    }
    return text.slice(0, m.index + m[0].length);
  }
  return text;
}

/**
 * A term as displayed: straight quotes made typographic, as the markdown
 * renderer does for headings and definitions ("Prime Minister's Office" →
 * "Prime Minister’s Office"). The front matter keeps the plain text, which is
 * also the entity name.
 */
export const displayTerm = (term: string): string =>
  term
    .replace(/(^|[\s([{])"/gu, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s([{])'/gu, "$1‘")
    .replace(/'/g, "’");

/** The A–Z heading a term is listed under: its first letter or digit, accents dropped. */
export function letterOf(term: string): string {
  const c = term.normalize("NFD").replace(/[^A-Za-z0-9]/g, "")[0];
  return c ? c.toUpperCase() : "#";
}

/** Sort order for the A–Z list: alphabetical, ignoring case, numbers by value ("Bill 21" before "Bill 101"). */
export const compareTerms = (a: string, b: string): number =>
  a.localeCompare(b, "en", { sensitivity: "base", numeric: true }) || a.localeCompare(b);
