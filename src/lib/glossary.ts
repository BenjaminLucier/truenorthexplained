/**
 * Glossary definitions (Astro side), from the `glossary` collection: one file
 * per term in content/glossary/<slug>.en.md (see src/lib/glossary-terms.ts and
 * ARCHITECTURE.md, "Glossary"). Used by the popovers on content pages and by
 * the A–Z list on /glossary (src/widgets/glossary).
 *
 * An alias entry (`alias_of`) has no definition of its own: the popover shows
 * the target's, and the A–Z list shows "See <target>".
 */
import { getCollection, type CollectionEntry } from "astro:content";
import { compareTerms, displayTerm, letterOf } from "./glossary-terms";
import type { Page } from "./site";

export type GlossaryEntry = CollectionEntry<"glossary">;

export interface GlossaryTerm {
  slug: string;
  term: string;
  /** Definition as inline HTML (emphasis kept, links flattened to text). */
  html: string;
}

const flattenLinks = (html: string) => html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, "$1");

/** The definition's rendered HTML without the paragraph round it: inline HTML. */
export const definitionHtml = (entry: GlossaryEntry): string =>
  (entry.rendered?.html ?? "")
    .trim()
    .replace(/^<p>([\s\S]*)<\/p>$/, "$1")
    .trim();

/** Every glossary entry, in A–Z order, with the letter it is listed under and the term as displayed. */
export async function glossaryEntries(): Promise<(GlossaryEntry & { letter: string; display: string })[]> {
  return (await getCollection("glossary"))
    .sort((a, b) => compareTerms(a.data.term, b.data.term))
    .map((e) => ({ ...e, letter: letterOf(e.data.term), display: displayTerm(e.data.term) }));
}

export async function glossaryTerms(): Promise<Map<string, GlossaryTerm>> {
  const entries = await getCollection("glossary");
  const bySlug = new Map(entries.map((e) => [e.id, e]));
  const terms = new Map<string, GlossaryTerm>();
  for (const entry of entries) {
    const target = entry.data.alias_of ? bySlug.get(entry.data.alias_of) : undefined;
    terms.set(entry.id, { slug: entry.id, term: displayTerm(entry.data.term), html: flattenLinks(definitionHtml(target ?? entry)) });
  }
  return terms;
}

/** Glossary slugs that a page links to (`/glossary#slug`), in first-seen order. */
export function linkedGlossarySlugs(page: Page): string[] {
  const html = page.rendered?.html ?? "";
  const slugs = [...html.matchAll(/href="\/glossary\/?#([^"]+)"/g)].map((m) => m[1]!);
  return [...new Set(slugs)];
}
