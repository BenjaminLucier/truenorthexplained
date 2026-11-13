/**
 * Entity links: `[text](type:slug)` and `[](type:slug)` in markdown.
 *
 * Rewrites the link to the entity's home (src/lib/entities.ts) and adds
 * `data-entity="type:slug"`, which src/lib/semantic.ts reads back for
 * backlinks. Empty link text becomes the entity's name. A term's home is
 * `/glossary#slug`, so glossary popovers pick these links up unchanged.
 *
 * An unknown id fails the build, naming the file and suggesting the closest id.
 */
import { fileURLToPath } from "node:url";
import { relative } from "node:path";
import { defineHastPlugin } from "satteri";
import { entityDigest, getEntity, isEntityType } from "../lib/entities";
import { projectRoot } from "../lib/project-root";

const PREFIX = /^([a-z]+):/;

export const fileLabel = (url: URL | undefined) => (url ? relative(projectRoot(), fileURLToPath(url)) : "markdown");

export const entityLinks = defineHastPlugin({
  name: "tne-entity-links",
  // Not read by Sätteri. It ends up in Astro's config digest, so the content
  // cache is dropped when any entity's home or name changes (astro.config.ts).
  cacheKey: entityDigest(),
  element: {
    filter: ["a"],
    visit(node, ctx) {
      const href = String(node.properties?.href ?? "");
      const type = href.match(PREFIX)?.[1];
      if (!type || !isEntityType(type)) return;
      let entity;
      try {
        entity = getEntity(href);
      } catch (e) {
        const message = `${fileLabel(ctx.fileURL)}: entity link [${ctx.textContent(node)}](${href}): ${(e as Error).message}`;
        ctx.report({ message, node, severity: "error" });
        // Sätteri collects reports without failing the compile, so throw as well.
        throw new Error(message);
      }
      ctx.setProperty(node, "href", entity.href);
      ctx.setProperty(node, "dataEntity", entity.id);
      if (node.children.length === 0 || ctx.textContent(node).trim() === "") {
        ctx.setField(node, "children", [{ type: "text", value: entity.name }]);
      }
    },
  },
});
