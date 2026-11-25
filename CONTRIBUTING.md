# Contributing

Thanks for helping out! The most useful contribution is a correction: if
something on the site is wrong, out of date or misleading, please say so.

## Before you start

- **Factual errors and out-of-date information:** open a
  [correction](https://github.com/BenjaminLucier/truenorthexplained/issues/new?template=correction.yml) with the page, what's
  wrong and a source. A PR that fixes the text directly is just as welcome.
- **Bugs** (something broken, hard to read or inaccessible): open a bug report,
  or a PR.
- **New pages, widgets and larger changes:** please open an issue first so we
  can agree on the approach before you spend time on it.
- Keep PRs small and focused, and justify every new dependency.
- By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Sources

Every factual claim needs a source a reader can check, preferably a primary
one: legislation, a court decision, a government or Parliament page, Elections
Canada, Statistics Canada. Wikipedia is fine for leads but not as the only
source for a contested or recent claim.

- Numbers that change (seats, office holders, dates of the next election) live
  in `content/facts.yaml` with `asOf` and `source`, and pages use them as
  `{{key}}` placeholders. Update the fact, not the page.
- Timeline events in `content/entities/events.yaml` take `sources:`.
- Where sources disagree, say so in the text ("Elections Canada reports X;
  some sources give Y").
- Write in plain language for a general reader, in Canadian English.

[STYLE.md](STYLE.md) covers how pages are written and sourced, and
[ARCHITECTURE.md](ARCHITECTURE.md) how pages, facts, entities and widgets fit together.

## Building

Requires Node (the version in `.nvmrc`; `fnm use` picks it up) and
[pnpm](https://pnpm.io).

```sh
pnpm install
pnpm exec playwright install chromium   # renders Mermaid diagrams at build time
pnpm dev                                # http://localhost:4321
```

## Checks

CI runs the following, and all must pass:

```sh
pnpm check                  # type-check
pnpm validate               # links, entity ids, glossary terms, fact keys
pnpm test                   # unit tests
pnpm build                  # static build and search index
pnpm exec playwright test   # browser and accessibility tests against the build
```

`pnpm test:e2e` runs the last two together. For a text-only correction,
`pnpm validate` is usually enough locally; CI runs the rest.

## Commit messages and PR titles

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
`fix:` for corrections and bugs, `feat:` for new pages or features, and
`docs`, `refactor`, `test`, `perf`, `ci` or `chore` for the rest.

PRs are squash-merged, so the **PR title** becomes the commit message, and CI
checks that it is a Conventional Commit.

## Who decides

This project is maintained by one person, who reviews every change and makes
the final call on direction. That's a matter of scale, not a closed door: if
you contribute regularly and want a bigger role, such as reviewing or looking
after a part of the site, say so in an issue. This section will change as the
project gains maintainers.

## License

Everything in this repository, text and code, is licensed under
[CC BY-SA 4.0](LICENSE), except data with its own terms (see the README's
"Licence" section). By submitting a contribution you agree that it is licensed
under CC BY-SA 4.0. There is no CLA and no sign-off requirement.
