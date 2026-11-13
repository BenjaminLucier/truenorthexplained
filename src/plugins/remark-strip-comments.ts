import type { Root, Parent } from "mdast";
import { SKIP, visit } from "unist-util-visit";

/**
 * Removes HTML comments from markdown so authoring notes such as
 * `<!-- check: … -->`, `<!-- visual: … -->` and `<!-- unverified link -->`
 * never reach the published HTML.
 */
export function remarkStripComments() {
  const commentOnly = /^\s*(<!--[\s\S]*?-->\s*)+$/;
  return (tree: Root) => {
    visit(tree, "html", (node, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (commentOnly.test(node.value)) {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      // Comments mixed with other inline HTML: strip just the comments.
      const stripped = node.value.replace(/<!--[\s\S]*?-->/g, "");
      if (stripped !== node.value) node.value = stripped;
    });
  };
}
