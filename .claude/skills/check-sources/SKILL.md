---
name: check-sources
description: Check every external source the site cites (links in content pages, facts.yaml and the entity YAML) and fix the ones that broke, moved or are still marked unverified. Use when asked to check links or sources, after a long gap between updates, or before a release of new pages.
argument-hint: "[host,host…] to check only some sites"
---

# Check the site's sources

The site cites about 550 external links. Pages rot: departments reorganise,
URLs move, documents get archived. This skill finds what broke and repairs the
citation, without changing what the page claims unless a source says otherwise.

## 1. Run the checker

```sh
pnpm sources --check            # or: pnpm sources --check --host canada.ca,parl.ca
```

It reports, in order:

- **Broken** (404/410): the cited page is gone.
- **Errors** (timeouts, 5xx, DNS): often temporary. Re-run just those hosts
  before changing anything; only treat a link as dead if it fails twice.
- **Moved** (redirected to another page): the new page may not say the same.
- **Blocked**: the site refuses automated requests (STYLE.md, "Sources", and
  `BLOCKING_HOSTS` in src/lib/sources.ts). **Never work around a bot check or
  CAPTCHA**, not with another User-Agent, another route or a headless browser.
  List them for a person to check in a browser.
- **Marked unverified but loaded fine**: candidates for dropping the
  `<!-- unverified link -->` marker, once you've read the page.

## 2. Fix each one

For each broken or moved link, open the cited place (`file:line`) and read what
the sentence claims. Then:

1. **Moved:** fetch the new page. If it supports the same claim, cite the new
   URL. If not, treat it as broken.
2. **Broken:** look for the same document at its new address (search the
   publisher's site for the title), then the Wayback Machine
   (`https://web.archive.org/web/2026*/<url>`) for an archived copy, then a
   different primary source for the same claim. Prefer, in order: the official
   publisher's current page, another official source, an archived copy.
3. If nothing supports the claim any more, don't delete the claim silently:
   leave a `<!-- check: source gone (date); … -->` marker and list it in the
   report.
4. The same URL is often cited in several places (`content/sources.en.md` lists
   most of them again). Change every occurrence.

Keep edits to the citation. If a source now says something different, that's a
correction: follow the fact-check skill's rules (state disagreement in the text,
attributed) and say so in the report.

`pnpm validate` runs after each content edit (a hook); fix anything it reports.

## 3. Record and report

- Append a dated section to `grounding/VERIFICATION.md` ("## Link check,
  YYYY-MM-DD"): a row per link changed (old → new, why) and the blocked links
  left for a person.
- Run `pnpm review` if you added or removed markers.
- Report to the user: counts by status, what you changed, and the links a
  person needs to check in a browser (with the page each is cited on).
