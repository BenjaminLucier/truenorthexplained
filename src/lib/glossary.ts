/**
 * Glossary definitions, extracted at build time from the glossary page itself
 * (content/glossary.en.md), so the definitions have a single source.
 *
 * Each entry there is a `### Term {#slug}` heading followed by one paragraph.
 * The paragraph's trailing "See: …" links are dropped, and an entry that only
 * points elsewhere ("See [Officers of Parliament](/glossary#…)") resolves to
 * that entry's definition.
 */
import { getPage, type Page } from "./site";

export interface GlossaryTerm {
  slug: string;
  term: string;
  /** Definition as inline HTML (emphasis kept, links flattened to text). */
  html: string;
}

const ENTRY = /<h3[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g;
const ALIAS = /^See <a href="\/glossary#([^"]+)">/;
const stripTags = (html: string) => html.replace(/<[^>]+>/g, "");
const flattenLinks = (html: string) => html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, "$1");

export async function glossaryTerms(): Promise<Map<string, GlossaryTerm>> {
  const html = (await getPage("glossary")).rendered?.html ?? "";
  const raw = new Map<string, { term: string; body: string }>();
  for (const [, slug, term, body] of html.matchAll(ENTRY)) {
    if (slug && term && body) raw.set(slug, { term: stripTags(term).trim(), body });
  }
  const terms = new Map<string, GlossaryTerm>();
  for (const [slug, { term, body }] of raw) {
    const target = body.match(ALIAS)?.[1];
    const source = target && raw.get(target) ? raw.get(target)!.body : body;
    const definition = flattenLinks(source.replace(/\s*See:\s[\s\S]*$/, "")).trim();
    terms.set(slug, { slug, term, html: definition });
  }
  return terms;
}

/** Glossary slugs that a page links to (`/glossary#slug`), in first-seen order. */
export function linkedGlossarySlugs(page: Page): string[] {
  const html = page.rendered?.html ?? "";
  const slugs = [...html.matchAll(/href="\/glossary\/?#([^"]+)"/g)].map((m) => m[1]!);
  return [...new Set(slugs)];
}
