/**
 * Renders one line of inline markdown from the entity YAML (an event's `text`,
 * a case's `holding`) the way content pages render: smart punctuation, `{{fact}}`
 * placeholders and `[text](type:slug)` entity links, external-link marking.
 * Returns inline HTML without the wrapping paragraph.
 *
 * Plain Node (Sätteri plus the site's own hast plugins), so tests can use it.
 */
import { markdownToHtml } from "satteri";
import { entityLinks } from "../plugins/entities";
import { facts } from "../plugins/facts";
import { externalLinks } from "../plugins/markdown";

const cache = new Map<string, string>();

export function inlineMarkdown(md: string): string {
  const hit = cache.get(md);
  if (hit !== undefined) return hit;
  const { html } = markdownToHtml(md, {
    features: { gfm: true, smartPunctuation: true },
    hastPlugins: [facts, entityLinks, externalLinks],
  });
  const inner = html.trim().replace(/^<p>([\s\S]*)<\/p>$/, "$1");
  if (/<\/?(p|ul|ol|h\d|table|blockquote|pre)\b/.test(inner)) throw new Error(`Expected one line of inline markdown, got block content: ${md}`);
  cache.set(md, inner);
  return inner;
}
