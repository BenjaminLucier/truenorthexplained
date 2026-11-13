import type { Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Supports explicit heading ids: `### Term {#term-slug}`.
 * Strips the `{#…}` suffix and uses it as the heading's id.
 */
export function remarkHeadingIds() {
  const idSuffix = /\s*\{#([\w-]+)\}\s*$/;
  return (tree: Root) => {
    visit(tree, "heading", (node) => {
      const last = node.children.at(-1);
      if (!last || last.type !== "text") return;
      const match = (last as Text).value.match(idSuffix);
      if (!match) return;
      (last as Text).value = (last as Text).value.replace(idSuffix, "");
      // hProperties is read by mdast-util-to-hast when building the HTML.
      const data = (node.data ??= {}) as { hProperties?: Record<string, unknown> };
      data.hProperties = { ...data.hProperties, id: match[1] };
    });
  };
}
