# Architecture

How the site is put together, and the conventions to follow when adding to it.
For setup and scripts, see [README.md](README.md). For how content is written, see
[STYLE.md](STYLE.md).

## Principles

- **Static first.** Everything that can be computed at build time is: Mermaid
  diagrams, maps, charts, tables. The browser gets finished HTML and SVG.
- **No UI framework.** Interactivity is vanilla TypeScript, usually a custom element
  that enhances server-rendered markup. Pages must make sense with JavaScript off.
- **Native HTML for accessibility.** Use `<button>`, `<details>`, `<dialog>`, the
  `popover` attribute, `<input type="radio">` and so on before writing ARIA by hand.
  Everything must work by keyboard and have visible focus.
- **Design tokens only.** Colours come from the semantic tokens in
  `src/styles/global.css` (`bg-surface`, `text-primary`, `border-subtle`, `accent`,
  `party-lpc` and so on). The default Tailwind palette is switched off. Every colour
  has a light and a dark value, so nothing needs `dark:` variants for colour.
- **Primary sources.** Data comes from official or openly licensed sources, fetched by
  a script that can be re-run. It's never typed in by hand.

## Directory layout

```
content/                 Markdown pages and the quiz bank (source of truth for prose)
grounding/               Raw reference material fetched from Wikipedia/Wikidata (not published)
scripts/                 Node/TypeScript scripts, run with tsx
  grounding/             `pnpm grounding`: re-download the grounding corpus
  data/                  `pnpm data:*`: download and build site datasets
src/
  data/                  Generated datasets the site imports (JSON/TopoJSON, committed)
  widgets/<name>/        Interactive widgets embeddable in markdown (see below)
  components/            Shared Astro components
  layouts/ pages/ lib/ scripts/ styles/ i18n/
public/flags/            Flag SVGs (canada.svg, <province-slug>.svg)
```

**Generated files are committed**, so the site builds offline and in CI without hitting
external services, and a re-fetch shows up as a reviewable git diff. Every dataset
records where it came from and when, either in a `_meta` field or a sibling
`*.meta.json` file: `{ source, url, licence, fetched }`.

## Widgets in markdown

Write a placeholder on its own line in any content page:

```html
<tn-widget name="bill-steps"></tn-widget>
<tn-widget name="power-sorter" data-set="federalism"></tn-widget>
```

The page route (`src/pages/[...slug].astro`) splits the rendered HTML at each
placeholder. It renders `src/widgets/<name>/index.astro` in its place, passing the
other attributes as string props (`data-set="federalism"` becomes `set="federalism"`,
and `data-foo-bar` becomes `fooBar`). An unknown name fails the build. See
`src/lib/widgets.ts`.

A widget is a normal Astro component:

- It renders useful static HTML at build time, imports its data directly (for example
  from `src/data/...`), and adds behaviour in a `<script>`, usually a custom element
  named `tn-<name>`.
- Its root element should carry `not-prose` so the typography styles don't leak in.
- Its styles go in the component's `<style>` block or in Tailwind classes, not in
  `global.css`.
- It doesn't use `localStorage`, apart from quiz progress through
  `src/scripts/progress.ts`.
- Its visible text lives in the widget for now. It moves to `src/i18n` when French
  arrives.

Widgets can also be imported directly by `.astro` pages.

## Content pages

- Pages are `content/**/*.en.md`, with ids derived by `src/lib/paths.ts`.
- Front matter is validated in `src/content.config.ts`.
- Authoring notes use HTML comments (`<!-- check: … -->`, `<!-- visual: … -->`). They're
  stripped from the output.
- A `<!-- visual: … -->` note marks where a planned widget belongs. Replace it with a
  `<tn-widget>` once the widget exists.

## Checks

```bash
pnpm check      # types, including .astro files
pnpm validate   # internal links, quiz references
pnpm build      # full static build (also validates all front matter and data)
```

**Dev cache gotcha:** if you change a schema in `content.config.ts` without editing the
content files, delete `node_modules/.astro/data-store.json` and `.astro/data-store.json`
before restarting `pnpm dev`. Otherwise the dev server keeps entries parsed with the
old schema.

## Licence

Everything here is CC BY-SA 4.0 (see `LICENSE`). Third-party data and images keep their
own terms. Record them in `grounding/ATTRIBUTION.md` and on the `/credits` page.
