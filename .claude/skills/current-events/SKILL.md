---
name: current-events
description: Bring the site up to date with recent Canadian political and legal events. Works through the freshness report and watchlist, checks the monitored official sources for what changed since the last update, then updates facts, data, timeline events and the watchlist, each with a source. Use when asked what's changed, to catch up on the news, to update the site, or when the session-start freshness line shows items due.
argument-hint: "[since YYYY-MM-DD] (default: the newest timeline event)"
---

# Catch the site up with current events

The site explains how things work, so most pages don't change with the news.
What does change is held in a few typed places, and this skill updates those:

| What changed | Where it lives | How to update |
|---|---|---|
| Office holders (PM, premiers, GG, Chief Justice, monarch), MPs, seat counts | `src/data/**` from Wikidata, Elections Canada | `pnpm refresh --only premiers,elections,portraits` |
| A single value with no dataset (committee count, next renewal date) | `content/facts.yaml` (`value`, `asOf`, `source`) | edit the entry; set `asOf` to today |
| Something happened (an election, a ruling, a law passed, a swearing-in) | `content/entities/events.yaml` | add an event with `sources:` (schema at the top of the file) |
| A ruling the site should explain | `content/entities/cases.yaml` + an event | add the case; link it from the relevant page |
| Something expected but not yet happened | `content/watchlist.yaml` | add an item with `checkBy` and `then` |

Pages read all of these at build time, so update the data, not the prose.
Prose changes only when how something works changes (a new law, a ruling that
changes the rules).

## 1. See what's due

```sh
pnpm freshness --all
```

Work through, in order: overdue and due watchlist items, stale datasets, stale
facts, the timeline's newest event, and dated phrases ("as of 2025").

## 2. Look for what happened

Decide the window: from the argument, or from the newest timeline event's date.
Then check each source in [monitor.md](monitor.md) for that window. Read the
primary source, not a news story about it, whenever one exists; a news report
is a lead, and Wikipedia is a lead, never the only source for something recent.

For each finding, decide:

- **Does the site already cover it?** Search content/ (`rg`) for the person,
  bill or case.
- **Is it settled?** A bill at second reading, a reported resignation or a
  leaked decision is not yet a change. Add a watchlist item instead.
- **Is it within scope?** The site covers how government works, institutions,
  rights and the provinces. A policy announcement usually isn't an event for
  the timeline; a change in who holds an office, a constitutional or electoral
  change, a major ruling, a new law that changes how something works, is.

## 3. Make the changes

- **Datasets first.** Run the matching `pnpm data:*` or `pnpm refresh --only …`
  step, then `git diff --stat src/data` and read what changed. Never hand-edit
  generated JSON.
- **Facts:** update `value`, `asOf` (today) and `source` (a URL a reader can
  open). Remove the entry's `# check:` comment only if you confirmed the value
  against that source.
- **Events:** id a readable slug with the year, date only as precise as the
  source supports, one or two plain sentences, `era`, `pages`, `sources`
  (official first). Keep the file in date order within the era. Don't rename
  existing ids (they're anchors).
- **Watchlist:** delete items that happened (git keeps them), move `checkBy`
  on items that slipped, add new expected changes with a source.
- **Where sources disagree** or something is reported but unconfirmed, say so in
  the text, attributed: "The Premier's Office announced X; as of {date} it had
  not been published in the Gazette." No silent guesses, no hidden markers.
- Write in the site's voice (STYLE.md): neutral, plain, Canadian spelling, no
  current office holders named in body text (use `{{facts}}`).

`pnpm validate` runs after each content edit (a hook). When done:

```sh
pnpm check && pnpm test && pnpm freshness
```

## 4. Report

A short list: what changed in the world, what you updated (file and one line
each, with the source), what you added to the watchlist, and what you couldn't
confirm. Don't change any page's `status:` front matter; that's the
maintainer's sign-off.
