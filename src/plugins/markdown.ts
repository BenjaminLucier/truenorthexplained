/**
 * Sätteri hast plugins for the site's markdown.
 *
 * Heading ids (`### Term {#slug}`) need no plugin: they come from Sätteri's
 * `attributes` feature, enabled in astro.config.ts.
 */
import { createHash } from "node:crypto";
import { defineHastPlugin, type HastContent } from "satteri";
import { createMermaidRenderer, type MermaidRenderer } from "mermaid-isomorphic";
import * as lucide from "lucide-static";

/**
 * Drops HTML comments so authoring notes such as `<!-- check: … -->`,
 * `<!-- visual: … -->` and `<!-- unverified link -->` never reach the
 * published HTML. Needs the `rawHtml` feature, which turns comments into
 * real comment nodes.
 */
export const stripComments = defineHastPlugin({
  name: "tne-strip-comments",
  comment(node, ctx) {
    ctx.removeNode(node);
  },
});

/** Wraps tables in a focusable, scrollable region so they never overflow on phones. */
export const scrollableTables = defineHastPlugin({
  name: "tne-scrollable-tables",
  element: {
    filter: ["table"],
    visit(node, ctx) {
      ctx.wrapNode(node, {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrap"], tabIndex: 0, role: "region", ariaLabel: "Table" },
        children: [],
      });
    },
  },
});

/** Marks links to other sites so CSS can show an "external" cue. */
export const externalLinks = defineHastPlugin({
  name: "tne-external-links",
  element: {
    filter: ["a"],
    visit(node, ctx) {
      const href = String(node.properties?.href ?? "");
      if (!/^https?:\/\//.test(href)) return;
      ctx.setProperty(node, "rel", ["noopener"]);
      ctx.setProperty(node, "dataExternal", "");
    },
  },
});

const CALLOUTS = {
  note: { title: "Did you know?", icon: lucide.Lightbulb },
  important: { title: "Key point", icon: lucide.KeyRound },
  myth: { title: "Common myth", icon: lucide.BadgeAlert },
} as const;
type CalloutKind = keyof typeof CALLOUTS;

/**
 * Turns GitHub-style alerts into callouts. Sätteri doesn't parse alerts itself,
 * so this looks for a blockquote whose first line is a marker:
 *
 *     > [!NOTE]        → "Did you know?"
 *     > [!IMPORTANT]   → "Key point"
 *     > [!MYTH]        → "Common myth"
 *
 * The blockquote becomes <div class="callout callout-…" role="note"> with a
 * title line; the rest of its content is kept. Styled in global.css.
 */
export const callouts = defineHastPlugin({
  name: "tne-callouts",
  element: {
    filter: ["blockquote"],
    visit(node, ctx) {
      const para = node.children.find(
        (c): c is Extract<HastContent, { type: "element" }> => c.type === "element" && c.tagName === "p",
      );
      const first = para?.children[0];
      if (!para || first?.type !== "text") return;
      const match = first.value.match(/^\s*\[!(NOTE|IMPORTANT|MYTH)\][ \t]*(?:\r?\n|$)/i);
      if (!match) return;
      const kind = match[1]!.toLowerCase() as CalloutKind;
      const rest = first.value.slice(match[0].length);
      if (rest.trim() === "" && para.children.length === 1) ctx.removeNode(para);
      else ctx.setField(first, "value", rest.replace(/^\s+/, ""));
      const { title, icon } = CALLOUTS[kind];
      ctx.setField(node, "tagName", "div");
      ctx.setProperty(node, "className", ["callout", `callout-${kind}`]);
      ctx.setProperty(node, "role", "note");
      ctx.prependChild(node, {
        type: "element",
        tagName: "p",
        properties: { className: ["callout-title"] },
        children: [
          { type: "raw", value: icon.replace("<svg", '<svg aria-hidden="true" focusable="false"') },
          { type: "text", value: title },
        ],
      });
    },
  },
});

let renderer: MermaidRenderer | undefined;

/**
 * Renders ```mermaid code blocks to inline SVG at build time, using a headless
 * Chromium (Playwright). Colours are applied afterwards from design tokens in
 * global.css, so diagrams follow the light/dark toggle.
 */
export const mermaidDiagrams = defineHastPlugin({
  name: "tne-mermaid",
  element: {
    filter: ["pre"],
    async visit(node, ctx) {
      const code = node.children.find(
        (c): c is Extract<HastContent, { type: "element" }> => c.type === "element" && c.tagName === "code",
      );
      const classes = code?.properties?.className;
      if (!code || !Array.isArray(classes) || !classes.includes("language-mermaid")) return;

      const diagram = ctx.textContent(code);
      // Unique, stable ids so several diagrams on one page don't share styles.
      const prefix = `mermaid-${createHash("sha1").update(diagram).digest("hex").slice(0, 8)}`;
      renderer ??= createMermaidRenderer();
      const [result] = await renderer([diagram], {
        prefix,
        mermaidConfig: {
          theme: "base",
          fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif",
          flowchart: { htmlLabels: true, curve: "basis" },
        },
      });
      if (result?.status !== "fulfilled") {
        ctx.report({ message: `Mermaid diagram failed to render: ${String(result?.reason)}`, node, severity: "error" });
        return;
      }
      const svg = result.value.svg.replace("<svg", `<svg role="img"`);
      ctx.replaceNode(node, {
        type: "element",
        tagName: "figure",
        properties: { className: ["diagram"] },
        children: [{ type: "raw", value: svg }],
      });
    },
  },
});
