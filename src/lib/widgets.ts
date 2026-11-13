/**
 * Interactive widgets inside markdown.
 *
 * Authors write a placeholder on its own line in a content page:
 *
 *     <tn-widget name="bill-steps"></tn-widget>
 *     <tn-widget name="power-sorter" data-set="federalism"></tn-widget>
 *
 * The page route splits the rendered HTML at each placeholder and renders
 * src/widgets/<name>/index.astro in its place, passing the other attributes
 * as string props (data-set="x" → set="x"). Widgets are ordinary Astro
 * components, so they render real HTML at build time and add behaviour with
 * a <script> (usually a custom element).
 */

export type Chunk = { kind: "html"; html: string } | { kind: "widget"; name: string; props: Record<string, string> };

const PLACEHOLDER = /<tn-widget\b([^>]*)>\s*<\/tn-widget>/g;
const ATTR = /([\w-]+)\s*=\s*"([^"]*)"/g;

const unescape = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function splitWidgets(html: string): Chunk[] {
  const chunks: Chunk[] = [];
  let last = 0;
  for (const match of html.matchAll(PLACEHOLDER)) {
    const before = html.slice(last, match.index);
    // A placeholder on its own line may arrive wrapped in a paragraph.
    chunks.push({ kind: "html", html: before.replace(/<p>\s*$/, "") });
    const props: Record<string, string> = {};
    let name = "";
    for (const [, key, value] of (match[1] ?? "").matchAll(ATTR)) {
      if (!key) continue;
      if (key === "name") name = unescape(value ?? "");
      else props[key.replace(/^data-/, "").replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = unescape(value ?? "");
    }
    if (!name) throw new Error(`<tn-widget> without a name: ${match[0]}`);
    chunks.push({ kind: "widget", name, props });
    last = match.index + match[0].length;
    const after = html.slice(last);
    const close = after.match(/^\s*<\/p>/);
    if (close) last += close[0].length;
  }
  chunks.push({ kind: "html", html: html.slice(last) });
  return chunks.filter((c) => c.kind === "widget" || c.html.trim() !== "");
}
