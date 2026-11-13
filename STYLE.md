# Writing style guide

How every page on True North Explained is written. The model page is
[content/learn/00-big-picture/index.en.md](content/learn/00-big-picture/index.en.md).

## Voice

- **Plain language for someone who knows nothing.** Define every term the first time
  it's used. Short sentences.
- **Neutral and calm.** Explain how things work, not whether they're good. Where people
  genuinely disagree (Senate reform, electoral reform, the monarchy, the
  notwithstanding clause), say so and summarize the main positions fairly in a sentence
  or two each.
- **Correct before clever.** Never state something you aren't sure of. If a claim needs a
  human to double-check it, leave a `<!-- check: … -->` comment beside it.
- **Canadian spelling** (centre, honour, defence, licence as a noun).
- **No US-centric framing.** A brief comparison is fine when it clears up a common
  confusion, as Module 0 does. Never make comparison the main explanation.

## Things that go out of date

- Don't name current officeholders (PM, premiers, Governor General, Chief Justice)
  in the body text.
- When a number or fact will change (seat counts, who holds an office, recent
  amendments), put it in an "As of" note:

  ```markdown
  > **As of 2026:** The House of Commons has {{commons.seats}} seats.
  ```

- Write a changing value as a **fact** when one exists: `{{commons.seats}}`,
  `{{commons.majority}}`, `{{monarch.name}}`, `{{premier.ontario.name}}`. It's filled
  in from the site's data at build time, so a data refresh updates every page. The
  list of keys is in ARCHITECTURE.md ("Facts registry"). Facts work in body text, in
  Mermaid diagrams and in `title` and `summary`, but not in headings. Only use them
  for statements about now ("is King of Canada"), never for history ("Mary Simon
  (2021) was the first Indigenous Governor General" stays as written). If a value
  can't be derived, add it to `content/facts.yaml` with a source and a `# check:`
  comment, or leave it in the text with a `<!-- check: … -->` comment.

## Page structure

Follow the templates in [SITEMAP.md](SITEMAP.md) exactly: the front matter keys and the
section headings.

- **Module main page:** TL;DR is one paragraph (it's reused by the tour). The Core
  section is a 3–5 minute read (roughly 700–1,200 words). Add Misconceptions (3–5) and
  Sources.
- **Deep dive:** "In short" is 2–4 sentences. "The details" is roughly 400–900 words,
  using subheadings, tables and lists freely. Add Sources.
- **Province / territory:** sections as in the template. "What makes it different" is
  the heart of the page.
- Fill in the `summary:` front matter with one line, and change `status: stub` to
  `status: draft`.

## Formatting

- Use tables for comparisons, numbered lists for processes, and bold for key terms on
  first use.
- Use **Mermaid** diagrams (```` ```mermaid ````) where a picture explains a process or
  structure: bill flow, court hierarchy, the confidence chain. Keep them small and use
  `flowchart TD` or `flowchart LR`.
- Describe richer future visuals with a comment for the app phase, for example
  `<!-- visual: interactive sorter of s.91 vs s.92 powers -->`.
- **Callouts** set a short passage apart. Write a blockquote whose first line is a
  marker (GitHub's alert syntax; Sätteri doesn't parse alerts itself, so a small
  plugin in `src/plugins/markdown.ts` turns them into callouts):

  ```markdown
  > [!NOTE]
  > Canada stopped distributing the penny in 2013.
  ```

  | Marker | Shown as | Use it for |
  |---|---|---|
  | `[!NOTE]` | Did you know? | A memorable fact or example that's interesting but not essential |
  | `[!IMPORTANT]` | Key point | The one idea in a section a reader must take away |
  | `[!MYTH]` | Common myth | A widespread misunderstanding, stated in bold, then corrected |

  Use them sparingly: at most one or two per page, and never for "As of" notes, which
  stay plain blockquotes. The facts in a callout follow the same sourcing rules as the
  rest of the page.
- **Glossary links** (`[riding](term:riding)`, or the older `[riding](/glossary#riding)`)
  show the term's definition in a popover on hover or focus, taken from the glossary
  entry. Link a term's first use on a page when a reader might not know it.
- **Entity links** point at a thing rather than a page: a term, person, institution,
  document or section, case or event. Write the entity id as the link target, and
  leave the text empty to use the entity's name:

  ```markdown
  [reserve powers](term:reserve-powers) · [](event:king-byng-affair) · [Lord Byng](person:julian-byng)
  [section 33](doc:charter/s33) · [*R. v. Oakes*](case:r-v-oakes) · [the Senate](org:senate)
  ```

  The link goes to the page that explains the thing best, and the page shows up in
  that thing's backlinks and in "Related pages". The ids live in `content/entities/`
  (people come from the site's data: `person:` plus the name in lowercase with
  hyphens). A wrong id fails `pnpm validate` and the build, with a suggestion.
- **`about:`** in front matter lists the entities a page is the main explanation of:
  `about: [doc:charter/s33, term:notwithstanding-clause]`. Keep it short; it's for
  the page's subject, not everything it mentions.
- **Timelines.** Wrap a dated list or table in `<tn-widget name="timeline">` to show it as
  an interactive timeline (see `src/widgets/timeline/index.astro` for the options). The
  markdown inside stays the source of the facts.
- **Internal links** use site paths: `/learn/<module>`, `/learn/<module>/<deep-dive>`,
  `/provinces/<id>`, `/glossary`. Never use file paths.
- Link generously across modules where a reader would naturally want to jump.

## Sources

- Prefer primary and official sources: legislation on Justice Laws, Parliament, Elections
  Canada, the Governor General, the courts, federal departments, provincial
  legislatures and governments. Use reputable secondary sources (for example the
  Canadian Encyclopedia) only when no official page covers the point.
- Cite specific sections where you can (for example "s. 91(27): criminal law").
- Only cite URLs you've confirmed load, or ones listed below. If you can't confirm one,
  mark it `<!-- unverified link -->`.

### Confirmed URLs

| Topic | URL |
|---|---|
| Constitution Acts: table of contents | https://laws-lois.justice.gc.ca/eng/const/ |
| Constitution Act, 1867 (starts here) | https://laws-lois.justice.gc.ca/eng/const/page-1.html |
| Constitution Act, 1867, ss. 51–90 | https://laws-lois.justice.gc.ca/eng/const/page-2.html |
| Constitution Act, 1867, ss. 91–116 (division of powers) | https://laws-lois.justice.gc.ca/eng/const/page-3.html |
| Constitution Act, 1982 / Charter (ss. 1–34) and s. 35 | https://laws-lois.justice.gc.ca/eng/const/page-12.html |
| Constitution Act, 1982, ss. 36–61 (amending formula, s. 52) | https://laws-lois.justice.gc.ca/eng/const/page-13.html |
| Canada Elections Act | https://laws-lois.justice.gc.ca/eng/acts/E-2.01/ |
| Parliament of Canada Act | https://laws-lois.justice.gc.ca/eng/acts/P-1/ |
| LEGISinfo (bill tracker) | https://www.parl.ca/legisinfo/en/index |
| Senate: about | https://sencanada.ca/en/about/ |
| Privy Council Office | https://www.canada.ca/en/privy-council.html |
| Auditor General (oag-bvg.gc.ca now redirects here) | https://www.canada.ca/en/auditor-general/ |
| The Crown in Canada (Canadian Heritage) | https://www.canada.ca/en/canadian-heritage/services/crown-canada.html |
| Governor General: role | https://www.gg.ca/en/governor-general/role-and-responsibilities |
| House of Commons: "Our Procedure" | https://www.ourcommons.ca/procedure/our-procedure/ |
| House of Commons: Members | https://www.ourcommons.ca/members/en |
| Discover Canada (citizenship guide) | https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada.html |
| About Canada's System of Justice | https://www.justice.gc.ca/eng/csj-sjc/just/index.html |
| Supreme Court: judicial work | https://www.scc-csc.ca/about-apropos/work-travail/judicial-judiciaire/ |
| Bank of Canada: about | https://www.bankofcanada.ca/about/ |
| Royal Canadian Mint (home) | https://www.mint.ca/ |

Known bad: `mint.ca/en/about-the-mint` returns 404.

These sites block automated checking (they return 403 or show a bot check), so links to
them can't be confirmed this way: `lop.parl.ca`, `thecanadianencyclopedia.ca`,
`legisquebec.gouv.qc.ca`, `assembly.pe.ca`, `courts.pe.ca`, `yukonassembly.ca`, and the
Supreme Court decision sites `decisions.scc-csc.ca` and `scc-csc.lexum.com`. They're legitimate
sources; a human should check those links in a browser.

## Quizzes

- Add questions to the module's file in `content/quizzes/` using the format in
  SITEMAP.md. Follow [content/quizzes/big-picture.en.yaml](content/quizzes/big-picture.en.yaml)
  as the example.
- **IDs** are `<module-id>-<short-slug>` and must be unique across the whole site.
  Provinces use `<province-id>-<slug>`.
- **`pages`** uses site paths without a leading slash: `learn/crown`,
  `learn/crown/reserve-powers`, `provinces/quebec`. A question can belong to more than
  one page.
- **How many:** 4–6 per module main page, 2–3 per deep dive, and 3 per province or
  territory.
- Every question needs an explanation and a source. Wrong options should be
  plausible, never silly. Test understanding, not trivia such as dates, unless the date
  is the point.
- Run `pnpm validate` to check internal links and quiz page references, and
  `pnpm build` to validate front matter and quiz fields. `pnpm review` regenerates
  REVIEW.md, the list of every `check` and `unverified link` marker.
