# True North Explained — Scope & Curriculum (draft)

> A simple, beautiful, easy-to-digest guide to how Canada works, legally and politically.
> Written by someone learning it as they go.

## Goal

Someone with zero background can visit and, in about **10 minutes**, get a correct mental
model of how Canada is governed. Anyone who wants more can **go deeper** on any piece.
Short quizzes (saved in localStorage) help them remember it.

## Non-goals (for now)

- **Not a law library.** We explain *which bodies make and apply which kinds of law*, not
  what any particular statute says.
- **Not current events.** Avoid naming who holds office unless needed; things that date
  quickly go in a clearly marked "As of …" box.
- **Not partisan.** We describe how the system works, not whether it works well. Real,
  live debates (Senate reform, electoral reform, the monarchy) get a neutral
  "people disagree about this" note.
- **Not a full history course.** History shows up only where it explains why something
  works the way it does today.

## The one-sentence answer

Canada is a **federal**, **parliamentary democracy** and a **constitutional monarchy**.

Each module below unpacks part of that sentence.

---

## Curriculum

Each module has three layers: **TL;DR** (one paragraph), **Core** (a 3–5 minute read),
and **Go deeper** (optional sections).

### 0. The big picture
The one-sentence answer, a diagram of how the pieces connect, and the five most common
misconceptions.

### 1. The Constitution
- It's not one document: Constitution Act 1867, Constitution Act 1982, plus other
  written pieces *and* unwritten conventions.
- Conventions: rules nobody wrote down that everyone follows (e.g. the PM must keep the
  confidence of the House).
- How the Constitution gets amended, and why that's so hard.
- *Go deeper:* patriation in 1982 and Quebec's refusal to sign; Meech Lake and
  Charlottetown.

### 2. The Crown
- The King of Canada is head of state. This is still true; the link to the monarchy
  hasn't been cut.
- The Governor General federally and Lieutenant Governors provincially act for the King.
- "Reigns but does not rule": what the Crown does in practice (royal assent, appointing
  the PM, dissolving Parliament), and its rarely used reserve powers.
- *Go deeper:* the 2008 prorogation, and what it would take to become a republic.

### 3. Parliament
- Three parts: the King, the House of Commons (elected) and the Senate (appointed).
- How a bill becomes law, as a visual flow.
- Majority vs. minority governments, confidence votes, the Opposition.
- *Go deeper:* Question Period, committees, party discipline.

### 4. Elections, and how the PM gets the job
- You vote for one **MP** in your **riding**. You never vote for the PM directly.
- The PM is whoever can keep the **confidence of the House**, which in practice is
  normally the leader of the party with the most seats.
- First-past-the-post: how it works and what it does to results.
- Parties, leaders, and how leaders are chosen (by the party, not voters at large).
- Cabinet and the PMO.
- *Go deeper:* Elections Canada, fixed election dates (and why they aren't really fixed).

### 5. Federalism: who does what
- Federal vs. provincial powers (sections 91 and 92 of the 1867 Act), shown as a
  sortable visual.
- Territories are different from provinces.
- Municipalities are created by provinces and have no constitutional status of their own.
- Shared and contested areas: health, environment, immigration.
- Money: transfers and equalization.

### 6. Government in action: the executive & the public service
- Ministers and departments; the public service is non-partisan.
- Crown corporations and agencies (CBC, Canada Post, etc.).
- **Bank of Canada vs. the Royal Canadian Mint.** The Bank of Canada is the Fed
  equivalent: interest rates, monetary policy, banknotes. The Mint only makes coins.
- Independent watchdogs: Auditor General, Parliamentary Budget Officer, ethics
  commissioners.

### 7. The legal system
- Where law comes from: the Constitution, statutes, regulations, and court decisions.
- **Bijuralism:** common law in most of Canada, civil law (the Civil Code) for private
  law in Quebec.
- Criminal law is federal but mostly enforced and prosecuted provincially.
- Court structure as a visual: provincial courts, superior courts, courts of appeal,
  the Supreme Court of Canada, plus federal courts.
- Judicial independence and judicial review: courts can strike down laws.

### 8. Rights: the Charter
- What the Charter protects, and that it only binds *governments*.
- Section 1: rights have "reasonable limits".
- Section 33: the notwithstanding clause.
- *Go deeper:* landmark cases, explained in one paragraph each.

### 9. Indigenous peoples and the Crown
- Treaties, and section 35 (Aboriginal and treaty rights).
- The Indian Act; self-government agreements.
- Why this is a constitutional topic and not only a historical one.
- Note: needs extra care with sources and tone.

### 10. A short history (connective tissue)
A timeline built only from events referenced elsewhere: 1763, 1867, 1931 (Statute of
Westminster), 1982, the 1980 and 1995 Quebec referendums, and so on.

### Appendices
- **Glossary**, with hover definitions on the site.
- **Myths vs. facts**
- **Provinces & territories**: one page each (decided, see Decisions).
- **Sources**: primary sources first (Justice Laws, Parliament of Canada, Elections
  Canada, Bank of Canada).

---

## Your starting assumptions, checked

| You said | Actually |
|---|---|
| There's Parliament, politicians, representative democracy | ✅ Yes. Specifically a *parliamentary* (Westminster) system, which differs a lot from the US. |
| The Mint is kinda like the Fed | ❌ The **Bank of Canada** is the Fed. The Mint just makes coins. |
| We probably have departments | ✅ About 20+ federal departments, plus many agencies and Crown corporations. |
| You vote for your MP, which implicitly votes for the PM | ✅ Mostly right. The PM is whoever commands the House's confidence, normally the leader of the largest party. MPs don't hold a formal vote for PM. |
| The Queen/King tie is broken now | ❌ Not broken. Charles III is King of Canada. His role is mostly ceremonial, but it is legally central. |
| Constitution? | ✅ Yes. It's a mix of written Acts (1867, 1982 including the Charter) and unwritten conventions. |

---

## Module file template

Layout: see [SITEMAP.md](SITEMAP.md). Each page is a `*.en.md` file.

Templates for each page type and the global quiz bank format are in
[SITEMAP.md](SITEMAP.md).

## Decisions

- **Phase:** content only. We write markdown now and build the web app later.
- **Audience:** anyone curious, including newcomers studying for citizenship, Canadians
  who never learned this, and people outside Canada. Assume no prior knowledge.
- **Provinces & territories:** each of the 13 gets its own page (see [SITEMAP.md](SITEMAP.md)).
- **Bilingual from the start:** files are named `*.en.md`. French (`*.fr.md`) is
  translated later, all at once, and sits next to the English file.
- **Sources:** link to primary documents and official government sites wherever
  possible, such as laws-lois.justice.gc.ca, parl.ca, elections.ca and bankofcanada.ca.
- **Order:** sitemap first, then module 0.
