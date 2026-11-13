import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import rehypeMermaid from "rehype-mermaid";
import { unified } from "@astrojs/markdown-remark";
import { remarkStripComments } from "./src/plugins/remark-strip-comments";
import { remarkHeadingIds } from "./src/plugins/remark-heading-ids";
import { rehypeTables } from "./src/plugins/rehype-tables";
import { rehypeExternalLinks } from "./src/plugins/rehype-external-links";

export default defineConfig({
  site: "https://truenorthexplained.ca",
  trailingSlash: "ignore",
  markdown: {
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid"] },
    processor: unified({
      remarkPlugins: [remarkStripComments, remarkHeadingIds],
      rehypePlugins: [
      [
        rehypeMermaid,
        {
          strategy: "inline-svg",
          // Colours come from our design tokens via CSS (see global.css),
          // so diagrams follow the light/dark toggle.
          mermaidConfig: {
            theme: "base",
            fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif",
            flowchart: { htmlLabels: true, curve: "basis" },
          },
        },
      ],
      rehypeTables,
      rehypeExternalLinks,
      ],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
