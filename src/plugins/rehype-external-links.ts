import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/** Marks links to other sites so CSS can show an "external" cue. */
export function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = String(node.properties?.href ?? "");
      if (!/^https?:\/\//.test(href)) return;
      node.properties = { ...node.properties, rel: ["noopener"], dataExternal: "" };
    });
  };
}
