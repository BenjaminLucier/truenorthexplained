# True North Explained

A plain-language guide to how Canada works, legally and politically: the Crown,
Parliament, elections, federalism, the courts, the Charter, Indigenous rights, and all
13 provinces and territories. Every page ends with a short quiz, and progress is saved
in the reader's own browser.

Live at **[truenorthexplained.ca](https://truenorthexplained.ca)**.

## How it's built

- **[Astro](https://astro.build)** generates a fully static site from the markdown in
  `content/`.
- **Tailwind CSS v4** with semantic design tokens such as `bg-surface`, `text-primary`
  and `accent`. Every colour has a light and a dark value.
- **Vanilla TypeScript** custom elements handle the few interactive parts: the theme
  toggle, the mobile menu and the quizzes. There is no UI framework.
- **Sätteri**, Astro 7's Rust-based markdown processor, does the markdown processing.
  Small hast plugins in `src/plugins/markdown.ts` strip authoring comments, wrap tables
  and render **Mermaid** diagrams to SVG at build time.
- **TypeScript 7.1**, which also type-checks `.astro` files through
  `@astrojs/ts-content-mapper`.

## Getting started

Requires [fnm](https://github.com/Schniz/fnm) (or any Node version manager) and
[pnpm](https://pnpm.io).

```bash
fnm use                                  # Node version from .nvmrc
pnpm install
pnpm exec playwright install chromium    # renders Mermaid diagrams, and runs pnpm test:e2e
pnpm dev                                 # http://localhost:4321
```

| Script | What it does |
|---|---|
| `pnpm dev` | Local dev server with hot reload (search needs a build: run `pnpm build && pnpm preview` to try it) |
| `pnpm build` | Static build into `dist/` (validates all front matter and quiz data), then builds the Pagefind search index in `dist/pagefind/` |
| `pnpm preview` | Serve the built site, with working search |
| `pnpm check` | Type-check `.ts` and `.astro` files |
| `pnpm validate` | Check internal links and quiz page references |
| `pnpm test` | Unit tests (Vitest) for the pure logic in `src/lib` and the widgets: `tests/unit/` |
| `pnpm test:e2e` | Build, then run the browser tests (Playwright, Chromium) against `astro preview` on port 4630: every page at phone and desktop width in both themes (console errors, failed requests, overflow, axe), plus smoke tests of the interactive parts. `tests/e2e/`. To re-run against an existing build: `pnpm exec playwright test` |
| `pnpm review` | Regenerate [REVIEW.md](REVIEW.md), the list of facts and links awaiting review |
| `pnpm data:geo` | Re-download province and riding boundaries and population estimates into `src/data/geo/` |
| `pnpm data:elections` | Re-download 2025 election results, current MPs and senators, and seat allocation into `src/data/elections/`, `src/data/parliament/` and `src/data/population/` |
| `pnpm data:money` | Re-download federal finances (Finance Canada, Statistics Canada), transfers to provinces and equalization (Finance Canada), the consumer price index (Statistics Canada) and interest rates (Bank of Canada) into `src/data/money/` |
| `pnpm data:election-history` | Rebuild every federal general election since 1867 (seats and votes by party family, turnout, government, women elected) into `src/data/elections/history.json` from Elections Canada and Wikipedia. Refreshes the Wikipedia pages first; add `--offline` to use the copies in `grounding/wikipedia/` |
| `pnpm data:premiers` | Rebuild every premier of each province and territory, with party family, into `src/data/wikidata/premiers.json` from Wikidata and Wikipedia |
| `pnpm data:population` | Re-download 2021 Census population by province (used by the amending-formula widget) |
| `pnpm data:treaties` | Re-download CIRNAC historic and modern treaty boundaries, simplify them with mapshaper and write `src/data/geo/treaties.topo.json` |
| `pnpm data:demographics` | Re-download Statistics Canada language, immigrant origin, urban/rural, Indigenous and age-pyramid data into `src/data/demographics/` |
| `pnpm data:portraits` | Re-download portraits of prime ministers, monarchs, governors general, Supreme Court judges, premiers and MPs from Wikimedia Commons into `public/portraits/`, with licence and author for each in `src/data/portraits.json`. Run after `pnpm grounding` and `pnpm data:elections` |
| `pnpm grounding` | Re-download the Wikipedia/Wikidata grounding corpus, flags and Statistics Canada demographics. See [grounding/README.md](grounding/README.md) |

`pnpm data:geo` uses Statistics Canada's official province boundary shapefile when it's
in `data/lpr_000b21a_e/` (download `lpr_000b21a_e.zip` from the
[2021 boundary files page](https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21)
and unzip it there; the site blocks scripts, so it has to be fetched by hand). Without
it, the script falls back to Statistics Canada's map service. `data/` is not committed.

All downloaded data is committed. Re-running a data script and reading the `git diff` is
how the site stays current: the diff shows exactly what changed upstream.

## Project layout

```
content/            All site content (the source of truth)
  learn/            10 modules: a main page plus deep dives
  provinces/        13 provinces and territories
  quizzes/          The global question bank (YAML)
  *.en.md           Home, glossary, timeline, myths, sources, about
src/
  content.config.ts Collections and schemas for pages and quiz questions
  pages/            Routes
  layouts/          Page shells
  components/       Header, footer, icons, quiz pieces
  scripts/          Client-side TypeScript (quiz logic, progress storage)
  plugins/          Sätteri markdown plugins (comments, tables, Mermaid)
  styles/global.css Design tokens and base styles
  i18n/en.ts        Interface text, ready for a French dictionary
scripts/validate.ts Content checks and review-list generator
```

The planning docs explain the content itself:

- [SCOPE.md](SCOPE.md): goals and curriculum
- [SITEMAP.md](SITEMAP.md): every page, the templates, and the quiz format
- [STYLE.md](STYLE.md): how pages are written and sourced
- [REVIEW.md](REVIEW.md): what still needs fact-checking

## Licence

© 2026 Benjamin Lucier. Text, code and data in this repository are licensed under
[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
(CC BY-SA 4.0). See [LICENSE](LICENSE).

Share-alike matches Wikipedia's licence, so material adapted from Wikipedia can be used
here. Third-party material keeps its own terms, listed in [grounding/ATTRIBUTION.md](grounding/ATTRIBUTION.md)
and on the site's credits page. That includes Statistics Canada and Elections Canada data
(Open Government Licence – Canada) and flag images from Wikimedia Commons.

An independent learning project, not affiliated with the Government of Canada. It's an
educational overview, not legal advice.
