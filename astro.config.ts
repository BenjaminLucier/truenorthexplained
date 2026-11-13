import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { satteri } from "@astrojs/markdown-satteri";
import { callouts, externalLinks, mermaidDiagrams, scrollableTables, stripComments } from "./src/plugins/markdown";

export default defineConfig({
  site: "https://truenorthexplained.ca",
  trailingSlash: "ignore",
  markdown: {
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid"] },
    processor: satteri({
      features: {
        // `### Term {#slug}` heading ids, used by the glossary.
        attributes: true,
        // Parse inline HTML into real nodes, so comments can be stripped.
        rawHtml: true,
      },
      hastPlugins: [stripComments, callouts, mermaidDiagrams, scrollableTables, externalLinks],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
