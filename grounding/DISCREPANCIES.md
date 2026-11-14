# Discrepancies

Facts in `content/` checked against the grounding corpus (Wikipedia snapshot in
`grounding/wikipedia/`, Wikidata and Statistics Canada datasets in `src/data/`), as of
the November 2026 fetch. Wikipedia is a pointer, not the last word: before changing a
page, confirm against the official source it cites.

Resolve an item by fixing the content (or confirming the content is right) and moving it
to "Resolved" with a note.

## Open

None from the grounding corpus. Facts that the November 2026 accuracy pass could not
settle are still marked in the content and listed in [REVIEW.md](../REVIEW.md); the
reasons are in [VERIFICATION.md](VERIFICATION.md).

Open questions about the data, found in that pass and not changed:

| Where | Question | Source |
|---|---|---|
| `src/data/wikidata/premiers.json` (British Columbia) | A general election was held on October 24, 2026. David Eby was still premier on 2026-11-13; a new premier was expected to be sworn in about November 20. Re-run `pnpm data:premiers` afterwards. | [Legislative Assembly of BC](https://www.leg.bc.ca/), [Elections BC](https://elections.bc.ca/) |

## Resolved

| # | Where | Was | Now | Source | Resolved |
|---|---|---|---|---|---|
| 1 | content/provinces/nova-scotia.en.md, `legislature.seats.nova-scotia` in content/facts.yaml | "55 seats, a number first used in the 2021 general election" | 56 seats. Inverness was split in 2026 to create Chéticamp-Margarees-Pleasant Bay; its first MLA was elected at a byelection on June 23, 2026. Wikipedia was right. | [Nova Scotia Legislature: MLA profiles](https://nslegislature.ca/members/profiles); [Government of Nova Scotia, February 26, 2026](https://news.novascotia.ca/en/2026/02/26/new-cheticamp-margarees-pleasant-bay-riding) | 2026-11-13 |
| 2 | content/learn/02-crown/reserve-powers.en.md, `king-byng-affair` in content/entities/events.yaml | King's request "~June 26–28"; Meighen defeated and Parliament dissolved July 2, 1926 | King asked for a dissolution on June 26 and resigned on June 28; Meighen became Prime Minister on June 29; his government was defeated on July 1 (the vote came in the early hours of July 2, per the Dictionary of Canadian Biography); Parliament was dissolved on July 2; the election was on September 14, 1926. The event is dated June 28. The reserve-powers page now names the Dictionary of Canadian Biography's dates for the request and the defeat, and says only that House of Commons Procedure and Practice gives 1926 as its one example of a refused dissolution. | [House of Commons Procedure and Practice, Appendix 6](https://www.ourcommons.ca/procedure-and-practice-4/app06-e.html); [Elections Canada: History of Election Outcomes](https://www.elections.ca/content.aspx?section=vot&dir=bkg&document=heo&lang=e); [DCB: Byng](http://www.biographi.ca/en/bio/byng_julian_hedworth_george_16E.html) | 2026-11-13 |
| 3 | `src/data/wikidata/chief-justices.json` | End dates for Duff (1944-01-07), Dickson (1990-06-30) and McLachlin (2017-12-15) one day later than the Court's list | Data unchanged; a note under the chief justices table on /governors-general gives the Court's dates. | [Supreme Court of Canada: current and former judges](https://www.scc-csc.ca/about-apropos/judges-juges/list-liste/) | 2026-11-13 |
| 4 | `src/data/wikidata/governors-general.json` | Payette's end 2021-01-21 (gg.ca: January 22); Jean's 2010-10-01 (gg.ca: September 30) | Data unchanged; a note under the governors general table on /governors-general gives gg.ca's dates. | [Former governors general](https://www.gg.ca/en/governor-general/former-governors-general) | 2026-11-13 |
| 5 | `src/data/wikidata/prime-ministers.json` | Macdonald 1878–1891 labelled "Conservative" (House: "Liberal-Conservative") | Data unchanged; a note under the table on /prime-ministers gives the House's label. | [Appendix 6](https://www.ourcommons.ca/procedure-and-practice-4/app06-e.html) | 2026-11-13 |
| 6 | `content/entities/cases.yaml`, `content/glossary/patriation-reference.en.md`, conventions and patriation-1982 pages | "substantial degree" in the first two, "substantial measure" in the pages | All four use "substantial measure", attributed as the judgment's words; the glossary and both pages note that some summaries say "substantial degree". | Lederman (1982) 27 McGill L.J., quoting the judgment at p. 103 | 2026-11-13 |

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
| Supreme Court bench | Still lists Sheilah Martin as sitting; no entry for Glenn Joyal as a judge | Martin left May 30, 2026; Joyal has sat since July 15, 2026 (the Court's list of judges) | `SCC_OVERRIDES` in `scripts/data/portraits.ts` |
| Governors general: term dates | Lisgar from 1868-11-14; Alexander to 1952-02-28; Simon to 2026-06-07 | 1869-02-02; 1952-01-28; 2026-06-08 (gg.ca, former governors general) | `GG_TERM_OVERRIDES` in `scripts/grounding/wikidata.ts` |
| Province "inception" (P571) | PEI 1769, BC January 1, 1871, Saskatchewan January 1, 1905 | These are colony dates or year-only values | Join dates come from P150 qualifiers on Canada instead |
| Census population (P1082 with P459 = census) | Canada has no census figures for 1961–2006; most provinces none for 1981–2006 | — | `population-history.json` keeps the gaps; the site's charts use Statistics Canada instead |
| PM parties (P102) | Mulroney and Tupper also list today's Conservative Party; Bennett lists Alberta's provincial PCs; Borden lists the Liberals (to 1891) | — | Only federal parties in the `PARTIES` table that existed during the term are kept |

Recent office-holders were confirmed against official or news sources on 2026-11-13
(details in VERIFICATION.md): Louise Arbour as the 31st Governor General from June 8,
2026 (gg.ca); the premiers of Quebec (Paul St-Pierre Plamondon, October 21, 2026), Prince
Edward Island (Rob Lantz, February 9, 2026), Yukon (Currie Dixon, November 22, 2025),
Nunavut (John Main, November 20, 2025) and Newfoundland and Labrador (Tony Wakeham,
October 29, 2025); and the Supreme Court bench above.
