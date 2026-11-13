# True North Explained

A plain-language guide to how Canada works, legally and politically: the Crown,
Parliament, elections, federalism, the courts, the Charter, Indigenous rights, and all
13 provinces and territories. Every page ends with a short quiz, and progress is saved
in the reader's own browser.

Live at **[truenorthexplained.ca](https://truenorthexplained.ca)**.

## How it's built

- **[Astro](https://astro.build)** generates a fully static site from the markdown in
  `content/`.
- **Tailwind CSS v4** with semantic design tokens such as `bg-surface`, `text-primary`
  and `accent`. Every colour has a light and a dark value.
- **Vanilla TypeScript** custom elements handle the few interactive parts: the theme
  toggle, the mobile menu and the quizzes. There is no UI framework.
- **Mermaid** diagrams are rendered to SVG at build time.
- **TypeScript 7.1**, which also type-checks `.astro` files through
  `@astrojs/ts-content-mapper`.

## Getting started

Requires [fnm](https://github.com/Schniz/fnm) (or any Node version manager) and
[pnpm](https://pnpm.io).

```bash
fnm use                                  # Node version from .nvmrc
pnpm install
pnpm exec playwright install chromium    # used to render Mermaid diagrams
pnpm dev                                 # http://localhost:4321
```

| Script | What it does |
|---|---|
| `pnpm dev` | Local dev server with hot reload |
| `pnpm build` | Static build into `dist/` (validates all front matter and quiz data) |
| `pnpm preview` | Serve the built site |
| `pnpm check` | Type-check `.ts` and `.astro` files |
| `pnpm validate` | Check internal links and quiz page references |
| `pnpm review` | Regenerate [REVIEW.md](REVIEW.md), the list of facts and links awaiting review |

## Project layout

```
content/            All site content (the source of truth)
  learn/            10 modules: a main page plus deep dives
  provinces/        13 provinces and territories
  quizzes/          The global question bank (YAML)
  *.en.md           Home, glossary, timeline, myths, sources, about
src/
  content.config.ts Collections and schemas for pages and quiz questions
  pages/            Routes
  layouts/          Page shells
  components/       Header, footer, icons, quiz pieces
  scripts/          Client-side TypeScript (quiz logic, progress storage)
  plugins/          Markdown plugins (strip review comments, heading ids, tables)
  styles/global.css Design tokens and base styles
  i18n/en.ts        Interface text, ready for a French dictionary
scripts/validate.ts Content checks and review-list generator
```

The planning docs explain the content itself:

- [SCOPE.md](SCOPE.md): goals and curriculum
- [SITEMAP.md](SITEMAP.md): every page, the templates, and the quiz format
- [STYLE.md](STYLE.md): how pages are written and sourced
- [REVIEW.md](REVIEW.md): what still needs fact-checking

## Copyright

© 2026 Benjamin Lucier. All rights reserved.

This repository is public so the site can be built and hosted openly, but no licence is
granted to copy, modify or redistribute its code or content.

An independent learning project, not affiliated with the Government of Canada. It's an
educational overview, not legal advice.
