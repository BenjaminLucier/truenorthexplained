# True North Explained

A static Astro site explaining how Canada works. Read README.md (commands),
ARCHITECTURE.md (how pages, facts, entities and widgets fit together) and
STYLE.md (voice and sourcing) before changing content.

- Node from `.nvmrc`, pnpm. Before finishing: `pnpm check`, `pnpm validate`,
  `pnpm test`; `pnpm test:e2e` for layout or widget changes.
- Changing values go in `{{facts}}` (`content/facts.yaml` or derived data), events
  in `content/entities/events.yaml`, expected changes in `content/watchlist.yaml`.
  Generated data in `src/data/` comes from `pnpm data:*` scripts: never hand-edit it.
- Every claim needs a source a reader can open. Where sources disagree, say so in
  the text, attributed.
- Never change a page's `status:` front matter: that's the maintainer's sign-off.
- Never work around a bot check, CAPTCHA or 403 when fetching sources.

Skills in `.claude/skills/`: `/current-events` (catch up with recent events),
`/check-sources` (find and fix broken citations), `/fact-check` (verify pages
claim by claim). A hook runs `pnpm validate` after every edit under `content/`.
