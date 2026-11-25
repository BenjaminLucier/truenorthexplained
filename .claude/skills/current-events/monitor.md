# Sources to check for recent events

Official sources first; the leads at the bottom point to things to confirm
against them. Each address loaded for an automated check on 2026-11-25 unless
noted. Sites that refuse automated requests are for a person to open in a
browser: never work around a bot check.

## Federal: Parliament and law

| Source | What to look for |
|---|---|
| [LEGISinfo: bills](https://www.parl.ca/legisinfo/en/bills) | Bills that got Royal Assent or died; the stage of watchlist bills |
| [House of Commons sitting calendar](https://www.ourcommons.ca/en/sitting-calendar) | Prorogation, dissolution, recalls |
| [Senate newsroom](https://sencanada.ca/en/newsroom/) | Senate appointments, Speaker, notable votes |
| [Canada Gazette](https://gazette.gc.ca/accueil-home-eng.html) | Part I: proclamations and appointments. Part II: regulations. Part III: Acts as passed |

## Federal: executive and Crown

| Source | What to look for |
|---|---|
| [Prime Minister: news](https://www.pm.gc.ca/en/news) | Cabinet changes, appointments (GG, Senate, judges), elections called |
| [Governor General](https://www.gg.ca/en) | Swearings-in, prorogation, dissolution, Royal Assent ceremonies |
| [Government of Canada news](https://www.canada.ca/en/news.html) | Department announcements. Times out for automated requests: use a browser |

## Courts

| Source | What to look for |
|---|---|
| [Supreme Court: judgments](https://www.scc-csc.ca/judgments-jugements/) | Decisions released, and upcoming ones. The decisions themselves are on decisions.scc-csc.ca, which shows a CAPTCHA: a person opens those |

## Elections and data

| Source | What to look for |
|---|---|
| [Elections Canada](https://www.elections.ca/) | By-elections, official results, redistribution |
| [Statistics Canada: The Daily](https://www150.statcan.gc.ca/n1/dai-quo/index-eng.htm) | Population estimates and census releases (then `pnpm data:population` / `data:demographics`) |
| [Bank of Canada: press](https://www.bankofcanada.ca/press/) | Rate decisions, used by the money pages (`pnpm data:money`) |

## Provinces and territories

Premiers and governments are refreshed from Wikidata (`pnpm data:premiers`).
To find what changed, start from the leads below. Then confirm each change on
the province's own legislature or premier's office site, and for elections on
its elections agency's site.

## Leads (confirm before using)

| Source | Use |
|---|---|
| [Wikipedia: 2026 in Canada](https://en.wikipedia.org/wiki/2026_in_Canada) (and the next year's page) | A month-by-month list of what happened; follow its citations to primary sources |
| [Wikipedia: List of current Canadian first ministers](https://en.wikipedia.org/wiki/List_of_current_Canadian_first_ministers) | Quick check on who holds each premiership |
| [Wikipedia: Current events portal](https://en.wikipedia.org/wiki/Portal:Current_events) | Very recent items |

When you add a source here, check that it loads first (`curl -sIL -A 'tne-link-check/1.0' <url>`).
