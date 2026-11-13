/**
 * Facts in markdown: `{{commons.seats}}` and `{{commons.seats|raw}}` in text
 * become the value from src/lib/facts.ts.
 *
 * Runs first in the plugin list (astro.config.ts), so Mermaid sources see the
 * resolved text: the diagram's id hash is computed from what is drawn. Inline
 * code and non-Mermaid code blocks are left alone, so pages can show the
 * syntax itself. Placeholders in headings aren't supported: `{…}` after a
 * heading is read as attributes. In Mermaid, `{{…}}` always means a fact, so
 * hexagon nodes (`A{{text}}`) can't be used.
 *
 * An unknown key fails the build, naming the file.
 */
import { defineHastPlugin } from "satteri";
import { FACT_LIKE_RE, factsDigest, resolveFacts } from "../lib/facts";
import { fileLabel } from "./entities";

export const facts = defineHastPlugin({
  name: "tne-facts",
  // See entityLinks.cacheKey: drops Astro's content cache when a fact's value changes.
  cacheKey: factsDigest(),
  text(node, ctx) {
    if (!node.value.includes("{{")) return;
    const parent = ctx.parent(node);
    let mermaid = false;
    if (parent?.type === "element" && parent.tagName === "code") {
      const pre = ctx.parent(parent);
      const classes = parent.properties?.className;
      mermaid = pre?.type === "element" && pre.tagName === "pre" && Array.isArray(classes) && classes.includes("language-mermaid");
      if (!mermaid) return;
    }
    let value: string;
    try {
      value = resolveFacts(node.value);
    } catch (e) {
      const message = `${fileLabel(ctx.fileURL)}: ${(e as Error).message}`;
      ctx.report({ message, node, severity: "error" });
      throw new Error(message);
    }
    const leftover = mermaid ? null : value.match(FACT_LIKE_RE);
    if (leftover) {
      const message = `${fileLabel(ctx.fileURL)}: malformed fact placeholder ${leftover[0]} (write {{key}} or {{key|raw}}, key in lowercase)`;
      ctx.report({ message, node, severity: "error" });
      throw new Error(message);
    }
    if (value !== node.value) ctx.setField(node, "value", value);
  },
});
