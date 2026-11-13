# Discrepancies

Facts in `content/` checked against the grounding corpus (Wikipedia snapshot in
`grounding/wikipedia/`, Wikidata and Statistics Canada datasets in `src/data/`), as of
the November 2026 fetch. Wikipedia is a pointer, not the last word: before changing a
page, confirm against the official source it cites.

Resolve an item by fixing the content (or confirming the content is right) and moving it
to "Resolved" with a note.

## Open

| # | Where | Our claim | Source's claim | Source |
|---|---|---|---|---|
| 1 | [content/provinces/nova-scotia.en.md:22](../content/provinces/nova-scotia.en.md) | "The House of Assembly has 55 seats, a number first used in the 2021 general election." | 56 members representing 56 electoral districts. | [Politics of Nova Scotia](https://en.wikipedia.org/wiki/Politics_of_Nova_Scotia) (`grounding/wikipedia/politics-of-nova-scotia.txt:7`); infobox of [Nova Scotia House of Assembly](https://en.wikipedia.org/wiki/Nova_Scotia_House_of_Assembly) also says 56. Check the Nova Scotia Legislature and Elections Nova Scotia before changing: this may be a recent boundary change. |
| 2 | [content/learn/02-crown/reserve-powers.en.md:59](../content/learn/02-crown/reserve-powers.en.md) (open `check` comment) | King's request "~June 26–28"; Meighen defeated and Parliament dissolved July 2, 1926. | Wikidata: King's term ended June 28, 1926; Meighen was Prime Minister from June 29 to September 25, 1926. That supports the June 28 resignation; the July 2 defeat and dissolution aren't in the corpus. | [Wikidata Q128645](https://www.wikidata.org/wiki/Q128645) via `src/data/wikidata/prime-ministers.json`; [King–Byng affair](https://en.wikipedia.org/wiki/King%E2%80%93Byng_affair) (not in the corpus) |

## Checked and consistent

These were compared and agree with the grounding data, so no change is needed.

| Where | Claim | Grounding |
|---|---|---|
| `content/provinces/*.en.md` front matter (`capital:`, line 5) and summary tables (line 15) | Capitals of all 13 provinces and territories | Wikidata P36, `src/data/wikidata/provinces.json` |
| `content/provinces/*.en.md` front matter (`joined:`, line 6) and summary tables (line 16) | Join years: 1867 (ON, QC, NS, NB), 1870 (MB, NT), 1871 (BC), 1873 (PE), 1898 (YT), 1905 (AB, SK), 1949 (NL), 1999 (NU) | Start dates on Canada's P150 statements in Wikidata (founding four default to 1 July 1867) |
| content/timeline.en.md:34, 37, 43, 44, 61, 106 | Manitoba July 15, 1870; PEI 1873; Yukon 1898; Alberta and Saskatchewan 1905; Newfoundland March 31, 1949; Nunavut April 1, 1999 | Same |
| content/learn/03-parliament/index.en.md:36, content/learn/04-elections/index.en.md:29, content/learn/03-parliament/confidence.en.md:29 | 343 seats in the Commons (172 for a majority), 105 senators | [House of Commons of Canada](https://en.wikipedia.org/wiki/House_of_Commons_of_Canada) and [Senate of Canada](https://en.wikipedia.org/wiki/Senate_of_Canada) infoboxes |
| Seat counts on province pages, line 22: AB 87, BC 93, MB 57, NB 49, NL 40, ON 124, PE 27, QC 127, SK 61, YT 21, NU 22 | Legislature sizes | Infoboxes of each legislature's Wikipedia article (Nova Scotia is item 1 above; the Northwest Territories page states no number, Wikipedia says 19) |
| content/provinces/ontario.en.md:7, 49 | Ontario is the most populous province; Toronto is Canada's largest city | `src/data/statcan/population.json`; Wikidata 2021 census figures in `provinces.json` |
| content/learn/07-law/supreme-court.en.md:12, 23, 25–27 | Nine judges; created 1875; criminal appeals to London ended 1933, all appeals 1949 | `supreme-court-of-canada.txt:1, 7`; `judicial-committee-of-the-privy-council.txt:56, 63`; first Chief Justice took office September 30, 1875 (`chief-justices.json`) |
| content/learn/02-crown/index.en.md:44 | Charles III succeeded Elizabeth II in September 2022 | `monarchs.json`: September 8, 2022 |

## Wikidata problems found by the script

Not content errors, but worth knowing when reading the datasets. The script works
around each one; see the comments in `scripts/grounding/wikidata.ts`.

| Item | Wikidata | Correct (per Wikipedia) | Handling |
|---|---|---|---|
| Premier of Quebec | No current head of government | Paul St-Pierre Plamondon, since October 21, 2026 | Taken from the [Premier of Quebec](https://en.wikipedia.org/wiki/Premier_of_Quebec) infobox |
| Premier of Prince Edward Island | Bloyce Thompson, since December 12, 2025 | Rob Lantz, since February 9, 2026 | Wikipedia infobox |
| Premier of Yukon | Mike Pemberton, since June 27, 2025 | Currie Dixon, since November 22, 2025 | Wikipedia infobox |
| Premier of Nunavut | P.J. Akeeagok, since 2021 | John Main, since November 20, 2025 | Wikipedia infobox |
| Premier of Newfoundland and Labrador | Tony Wakeham since October 1, 2025 | Since October 29, 2025 | Wikipedia infobox date |
| Fredericton (Q2138) | No English label | "Fredericton" | Label fallback to `en-ca` |
| Province "inception" (P571) | PEI 1769, BC January 1, 1871, Saskatchewan January 1, 1905 | These are colony dates or year-only values | Join dates come from P150 qualifiers on Canada instead |
| Census population (P1082 with P459 = census) | Canada has no census figures for 1961–2006; most provinces none for 1981–2006 | — | `population-history.json` keeps the gaps; the site's charts use Statistics Canada instead |
| PM parties (P102) | Mulroney and Tupper also list today's Conservative Party; Bennett lists Alberta's provincial PCs; Borden lists the Liberals (to 1891) | — | Only federal parties in the `PARTIES` table that existed during the term are kept |

Recent changes a human should still confirm, even where Wikidata and Wikipedia agree:
Louise Arbour as the 31st Governor General from June
8, 2026, and the Quebec, PEI, Yukon and Nunavut premiers above.
