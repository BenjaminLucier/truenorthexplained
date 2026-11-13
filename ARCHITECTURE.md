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

A placeholder can also wrap markdown. The rendered HTML inside it reaches the widget as
a `content` prop, so the page's own markdown stays the source of the widget's data (the
`timeline` widget works this way). Leave a blank line after the opening tag and before
the closing one so the markdown inside is parsed:

```html
<tn-widget name="timeline" data-group-by="module">

## An era
- **1867** — Confederation. [Read more](/learn/constitution)

</tn-widget>
```

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

## Charts

Charts are SVG or HTML drawn at build time, with no chart library. The shared pieces
live in `src/components/charts/`:

| File | What it is |
|---|---|
| `ChartCard.astro` | The card round every chart: title, lede, the chart (default slot), a "Show the data" table (`table` slot) and the sources. |
| `Legend.astro` | The one legend: `items` of `{ label, color, kind }`, where `kind` is `swatch` (default), `light`, `outline`, `line`, `dash`, `dot`, `band` or `shade`. `size="sm"` for a larger legend. |
| `ChartTip.astro` | The one tooltip: the `<tn-chart>` custom element, its tooltip box and styles. |
| `SeriesChart.astro` | Lines, bars, bands and notes over a numeric x axis. Its `hover` prop adds a crosshair tooltip. |
| `TimePlot.astro` | The frame for election-history charts (1867 to today on `xOf`). |

`src/lib/charts.ts` has the scales and path helpers, plus `tipRows` and `formatValue`
for tooltips. Colours are tokens (`var(--tn-data-cat-1)`, `var(--tn-party-lpc)`…).

**Making a chart interactive.** Wrap it in `<tn-chart>`, put `<ChartTip />` inside, and
mark each hoverable thing (a bar, a column, a point's hit area) as a *stop* with
`data-tip`:

```astro
<tn-chart role="group" aria-label="Seats by province. Use the arrow keys to move between provinces.">
  <svg>…
    <rect data-tip data-tip-title="Ontario" data-tip-rows={tipRows([["Seats", "122", color]])} data-group="on" />
  …</svg>
  <ChartTip />
</tn-chart>
```

- **Tooltip content.** Either `data-tip=""` plus `data-tip-title`, `data-tip-sub`,
  `data-tip-note` and `data-tip-rows` (JSON `[label, value?, colour?][]`, made with
  `tipRows`), or `data-tip="some-id"` naming a `<template id="some-id">` with richer
  markup using the `ct-h`, `ct-sub`, `ct-p`, `ct-rows` (a table; `ct-strong` row) and
  `ct-sw` (swatch, `style="--sw: …"`) classes.
- **Accessible name.** Give stops an `aria-label` with the same facts, or leave it off and
  `<tn-chart>` writes one from the tooltip text. Stops get `role="img"` if they have no
  role. The tooltip itself is `aria-hidden`. Label the chart (`role="group"` and
  `aria-label` on `<tn-chart>` or on the SVG holding the stops), and always give the
  card a `table` slot: it's the text alternative with JavaScript off.
- **Keyboard.** The chart is one tab stop: the stop with `data-start`, else the first.
  Left/Right (and Up/Down) step through stops in document order, PageUp/PageDown jump a
  tenth, Home/End go to the ends, Escape hides the tooltip. Stops with `data-row="n"`
  make rows, and Up/Down go to the nearest stop in the next row. `data-nav="grid"` on
  `<tn-chart>` makes the arrows move to the nearest stop on screen instead, for grids
  whose layout changes with width. Hidden stops are skipped.
- **Pointer.** Mouse hover shows the tooltip beside the pointer; a tap (or a drag) shows
  it above the stop, and tapping elsewhere hides it. `data-tip-place="side"` on
  `<tn-chart>` puts it beside the stop instead, or beside the element in the same group
  marked `data-tip-anchor` (a crosshair line, say).
- **Highlighting.** While a stop is active, it and every element with the same
  `data-group` get `.is-active`, and `<tn-chart>` gets `data-active`. Style those in the
  widget (dim the others, show a guide line or dots). SVG stops get no browser focus
  outline, so style `:focus-visible` or `.is-active` for them; HTML stops keep the
  site's focus ring.

`src/components/reference/LineChart.astro` (static population lines) and
`TermTimeline.astro` (terms as links) predate this and have no tooltips. For a new
chart over time, use `SeriesChart` with `hover`.

## Content pages

- Pages are `content/**/*.en.md`, with ids derived by `src/lib/paths.ts`.
- Front matter is validated in `src/content.config.ts`.
- Authoring notes use HTML comments (`<!-- check: … -->`, `<!-- visual: … -->`). They're
  stripped from the output.
- A `<!-- visual: … -->` note marks where a planned widget belongs. Replace it with a
  `<tn-widget>` once the widget exists.

## The semantic layer: entities, facts and backlinks

Pages used to connect only through hand-written links, and the same thing (the
King–Byng affair, a prime minister, the size of the House) was described separately in
several places. A small semantic layer gives those things one identity each.

### Entities

An entity is a thing the site talks about. Every entity has an **id** of the form
`type:slug` (lowercase ASCII, hyphens; document sections add `/sNN`), a `name`, an
optional one-line `summary`, and a canonical **home**: the existing page or anchor
that explains it best. Entities do not get pages of their own, so no new URLs exist
and every old URL keeps working.

| Type | Id example | Lives in | Home |
|---|---|---|---|
| Person | `person:mackenzie-king` | Derived from `src/data/wikidata/{prime-ministers,governors-general,monarchs,chief-justices,premiers}.json` (id = slug of the name; the JSON is never copied). Others, and overrides such as `aliases`, in `content/entities/people.yaml` | The list page for their office (`/prime-ministers`, `/governors-general`, a province page), or an explicit `page` |
| Institution | `org:senate` | `content/entities/institutions.yaml` | `page` (with optional `#anchor`) |
| Document, section | `doc:charter`, `doc:charter/s33` | `content/entities/documents.yaml`; sections nest under their document | `page`; `url` holds the official text |
| Case | `case:r-v-oakes` | `content/entities/cases.yaml` (year, citation, sections, one-line holding) | `/learn/charter/landmark-cases#<slug>` or `page` |
| Event | `event:king-byng-affair` | `content/entities/events.yaml` (date, era, text, `pages`, `people`, `entities`) | `/timeline#<slug>`, or `page` when one page tells the story |
| Term or concept | `term:reserve-powers` | The glossary: one file per term, `content/glossary/<slug>.en.md` | `/glossary#<slug>` |

YAML entity fields: `id` (slug only; the file gives the type), `name`, `short?`,
`aliases?`, `summary?`, `page?` (site path, may carry `#anchor`), `url?`, plus the
type's own fields. Entities may point at each other (`people`, `entities`, `sections`).

`src/lib/entities.ts` is the registry. It is **plain Node** (reads files with
`node:fs` from the project root; no `astro:` imports), because three callers need it:
the markdown plugin (runs in the Astro config), `scripts/validate.ts` (runs under
tsx) and pages. It exposes `allEntities()`, `getEntity(id)` (throws on unknown ids),
`hrefFor(id)` and `labelFor(id)`.

### Referring to an entity in markdown

An ordinary link whose destination is an entity id:

```md
the [reserve powers](term:reserve-powers) were last used in the [](event:king-byng-affair)
under [section 33](doc:charter/s33)
```

Empty link text means "use the entity's name". The `entityLinks` hast plugin
(`src/plugins/entities.ts`) rewrites the link to the entity's home and adds
`data-entity="type:slug"`. Because a term's home is `/glossary#slug`, glossary
popovers keep working unchanged. An unknown id is a build error, and
`pnpm validate` reports it too (it scans the markdown source, so it fails without a
build). Plain links to pages remain fine; use an entity link when the thing has an
identity beyond one page.

### `about:` front matter

`about: [org:senate, doc:constitution-act-1867/s24]` lists the entities a page is the
main explanation of (checked by `validate` and the schema). It drives backlinks and
related pages, and gives events and glossary terms somewhere to send the reader.

### Backlinks and related pages

`src/lib/semantic.ts` (Astro side) builds one index per build from every page's
`about` and its `data-entity` links:

- `pagesAbout(id)`: pages that list the entity in `about`.
- `mentions(id)`: pages (and glossary terms, events) that link to it.
- `relatedPages(page)`: pages about the entities this page mentions, then pages that
  mention the entities this page is about, ranked by overlap, excluding itself, its
  parent module and its neighbours in the reading order.

ContentLayout shows "Related pages" under the article. Each glossary term shows
"Explained in" (its `see` list plus pages about it) and "Mentioned in" (computed).
Timeline events link to their `pages` and to the list pages of their `people`.

### Glossary

One markdown file per term: `content/glossary/<slug>.en.md`, front matter
`{ term, aliases?, alias_of?, see?: [page ids or entity ids] }`, body = the definition
(normal markdown, so entity links and facts work inside definitions). They load as
the `glossary` collection and are excluded from the `pages` collection and from page
counts. `content/glossary.en.md` keeps the page's front matter and intro; the
`glossary` widget renders the A–Z list from the collection with the same `#slug`
anchors, so `/glossary#slug` links and popovers are unchanged.

### Facts registry

Values that change (seat counts, the majority threshold, who holds an office, the
latest population) come from `src/lib/facts.ts`, also plain Node. A fact is
`{ value, asOf?, source }`. Most are **derived** from committed data
(`commons.seats`, `commons.majority`, `senate.seats`, `pm.name`, `gg.name`,
`monarch.name`, `premier.<province-slug>.name`, `population.canada`, …); the few
that can't be derived sit in `content/facts.yaml` with an `asOf` date, a `source`
and a `# check:` comment.

In markdown, write `{{commons.seats}}`. The `facts` hast plugin
(`src/plugins/facts.ts`) replaces placeholders in text (including Mermaid sources)
before the other plugins run. `resolveFacts()` does the same for front-matter
strings (`title`, `summary`) in layouts, the search index and widgets. An unknown
key is a build error and a `validate` error. Numbers render with `en-CA` grouping;
`{{key|raw}}` gives the bare value.

Rule of thumb: if a re-run of a `pnpm data:*` script or an election could make a
sentence false, the changing part should be a fact.

## Checks

```bash
pnpm check      # types, including .astro files
pnpm validate   # internal links, quiz references, entity ids, fact keys
pnpm build      # full static build (also validates all front matter and data)
```

**Dev cache gotcha:** if you change a schema in `content.config.ts` without editing the
content files, delete `node_modules/.astro/data-store.json` and `.astro/data-store.json`
before restarting `pnpm dev`. Otherwise the dev server keeps entries parsed with the
old schema.

## Licence

Everything here is CC BY-SA 4.0 (see `LICENSE`). Third-party data and images keep their
own terms. Record them in `grounding/ATTRIBUTION.md` and on the `/credits` page.
