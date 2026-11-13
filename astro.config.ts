import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { satteri } from "@astrojs/markdown-satteri";
import { callouts, externalLinks, mermaidDiagrams, scrollableTables, stripComments } from "./src/plugins/markdown";
import { entityLinks } from "./src/plugins/entities";
import { facts } from "./src/plugins/facts";

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
      // `facts` runs first so Mermaid sees resolved text. `facts` and
      // `entityLinks` carry a `cacheKey` (a hash of every fact value and
      // entity home/name): it is part of this config, so Astro drops its
      // cached markdown whenever one of them changes, even if no page did.
      hastPlugins: [facts, entityLinks, stripComments, callouts, mermaidDiagrams, scrollableTables, externalLinks],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
