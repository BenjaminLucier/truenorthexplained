/**
 * Sätteri hast plugins for the site's markdown.
 *
 * Heading ids (`### Term {#slug}`) need no plugin: they come from Sätteri's
 * `attributes` feature, enabled in astro.config.ts.
 */
import { createHash } from "node:crypto";
import { defineHastPlugin, type HastContent } from "satteri";
import { createMermaidRenderer, type MermaidRenderer } from "mermaid-isomorphic";

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
