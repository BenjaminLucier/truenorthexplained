# Grounding corpus

Raw reference material pulled from Wikipedia, Wikidata, Wikimedia Commons and
Statistics Canada. It's **grounding context** for writing and fact-checking the site:
not published as-is, but kept in the repo so that each re-fetch shows up as a reviewable
git diff.

## What's here

| Path | What it is | Licence |
|---|---|---|
| `sources.yaml` | The list of Wikipedia pages to fetch, grouped by topic | CC BY-SA 4.0 (this repo) |
| `wikipedia/<slug>.wiki` | Raw wikitext of each page: infoboxes, tables and references intact | CC BY-SA 4.0 (Wikipedia) |
| `wikipedia/<slug>.txt` | Plain-text extract of the same page, one paragraph per line, headings as `== Heading ==` | CC BY-SA 4.0 (Wikipedia) |
| `manifest.json` | Fetch log: each page's title, revision id and when that revision was first fetched; run times | — |
| `ATTRIBUTION.md` | Licences and credits for everything the script downloads | — |
| `DISCREPANCIES.md` | Facts in `content/` checked against this corpus | — |

The same script also writes the site's reference datasets:

| Path | Source |
|---|---|
| `src/data/wikidata/*.json` | Wikidata SPARQL (CC0): prime ministers, monarchs, governors general, chief justices, provinces and territories, census populations |
| `src/data/statcan/*.json` | Statistics Canada tables (OGL – Canada): population, immigration, age |
| `public/flags/*.svg` + `src/data/flags.json` | Wikimedia Commons flag files (P41 on Wikidata) and their licences |

## Re-running it

```bash
fnm exec --using=26 pnpm grounding                    # everything (a few minutes)
fnm exec --using=26 pnpm grounding --only wikipedia   # just the Wikipedia pages
fnm exec --using=26 pnpm grounding --only wikidata,flags
```

Steps: `wikipedia`, `wikidata`, `flags`, `statcan`. The code is in `scripts/grounding/`.

The script is **deterministic and idempotent**. Output is sorted, formatted the same way
every time, and per-page files contain no timestamps. A Wikipedia page is only
downloaded again when its revision id changes. A dataset's `_meta.fetched` date only
moves when its data changes. So a re-run with no upstream changes leaves everything
untouched except the `runs` times in `manifest.json`.

It's polite to Wikimedia: at most four requests at a time, `maxlag=5` on API calls,
retries with exponential backoff (honouring `Retry-After`), and a descriptive
User-Agent with no personal details.

### Adding or removing pages

Edit `sources.yaml`: add a title under the right topic, or delete one. Titles are
resolved through the API, so redirects are fine; the file is named after the page the
title resolves to. A title that doesn't exist is reported and skipped. Removing a title
deletes its files on the next run.

### Sanity checks

The Wikidata step fails rather than write something wrong. It checks, among other
things, that Mark Carney is the 24th Prime Minister from March 14, 2025, that Macdonald,
King and Pierre Trudeau have the right number of terms, that exactly one person holds
each office, that every province has complete data, and that the current Prime Minister,
monarch, Governor General and Chief Justice match the infobox of the office's Wikipedia
page. Current premiers are taken from the Wikipedia infobox when Wikidata lags behind,
and the difference is recorded in `premier.check` in `provinces.json`.

## Using the diff to update content

1. Run `pnpm grounding` on a clean working tree.
2. Review `git diff --stat`, then the diff itself:
   - `grounding/wikipedia/*.txt` is the quickest to read. Look for changed numbers,
     dates, officeholders and new sections.
   - `grounding/wikipedia/*.wiki` shows the same change with infobox fields, which is
     often clearer for facts such as `incumbent`, `seats` or `population`.
   - `src/data/**` diffs mean the charts and tables will change on the next build. Check
     the build output looks right.
3. For each change that matters, search `content/` for the old fact
   (`rg "343 seats" content`) and update the page, its "As of" note and any quiz
   question. Prefer confirming against the official source the page cites; Wikipedia is
   a pointer, not the final word.
4. Update `DISCREPANCIES.md` if you resolve or find a mismatch.
5. Commit the corpus and the content changes together, so the history shows why the
   content changed.

`manifest.json` tells you when each page's current revision was first fetched and links
to the page, so you can open the revision history on Wikipedia to see who changed what.
