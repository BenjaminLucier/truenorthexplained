# Sitemap (draft)

Every page on the eventual site, and the content file behind each one.

## Principles

1. **Two depths.** Every module has one main page that stands on its own. Each "go
   deeper" topic gets its own child page, so main pages stay short.
2. **The tour is assembled, not written.** The 10-minute tour strings together the TL;DR
   of every module, so there's nothing extra to keep in sync.
3. **Stable IDs, translatable slugs.** Folder and file names are the stable English IDs.
   The French translation sits next to the English file (`index.en.md` → `index.fr.md`).
   French URLs can get French slugs later through front matter.
4. **Everything links to the glossary.** Any defined term can show a hover definition.
5. **Internal links use site paths** such as `/learn/crown`, never file paths. The app will
   resolve them, and they translate cleanly to `/fr/...`.
6. **Page status** is set in front matter: `stub` (empty), `draft` (written, not
   reviewed) or `reviewed`.

## Site tree

```
/                                   Home: the one-sentence answer + "Take the 10-minute tour"
├── /tour                           10-minute tour (assembled from module TL;DRs)
│
├── /learn                          All modules, in order
│   ├── /big-picture                0. The big picture + how the pieces connect (diagram)
│   │
│   ├── /constitution               1. The Constitution
│   │   ├── /constitution-act-1867      What's in the 1867 Act
│   │   ├── /patriation-1982            1982: bringing it home (and Quebec)
│   │   ├── /amending-formula           Why changing it is so hard
│   │   └── /conventions                The unwritten rules
│   │
│   ├── /crown                      2. The Crown
│   │   ├── /governor-general           The GG and Lieutenant Governors
│   │   ├── /reserve-powers             Reserve powers and the crises that tested them
│   │   └── /republic-question          Could Canada drop the monarchy?
│   │
│   ├── /parliament                 3. Parliament
│   │   ├── /how-a-bill-becomes-law     Visual flow
│   │   ├── /senate                     What the Senate is for
│   │   ├── /confidence                 Majority, minority, confidence votes
│   │   └── /question-period-and-committees
│   │
│   ├── /elections                  4. Elections & the Prime Minister
│   │   ├── /election-day               How a federal election actually runs
│   │   ├── /first-past-the-post        FPTP and the alternatives
│   │   ├── /party-leaders              How parties choose leaders
│   │   └── /cabinet-and-pmo            Cabinet, the PMO, and the Privy Council Office
│   │
│   ├── /federalism                 5. Federalism: who does what
│   │   ├── /division-of-powers         Sections 91 & 92 (interactive sorter)
│   │   ├── /money-and-equalization     Transfers and equalization
│   │   ├── /territories                Why territories aren't provinces
│   │   └── /municipalities             Cities are created by the provinces
│   │
│   ├── /government                 6. Government in action
│   │   ├── /departments                Ministers, deputy ministers, the public service
│   │   ├── /bank-of-canada-vs-mint     Who controls money
│   │   ├── /crown-corporations         CBC, Canada Post, VIA Rail…
│   │   ├── /watchdogs                  Officers of Parliament (Auditor General, PBO…)
│   │   └── /the-budget                 How federal spending gets approved
│   │
│   ├── /law                        7. The legal system
│   │   ├── /courts                     Court structure map
│   │   ├── /common-law-and-civil-law   Bijuralism and Quebec
│   │   ├── /criminal-law               Federal law, provincial enforcement
│   │   ├── /supreme-court              How a case gets there; judicial review
│   │   └── /judges                     Appointments and independence
│   │
│   ├── /charter                    8. Rights: the Charter
│   │   ├── /your-rights                The rights, in plain language
│   │   ├── /reasonable-limits          Section 1 and the Oakes test
│   │   ├── /notwithstanding-clause     Section 33
│   │   └── /landmark-cases             One paragraph each
│   │
│   └── /indigenous                 9. Indigenous peoples and the Crown
│       ├── /treaties                   Historic and modern treaties (map)
│       ├── /section-35                 Aboriginal and treaty rights
│       ├── /indian-act                 What it is and why it still matters
│       └── /self-government            Self-government agreements
│
├── /provinces                      Map + comparison table of all 13
│   ├── /alberta
│   ├── /british-columbia
│   ├── /manitoba
│   ├── /new-brunswick
│   ├── /newfoundland-and-labrador
│   ├── /nova-scotia
│   ├── /ontario
│   ├── /prince-edward-island
│   ├── /quebec
│   ├── /saskatchewan
│   ├── /northwest-territories
│   ├── /nunavut
│   └── /yukon
│
├── /timeline                       History (was module 10): only events referenced elsewhere
├── /glossary                       Every defined term, A–Z
├── /myths                          Myths vs. facts
├── /quizzes                        Quiz on anything (a page, a module, a province, or everything) + progress
├── /sources                        Primary sources used across the site
└── /about                          Why this exists; written by a learner
```

**Count:** 1 home + 1 tour + 10 module pages + 37 deep dives + 1 provinces index +
13 province/territory pages + 6 reference pages = **69 pages**.

## Content folder layout

This mirrors the URLs. Only `*.en.md` files exist for now.

```
content/
├── home.en.md
├── learn/
│   ├── 00-big-picture/
│   │   └── index.en.md
│   ├── 01-constitution/
│   │   ├── index.en.md
│   │   ├── constitution-act-1867.en.md
│   │   ├── patriation-1982.en.md
│   │   ├── amending-formula.en.md
│   │   └── conventions.en.md
│   └── …                           (same pattern for 02–09)
├── provinces/
│   ├── index.en.md
│   ├── alberta.en.md
│   └── …
├── timeline.en.md
├── glossary.en.md
├── myths.en.md
├── sources.en.md
├── about.en.md
└── quizzes/                        Global question bank (see "Quizzes" below)
    ├── big-picture.en.yaml
    ├── constitution.en.yaml
    ├── …                           one file per module
    └── provinces.en.yaml
```

The number prefixes (`01-`) only set the order. URLs drop them. `/tour` and `/quizzes`
have no page files of their own: they're generated from module content and the
question bank.

## Page templates

### Module main page (`index.en.md`)

```markdown
---
id: crown
title: The Crown
order: 2
summary: One-line hook
deep_dives: [governor-general, reserve-powers, republic-question]
---

## TL;DR            <!-- one paragraph; reused by /tour -->
## Core             <!-- 3–5 minute read -->
## Misconceptions
## Sources
```

The end-of-page quiz is added automatically from the question bank (see "Quizzes"
below). A page never contains its questions.

### Deep dive

```markdown
---
id: reserve-powers
parent: crown
title: Reserve powers
---

## In short
## The details
## Sources
```

### Province / territory

```markdown
---
id: quebec
type: province            # or territory
capital: Quebec City
joined: 1867
---

## At a glance          <!-- legislature name, seats, crown rep, head of government -->
## How it's governed    <!-- legislature, premier, LG or Commissioner -->
## What makes it different
## Courts
## Local government
## Sources
```

The "What makes it different" section carries most of the interest. A few examples:

- **Quebec** has the National Assembly and civil law.
- **Nunavut and the Northwest Territories** use consensus government, with no political
  parties.
- **Territories** have a Commissioner instead of a Lieutenant Governor.

## Quizzes

All questions live in **one global bank**, kept in `content/quizzes/`. Each question has
a stable ID and says which pages it belongs to. Every quiz on the site is just a filter
over the bank:

| Quiz | Which questions it uses |
|---|---|
| End of a page | Questions tagged with that page |
| A whole module | Questions tagged with any page in that module (`learn/crown/*`) |
| A province | `provinces/quebec` |
| All provinces | `provinces/*` |
| A theme that cuts across modules | Questions with that `tags` value (e.g. `money`) |
| Everything | The whole bank |

### Question format

```yaml
- id: crown-head-of-state          # globally unique, never changes, never reused
  pages: [learn/crown]             # page(s) this question belongs to
  tags: [monarchy]                 # optional cross-cutting themes
  type: single                     # single | multi | true-false
  question: Who is Canada's head of state?
  options:
    - The Prime Minister
    - The Governor General
    - The King
    - The Chief Justice of Canada
  answer: 2                        # index into options; a list for `multi`
  explanation: >
    The King is head of state. The Governor General represents him in Canada,
    and the Prime Minister is head of government.
  source: <primary source URL>
```

For `type: true-false`, leave out `options` and set `answer: true` or `answer: false`.

### Rules

- **Pages don't list their questions.** A question says which pages it belongs to, so
  each fact about membership is recorded in only one place.
- **Hand-picking is still possible.** A page can use front matter
  `quiz: [crown-head-of-state, …]` to choose specific questions or set their order.
  Without it, the page uses every question tagged with it.
- **Inline embeds (optional).** Writing `{{quiz crown-head-of-state}}` in a page body
  places a single question right where the related idea is explained.
- **Translation:** `crown.fr.yaml` keeps the same IDs and option order. Only the text
  changes.
- **Progress** is saved in localStorage by question ID, so a question you answered on a
  page also counts in the module quiz and the everything quiz.
