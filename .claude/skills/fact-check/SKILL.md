---
name: fact-check
description: Fact-check one or more pages of the site against primary sources, claim by claim, and correct what's wrong with a cited source. Use when asked to fact-check, verify, audit or review the accuracy of a page, a module, the facts registry, the timeline or the quizzes, or to resolve the `check` markers listed in REVIEW.md.
argument-hint: "<page path, module folder, 'review' for REVIEW.md markers, or 'facts'>"
---

# Fact-check pages

The site's credibility rests on every claim being right and checkable. This is
the method used for the accuracy pass logged in `grounding/VERIFICATION.md`;
follow it so later passes stay comparable.

## Scope

- **A page or folder** under `content/`: every factual claim in it, its quiz
  (`content/quizzes/`), and the facts and events it uses.
- **`review`**: the `check` and `unverified link` markers in REVIEW.md
  (`pnpm review` regenerates it).
- **`facts`**: every entry in `content/facts.yaml`.

For more than about three pages, split the work: one `fact-checker` subagent
(`.claude/agents/fact-checker.md`) per page or module, run in parallel, each
reporting rows in the format below. Then review their diffs yourself before
accepting them, and reconcile claims that appear on several pages.

## For each claim

1. **Find a primary source** (STYLE.md, "Sources"): the legislation on Justice
   Laws, the court decision, Parliament, Elections Canada, Statistics Canada,
   the government body itself. A provided source on the line is the first to
   check. `grounding/wikipedia/` has local copies of the relevant Wikipedia
   articles: use them to find leads and citations, not as the final source.
2. **Read it.** Confirm the claim says what the source says: numbers, dates,
   names, section numbers, "first"/"only"/"always" wording.
3. **Verdict:**
   - **confirmed:** leave the text; remove any `check` marker on it.
   - **corrected:** change the text to match the source, and cite it if the
     page doesn't already.
   - **disputed:** sources disagree. Say so in the text, attributed: "Elections
     Canada reports 343 seats; some older sources give 338." No hidden
     markers for disagreement.
   - **unresolved:** no reachable source. Leave or add a
     `<!-- check: what to confirm; unresolved YYYY-MM-DD: why -->` marker.
4. **Changing values** (seats, office holders, dates of next events) belong in
   `{{facts}}`, not literal text (STYLE.md, "Things that go out of date"). Move
   them while you're there.
5. **Quizzes:** check each answer and its explanation against the corrected
   page. A quiz must never disagree with its page.

Sites that block automated requests (STYLE.md lists them; the Supreme Court's
decision site shows a CAPTCHA) are for a person to open. Never work around a bot
check. Mark those claims unresolved with the reason.

## Rules

- Neutral and plain (STYLE.md, "Voice"). Fix facts, not style, unless a
  sentence is misleading.
- Don't change a page's `status:` front matter. That's the maintainer's
  sign-off, not yours.
- `pnpm validate` runs after each content edit (a hook). At the end, run
  `pnpm check && pnpm test && pnpm review`.

## Record

Append a dated section to `grounding/VERIFICATION.md`, one row per claim
checked:

```markdown
| File:line | Claim | Verdict | Source (accessed YYYY-MM-DD) | Before → after |
```

Open disagreements between sources also go in `grounding/DISCREPANCIES.md`.
Report to the user: counts per verdict, the corrections (before → after, with
source), and what's left for a person to check.
