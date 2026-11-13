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
  entities/              Entity registry YAML (institutions, documents, cases, events, people overrides)
  facts.yaml             Facts that can't be derived from src/data
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

| Type | Id example | Lives in | Home (default) |
|---|---|---|---|
| Person | `person:william-lyon-mackenzie-king` | Derived from `src/data/wikidata/{prime-ministers,governors-general,monarchs,chief-justices,premiers}.json` (the JSON is never copied). Others, and overrides, in `content/entities/people.yaml` | The row for their highest office: `/prime-ministers#pm-N`, `/governors-general#gg-N`, `/governors-general#monarch-N`, `/governors-general#cj-N` (monarchs and chief justices are listed there too), or `/provinces/<slug>` for premiers |
| Institution | `org:senate` | `content/entities/institutions.yaml` | `page` (required) |
| Document, section | `doc:charter`, `doc:charter/s33` | `content/entities/documents.yaml`; sections nest under their document | `page` (required); a section defaults to its document's page and `url` |
| Case | `case:r-v-oakes` | `content/entities/cases.yaml` | `/learn/charter/landmark-cases#<slug>` |
| Event | `event:king-byng-affair` | `content/entities/events.yaml`, which also lists the timeline's `eras` | `/timeline#<slug>` |
| Term or concept | `term:reserve-powers` | The glossary (today: the `### Term {#slug}` headings of `content/glossary.en.md`, read by `glossaryTermSources()`; later one file per term, see below) | `/glossary#<slug>` |

An explicit `page` always replaces the default home. Each YAML file starts with a
comment listing its fields; `src/lib/entities.ts` has the matching types. Fields every
YAML entity can have: `id` (slug only; the file gives the type), `name`, `short`,
`aliases`, `summary`, `page` (a site path, may carry `#anchor`), `url`. Then, by type:

- **org**: `people` (person ids), `entities` (any ids).
- **doc**: `year`, `entities`, `sections`: a list of `{ n, title?, name?, short?,
  summary?, page?, url? }`. `n` is the number as written (`33`, `"92A"`, `"91(24)"`); the
  section id is `s` plus its slug: `doc:constitution-act-1867/s92a`, `…/s91-24`. A
  section's `name` defaults to "section 92A" and `short` to "s. 92A".
- **case**: `year` and `holding` (required; one line, inline markdown), `citation`,
  `sections` (doc or section ids), `tag` (the free-text label of the landmark-cases
  table, "s. 1, s. 11(d)"), `topic` (the subject in its heading), `people`, `entities`.
- **event**: `title`, `date`, `text` (inline markdown) and `era` (required); `end`,
  `module` (a learn module key; otherwise the first `/learn/…` page decides), `pages`
  (site paths, or `{ page, label }` to set the link text), `people`, `entities`;
  `name` defaults to `title`. `date` and `end` are a year (`1926`) or an ISO date
  (`1926-06`, `1926-06-28`). `eras` is a list of `{ id, title }`.
- **person** (people.yaml): with `qid`, an override of a derived person (`id` may
  rename them; `page` replaces the derived home). Without `qid`, a new person:
  `name` and `page` are required.

Person ids are the slug of the name (`slugify(name, 80)` from `src/lib/ids.ts`). The
same person in several datasets (Charles Tupper was premier, then prime minister) is
merged by Wikidata id, and their highest office gives the name and home (prime
minister, Governor General, monarch, chief justice, premier). When two different
people share a name, the one holding the higher office (then the earlier one) keeps
the plain slug and the other gets the year they first took office
(`person:daniel-johnson-1994`); `pnpm validate` prints a NOTE for each. Rename either
in people.yaml with `qid` + `id`.

`src/lib/entities.ts` is the registry. It is **plain Node** (reads files with
`node:fs` from the project root, found by `src/lib/project-root.ts`; no `astro:`
imports), because three callers need it: the markdown plugins (run in the Astro
config), `scripts/validate.ts` (runs under tsx) and pages, plus tests. It exposes
`allEntities()`, `getEntity(id)` (throws, suggesting the nearest id), `hasEntity(id)`,
`hrefFor(id)`, `labelFor(id)`, `eras()` and `checkEntityPages(validPaths)`. Loading
checks the YAML (unknown fields, types, duplicate ids, references between entities)
and throws one error listing every problem with its file and id. Whether each `page`
exists is checked by `pnpm validate`, which knows the site's paths; anchors are not
checked.

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

Sätteri collects `ctx.report()` diagnostics without failing the compile, so the
plugins throw as well; that is what stops the build.

### `about:` front matter

`about: [org:senate, doc:constitution-act-1867/s17]` lists the entities a page is the
main explanation of (checked by `validate` and the schema). It drives backlinks and
related pages, and gives events and glossary terms somewhere to send the reader.

### Backlinks and related pages

`src/lib/semantic.ts` (Astro side) builds one index per build (in dev, per call)
from every page's `about` and the `data-entity` links in its rendered HTML:

- `pagesAbout(id)`: pages that list the entity in `about`.
- `mentions(id)`: `{ pages, entities }`: pages that link to it, and entities that
  name it in `people`, `entities` or `sections`.
- `relatedPages(page)`: `{ page, via, score }[]`, at most four. A page counts as
  being about the entities in its `about` and those whose home is on it. Scoring is
  the pure `rankRelated()` in `src/lib/related.ts`: 3 points for each entity this page
  links to that the other is about, 2 for each entity both are about, 1 for each
  entity this page is about that the other links to. It leaves out the page itself,
  hub pages (home, glossary, timeline, sources, myths, credits, about), the module's
  main page and the neighbours in the reading order; hub pages get no suggestions.

ContentLayout shows "Related pages" under the quiz, above previous/next, and nothing
when there are none. Planned: each glossary term shows "Explained in" (its `see`
list plus pages about it) and "Mentioned in"; timeline events link to their `pages`
and to the list pages of their `people`.

### Glossary

Planned. One markdown file per term: `content/glossary/<slug>.en.md`, front matter
`{ term, aliases?, alias_of?, see?: [page ids or entity ids] }`, body = the definition
(normal markdown, so entity links and facts work inside definitions). They load as
the `glossary` collection and are excluded from the `pages` collection and from page
counts. `content/glossary.en.md` keeps the page's front matter and intro; the
`glossary` widget renders the A–Z list from the collection with the same `#slug`
anchors, so `/glossary#slug` links and popovers are unchanged. Switching `term:`
entities over means changing `glossaryTermSources()` in `src/lib/entities.ts`.

### Facts registry

Values that change (seat counts, the majority threshold, who holds an office, the
latest population) come from `src/lib/facts.ts`, also plain Node. A fact is
`{ value, asOf?, source }`. Most are **derived** from committed data; the few that
can't be derived sit in `content/facts.yaml` with an `asOf` date, a `source` and a
`# check:` comment. A key can't be both.

| Keys | From |
|---|---|
| `commons.seats`, `commons.majority` (checked against floor(seats/2)+1), `commons.seats.<province>` | `src/data/parliament/commons.json`, `seat-allocation.json` |
| `ridings.count` | `src/data/elections/2025/ridings.json` |
| `senate.seats`, `senate.seats.<province>` | `src/data/parliament/senate.json` |
| `pm.name`, `pm.ordinal` ("24th"), `pm.since`, `pm.party`, `pm.count` | `src/data/wikidata/prime-ministers.json` |
| `gg.*`, `monarch.*`, `chief-justice.*`: `.name`, `.since` ("September 8, 2022"), `.since-year` | `src/data/wikidata/{governors-general,monarchs,chief-justices}.json` |
| `premier.<province>.name`, `.party`, `.since` | `src/data/wikidata/premiers.json` |
| `population.canada`, `population.<province>`, each with `.rounded` ("41.8 million"); `population.as-of` | `src/data/population/provinces.json` (latest quarterly estimate) |
| `elections.count`, `elections.latest.year` | `src/data/elections/history.json` |

`<province>` is the site's slug (`british-columbia`). Numbers render with `en-CA`
grouping and `{{key|raw}}` gives the bare value, so years are stored as strings.

In markdown, write `{{commons.seats}}`. The `facts` hast plugin
(`src/plugins/facts.ts`) runs first, so Mermaid sources see the resolved text (and the
diagram's id hash follows what is drawn). It skips inline code and other code blocks,
so the syntax can be shown. Placeholders don't work in headings (`{…}` there is read
as attributes), and Mermaid hexagon nodes (`A{{text}}`) can't be used. For front
matter, `allPages()` in `src/lib/site.ts` runs `resolveFacts()` over `title`,
`summary` and the home page's `hero` and `ideas`, so layouts, cards, navigation,
`<meta name="description">` and the search index all get resolved text. An unknown
key is a build error and a `validate` error; a placeholder left in a rendered page
fails the build too.

**Cache:** `facts` and `entityLinks` carry a `cacheKey`, a hash of every fact value
and every entity's home and name. It is part of the Astro config, so Astro drops its
cached markdown when a dataset or YAML change alters what a page would render, even
if no page changed. The dev server only rereads the config on restart.

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
