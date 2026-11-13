import type { Element, Root } from "hast";
import { SKIP, visit } from "unist-util-visit";

/** Wraps tables in a scrollable container so they never overflow on phones. */
export function rehypeTables() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) return;
      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrap"], tabIndex: 0, role: "region", ariaLabel: "Table" },
        children: [node],
      };
      parent.children[index] = wrapper;
      return [SKIP, index + 1];
    });
  };
}
