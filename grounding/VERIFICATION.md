# Verification log

The accuracy pass of 2026-11-13. Every row was checked against a source fetched on that
date (the "accessed" date for every row is 2026-11-13). Verdicts: **confirmed** (marker
removed, source cited), **corrected** (text changed, before and after given),
**unresolved** (marker left in place with the reason). `pnpm review` lists what is still
marked; `grounding/DISCREPANCIES.md` tracks the open discrepancies.

Nine agents each checked one area and reported the rows below; the orchestrator reviewed
every diff, merged it, and reconciled findings that touched more than one area. Nothing
here is a human sign-off: no page's `status:` was changed.

## Reconciliation and orchestrator checks

Checked again by the orchestrator against the official page:

| Claim | Verdict | Source URL |
|---|---|---|
| Supreme Court bench: Wagner (CJ), Karakatsanis, Côté, Rowe, Kasirer, Jamal, O'Bonsawin, Moreau, Joyal (since 2026-07-15); Martin left 2026-05-30 | confirmed | https://www.scc-csc.ca/about-apropos/judges-juges/list-liste/ |
| Louise Arbour, 31st Governor General, sworn in June 8, 2026 | confirmed | https://www.gg.ca/en/governor-general |
| Nova Scotia House of Assembly: 56 members, including Chéticamp-Margarees-Pleasant Bay | confirmed | https://nslegislature.ca/members/profiles |

Edits made by the orchestrator from the agents' cross-area findings:

| File | Claim | Verdict | Source URL | Before → After |
|---|---|---|---|---|
| content/entities/events.yaml (`king-byng-affair`) | Date and text | corrected | https://www.ourcommons.ca/procedure-and-practice-4/app06-e.html ; http://www.biographi.ca/en/bio/byng_julian_hedworth_george_16E.html | `date: 1926` → `date: 1926-06-28`; "…request for an election, the last time this happened federally." → "…request for an election, and the Prime Minister resigns on June 28. It was the last time this happened federally." (Both sources give the resignation as June 28. They differ on the request: House of Commons Procedure and Practice says June 26, the Dictionary of Canadian Biography dates the formal request June 28. They also differ on the defeat of the Meighen government: July 1 in the House sources, about 2 a.m. on July 2 in the DCB. The reserve-powers page follows the House sources.) |
| content/entities/events.yaml (`indian-act-changes-1951`) | What the 1927 rule banned | corrected | https://www.thecanadianencyclopedia.ca/en/article/indian-act | "the limit on hiring lawyers for land claims" → "the ban on raising money for land claims" |
| content/entities/events.yaml (`alberta-equalization-referendum-2021`) | "non-binding" | unresolved (judgement call; marker added) | https://kings-printer.alberta.ca/documents/Acts/R08P4.pdf (s. 4) | The page money-and-equalization now says "provincial referendum"; the event keeps "non-binding" because its old timeline anchor is built from its first words |
| content/entities/institutions.yaml (PBO) | "officer of Parliament" | confirmed (marker removed) | https://www.pbo-dpb.ca/en/history--historique ("independent officer of Parliament" since 2017) | |
| content/learn/07-law/criminal-law.en.md; content/glossary/rcmp.en.md | Which provinces contract the RCMP | corrected | https://rcmp.ca/en/contract-policing/about (eight provinces and three territories) | "Most other provinces" → "All other provinces"; glossary "Most provinces other than Ontario and Quebec" → "Every province except Ontario and Quebec" |
| content/learn/09-indigenous/section-35.en.md | When s. 35(3) and (4) were added | corrected | https://laws-lois.justice.gc.ca/eng/const/endNotes.html (notes 97–98, SI/84-102) | "were added in 1983" → "were added by an amendment agreed in 1983 and proclaimed in 1984" |
| content/learn/02-crown/republic-question.en.md | Alberta's referendum law | corrected (marker removed) | https://kings-printer.alberta.ca/documents/Acts/R08P4.pdf ; https://www.elections.ab.ca/uploads/Referendum-Act-Fact-Sheet.pdf | added "Alberta had a similar rule until 2025, when it was repealed." (same finding as on amending-formula) |
| scripts/grounding/wikidata.ts | Governor General term dates | corrected (override added so re-runs keep it) | https://www.gg.ca/en/governor-general/former-governors-general | Lisgar start 1868-11-14 → 1869-02-02; Alexander end 1952-02-28 → 1952-01-28; Simon end 2026-06-07 → 2026-06-08 |
| src/widgets/supreme-court-bench/index.astro | Caption source | corrected | — | "Source: Wikidata" → "Source: Wikidata, corrected against the Supreme Court of Canada's list of judges" |
| content/sources.en.md | Markers and links | synced with the pages | — | 9 markers removed, 2 links replaced (Winnipeg Charter, Lieutenant Governor of Ontario), 12 left with their reasons, and the sources newly cited on pages added |

Where a row in a later section disagrees with the table above, the table above is the final state.

Points where two agents' sources differ, left for a person:

- **"Substantial degree" or "substantial measure" (Patriation Reference).** The pages conventions and patriation-1982 now quote "substantial measure" (from Lederman's 1982 article quoting the judgment). `cases.yaml` and the glossary entry keep "substantial degree", which the law agent confirmed against the judgment itself. Both phrases may appear in the judgment; decisions.scc-csc.ca returned 403 to the orchestrator's check.
- **Supreme Court decisions site.** `decisions.scc-csc.ca/…/index.do` returned 403 to most fetches. The law agent read decisions through the site's own `?iframe=true` frame URL. If that counts as going around a block, the 25 `cases.yaml` rows need a browser check; several are independently confirmed by Supreme Court "case in brief" pages, DFO and Charterpedia in other sections.
- **Chief justices' end dates** in `src/data/wikidata/chief-justices.json` are one day later than the Court's own list for Duff, Dickson and McLachlin. Not changed.
- **Macdonald's 1878–1891 party label** in `prime-ministers.json` is "Conservative"; House of Commons Procedure and Practice says "Liberal-Conservative". Not changed.
- **British Columbia.** A general election was held on October 24, 2026. The premier in the data (David Eby) was still in office on 2026-11-13; a new premier was expected to be sworn in about November 20. Re-run `pnpm data:premiers` after that.


## Big picture and constitution

**content/learn/01-constitution/amending-formula.en.md**
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| 7/50 can't be met without Ontario or Quebec (census check) | confirmed | https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000101 (CSV 98-10-0001-01: ON 14,223,942 + QC 8,501,833 = 61.6% of the provinces' 36,873,821) | 2026-11-13 | |
| BC/Alberta referendum laws | corrected | https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96067_01 ; https://kings-printer.alberta.ca/documents/Acts/R08P4.pdf ; https://www.elections.ab.ca/uploads/Referendum-Act-Fact-Sheet.pdf | 2026-11-13 | "some provinces (including British Columbia and Alberta) have laws requiring a referendum before their legislature votes on certain constitutional amendments" → "British Columbia has a law requiring a referendum before the provincial government can ask its legislature to approve a constitutional amendment. Alberta had a similar rule until 2025, when it was repealed." |
| 1983 s. 35 amendment is the only use of s. 38 | confirmed | https://www.constitutionalstudies.ca/2019/07/amending-formula/ ("one successful use of the general formula in 1983"); https://laws-lois.justice.gc.ca/eng/const/endNotes.html (no later s. 38 amendment listed) | 2026-11-13 | |
| Regional veto applies to "a 7/50 amendment" (unmarked) | corrected | https://laws-lois.justice.gc.ca/eng/acts/C-36.7/FullText.html s. 1(1) | 2026-11-13 | "propose a 7/50 amendment unless" → "propose a 7/50 amendment (other than one a province can opt out of) unless" |
| ss. 38–47 details, s. 41 list, s. 42 list (unmarked) | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-13.html | 2026-11-13 | |
| 1993 NB s. 16.1, 1997 s. 93A, 2022/2023 s. 45 additions (unmarked) | confirmed | endNotes.html; https://laws-lois.justice.gc.ca/eng/const/page-3.html | 2026-11-13 | |

**content/learn/01-constitution/constitution-act-1867.en.md**
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| Last disallowance 1943 (Alberta), last reservation 1961 (Sask.) | confirmed | https://www.constitutionalstudies.ca/2019/07/reservation-and-disallowance/ ; https://www.thecanadianencyclopedia.ca/en/article/disallowance ("The last disallowance was in 1943"); https://www.esask.uregina.ca/entry/bastedo_frank_lindsay_1886-1973.html ("the last in the country") | 2026-11-13 | |
| Edwards citation [1930] A.C. 124 (P.C.) | confirmed (secondary source; the primary sources BAILII, CanLII and ICLR return 403) | https://www.constitutionalstudies.ca/2019/07/living-tree-doctrine/ (cites "[1930] AC 124 … 1929 UKPC 86" and the living-tree quote) | 2026-11-13 | |
| Part ranges and s. 9/11/15/16/29/55/56/90/133, 90Q.1–2, 90S.1, ss. 91/92 items (unmarked) | confirmed | page-1.html, page-2.html, page-3.html; Act text has no "Prime Minister" | 2026-11-13 | |

**content/learn/01-constitution/conventions.en.md**
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| Senate "generally doesn't block bills" as convention or practice | unresolved (judgement call) | n/a | 2026-11-13 | |
| Abbott and Bowell in the Senate; Turner 1984 | corrected | https://revparl.ca/english/issue_param_134_art_869.html ; https://globalnews.ca/news/10962362/can-mark-carney-be-prime-minister/amp ; https://cfjctoday.com/2020/09/19/some-highlights-from-the-life-and-career-of-former-prime-minister-john-turner/ ; https://www.cp24.com/news/canada/2025/03/09/does-canadas-next-prime-minister-need-to-be-a-member-of-parliament/ | 2026-11-13 | "and several have taken office without a seat and then won one" → "A few have held office without a Commons seat: John Turner took office in 1984 without one and won one in that year's election." |
| "unconstitutional in the conventional sense" wording | unresolved (blocked) | decisions.scc-csc.ca and CanLII 403 | 2026-11-13 | |
| conventions-toggle Senate row | unresolved (judgement call) | n/a | 2026-11-13 | |
| Jennings three-part test (unmarked) | confirmed | https://lawjournal.mcgill.ca/wp-content/uploads/pdf/2257741-lederman.pdf | 2026-11-13 | |
| "substantial degree" quote (unmarked) | corrected | Lederman PDF quoting the judgment at p. 103: "at least a substantial measure of provincial consent" | 2026-11-13 | "substantial degree" → "substantial measure" |

**content/learn/01-constitution/index.en.md**
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| Schedule lists about thirty Acts and orders | confirmed (made exact: items 1–30) | https://laws-lois.justice.gc.ca/eng/const/page-14.html | 2026-11-13 | "about thirty" → "thirty" |

**content/learn/01-constitution/patriation-1982.en.md**
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| National Assembly December 1981 resolution | corrected (made precise) | https://primarydocuments.ca/letter-from-premier-levesque-to-prime-minister-thatcher-19-december-1981/ (resolution adopted December 1, 1981; "cannot accept the plan … unless" conditions) | 2026-11-13 | "Quebec's National Assembly passed a resolution opposing the package." → "On December 1, 1981, Quebec's National Assembly passed a resolution saying it could not accept the plan unless it met certain conditions, including a veto for Quebec or guaranteed compensation when a province opts out." |
| Charlottetown TCE link | confirmed (loads, title "Charlottetown Accord") | https://www.thecanadianencyclopedia.ca/en/article/the-charlottetown-accord | 2026-11-13 | |
| "substantial degree" (unmarked) | corrected | Lederman PDF | 2026-11-13 | → "substantial measure" |
| Patriation Reference September 1981 (unmarked) | confirmed (September 28, 1981) | Lederman PDF | 2026-11-13 | |
| Canada Act s. 2; Statute of Westminster ss. 4 and 7 (unmarked) | confirmed | https://www.legislation.gov.uk/ukpga/1982/11 ; https://www.legislation.gov.uk/ukpga/Geo5/22-23/4 | 2026-11-13 | |
| Meech deadline June 23, 1990; Harper; Newfoundland didn't vote (unmarked) | confirmed | https://www.constitutionalstudies.ca/2019/07/meech-lake-accord/ ; https://www.biographi.ca/en/topics/topic-match-list.php?id=2188 | 2026-11-13 | |
| Charlottetown agreed August 28, 1992; referendum October 26, 1992; Quebec 56.68% No; 25% House seat guarantee (unmarked) | confirmed | https://www.constitutionalstudies.ca/2019/07/charlottetown-accord/ ; https://www.electionsquebec.qc.ca/en/results-and-statistics/referendum-on-the-charlottetown-constitutional-accord/ ; Draft Legal Text, October 9, 1992 (https://dn790006.ca.archive.org/0/items/31761115498693/31761115498693.pdf) | 2026-11-13 | |

**content/quizzes/big-picture.en.yaml** (all answers correct and distractors wrong)
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| big-picture-head-of-state | confirmed | https://www.canada.ca/en/canadian-heritage/services/crown-canada.html | 2026-11-13 | |
| big-picture-vote-for-pm | confirmed; source made specific | https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/federal-elections.html | 2026-11-13 | source: discover-canada.html → …/read-online/federal-elections.html |
| big-picture-who-becomes-pm | confirmed; source made specific | https://www.gg.ca/en/governor-general/role-and-responsibilities/constitutional-duties (plus Discover Canada federal-elections) | 2026-11-13 | source: …/role-and-responsibilities → …/constitutional-duties |
| big-picture-federal-orders | confirmed; source corrected | https://laws-lois.justice.gc.ca/eng/const/page-3.html (ss. 91, 92, 92(8)) | 2026-11-13 | source: page-1.html → page-3.html |
| big-picture-central-bank | confirmed | https://www.bankofcanada.ca/about/ | 2026-11-13 | |
| big-picture-one-document | confirmed | https://laws-lois.justice.gc.ca/eng/const/ ; page-13 s. 52(2) | 2026-11-13 | |
| big-picture-strike-down | confirmed; source made specific | https://www.justice.gc.ca/eng/csj-sjc/just/05.html ; page-13 s. 52(1) | 2026-11-13 | source: …/just/index.html → …/just/05.html |

**content/quizzes/constitution.en.yaml**
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| constitution-supreme-law | confirmed | page-13.html s. 52(1) | 2026-11-13 | |
| constitution-1982-added | confirmed | page-12/13 and the Justice Laws contents page (Parts I, II, V); page-3 ss. 91–92 | 2026-11-13 | |
| constitution-1982-replaced-1867 | confirmed | https://laws-lois.justice.gc.ca/eng/const/ | 2026-11-13 | |
| constitution-conventions-enforced | answer confirmed; link still blocked | Lederman PDF | 2026-11-13 | |
| constitution-quebec-bound | answer not verified from a primary source; marker kept (blocked) | n/a | 2026-11-13 | |
| constitution-1867-no-pm | confirmed (no "Prime Minister" anywhere in the 1867 Act pages) | page-1 to page-10 | 2026-11-13 | |
| constitution-1867-original-name | confirmed | endNotes.html (s. 1 originally "British North America Act, 1867") | 2026-11-13 | |
| constitution-living-tree | confirmed; source replaced | https://www.constitutionalstudies.ca/2019/07/living-tree-doctrine/ | 2026-11-13 | source: page-1.html + check → CCS living-tree page |
| constitution-why-uk-amended | answer confirmed (s. 7(1); formula talks began 1927, https://www.constitutionalstudies.ca/2019/07/patriation/); "at Canada's request" unresolved, new marker | legislation.gov.uk Statute of Westminster | 2026-11-13 | |
| constitution-meech-charlottetown | confirmed | CCS Meech and Charlottetown pages; Élections Québec | 2026-11-13 | |
| constitution-general-formula | confirmed | page-13 s. 38(1) | 2026-11-13 | |
| constitution-unanimity-matters | confirmed (s. 41(a), (d), (e); Senate selection s. 42(1)(b)) | page-13 | 2026-11-13 | |
| constitution-regional-veto | confirmed | https://laws-lois.justice.gc.ca/eng/acts/C-36.7/FullText.html | 2026-11-13 | |
| constitution-convention-test | answer confirmed (Jennings test); link still blocked | Lederman PDF | 2026-11-13 | |

**content/learn/00-big-picture/index.en.md**: no markers. While checking the quiz sources I saw nothing wrong. I didn't verify the rest of the page line by line.

### Big picture and constitution: corrections

1. **amending-formula, BC/Alberta referendum laws:** see the table row above.
   - Alberta's former s. 2 ("Referendum to precede constitutional change") was repealed by Bill 54, the Election Statutes Amendment Act, 2025 (S.A. 2025, c. 7, s. 11), in force July 4, 2025.
   - The Act is now the Referendum Act, R.S.A. 2000, c. R-8.4 (renamed in 2020).
   - BC s. 1 still applies to any amendment.
2. **amending-formula, regional veto scope:** "propose a 7/50 amendment unless" → "propose a 7/50 amendment (other than one a province can opt out of) unless". Source: C-36.7 s. 1(1).
3. **conventions, PMs without a seat:** "several have taken office without a seat and then won one" → the Turner sentence in the table row above.
4. **conventions line 70 and patriation line 47:** "substantial degree" → "substantial measure". Source: the judgment as quoted by Lederman (1982) 27 McGill L.J., quoting p. 103.
5. **patriation, the December 1, 1981 resolution:** wording as in the table row above. Source: primarydocuments.ca (Lévesque letter).
6. **index:** "about thirty" → "thirty". Source: Justice Laws page-14 schedule, items 1–30.

### Big picture and constitution: unresolved

- **Blocked:**
  - conventions line 80: exact wording "unconstitutional in the conventional sense" (decisions.scc-csc.ca and CanLII 403).
  - constitution quiz line 81: Quebec Veto Reference link (same block).
- **Judgement call:**
  - conventions line 38: Senate row, convention or practice.
  - conventions line 106: the conventions-toggle widget carries the same question.
- **Not found:** constitution quiz `constitution-why-uk-amended`: "at Canada's request". New marker added. The page patriation-1982 line 27 says the same thing, unmarked. I couldn't fetch a source: the PCO page Wikipedia cites is offline, and archive.org can't be fetched.
- **Noticed but not verified (outside marker scope, left unmarked):**
  - patriation: "Fulton–Favreau formula (1964)". CCS gives 1960 for the proposal and 1965 for Quebec's withdrawal, but no 1964 date.
  - patriation: Newfoundland "had already withdrawn the province's earlier approval". True per Wikipedia, citing a book; no fetchable primary source.
  - amending-formula: the 2014 Senate Reform and Supreme Court Act references. scc-csc.ca and CanLII are blocked.
- **Search budget:** the shared web-search limit ran out during the run, which cut short the hunt for alternatives on the last two "not found" items.

### Big picture and constitution: unverified links still marked

- constitution.en.yaml lines 64 and 225: decisions.scc-csc.ca item 2519 (Patriation Reference). Still 403. Note appended: "still blocked 2026-11-13".

## Crown, governors general, prime ministers and Parliament

Short names for sources used below:
- **PP4-A6**: https://www.ourcommons.ca/procedure-and-practice-4/app06-e.html
- **PP4-1**: https://www.ourcommons.ca/procedure-and-practice-4/ch01-3-e.html
- **PP4-16**: https://www.ourcommons.ca/procedure-and-practice-4/ch16-5-e.html
- **MM2**: https://www.ourcommons.ca/MarleauMontpetit/DocumentViewer.aspx?Language=E&Sec=Ch02&Seq=4
- **EC-HEO**: https://www.elections.ca/content.aspx?section=vot&dir=bkg&document=heo&lang=e
- **PROC18**: https://www.ourcommons.ca/documentviewer/en/43-2/PROC/report-18/page-72
- **LOP**: https://lop.parl.ca/sites/PublicWebsite/default/en_CA/ResearchPublications/202509E
- **GGF**: https://www.gg.ca/en/governor-general/former-governors-general
- **GGC**: https://www.gg.ca/en/governor-general/role-and-responsibilities/constitutional-duties
- **CH-GG**: https://www.canada.ca/en/canadian-heritage/services/crown-canada/governor-general.html
- **CH-LG**: https://www.canada.ca/en/canadian-heritage/services/crown-canada/lieutenant-governors.html
- **CH-M**: https://www.canada.ca/en/canadian-heritage/services/crown-canada/monarch.html
- **SO**: https://www.ourcommons.ca/procedure/standing-orders/chap13-e.html
- **C1** / **C2** / **C13**: https://laws-lois.justice.gc.ca/eng/const/page-1.html, page-2.html and page-13.html
- **OP-*** pages: the ourcommons.ca "Our Procedure" URLs already cited on the pages

**content/learn/02-crown/reserve-powers.en.md**
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| King–Byng dates | corrected (added exact dates) | PP4-A6 note 7; MM2; EC-HEO | 2026-11-13 | undated steps and "~June 26–28 … July 2" → request June 26; resigned June 28; Meighen PM June 29; defeated July 1; dissolved July 2; election September 14, 1926 |
| Defeat "by a single vote" | confirmed | MM2 ("96-95"); LOP | 2026-11-13 | |
| No federal refusal of dissolution since 1926 | unresolved | PP4-1 (gives only the 1926 example) | 2026-11-13 | |
| 2008 meeting length | corrected | PROC18 ("only after several hours of reflection") | 2026-11-13 | "After a meeting of about two hours" → "She agreed, but only after several hours" |
| Parliament returned January 26, 2009 | confirmed | https://www.ourcommons.ca/DocumentViewer/en/40-2/house/sitting-1/hansard | 2026-11-13 | |
| 2008 was the "first time" a PM sought prorogation to avoid a confidence vote | corrected | PROC18 (1873 Macdonald prorogation) | 2026-11-13 | "first time" claim → names the 1873 earlier case |
| MacKinnon v. Canada (AG), 2025 FC | unresolved (blocked) | CanLII 403; Wikipedia points to 2025 FC 422 | 2026-11-13 | |
| 1878 Letellier dismisses Boucher de Boucherville | confirmed | http://www.biographi.ca/en/bio/letellier_de_saint_just_luc_11E.html ("2 March 1878") | 2026-11-13 | |
| 1961 Bastedo reservation, the last one | corrected (minor) | https://esask.uregina.ca/entry/bastedo_frank_lindsay_1886-1973.html | 2026-11-13 | "Ottawa promptly approved it" → "Ottawa approved it by order in council" |

**content/learn/02-crown/governor-general.en.md**
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| Custom of alternating anglophone and francophone holders | unresolved (judgement call, not found) | – | 2026-11-13 | |
| "Most bills" get assent by written declaration | corrected | PP4-16 ("frequently dispensed with") | 2026-11-13 | "Most bills now get assent by written declaration" → "Assent is now often given by written declaration" |
| Ceremony twice a year and for the first supply bill | confirmed | PP4-16 | 2026-11-13 | |
| Deputies such as Supreme Court judges | confirmed | PP4-1 | 2026-11-13 | |
| Consulting premiers on Lieutenant Governor appointments | unresolved (not found) | CH-LG is silent | 2026-11-13 | |
| Maritime Bank case, [1892] A.C. 437 | unresolved (blocked) | BAILII challenge; CanLII 403 | 2026-11-13 | |
| Commissioner's usual term | corrected | Yukon Act s. 4; Nunavut Act s. 5 (laws-lois) | 2026-11-13 | "Varies" → "No fixed term" |
| GG appointment, about 5 years, advisory group | confirmed | CH-GG | 2026-11-13 | |

**content/learn/02-crown/index.en.md**
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| Accession September 2022; crowned May 2023 | confirmed | https://www.royal.uk/the-king ; https://www.royal.uk/coronation | 2026-11-13 | marker turned into a `<!-- maintenance: … -->` note |
| Commissioners are not representatives of the King | confirmed | CH-GG ("are not official representatives of The King") | 2026-11-13 | |
| 1953 Canadian title | confirmed | CH-M | 2026-11-13 | |

**content/learn/02-crown/republic-question.en.md**
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| Provincial referendum laws: BC | corrected/narrowed | https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96067_01 | 2026-11-13 | general "some provinces …" → BC's s. 1 rule stated; it covers any amendment |
| Provincial referendum laws: Alberta | unresolved (not found) | – | 2026-11-13 | |
| SCC refused leave (file 38986) | confirmed; dated | https://www.scc-csc.ca/case-dossier/info/dock-regi-eng.aspx?cas=38986 | 2026-11-13 | "2020" → "April 23, 2020" |

**content/learn/03-parliament/\***
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| Only one federal coalition: 1917 Union Government (confidence) | corrected (made precise) | LOP | 2026-11-13 | "very rare" → "only one … Union Government, formed in 1917" |
| Senate pre-study (how-a-bill) | confirmed | PP4-16 | 2026-11-13 | |
| Opposition-chaired committees (question-period) | confirmed; committees named | SO 106(2) | 2026-11-13 | |
| Committees' power to send for persons, papers and records (question-period) | confirmed | SO 108(1)(a) | 2026-11-13 | |
| QP 45 min, 2:15 / 11:15 Fridays, written questions 45 days, late show Monday–Thursday (question-period, unmarked) | confirmed | OP-Questions | 2026-11-13 | |
| Retirement at 75 since 1965 (senate) | confirmed | https://laws-lois.justice.gc.ca/eng/const/endNotes.html (in force June 2, 1965) | 2026-11-13 | |
| s. 26 used once, in 1990; 2014 caucus change (senate) | confirmed | PP4-1 | 2026-11-13 | |
| Current Senate group composition (senate) | unresolved | PP4-1 confirms it only as of November 2024 | 2026-11-13 | |
| Link to Reference re Senate Reform at scc-csc 13614 (senate) | confirmed (loads, right title) | https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/13614/index.do | 2026-11-13 | marker removed |
| ss. 53–55 cited on Justice Laws page-1 (index, senate, how-a-bill) | corrected (link) | C2 | 2026-11-13 | page-1 → page-2 |

**content/governors-general.en.md**
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| 1953 Royal Style and Titles Act gave a distinct Canadian title | confirmed | CH-M | 2026-11-13 | |
| Massey (1952) first Canadian-born; holders before him | confirmed; wording fixed | https://www.gg.ca/en/governor-general/former-governors-general/vincent-massey | 2026-11-13 | "came from Britain" → "was British" |
| Sauvé first woman | confirmed | https://www.gg.ca/en/governor-general/former-governors-general/jeanne-sauve | 2026-11-13 | |
| Simon first Indigenous GG | confirmed | https://www.gg.ca/en/governor-general/former-governors-general/mary-simon | 2026-11-13 | |
| Administrator period January–July 2021 | confirmed | GGF; PP4-1 | 2026-11-13 | |
| Edward VIII abdicated December 1936 | confirmed | https://www.royal.uk/edward-viii | 2026-11-13 | |
| Current GG: Louise Arbour, 31st, sworn in June 8, 2026 | confirmed | https://www.gg.ca/en/governor-general | 2026-11-13 | |
| JSON: Mary Simon's end date | corrected | GGF ("July 26, 2021 - June 8, 2026") | 2026-11-13 | 2026-06-07 → 2026-06-08 |
| JSON: Lisgar's start date | corrected | GGF | 2026-11-13 | 1868-11-14 → 1869-02-02 |
| JSON: Lord Alexander's end date | corrected | GGF | 2026-11-13 | 1952-02-28 → 1952-01-28 |
| JSON: Hnatyshyn, LeBlanc, Clarkson, Johnston, Arbour start | confirmed | GGF | 2026-11-13 | |
| JSON: Jean end (Oct 1 vs gg.ca Sept 30); Payette end (Jan 21 vs gg.ca Jan 22, while PP4-1 says she resigned Jan 21) | left as is | conventions differ; sources conflict on Payette | 2026-11-13 | |

**content/prime-ministers.en.md and prime-ministers.json**
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| Last 8 PMs (Turner to Carney): start dates and parties | confirmed | PP4-A6 | 2026-11-13 | |
| Current PM Carney (24th), sworn in March 14, 2025 | confirmed | https://www.pm.gc.ca/en/about ; PP4-A6 | 2026-11-13 | |
| Every earlier start date (Macdonald to Harper) | confirmed | PP4-A6 | 2026-11-13 | |
| End dates | confirmed (convention) | PP4-A6 ends the day before; JSON uses the successor's start | 2026-11-13 | no change |
| Monarch Charles III, from 2022-09-08 | confirmed | https://www.royal.uk/the-king | 2026-11-13 | |
| Macdonald 1873 resignation; death 1891; Clark 1979–80 | confirmed | PP4-A6; EC-HEO | 2026-11-13 | |

**Quizzes** (verdict "confirmed" unless noted)
| Claim | Verdict | Source | Accessed | Before → After |
|---|---|---|---|---|
| crown-reigns-not-rules | confirmed | GGC | 2026-11-13 | |
| crown-uk-government-role | confirmed | CH-M ("independent of" the UK role) | 2026-11-13 | |
| crown-what-the-crown-means | unresolved: "R = Rex/Regina" not in a fetched source; marker added | https://www.justice.gc.ca/eng/csj-sjc/just/08.html | 2026-11-13 | source index.html → 08.html |
| crown-divisible | confirmed | CH-LG | 2026-11-13 | |
| crown-gg-appointment | confirmed | CH-GG | 2026-11-13 | |
| crown-lg-appointment | confirmed | C2 s. 58; CH-LG | 2026-11-13 | |
| crown-administrator | confirmed | CH-GG | 2026-11-13 | |
| crown-reserve-powers-purpose | confirmed | GGC | 2026-11-13 | |
| crown-king-byng | confirmed | PP4-A6 | 2026-11-13 | source TCE → PP4-A6 |
| crown-2008-prorogation | confirmed | PROC18 | 2026-11-13 | source → PROC18 |
| crown-republic-unanimity | confirmed | C13 s. 41(a) | 2026-11-13 | |
| crown-succession-change | confirmed: Act assented 2013-03-27; QCCA 1826 dated October 28, 2019; leave dismissed 2020. The QCCA's reasoning itself was not read (CanLII blocked) | succession act on laws-lois; SCC docket 38986 | 2026-11-13 | |
| parliament-three-parts | confirmed | C1 s. 17 | 2026-11-13 | |
| parliament-minority-government | confirmed | OP-ParliamentaryFramework | 2026-11-13 | |
| parliament-money-bills | confirmed | C2 s. 53 | 2026-11-13 | source page-1 → page-2 |
| parliament-official-opposition | confirmed | OP-ParliamentaryFramework; OP-Questions | 2026-11-13 | |
| parliament-prorogation | confirmed | OP-ParliamentaryCycle | 2026-11-13 | |
| parliament-bill-order | confirmed | OP-LegislativeProcess | 2026-11-13 | |
| parliament-same-text | confirmed | PP4-16 | 2026-11-13 | |
| parliament-private-members-bill | confirmed | OP-LegislativeProcess | 2026-11-13 | |
| parliament-senate-appointment | confirmed | C1 s. 24 | 2026-11-13 | the canada.ca advisory board page was not fetched |
| parliament-senate-advisory-board | not independently re-fetched | – | 2026-11-13 | |
| parliament-senate-seats | confirmed | C1 ss. 21–22 | 2026-11-13 | |
| parliament-confidence-loss | confirmed | OP-ParliamentaryFramework | 2026-11-13 | |
| parliament-confidence-budget | confirmed | OP-ParliamentaryFramework | 2026-11-13 | |
| parliament-question-period-answer | confirmed | OP-Questions | 2026-11-13 | |
| parliament-committee-membership | confirmed | OP-Committees | 2026-11-13 | |
| governors-general-appointed | confirmed | GGC | 2026-11-13 | |
| governors-general-term | confirmed | PP4-1 ("at pleasure", generally five years) | 2026-11-13 | source → PP4-1 |
| governors-general-administrator | confirmed | GGF | 2026-11-13 | source Wikipedia → GGF |
| governors-general-first-canadian | confirmed | gg.ca Massey page | 2026-11-13 | explanation "came from Britain" → "was British"; source → gg.ca |
| governors-general-first-woman | confirmed | gg.ca Sauvé page | 2026-11-13 | source → gg.ca |
| governors-general-abdication | confirmed | royal.uk/edward-viii | 2026-11-13 | source → royal.uk |
| governors-general-succession | confirmed | https://www.royal.uk/accession | 2026-11-13 | source → royal.uk |
| prime-ministers-appointed | confirmed | PP4-A6 | 2026-11-13 | source → PP4-A6 |
| prime-ministers-numbering | confirmed | 24th PM (pm.gc.ca) vs 30 ministries (PP4-A6) | 2026-11-13 | source → PP4-A6 |
| prime-ministers-king-byng | confirmed | PP4-A6 | 2026-11-13 | source → PP4-A6 |
| prime-ministers-unionist | confirmed | PP4-A6 note 5 | 2026-11-13 | source → PP4-A6 |
| prime-ministers-merger | partly confirmed: CPC registered 2003-12-07; the merger detail rests on Wikipedia (kept as source) | Elections Canada registered parties page | 2026-11-13 | |
| prime-ministers-clark-defeat | confirmed | MM2 (139–133); EC-HEO | 2026-11-13 | source → EC-HEO |
| prime-ministers-longest | confirmed (worked out from term dates: about 21.4 and 19.0 years) | PP4-A6 | 2026-11-13 | source → PP4-A6 |

### Crown, governors general, prime ministers and Parliament: corrections

**King–Byng dates** (reserve-powers):
- **Before:** steps not dated; marker said "~June 26–28 … July 2".
- **After:** King asked for dissolution on **June 26, 1926**. He resigned **June 28**. Meighen formed a government **June 29**. It was defeated in the House on **July 1** (96–95). Parliament was dissolved **July 2**. The election was **September 14, 1926**.
- **Sources:** PP4-A6 note 7; MM2; EC-HEO. The PCO ministry pages (archived at LAC) agree: King's ministry ended 28 June 1926 and Meighen's began 29 June 1926.
- **Note:** Wikipedia says the vote came at about 2 a.m. on July 2, during the July 1 sitting. I did not confirm this; the official sources say July 1.

**Other corrections:**
- 2008 meeting: "After a meeting of about two hours, she agreed." → "She agreed, but only after several hours." (PROC18)
- 2008 "first time" claim → "The Prime Minister had asked for a prorogation to avoid an imminent confidence vote. A House of Commons committee has pointed to one earlier case: in 1873, John A. Macdonald was granted a prorogation while losing support in the House during the Pacific Scandal." (PROC18)
- 1961: "Ottawa promptly approved it" → "Ottawa approved it by order in council." (Encyclopedia of Saskatchewan)
- Royal assent: "Most bills now get assent by written declaration" → "Assent is now often given by written declaration" (PP4-16)
- Commissioner's term: "Varies" → "No fixed term" (Yukon Act s. 4; Nunavut Act s. 5)
- Coalitions: "have been very rare at the federal level" → "Canada has had only one at the federal level: Robert Borden's Union Government, formed in 1917 during the First World War." (LOP)
- Referendum laws: "some provinces have their own laws requiring a referendum before their legislature votes on certain constitutional amendments" → states BC's law, which covers any amendment (BC Constitutional Amendment Approval Act s. 1)
- Massey: "every holder came from Britain" → "was British", on the page and in the quiz (gg.ca)
- governors-general.json:
  - Simon end 2026-06-07 → 2026-06-08
  - Lisgar start 1868-11-14 → 1869-02-02
  - Alexander end 1952-02-28 → 1952-01-28
  - Source for all three: GGF.
- Constitution Act ss. 53–55 citations moved from page-1 to page-2 (index, senate, how-a-bill and quiz parliament-money-bills).

### Crown, governors general, prime ministers and Parliament: unresolved

- **Blocked:**
  - MacKinnon v. Canada (AG), 2025 FC (CanLII 403; the court's search needs JavaScript; Wikipedia says 2025 FC 422, March 2025, Crampton CJ).
  - Maritime Bank [1892] A.C. 437 (BAILII challenge, CanLII 403).
  - Alberta Constitutional Referendum Act (King's Printer URLs 404, CanLII 403).
- **Not found:**
  - No federal refusal of dissolution since 1926.
  - Consulting premiers on Lieutenant Governor appointments.
  - Quiz crown-what-the-crown-means: "R = Rex/Regina" (new marker).
  - Current Senate group composition (confirmed only as of November 2024 by PP4-1; sencanada.ca needs JavaScript).
- **Judgement call:** custom of alternating anglophone and francophone holders.
- **Sources conflict:** Payette's end date (Wikidata and PP4-1 say resigned Jan 21, 2021; gg.ca says the term ran to Jan 22). I left the JSON at Jan 21.

### Crown, governors general, prime ministers and Parliament: unverified links still marked

None. The Reference re Senate Reform link at scc-csc item 13614 loads with the right title, so I removed its marker.

## Elections

**content/learn/04-elections/party-leaders.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| s. 406(2): parties tell EC who may endorse candidates | confirmed | https://laws-lois.justice.gc.ca/eng/acts/E-2.01/FullText.html | |
| "in many parties that includes the leader" | unresolved | (party filings not published) | |
| Membership eligibility (non-citizens, under 18) | unresolved | liberal.ca/register (no detail), conservative.ca/join (404) | |
| Riding-weighted points systems | unresolved | not reachable | |
| PoCA ss. 49.2–49.8: 20% notice, secret ballot, 12+ MPs, four votes, binding until dissolution | confirmed | https://laws-lois.justice.gc.ca/eng/acts/P-1/FullText.html | |
| CEA s. 478.1: leadership contest registration and finance | confirmed | CEA (above) | |

**content/learn/04-elections/cabinet-and-pmo.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| Senator-ministers "rare in recent decades" | corrected | https://sencanada.ca/en/content/sen/chamber/412/debates/002db_2013-10-17-e | "though this has been rare in recent decades" → "For decades the government's leader in the Senate sat in cabinet, but that stopped in 2013." |
| Treasury Board established by statute (FAA) | confirmed | https://laws-lois.justice.gc.ca/eng/acts/F-11/FullText.html (s. 5(1)) | |
| s. 11 Privy Council | confirmed | https://laws-lois.justice.gc.ca/eng/Const/FullText.html | |
| PCO non-partisan; Clerk is Secretary to the Cabinet and Head of the Public Service | confirmed | https://www.canada.ca/en/privy-council/corporate/mandate.html | |
| Cabinet solidarity (support publicly or resign) | confirmed | https://www.pm.gc.ca/en/news/backgrounders/2015/11/27/open-and-accountable-government | |

**content/learn/04-elections/election-day.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| "Most provinces/territories have fixed-date laws" | confirmed | Primary law for 7 of 13: BC Constitution Act s. 23; AB Election Act s. 38.1 (current to Dec 18, 2025); MB Elections Act s. 49.1; NB Legislative Assembly Act s. 3(4); PEI Election Act s. 4.1 (current to May 29, 2026); NL House of Assembly Act s. 3; Élections Québec page. URLs are in the page's Sources. | |
| Democracy Watch v. Canada (PM), 2023 FCA 41 | unresolved (blocked) | CanLII and FCA site returned 403 | |
| s. 3 (18+ citizens), s. 56.1(1)–(2), s. 56.2, s. 57 (36th–50th day), s. 128 (12 hours, staggered), s. 132 (3 consecutive hours), s. 171 (10th–7th day), s. 300 (1/1000 recount) | confirmed | CEA FullText | |
| First fixed date was October 19, 2009, so 2008 came before it | confirmed | CEA s. 56.1(2) | |
| Special ballot: can't switch; ID and vouching; ways to vote | confirmed | https://www.elections.ca/content.aspx?section=vot&dir=faq&document=faqvoting&lang=e | |

**content/learn/04-elections/first-past-the-post.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| February 2017 date and stated reason | confirmed (wording made exact) | https://www.pm.gc.ca/en/mandate-letters/2017/02/01/archived-minister-democratic-institutions-mandate-letter | "In early 2017" → "In February 2017" |
| Provincial reform votes (BC, ON, PEI) with no change | confirmed | ERRE report ch. 3 https://www.ourcommons.ca/documentviewer/en/42-1/ERRE/report-3/page-90 ; https://elections.bc.ca/docs/rpt/2018-CEO-2018-Referendum-Report.pdf (61.3% kept FPTP); https://www.electionspei.ca/index.php/resources/history-of-elections-on-pei (2019: 15 districts, 17 needed) | |
| All jurisdictions use FPTP as of 2026 | unresolved (not found) | | |
| ERRE recommendations (Gallagher ≤5, referendum with current system on the ballot, no mandatory/online voting "at this time") | confirmed | https://www.ourcommons.ca/documentviewer/en/42-1/ERRE/report-3/page-408 | |
| Supplementary opinions (Liberal; NDP and Green) | confirmed | https://www.ourcommons.ca/DocumentViewer/en/42-1/ERRE/report-3/page-ToC | |
| s. 313 largest number of votes | confirmed | CEA | |
| 2019 and 2021: most votes but fewer seats | confirmed | EC ovr2019app/51/table8E and ovr2021app/53/table8E (CPC 6,239,227 vs LPC 6,018,728; CPC 5,747,410 vs LPC 5,556,629) | |

**content/learn/04-elections/index.en.md**: no markers. The fixed-date summary, five-year limit and voting age are consistent with the CEA and Charter. Only spot-checked.

**content/elections-history.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| Provinces that added seats in the 1870s | corrected | https://laws-lois.justice.gc.ca/eng/Const/FullText.html (PEI admitted July 1, 1873); site data (House 200 → 206, 1872 → 1874) | "Manitoba and British Columbia in the 1870s" → "Manitoba, British Columbia and Prince Edward Island in the 1870s" |
| 1921 first near-equal franchise; Macphail first woman MP | confirmed | https://www.elections.ca/content.aspx?section=res&dir=his/chap2&document=index&lang=e | |

**content/ridings.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| open.canada.ca FED 2023 link | confirmed (marker removed) | https://open.canada.ca/data/en/dataset/18bf3ea7-1940-46ec-af52-9ba3f77ed708 | |
| StatCan boundary files link | unresolved (blocked) | 403 | |
| 343 ridings; April 28, 2025 | confirmed | https://www.elections.ca/res/rep/off/ovrGE45/62/table7E.html | |

**history.json spot-check** (compared all 45 rows with https://www.elections.ca/content.aspx?section=ele&dir=turn&document=index&lang=e; zero mismatches in electors, ballots and turnout)
| Item | Verdict |
|---|---|
| Dates: 1867 (Aug 7 – Sep 20), 1874-01-22, 1917-12-17, 1921-12-06, 1958-03-31, 1984-09-04, 1993-10-25, 2011-05-02, 2015-10-19, 2019-10-21, 2021-09-20, 2025-04-28 | confirmed |
| Turnout: 2011 61.1, 2015 68.3, 2019 67.0, 2021 62.6, 2025 69.0 | confirmed |
| Seats 2025: LPC 169, CPC 144, BQ 22, NDP 7, GPC 1 (minority) | confirmed (EC GE45 table 7) |
| Seats 2021: 160/119/32/25/2 | confirmed (ovr2021app/53/table7E) |
| Seats 2019: 157/121/32/24/3/1 | confirmed (ovr2019app/51/table7E) |
| Seats 2015: 184/99/44/10/1 | confirmed (ovr2015app/41/table7E) |
| Seats 2011: 166/103/34/4/1 | unresolved (EC 2011 results frame links are 404; ParlInfo 403) |
| 2025 vote: LPC 43.8, CPC 41.3, NDP 6.3, BQ 6.3, GPC 1.2 | confirmed (GE45 table 9) |

**Quizzes: elections.en.yaml (14)**. Every answer is correct and every distractor is wrong.
- Confirmed: what-you-vote-for (CEA s. 313); who-can-vote (s. 3); new-leader-pm (Our Procedure: the PM is whoever can hold confidence); most-votes-fewer-seats (EC tables); elections-canada (EC mission page: independent, reports directly to Parliament); fixed-date (s. 56.1(1)); campaign-length (s. 57); fptp-winner (s. 313); fptp-concentrated-votes (6.3% each, 22 vs 7, BQ 0.0 outside Quebec); erre-report (page-408); leaders-chosen-by (CEA Part 18 Div. 6); reform-act (PoCA s. 49.8(1)(c)); pmo-vs-pco (PCO mandate).
- cabinet-solidarity: answer confirmed. Its source changed from Our Procedure (which doesn't mention resigning) to the Open and Accountable Government URL.

**elections-history.en.yaml (6)**
- governing-parties: confirmed against site data (only lpc and cpc families). The source is still Wikipedia.
- most-votes: confirmed (EC).
- majority-under-half: confirmed against site data; 23 of 29 majorities had under 50%.
- turnout-peak: confirmed (EC: 1958 79.4%, 2008 58.8%; 1958 has the largest seat share in the data, 208 of 265).
- first-nations-vote (1960) and voting-age (1970, first used 1972): confirmed (EC chap3).

**ridings.en.yaml (5)**
- what-is, redrawn-after-census (Constitution Act s. 51(1)) and mp-can-change (House of Commons members data fetched 2026-11-13; 7 members joined after the election): confirmed.
- why-sizes-differ: explanation corrected (see 3).
- 2025-plurality: corrected 119 → 120 (see 6).

### Elections: corrections

1. **cabinet-and-pmo.en.md:** "A senator can also be a minister, though this has been rare in recent decades." → "A senator can also be a minister. For decades the government's leader in the Senate sat in cabinet, but that stopped in 2013." Source: Senate Debates, October 17, 2013 (https://sencanada.ca/en/content/sen/chamber/412/debates/002db_2013-10-17-e), which says the government leader is not in cabinet "for the first time since" Diefenbaker. Source line added.
2. **elections-history.en.md:** "Manitoba and British Columbia in the 1870s" → "Manitoba, British Columbia and Prince Edward Island in the 1870s". Source: https://laws-lois.justice.gc.ca/eng/Const/FullText.html (PEI admitted July 1, 1873), plus House size 200 → 206 in the site data.
3. **first-past-the-post.en.md:** "In early 2017" → "In February 2017". Source: https://www.pm.gc.ca/en/mandate-letters/2017/02/01/archived-minister-democratic-institutions-mandate-letter
4. **quizzes/ridings.en.yaml `ridings-2025-plurality`:** "119 of the 343 ridings" → "120 of the 343 ridings". Champagne had 31,095 of 62,240 valid votes (49.96%); EC prints this as 50.0. Source: https://www.elections.ca/res/rep/off/ovrGE45/62/table12E.html and table11E.html. The answer ("about 1 in 3") is unchanged. "Most in QC, ON, BC" still holds (51, 30 and 23).
5. **quizzes/ridings.en.yaml `ridings-why-sizes-differ`:** "Commissions can go further in sparse rural or northern areas, which is why northern ridings are both huge and smaller in population." → "Commissions can depart from the average to keep ridings in sparse rural or northern areas a manageable size, which is why those ridings are both huge and smaller in population." Source: Electoral Boundaries Readjustment Act s. 15(2), https://laws-lois.justice.gc.ca/eng/acts/E-3/FullText.html. Going beyond 25% is allowed only in extraordinary circumstances.

### Elections: unresolved

- **Blocked:**
  - election-day: Democracy Watch v. Canada (PM), 2023 FCA 41 (CanLII and FCA site returned 403). The 2021 row "A similar court challenge was again dismissed" and Conacher 2010 FCA 131 are also unverified for the same reason.
  - history.json: 2011 seat totals.
- **Not found:** first-past-the-post: "As of 2026 all federal, provincial and territorial elections use FPTP".
- **Party rules not reachable** (party sites 404 or unparsed, and no search budget left): party-leaders, all three markers.
- **Noticed but not edited:** a Wikipedia summary (pointer only) says Nova Scotia repealed its fixed-date law in 2025 and Ontario did so in late 2025. "Most" still holds either way.

### Elections: unverified links still marked

- content/ridings.en.md line 50, StatCan boundary files: "blocked 2026-11-13: 403 to automated fetch".

### Elections: code changes

**A. Majority wording**
- Files: `src/lib/province-profile.ts`, `src/widgets/province-profile/data.ts`, `src/widgets/province-profile/Election.astro`, `src/widgets/ridings-explorer/data.ts`.
- **Before:** `ridingsTakeaway` used Elections Canada's one-decimal share. A winner at exactly 50 still produced "every winner had more than half the votes". Real cases were also misclassified: Champagne in Saint-Maurice—Champlain had 31,095 of 62,240 votes (49.96%), which EC prints as 50.0, so he was counted as having half or more.
- **After:**
  - The decision uses the unrounded share. There is a new `voteShare(votes, validVotes)`, and `RidingRow.winnerShare` is now raw. Exactly half (2 × votes = valid votes) gives "every winner had **at least** half the votes".
  - There is a new `winnerPct()`. It adds decimals only when one decimal would print "50.0%" for a share that isn't exactly half (49.96%, 50.05%, 50.01%). The profile map tooltip and table use it, so the displayed figure always agrees with the text.
  - The ridings explorer's `winnerShare` is now also computed from votes. As a result, riding-share-map counts 120 winners under 50% (was 119) and Jonquière (20,247 of 50,629 = 39.99%) under 40%.
- The `it.fails` at about line 319 is now a passing `it` with exact expectations. I added a `winnerPct` test.

**B. Population wording** (`trendTakeaway`)
- **Before:** when the endpoints were within 1% but there was a peak in between, it read "held at about X … after peaking at Y".
- **After:** "X's population rose from 1 million in 1951 to 1.3 million in 1990, then fell back to about 1 million in 2026." The "held at about" wording is kept only when there is no qualifying peak.
- The `it.fails` at about line 214 is now a passing `it` with the exact sentence.

**C. Dates**
- `scripts/data/election-history.ts` has a new `siteDateLabel()`. It turns "22 January 1874" into "January 22, 1874", and "7 August - 20 September 1867" into "August 7 – September 20, 1867". It fails on any unknown format.
- I did not re-run the script, because that needs network access and would refresh all the other data. Instead I patched the 45 `dateLabel` values in `src/data/elections/history.json` with jq, using the same transformation. Only those lines changed.
- Audit: raw ISO "Data fetched 2026-11-13" now uses `formatDate`, giving "November 13, 2026". Files:
  - `src/widgets/election-governments/index.astro`
  - `src/widgets/election-house-size/index.astro`
  - `src/widgets/election-seats/index.astro`
  - `src/widgets/election-turnout/index.astro`
  - `src/widgets/election-votes-seats/index.astro`
  - `src/widgets/election-women/index.astro`
  - `src/widgets/premiers-ribbon/RibbonTable.astro` (only that line was changed)
- I found no other non-site-style dates. The short "Sept. 25, 1926" style (Canadian Press abbreviations, in `reference.ts`) is deliberate, and fiscal-year labels like "1926-27" are not dates.
- I added a test in `tests/unit/elections.test.ts` asserting that every history `dateLabel` is in site style.

## Federalism and government

**content/learn/05-federalism/money-and-equalization.en.md**
| Claim | Verdict | Source URL | Accessed | Before → After |
|---|---|---|---|---|
| CST condition: no minimum residency period for social assistance | confirmed | https://laws-lois.justice.gc.ca/eng/acts/F-8/section-25.1.html ; https://www.canada.ca/en/department-finance/programs/federal-transfers/canada-social-transfer.html | 2026-11-13 | |
| CHT and CST created in 2004 by splitting the CHST | confirmed ("restructure the CHST effective April 1, 2004") | https://www.canada.ca/en/department-finance/programs/federal-transfers/history-health-social-transfers.html | 2026-11-13 | |
| TFF since 1985 | confirmed (Start date: 1985) | https://www.canada.ca/en/department-finance/corporate/transparency/plans-performance/departmental-plans/2026-2027/supplementary-information-tables-page-1.html | 2026-11-13 | |
| Alberta 2021 referendum | corrected (61.7% yes on Oct 18, 2021 confirmed; "non-binding" dropped) | https://www.elections.ab.ca/uploads/2021-Senate-and-Referendum-Report.pdf ; https://kings-printer.alberta.ca/documents/Acts/R08P4.pdf (s. 4) | 2026-11-13 | "non-binding provincial referendum" → "provincial referendum" |
| As of 2026: CHT 5% floor 2023-24 to 2027-28; GDP average with 3% floor; CST 3% | confirmed | Finance Canada CHT and CST pages | 2026-11-13 | |
| Equalization: 1957 start, general revenues, fiscal capacity, five revenue sources, GDP growth, renewal before March 31, 2029, every province has received it | confirmed | https://www.canada.ca/en/department-finance/programs/federal-transfers/equalization.html | 2026-11-13 | |
| TFF: gap-filling formula, part of revenue capacity excluded (30%) | confirmed | Finance Canada TFF page | 2026-11-13 | |
| Spot check of 2026-27 figures (transfers.json, `latest`) | confirmed: all 13 rows match (e.g. QC equalization 13,907; ON 406; total equalization $27,160M) | https://www.canada.ca/en/department-finance/programs/federal-transfers/major-federal-transfers.html | 2026-11-13 | |

**content/learn/05-federalism/municipalities.en.md**
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| Ontario 2022 strong-mayor law for some cities | confirmed (Bill 3, royal assent Sept 8, 2022; Toronto plus designated municipalities) | https://www.ola.org/en/legislative-business/bills/parliament-43/session-1/bill-3 | 2026-11-13 | |
| CCBF was formerly the Gas Tax Fund and flows through the provinces | confirmed | https://search.open.canada.ca/qpnotes/record/infc,INFC-012023-INFC-0002 | 2026-11-13 | |
| Toronto 2021 5–4, s. 92(8) not in dispute (unmarked) | confirmed | https://www.scc-csc.ca/judgments-jugements/cb/2021/38921/ | 2026-11-13 | |

**content/learn/05-federalism/territories.en.md**
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| Nunavut transfer on April 1, 2027; agreement signed January 2024 | confirmed | https://search.open.canada.ca/qpnotes/record/aandc-aadnc%2CNA-2025-QP-2860 | 2026-11-13 | |
| Link to the Nunavut devolution agreement | confirmed (loads; titled as the agreement) | https://www.rcaanc-cirnac.gc.ca/eng/1702495657169 | 2026-11-13 | |
| Territories' powers are delegated by Parliament; devolution (unmarked) | confirmed | https://www.canada.ca/en/intergovernmental-affairs/services/provinces-territories.html | 2026-11-13 | |
| s. 42(1)(e),(f) general formula (unmarked) | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-13.html | 2026-11-13 | |

**content/learn/05-federalism/division-of-powers.en.md**
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| Driver's licences card cites s. 92(13) and (16) | unresolved (blocked) | decisions.scc-csc.ca and canlii.org returned 403 | 2026-11-13 | |
| Heads of power in ss. 91, 92, 92A, 94A and 95 tables (unmarked) | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-3.html | 2026-11-13 | |

**content/learn/06-government/bank-of-canada-vs-mint.en.md**
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| Targets introduced in 1991; 2% target since the mid-1990s | confirmed (announced Feb 1991; 3% by end-1992, 2.5% by mid-1994, 2% by end-1995, each ±1 point) | https://www.bankofcanada.ca/2002/01/inflation-targeting-canada-experience-lessons/ ; https://www.bankofcanada.ca/1998/10/canadian-experience-targets-inflation-control/ | 2026-11-13 | |
| Nov 2026 renewal for 2027–2031 keeps 2% and the 1–3% range | confirmed ("midpoint of the 1% to 3% inflation-control range"; joint statement Nov 5, 2026) | https://www.bankofcanada.ca/2026/11/joint-statement-of-the-government-of-canada-and-the-bank-of-canada-on-the-renewal-of-the-monetary-policy-framework-2026/ | 2026-11-13 | |
| s. 14 directive has never been used | confirmed ("this power has never been used", Bank of Canada, 2022; no later use found) | https://www.bankofcanada.ca/2022/05/earning-the-trust-of-canadians/ ; https://laws-lois.justice.gc.ca/eng/acts/B-2/page-2.html | 2026-11-13 | |
| Mint: 1908 Ottawa branch of the Royal Mint, Canadian control 1931, Crown corporation 1969 | confirmed | https://www.thecanadianencyclopedia.ca/en/article/royal-canadian-mint | 2026-11-13 | |
| Governor appointed by the directors with cabinet approval, 7-year term; Deputy Minister of Finance has no vote (unmarked) | confirmed (ss. 5(2), 6) | https://laws-lois.justice.gc.ca/eng/acts/B-2/page-1.html | 2026-11-13 | |
| Bank in operation since 1935, Crown corporation in 1938, five areas of work (unmarked) | confirmed | https://www.bankofcanada.ca/about/ | 2026-11-13 | |
| Mint: Ottawa and Winnipeg, coins for profit (unmarked) | confirmed | https://www.mint.ca/en/company | 2026-11-13 | |

**content/learn/06-government/watchdogs.en.md**
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| Public Accounts Committee chaired by the Official Opposition (SO 106(2)) | confirmed | https://www.ourcommons.ca/procedure/standing-orders/chap13-e.html | 2026-11-13 | |
| PBO created in 2006; independent officer of Parliament in 2017 | confirmed | https://www.pbo-dpb.ca/en/history--historique | 2026-11-13 | |
| Information Commissioner can order records released; Commissioner of Canada Elections sits within the Office of the Chief Electoral Officer | confirmed | https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy/modernizing-access-information/how-bill-c-58-changed-access-information-act.html ; https://laws-lois.justice.gc.ca/eng/acts/E-2.01/section-509.1.html | 2026-11-13 | |
| Ombuds report to a minister, not to Parliament | confirmed (both make their recommendations to their minister) | https://www.canada.ca/en/taxpayers-ombudsperson/corporate/about-us/mandate.html ; https://www.ombudsman-veterans.gc.ca/en/publications/annual-reports/2025-2026 | 2026-11-13 | |
| Link to the Office of the Auditor General | confirmed (loads the OAG home page) | https://www.canada.ca/en/auditor-general/ | 2026-11-13 | |
| AG appointment, 10-year term, no reappointment, removal by joint address (unmarked) | confirmed (s. 3) | https://laws-lois.justice.gc.ca/eng/acts/A-17/page-1.html | 2026-11-13 | |
| Four criteria and nine officers of Parliament (unmarked) | confirmed | https://hillnotes.ca/2018/04/26/to-be-or-not-to-be-an-officer-of-parliament-that-is-the-question/ | 2026-11-13 | |
| PBO costs election platforms (unmarked) | confirmed | https://www.pbo-dpb.ca/en/about--a-propos | 2026-11-13 | |

**content/learn/06-government/crown-corporations.en.md**
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| Public auto insurance in B.C. (ICBC), Saskatchewan (SGI) and Manitoba (MPI) | unresolved (partly confirmed) | https://www2.gov.bc.ca/gov/content/governments/organizational-structure/ministries-organizations/crown-corporations ; https://www.mpi.mb.ca/who-we-are/ ; https://www.cicorp.sk.ca/ ; https://saaq.gouv.qc.ca/en/traffic-accident/public-automobile-insurance-plan | 2026-11-13 | |
| Privatizations: Air Canada late 1980s, Petro-Canada from 1991, CN 1995 | unresolved for CN; others confirmed | https://laws-lois.justice.gc.ca/eng/acts/A-10.1/page-1.html ; https://www.thecanadianencyclopedia.ca/en/article/air-canada ; https://www.thecanadianencyclopedia.ca/en/article/petro-canada | 2026-11-13 | |
| Crown corporation governance: wholly owned, board, corporate plan approved by cabinet, responsible minister (unmarked) | confirmed | https://www.canada.ca/en/treasury-board-secretariat/services/guidance-crown-corporations/directors-crown-corporations-introductory-guide-roles-responsibilities.html | 2026-11-13 | |
| s. 89 directives: board consulted, tabled in Parliament (unmarked) | confirmed | https://laws-lois.justice.gc.ca/eng/acts/F-11/section-89.html | 2026-11-13 | |

**content/learn/06-government/departments.en.md**
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| Political activity rules: impartiality test, Commission permission to run, deputy heads limited to voting | confirmed (ss. 113(1), 114(1)–(2), 117) | https://laws-lois.justice.gc.ca/eng/acts/P-33.01/section-117.html ; https://laws-lois.justice.gc.ca/eng/acts/P-33.01/section-113.html ; https://laws-lois.justice.gc.ca/eng/acts/P-33.01/section-114.html | 2026-11-13 | |
| Values and Ethics Code: five values | unresolved (blocked) | tbs-sct.canada.ca rejected the request | 2026-11-13 | |
| Deputy ministers appointed by the Governor in Council on the PM's recommendation; accounting officers (unmarked) | confirmed | https://www.pm.gc.ca/en/news/backgrounders/2015/11/27/open-and-accountable-government | 2026-11-13 | |

**content/learn/06-government/the-budget.en.md** (no markers)
| Claim | Verdict | Source | Accessed | |
|---|---|---|---|---|
| ss. 53–54 | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-2.html | 2026-11-13 | |
| Appropriation acts, statutory spending, interim supply, allotted days, committees can't increase votes | confirmed | https://www.ourcommons.ca/procedure/procedure-and-practice-3/ch_18_1-e.html | 2026-11-13 | |

**content/quizzes/federalism.en.yaml** (17 questions; all confirmed, none changed)
| id | Verdict | Source |
|---|---|---|
| federalism-orders-equal | confirmed | const page-3 |
| federalism-health-care | confirmed | Finance CHT page |
| federalism-concurrent | confirmed (s. 95) | const page-3 |
| federalism-paramountcy | confirmed (s. 94A exception) | const page-3 |
| federalism-municipal-status | confirmed (s. 92(8)) | const page-3; SCC case in brief |
| federalism-residual-power | confirmed (POGG) | const page-3 |
| federalism-marriage-split | confirmed (91(26), 92(12)) | const page-3 |
| federalism-property-civil-rights | confirmed (answer false is correct; the explanation is standard doctrine and matches the page) | const page-3 |
| federalism-equalization-funding | confirmed ("make no contributions") | Finance equalization page |
| federalism-fiscal-capacity | confirmed | Finance equalization page |
| federalism-cht-cst-allocation | confirmed | Finance CST and CHT pages |
| federalism-territory-powers | confirmed | Intergovernmental Affairs provinces-territories page |
| federalism-territory-equalization | confirmed | Finance equalization and TFF pages |
| federalism-new-province | confirmed (s. 42(1)(f), s. 38(1)) | const page-13 |
| federalism-toronto-council | confirmed (5–4) | SCC 38921 case in brief |
| federalism-ontario-equalization | confirmed (first payment 2009-10; 2026-27 = $406M) | open.canada dataset 4eee1558 (fetched by the data script today); major-federal-transfers table |
| federalism-transfers-per-person | confirmed | Finance equalization page; major-federal-transfers table |

**content/quizzes/government.en.yaml** (18 questions)
| id | Verdict | Source | Before → After |
|---|---|---|---|
| government-public-service-neutral | confirmed | PSEA | |
| government-minister-vs-deputy | confirmed | pm.gc.ca Open and Accountable Government | |
| government-deputy-appointment | confirmed; marker removed, source replaced | https://www.pm.gc.ca/en/news/backgrounders/2015/11/27/open-and-accountable-government | source: TBS institutional-forms page → pm.gc.ca guide |
| government-mint-role | confirmed | mint.ca/en/company | |
| government-boc-policy-rate | confirmed | Bank of Canada inflation-targeting page | |
| government-boc-target | confirmed | Bank of Canada inflation-targeting page; joint statement | |
| government-crown-corp-definition | confirmed | TBS directors guide | |
| government-crown-corp-directive | confirmed | FAA s. 89(4) | |
| government-ag-reports-to | confirmed | AG Act s. 3 | |
| government-ag-term | confirmed | AG Act s. 3 | |
| government-pbo-costing | confirmed | PBO about page | |
| government-budget-vs-estimates | confirmed | Procedure and Practice ch. 18 | |
| government-money-bills-origin | confirmed | const page-2 s. 53 | |
| government-royal-recommendation | confirmed | const page-2 s. 54 | |
| government-spending-peak | confirmed (47.3% in 1943-44; 29.0% in 2020-21; 14.1–24.9% in other years since 1950) | Fiscal Reference Tables 2026 (federal-finances.json, fetched today) | |
| government-biggest-revenue | confirmed (personal income tax 47%, corporate 19.8%, GST 9.8% in 2025-26) | Fiscal Reference Tables 2026 | |
| government-rate-peak | corrected (explanation) | Bank of Canada Valet data in interest-rates.json (overnight target 1.5% in Dec 2008, 0.25% from April 2009) | "In 2008 and 2020 it cut its rate close to zero" → "In 2009 and 2020 …" |
| government-inflation-since-targets | confirmed (about 2.0% a year on average, 1991–2025) | StatCan 18-10-0005 (prices.json) | |

### Federalism and government: corrections

1. **money-and-equalization.en.md, Alberta referendum.** Changed "[non-binding provincial referendum](event:alberta-equalization-referendum-2021)" to "[provincial referendum](event:alberta-equalization-referendum-2021)". Alberta's Referendum Act s. 4 made a majority result on a constitutional question binding on the Alberta government that called the vote. It could not bind Ottawa or amend the Constitution, and the page already says so. Sources: https://kings-printer.alberta.ca/documents/Acts/R08P4.pdf (s. 4) and https://www.elections.ab.ca/uploads/2021-Senate-and-Referendum-Report.pdf (Order in Council 241/2021 under s. 1; 61.7% yes).
   - Caveat: the copy of the Act I read is current to Dec 11, 2025. Its history note shows s. 4 existed in RSA 2000 c. C-25. Some news coverage called the vote non-binding, so the neutral wording is the safe fix either way.
2. **government.en.yaml, government-rate-peak.** Changed "In 2008 and 2020" to "In 2009 and 2020". The overnight target was 1.5% in Dec 2008 and reached 0.25% in April 2009. Source: Bank of Canada Valet series V39079 (src/data/money/interest-rates.json).

I also added source citations to every page where a marker was resolved, and replaced the source on government-deputy-appointment.

### Federalism and government: unresolved

- **Blocked to automated fetch:**
  - division-of-powers.en.md line 22: the s. 92(13)/(16) heads for driver's licensing. decisions.scc-csc.ca and CanLII return 403, and no fetched secondary source names those heads.
  - departments.en.md line 101: Values and Ethics Code wording. tbs-sct.canada.ca rejects the request and the canada.ca pages return no text.
- **Not found (partly confirmed):**
  - crown-corporations.en.md line 82, public auto insurance: ICBC and MPI confirmed. SGI is confirmed as a Crown corporation, but no fetched page confirms its auto insurance role. The list also leaves out Quebec's public injury plan run by the SAAQ, which a human may want to add.
  - crown-corporations.en.md line 88: CN's 1995 privatization has only a Wikipedia source (Act July 13, 1995; IPO November 1995). Air Canada and Petro-Canada are confirmed.

### Federalism and government: unverified links still marked

None. Both links (rcaanc-cirnac Nunavut agreement and canada.ca/en/auditor-general) loaded the right pages, so I removed their markers.

## Law, the Charter, cases and the Supreme Court bench

**content/entities/cases.yaml.** Every case was checked on decisions.scc-csc.ca (`/scc-csc/scc-csc/en/item/<n>/index.do`, read through `?iframe=true`). The item number is given for each.
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| Big M, [1985] 1 SCR 295, decided 1985-04-24; Lord's Day Act struck | confirmed | item 43 | |
| Oakes, [1986] 1 SCR 103; s. 1 test | confirmed | item 117 | |
| Morgentaler, [1988] 1 SCR 30; s. 251 struck under s. 7 | confirmed | item 288 | |
| Ford, [1988] 2 SCR 712; signs are expression; s. 33 rules | confirmed | item 384 | |
| Vriend, [1998] 1 SCR 493; reading in | confirmed | item 1607 | |
| Secession Ref, [1998] 2 SCR 217 | confirmed | item 1643 | |
| Carter, 2015 SCC 5, [2015] 1 SCR 331 | confirmed | item 14637 | |
| Jordan, 2016 SCC 27, [2016] 1 SCR 631; 18/30-month ceilings | confirmed | item 16057 | |
| Persons Case citation [1930] A.C. 124 (P.C.) (marker); year 1929 | confirmed | item 2196 (cited at that page); canada.ca/en/women-gender-equality/commemorations-celebrations/womens-history-month/persons-day.html (October 18, 1929) | marker removed; source comment and alias "Edwards v. Attorney-General for Canada" added. BAILII is blocked (bot challenge) |
| 1939 Inuit reference: formal name and citation (marker) | confirmed | item 15858 (Daniels, para. 39: [1939] S.C.R. 104, "Re Eskimo") | citation and alias Re Eskimo added; formal name recorded in a comment |
| Calder, [1973] SCR 313; title recognized; led to claims policy | confirmed | item 5113; bctreaty.ca/timeline_milestones/calder-v-british-columbia-1973/ | |
| Patriation Ref, [1981] 1 SCR 753; legal, but convention requires "substantial degree" of consent | confirmed | item 2519 | url added |
| Quebec Veto Ref, [1982] 2 SCR 793; no Quebec veto | confirmed | item 5530 | url added |
| Manitoba Language Rights, 1985; deemed temporarily valid | confirmed | item 60 | citation [1985] 1 S.C.R. 721 and url added |
| Sparrow, [1990] 1 SCR 1075; valid objective plus honour of the Crown | confirmed | item 609 | |
| Delgamuukw, [1997] 3 SCR 1010; "right to the land itself"; oral histories | confirmed | item 1569 | |
| Marshall 1999, "moderate livelihood" wording (marker) | confirmed | item 1739 (paras. 4, 7, 59–61; 1760–61 treaties) | marker removed; citation [1999] 3 S.C.R. 456 and url added |
| Haida, 2004 SCC 73; consult even on unproven claims | confirmed | item 2189 | |
| Same-Sex Marriage Ref, 2004 | confirmed | item 2196 (Q1: yes, for s. 1 of the proposed law) | citation 2004 SCC 79, [2004] 3 S.C.R. 698, url and alias added |
| Senate Reform Ref, 2014 SCC 32; 7/50 for elections and term limits, unanimity to abolish | confirmed | item 13614 | url added |
| Tsilhqot'in, 2014 SCC 44; first declaration of Aboriginal title | confirmed | item 14246; jfklaw.ca (law firm) for "first ever" | |
| Daniels, 2016 SCC 12; Métis and non-status Indians are "Indians" | confirmed | item 15858 | |
| GGPPA References, 2021 SCC 11; national concern | confirmed | item 18781 | url added |
| Toronto v. Ontario, 2021 SCC 34; 47 wards cut to 25 in 2018 | confirmed | item 19011 | url added |
| 2024 child-welfare reference: name and citation (marker) | confirmed | item 20264 (2024 SCC 5, 2024-02-09: "The Act as a whole is constitutionally valid"; S.C. 2019, c. 24) | marker removed; formal name as alias, citation and url added |

**content/learn/07-law/*.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| Interpretation Act ss. 8.1 and 8.2 added by the Harmonization Act No. 1, 2001 (marker) | confirmed | laws-lois.justice.gc.ca/eng/acts/I-21/FullText.html (2001, c. 4, s. 8); laws-lois.justice.gc.ca/eng/acts/F-7.5/ (assented 2001-05-10) | sources added |
| "Most other provinces" pay the RCMP, given the RNC in Newfoundland and Labrador (marker) | corrected | rnc.gov.nl.ca ("Provincial Police Service"); rcmp.ca/en/nl/corporate-information | RNC sentence added (see section 3) |
| "No judge ever removed by joint address" (marker) | unresolved | justice.gc.ca/eng/cons/fjdp-pdmf/2.html says nothing on this | reason appended |
| Regional seat distribution (3 Ontario, 2 West or North, 1 Atlantic) is a tradition, not law (marker) | confirmed | scc-csc.ca/about-apropos/judges-juges/meet-rencontrez/ ("Traditionally…") | source added |
| Leave statistics "as of 2026" (marker) | confirmed and added | scc-csc.ca/about-apropos/work-travail/review-retro/stat-2025/ (2025: 474 submitted, 35 granted, 7%) | figure added |
| SCA s. 4(1), 5, 6, 9(2), 25 (quorum 5), 40(1), 53 | confirmed | laws-lois.justice.gc.ca/eng/acts/S-26/FullText.html | |
| Panels of at least 5 judges, usually 7 or 9 | confirmed | scc-csc.ca/about-apropos/work-travail/judicial-judiciaire/ | |
| CA 1867 ss. 91(27), 92(14), 92(15), 96, 99; CA 1982 s. 52 | confirmed | laws-lois.justice.gc.ca/eng/const/FullText.html | |

**content/learn/08-charter/*.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| Bill 21 Supreme Court appeal status (marker) | confirmed and updated | scc-csc.ca/cases-dossiers/search-recherche/41231/ (heard 2026-03-23 to 26, decision reserved); 2026 SCC 1–38 (through Nov. 10) has no Bill 21 ruling; Charterpedia s. 33 (the question is open; leave granted in the Sikh org. and UR Pride appeals) | "As of 2026…" → "As of November 2026…; the Supreme Court heard the appeal on Bill 21 in March 2026 and had not yet ruled" |
| Bill 21 override renewed in 2024 (marker) | confirmed | assnat.qc.ca projet-loi-52-43-1 and 2024 c. 12 PDF (passed May 2, assented May 7, in force June 16, 2024) | |
| Saskatchewan 2023 law: parental consent, under 16, s. 33 (marker) | confirmed (wording tightened) | docs.legassembly.sk.ca/legdocs/Bills/29L3S/Bill29-137.pdf (s. 197.4; notwithstanding ss. 2, 7, 15) | "a new name or pronoun" → "a new gender-related name or pronoun" |
| Alberta 2025: Back to School Act and Bill 9 (marker) | confirmed | assembly.ab.ca billinfoid=12087 (assent Oct. 28, 2025) and 12098 (assent Dec. 11, 2025); both bill PDFs contain s. 33 declarations | sources added |
| Corporations: s. 7 and s. 15 (marker) | corrected | justice.gc.ca Charterpedia art7 (Irwin Toy) and art15 (no majority ruling; Hislop reasoning) | see section 3 |
| s. 33(1)–(5), federal non-use, Ford rules, Yukon among users | confirmed | Charterpedia art33; Charter text | |

**Supreme Court bench** (scc-csc.ca/about-apropos/judges-juges/list-liste/; PMO release of 2026-06-30)
| Judge | Verdict | Date |
|---|---|---|
| Richard Wagner, Chief Justice | confirmed | judge since 2012-10-05; Chief Justice since 2017-12-18 |
| Karakatsanis / Côté / Rowe / Kasirer / Jamal / O'Bonsawin / Moreau | confirmed | 2011-10-21 / 2014-12-01 / 2016-10-28 / 2019-09-16 / 2021-07-01 / 2022-09-01 / 2023-11-06 |
| Sheilah Martin (was shown on the site) | corrected | left 2026-05-30 |
| Glenn D. Joyal (was missing) | corrected | joined 2026-07-15 |

**Quizzes.** All 31 questions were checked.
- **law.en.yaml (17):** sources-of-law (CA 1982 s. 52), bijuralism (DoJ just/07), criminal-federal (s. 91(27)), judges-elected (DoJ ccs-ajc/05), judicial-review, s96-courts (s. 96), federal-court-role (ccs-ajc/02), integrated-system (ccs-ajc/02), quebec-criminal, provincial-offences (s. 92(15)), who-prosecutes (ppsc-sppc.gc.ca), scc-leave and scc-reference (SCC judicial work; SCA s. 53), scc-quebec-seats (SCA s. 6), judicial-independence and judge-removal (ccs-ajc/05). All confirmed.
- **law-precedent:** answer confirmed, source corrected: just/07 → justice.gc.ca/eng/csj-sjc/just/03.html, which actually explains precedent.
- **charter.en.yaml (14):** applies-to (art321), part-of-constitution, rights-absolute and burden-s1 and oakes-steps (art1), citizens-only (ss. 3, 6(1), 23), s33-scope, s33-five-years and s33-federal-use (art33; s. 33(3)–(5)), legal-rights (s. 10), official-languages (s. 16(2)), jordan (art11b), vriend (item 1607), carter (item 14637). All confirmed, none changed.

### Law, the Charter, cases and the Supreme Court bench: corrections

1. **criminal-law.en.md, NL policing.**
   - Before: "…pay the RCMP… to act as their provincial police. Many cities have their own police services." The marker questioned "most other provinces" given the RNC.
   - After: same, plus "In Newfoundland and Labrador, the RCMP shares that role with the province's own Royal Newfoundland Constabulary, which polices the St. John's area, Corner Brook and western Labrador."
   - Sources: https://www.rnc.gov.nl.ca/ and https://rcmp.ca/en/nl/corporate-information.
   - I kept "Most other provinces": I couldn't fetch a source confirming that all 8 contract the RCMP.
2. **your-rights.en.md, corporations.**
   - Before: "Others, such as the section 7 right… and the section 15 equality rights, have been held to protect only human beings."
   - After: "Others, such as the section 7 right…, have been held to protect only human beings. The Supreme Court hasn't squarely decided whether corporations have section 15 equality rights, but its reasoning suggests they don't."
   - Source: https://www.justice.gc.ca/eng/csj-sjc/rfc-dlc/ccrf-ccdl/check/art15.html
3. **notwithstanding-clause.en.md, Bill 21 status.**
   - Before: "As of 2026: … an open and actively litigated question." plus marker.
   - After: "As of November 2026: … open and actively litigated question. The Supreme Court heard the appeal on Quebec's Bill 21, which raises it, in March 2026 and had not yet ruled."
   - Source: https://www.scc-csc.ca/cases-dossiers/search-recherche/41231/
4. **notwithstanding-clause.en.md, Saskatchewan row.** "new name or pronoun" → "new gender-related name or pronoun" (Bill 137, s. 197.4).
5. **Supreme Court bench data.**
   - Wikidata is out of date: it still lists Martin as sitting and doesn't list Joyal.
   - Fix: added `SCC_OVERRIDES` to scripts/data/portraits.ts (`ended: {Q44080964: "2026-05-30"}`; adds Joyal, Q5568908, since 2026-07-15, `born: null` because the Court doesn't publish it), so re-runs keep the fix. I applied the same change to the `supremeCourt` array in src/data/portraits.json by hand rather than re-running the whole script.
   - Martin's leftover portrait entry stays until the script is next run.
6. **supreme-court.en.md.** Added "In 2025, the judges considered 474 applications and granted 35, about 7%" from the SCC 2016–2025 statistics.

### Law, the Charter, cases and the Supreme Court bench: unresolved

- **Not found:** judges.en.md:85, the "never removed by joint address" claim. The marker stays, with its reason appended.
- **Blocked:** the BAILII text of the Persons Case (bot challenge). It didn't matter, because the SCC's citation and canada.ca confirmed it. CanLII and The Canadian Encyclopedia return 403.
- **Not checked for completeness:** whether the s. 33 timeline is missing other 2025–2026 uses, for example other Quebec laws. The table says "Some examples", so it isn't wrong, but the search budget was exhausted before I could check.
- **Sources conflict (data, not my script):** chief-justices.json end dates are one day later than the Court's own list for three chief justices:

  | Chief Justice | chief-justices.json | SCC list |
  |---|---|---|
  | Duff | 1944-01-07 | 1944-01-06 |
  | Dickson | 1990-06-30 | 1990-06-29 |
  | McLachlin | 2017-12-15 | 2017-12-14 |

  The difference is probably the last day in office versus the effective retirement date. Not changed: the file is regenerated by scripts/grounding/wikidata.ts.
- **Sources conflict:** Wikidata has two birth years for Mary Moreau (1955 and 1956). The site uses 1956 ("Turns 75 in 2031"), and the SCC bio gives no birth date.

### Law, the Charter, cases and the Supreme Court bench: unverified links still marked

None in my files.

## Indigenous peoples, demographics and the treaty map

#### content/learn/09-indigenous/treaties.en.md
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Treaty-map "not covered by a historic treaty" layer wording | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028574/1529354437231 | |
| Treaty-map parties (see the annotation table below) | corrected (in script) | see table below | |
| 70 historic treaties, 1701–1923; groups and dates | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028574/1529354437231 | |
| Royal Proclamation dated October 7, 1763 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1360941656761/1544619778887 | |
| Treaty of Niagara 1764 framing | corrected | https://www.thecanadianencyclopedia.ca/en/article/treaty-of-niagara-1764 | added "Canada doesn't officially recognize it as a treaty." |
| Peace and Friendship 1725–1779, no land surrendered | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1360937048903/1544619681681 | |
| Marshall 1999: 1760–61 treaties, moderate livelihood | confirmed | https://www.dfo-mpo.gc.ca/fisheries-peches/aboriginal-autochtones/moderate-livelihood-subsistance-convenable/marshall-overview-apercu-eng.html | |
| CIRNAC lists 27 modern treaties | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1677073191939/1677073214344 | |
| JBNQA 1975 was the first modern treaty | confirmed | same | |
| Nunavut Agreement 1993 the largest claim; territory 1999 | confirmed | https://www.thecanadianencyclopedia.ca/en/article/nunavut | |
| Nisga'a in effect 2000 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/N-23.3/ | |
| Specific Claims Tribunal | confirmed | https://www.thecanadianencyclopedia.ca/en/article/specific-claims | |

#### Treaty annotations (scripts/data/treaties.ts)
| Annotation | Verdict | Source URL | Before → After |
|---|---|---|---|
| Peace and Friendship: Mi'kmaq, Wolastoqiyik, Peskotomuhkati, 1725–1779 | confirmed | CIRNAC P&F page above | |
| Upper Canada land surrenders | corrected | https://www.rcaanc-cirnac.gc.ca/eng/1360941656761/1544619778887 ; https://www.rcaanc-cirnac.gc.ca/eng/1370372152585/1581293792285 | "…Mississauga and Chippewa, and the British Crown (more than 30 separate agreements)" → "…Mississauga and Chippewa, and other First Nations, and the British Crown (many separate agreements)" |
| Robinson-Huron and Robinson-Superior | corrected | https://www.rcaanc-cirnac.gc.ca/eng/1360945974712/1544619909155 | "the Province of Canada for the British Crown" → "William Benjamin Robinson for the British Crown" |
| Douglas Treaties | corrected | same | "southern Vancouver Island … James Douglas for the Hudson's Bay Company's colony of Vancouver Island" → "Vancouver Island (14 treaties), and James Douglas for the Hudson's Bay Company and the British Crown" |
| Treaties 1 and 2 (Chippewa/Swampy Cree; Chippewa), 1871 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028664/1581294165927 | |
| Treaty 3, Saulteaux (Ojibbeway), 1873 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028675/1581294028469 | |
| Treaty 4, Cree and Saulteaux, 1874 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028689/1581293019940 | |
| Treaty 5, Saulteaux and Swampy Cree, 1875 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028699/1581292696320 | |
| Treaty 6, Plain and Wood Cree "and other Tribes" (adhesions name Plain Stony), 1876 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028710/1581292569426 | |
| Treaty 7, Blackfeet, Blood, Piegan, Sarcee, Stony, 1877 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028793/1581292336658 | |
| Treaty 8, Cree, Beaver, Chipewyan, 1899 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028813/1581293624572 | |
| Treaty 9, Ojibeway and Cree, 1905–1906 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028863/1581293189896 | |
| Treaty 10, Chipewyan and Cree, 1906 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028874/1581292941464 | |
| Treaty 11, Slave, Dogrib, Loucheux and Hare ("Dene First Nations"), 1921 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100028916/1581294101357 | |
| Williams Treaties: seven First Nations; Canada and Ontario; 1923 | confirmed | https://www.canada.ca/en/crown-indigenous-relations-northern-affairs/news/2018/11/canada-and-ontario-advance-reconciliation-with-historic-apologies-to-the-seven-williams-treaties-first-nations-communities.html ; CIRNAC Upper Canada page | |
| JBNQA parties; signed 1975, in effect 1977 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/J-0.3/ ; CIRNAC modern treaties page | |
| Northeastern Quebec Agreement parties | corrected | https://laws-lois.justice.gc.ca/eng/acts/C-45.7/ | "The Naskapi of Kawawachikamach, Quebec and Canada" → "The Naskapi of Kawawachikamach (then of Schefferville), Quebec, Canada, Quebec Crown corporations, and the Cree and Inuit parties to the James Bay agreement" |
| Inuvialuit: COPE and Canada, 1984 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/W-6.7/ | |
| Gwich'in | corrected | https://laws-lois.justice.gc.ca/eng/acts/G-11.8/ | "…the Northwest Territories and Canada" → "The Gwich'in of the Northwest Territories and Canada" |
| Sahtu | corrected | https://laws-lois.justice.gc.ca/eng/acts/S-1.5/ | "…Métis, the Northwest Territories and Canada" → "The Sahtu Dene and Métis and Canada"; added "signed 1993" |
| Nunavut Agreement: Inuit and Canada, 1993 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/N-28.7/ | |
| Nisga'a yearNote | corrected | https://laws-lois.justice.gc.ca/eng/acts/N-23.3/ | "signed 1998, in effect 2000" → "signed 1999, in effect 2000" (signed April 27 and May 4, 1999) |
| Tłı̨chǫ: tripartite | confirmed; yearNote added | https://laws-lois.justice.gc.ca/eng/acts/T-11.3/ | added "signed 2003" |
| Labrador Inuit: tripartite, 2005 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/L-4.3/ | |
| Nunavik Inuit and Canada | confirmed; yearNote added | https://laws-lois.justice.gc.ca/eng/acts/N-28.5/ | added "signed 2006" |
| Eeyou Marine: Crees and Canada | confirmed; yearNote added | https://laws-lois.justice.gc.ca/eng/acts/E-1.5/ | added "signed 2010" |
| Tsawwassen, Maa-nulth (five First Nations), Tla'amin: tripartite | confirmed; yearNotes added | https://laws-lois.justice.gc.ca/eng/acts/T-21.5/ ; https://laws-lois.justice.gc.ca/eng/acts/M-0.55/ ; https://laws-lois.justice.gc.ca/eng/acts/T-11.2/ | added "signed 2007", "signed 2008", "signed 2014" |
| Délı̨nę: four parties including the Land Corporation | confirmed; yearNote added | https://laws-lois.justice.gc.ca/eng/acts/D-1.5/ | added "signed 2015" |
| Whitecap Dakota: First Nation and Canada, 2023 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/S-8.36/ | |
| 11 Yukon final agreements: First Nation, Yukon and Canada | confirmed; yearNotes added | https://laws-lois.justice.gc.ca/eng/acts/Y-2.3/ ; CIRNAC modern list | added "signed 1993" for Champagne and Aishihik, Teslin and Na-Cho Nyäk Dun; "signed 2005" for Carcross/Tagish |

#### content/learn/09-indigenous/self-government.en.md
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| RCAP: "Aboriginal peoples are nations", inherent right; 1996 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100014597/1572547985018 ; TCE royal-commission-on-aboriginal-peoples | |
| 24 comprehensive agreements, more than 40 communities | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100032275/1529354547314 | |
| Charter continues to apply | confirmed | same | |
| 2024 SCC 5: Act valid as a whole; ss. 21 and 22(3) upheld; Feb 9, 2024 | confirmed | https://www.scc-csc.ca/case-dossier/cb/2024/40061-eng.aspx | |
| Nunatsiavut Government under the Labrador Inuit Land Claims Agreement (in force Dec 1, 2005) | confirmed | https://laws-lois.justice.gc.ca/eng/acts/L-4.3/ | |
| Métis agreements since 2019 (MNA, MNO, MN-S, June 27, 2019) | confirmed | https://www.thecanadianencyclopedia.ca/en/article/metis | |
| UNDRIP: 2007 vote against, 2010 support, 2016 full support | confirmed | https://www.justice.gc.ca/eng/declaration/what-quoi.html ; https://www.canada.ca/en/indigenous-northern-affairs/news/2016/05/speech-delivered-at-the-united-nations-permanent-forum-on-indigenous-issues-new-york-may-10-.html | |
| UNDRIP Act 2021: ss. 5–7; action plan June 2023 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/U-2.2/FullText.html ; https://www.justice.gc.ca/eng/declaration/index.html | |
| BC law, S.B.C. 2019, c. 44 | confirmed | https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/19044 | |
| Sechelt 1986 | corrected (name) | https://laws-lois.justice.gc.ca/eng/acts/S-6.6/ | "Sechelt (BC, 1986)" → "shíshálh Nation (Sechelt) (BC, 1986)" |
| Education sector agreements (Nova Scotia, Ontario) | confirmed | CIRNAC self-government page | |

#### content/learn/09-indigenous/indian-act.en.md
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Registration reform status, 2025–26 | corrected | https://www.parl.ca/legisinfo/en/bill/45-1/s-2 ; https://www.sac-isc.gc.ca/eng/1706280426591/1706280463468 | added "A bill on remaining inequities in registration and band membership (Bill S-2) was at the committee stage in the House of Commons in 2026." |
| Second-generation cut-off definition | confirmed | https://www.thecanadianencyclopedia.ca/en/article/indian-act | |
| First Nations Elections Act 2014; three election options | confirmed | https://laws-lois.justice.gc.ca/eng/acts/F-11.65/ ; Indian Act s. 2 "council of the band" | |
| 1927 restriction | corrected | TCE indian-act | "stopped First Nations from hiring lawyers to pursue land claims without government approval (1927 to 1951)" → "made it illegal for First Nations to raise money to pursue land claims (1927 to 1951)" |
| Ceremony bans | corrected | TCE indian-act ; TCE potlatch | "(a ban added in 1884 and removed in 1951)" → "(bans added from 1884 and removed in 1951)" (potlatch 1884, dances 1895) |
| Last school closed 1996 (page says "1990s"); TRC 2008; NCTR at the University of Manitoba; 150,000; 94 Calls; 2008 apology | confirmed | TCE residential-schools ; TCE truth-and-reconciliation-commission | |
| White Paper withdrawn (page gives no year) | confirmed | https://www.thecanadianencyclopedia.ca/en/article/the-white-paper-1969 | |
| 1876, 1951, 1985; Lovelace 1981; C-31 1985; C-3 2011; S-3 2017; vote 1960 | confirmed | TCE indian-act | |

#### content/learn/09-indigenous/section-35.en.md
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| 1983 Proclamation added 35(3), 35(4) and 35.1; no other amendment | confirmed | https://laws-lois.justice.gc.ca/eng/const/FullText.html (endnotes 97, 98) | |
| Guerin 1984 (fiduciary), Van der Peet 1996 (test), Powley 2003 (Métis harvesting) | confirmed | TCE guerin-case, van-der-peet-case, powley-case | |

#### content/learn/09-indigenous/index.en.md
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| s. 87 framing: registered Indians, property on reserve; Métis not eligible | confirmed | https://www.canada.ca/en/revenue-agency/services/indigenous-peoples/information-indians.html ; Indian Act s. 87 | |
| 2021 Census: 1,807,250 (5.0%); 1,048,405 First Nations; 624,220 Métis; 70,545 Inuit | confirmed | https://www150.statcan.gc.ca/n1/daily-quotidien/220921/dq220921a-eng.htm | |

#### content/demographics.en.md
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Recent growth from international migration | corrected | StatCan WDS table 17-10-0008-01 ; https://www150.statcan.gc.ca/n1/daily-quotidien/260923/dq260923b-eng.htm | see Corrections |
| Grandfather clause | corrected | https://laws-lois.justice.gc.ca/eng/const/page-2.html s. 51(1) rule 2 | "protects some provinces from losing seats" → "guarantees each province at least as many MPs as it had in the 43rd Parliament" |
| 1967 points system | confirmed | https://www.thecanadianencyclopedia.ca/en/article/immigration-policy | |
| Senatorial clause s. 51A | confirmed | page-2 above | |
| Headline data: July 1, 2026 population 41,798,407; Quebec 9,067,114; 1913 arrivals 400,870 / 7,632k; urban 1871/1921/1931; recent immigrants 62.0% Asia, 10.1% Europe | confirmed | WDS 17-10-0009, 17-10-0063, 17-10-0068; https://www150.statcan.gc.ca/n1/daily-quotidien/221026/dq221026a-eng.htm | |

#### Quizzes (28 questions)
| Id | Verdict | Source |
|---|---|---|
| indigenous-three-peoples | confirmed | laws-lois const page-12, s. 35(2) |
| indigenous-rights-created-1982 | confirmed | page-12 |
| indigenous-federal-jurisdiction | confirmed | page-3, s. 91(24) |
| indigenous-unceded-bc | confirmed | TCE comprehensive-land-claims-modern-treaties |
| indigenous-duty-to-consult | confirmed (decisions.scc-csc.ca blocked) | TCE duty-to-consult |
| indigenous-treaties-relevant-today | confirmed | DFO Marshall page |
| indigenous-royal-proclamation | confirmed | CIRNAC about treaties |
| indigenous-modern-treaty-nunavut | confirmed | TCE nunavut ; N-28.7 |
| indigenous-modern-treaties-protected | confirmed | page-12, s. 35(3) |
| indigenous-tsilhqotin | confirmed | TCE tsilhqot-in-case |
| indigenous-daniels | confirmed | TCE daniels-case |
| indigenous-status-meaning | confirmed | ISC status page |
| indigenous-bill-c31 | confirmed | TCE indian-act |
| indigenous-trc | confirmed | TCE truth-and-reconciliation-commission |
| indigenous-inherent-right | confirmed | CIRNAC self-government page |
| indigenous-undrip-act | confirmed | U-2.2 |
| indigenous-first-modern-treaty | confirmed | CIRNAC modern treaties page |
| indigenous-historic-modern-treaties | confirmed | CIRNAC modern list ; TCE |
| demographics-estimates | confirmed | WDS footnotes for 17-10-0009 (census net undercoverage) |
| demographics-seats | confirmed | page-2 s. 51 ; page-1 s. 22 |
| demographics-senatorial-clause | confirmed | s. 51A ; s. 22 (PEI has 4 senators) |
| demographics-1913 | corrected (explanation) | WDS 17-10-0063 / 17-10-0008 |
| demographics-seniors-children | confirmed (20.0% vs 15.0%) | https://www150.statcan.gc.ca/n1/daily-quotidien/260923/dq260923a-eng.htm |
| demographics-median-age | confirmed | same |
| demographics-youngest | confirmed (Nunavut 27.6) | same |
| demographics-quebec-share | confirmed (28.9% → 21.7%) | WDS 17-10-0009 |
| demographics-urban-majority | confirmed | WDS 17-10-0068 ; urban-rural.json shows 82.2% in 2021 |
| demographics-immigrant-origins | confirmed | Daily 221026 ; 98-10-0302 data |

### Indigenous peoples, demographics and the treaty map: corrections

- **demographics.en.md growth.** Before: "In recent years, immigration and temporary residents such as international students and workers have driven most of it." After: "In recent years, international migration has driven most of it: more than four-fifths of growth in each year from 2021/2022 to 2025/2026. That means new permanent residents plus, until mid-2025, a growing number of temporary residents such as international students and workers. Since then, the number of temporary residents has fallen, and growth has slowed."
  - Basis: WDS 17-10-0008-01 components, which reconcile exactly with the July 1 estimates. International migration's share of growth was 94% in 2021/22, 98% in 2022/23, 97% in 2023/24, 92% in 2024/25 and 80.1% in 2025/26. Net non-permanent residents went from +34,305 in 2024/25 to −154,614 in 2025/26.
  - Note that 80.1% is only just above four-fifths.
- **Grandfather clause, 1927 restriction, ceremony bans, Treaty of Niagara, Bill S-2 note, shíshálh name, all treaty annotations:** exact before and after text is in the tables above.
- **Quiz demographics-1913:** "about 9 to 12 per 1,000" → "about 9 to 13 per 1,000". The data show 12.9 in 2021/22 and 8.8 in 2025/26.

### Indigenous peoples, demographics and the treaty map: unresolved

None. Every marker in my files is resolved.

Caveats:
- The SCC decision site and CanLII returned 403. Marshall was confirmed through DFO, 2024 SCC 5 through the SCC case-in-brief page, and the quiz cases through TCE.
- The Treaty 6 "Assiniboine (Nakoda)" label rests on adhesions naming the "Plain Stony".

### Indigenous peoples, demographics and the treaty map: unverified links still marked

None were marked in my files.

New TCE citations were added. STYLE.md lists that site as blocking automated checks, but every TCE page I cited loaded here (HTTP 200).

## Provinces (east and centre), facts registry and premiers

**content/facts.yaml** (all `asOf` set to 2026-11-13; sources now name the URL)
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Commons standing committees = 25 | confirmed | https://www.ourcommons.ca/procedure/standing-orders/chap13-e.html (S.O. 104(2), consolidated version as of April 27, 2026) | |
| Standing joint committees = 2 | confirmed | same page, S.O. 104(3) | |
| Alberta 87 | confirmed | https://www.assembly.ab.ca/members/members-of-the-legislative-assembly | |
| BC 93 | confirmed | https://elections.bc.ca/2026-provincial-election/writs-of-election/ | |
| Manitoba 57 | confirmed | https://www.gov.mb.ca/legislature/members/mla_list_alphabetical.html | |
| New Brunswick 49 | confirmed | https://www.legnb.ca/en/members/current | |
| Newfoundland and Labrador 40 | confirmed | https://www.assembly.nl.ca/Members/members.aspx | |
| Northwest Territories 19 | confirmed | https://www.ntlegislativeassembly.ca/visitors/maps/constituency-map | |
| Nova Scotia | corrected | https://nslegislature.ca/members/profiles (56 of 56); https://news.novascotia.ca/en/2026/02/26/new-cheticamp-margarees-pleasant-bay-riding | 55 → 56 |
| Nunavut 22 | confirmed | https://www.assembly.nu.ca/members/mla | |
| Ontario 124 | confirmed | https://www.ola.org/en/members/current ("Total seats: 124") | |
| PEI 27 | confirmed | https://www.assembly.pe.ca/members (it loaded once; later blocked by Radware) | |
| Quebec 127 | confirmed | https://www.assnat.qc.ca/en/deputes/index.html | |
| Saskatchewan 61 | confirmed | https://www.legassembly.sk.ca/mlas/ | |
| Yukon 21 | confirmed (news; the official Yukon sites return 403) | https://nationalnewswatch.com/2025/11/22/currie-dixon-sworn-in-as-yukons-12th-premier-appoints-eight-to-cabinet ("14 of 21 seats") | |

**content/provinces/index.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| Alberta row note: rises to 89 or 91 in 2027 (Bill 32) | unresolved (marker kept, note appended) | 87 now: assembly.ab.ca. A Nov 2, 2026 news report says the panel recommends 91: https://www.westernstandard.news/news/breaking-alberta-electoral-boundaries-panel-calls-for-91-ridings-sparking-constitutional-dispute/78409 | |
| NWT, Nunavut, PEI, Quebec and Saskatchewan seat counts not re-verified | confirmed (marker removed) | see facts.yaml rows | |
| Territorial legislature links | NWT and Nunavut links load; Yukon still 403 (marker kept, note appended) | curl check | |

**content/provinces/ontario.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| "nearly 4 in 10 Canadians" | confirmed | StatCan WDS, table 17-10-0009-01: Ontario 16,262,121 of 41,798,407 on July 1, 2026 = 38.9% | |
| French-language services complaints go to the Ombudsman | confirmed | https://www.lawtimesnews.com/news/general/ontario-ombudsman-warns-french-language-services-act-exemptions-threaten-french-service-rights/393110 (Dec 8, 2025; ombudsman.on.ca returns 403) | |
| Strong mayor powers since 2022 for a growing number of municipalities; propose budget; hire senior staff | confirmed | https://www.blg.com/en/insights/2025/05/strong-mayor-powers-and-duties-are-widely-expanded-in-ontario ; https://nationalnewswatch.com/2026/04/02/ontario-to-build-on-strong-mayor-system-by-appointing-strong-regional-chairs (216 municipalities) | |
| Lieutenant Governor link | corrected | https://lgontario.ca/en/ (200, "Office of the Lieutenant Governor of Ontario"). www.lgontario.ca fails a certificate check. | https://www.lgontario.ca/en/ → https://lgontario.ca/en/ |

**content/provinces/quebec.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| Canada–Québec Accord 1991; Quebec selects; Ottawa handles admissibility and citizenship | confirmed | https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/agreements/federal-provincial-territorial/quebec/canada-quebec-accord-relating-immigration-temporary-admission-aliens.html (signed Feb 5, 1991; in force Apr 1, 1991; Quebec has "sole responsibility for the selection") | |
| Notwithstanding clause used "more than any other province" | confirmed | https://publications.gc.ca/collections/Collection-R/LoPBdP/BP/bp194-e.htm (Quebec put the clause in "every piece of legislation" from 1982 to 1985) | |
| Kativik Regional Government and Cree Nation Government: current names and treaty basis | confirmed | https://www.krg.ca/en-CA/ ; https://www.cngov.ca/governance-structure/legislation/agreements/ (JBNQA 1975, Governance Agreement 2012). The KRG's JBNQA/Kativik Act basis comes from Wikipedia only, because legisquebec is blocked. | |
| 127 seats, up from 125, at the Oct 2026 election | confirmed (unmarked) | assnat.qc.ca; election Oct 5, 2026: https://www.mtlblog.com/quebec-premier-designate-to-be-sworn-in | |
| 6 links (legisquebec CCQ-1991, C-11, C-12; three court sites) | unresolved: blocked (403); notes appended | | |

**content/provinces/new-brunswick.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| French first language "roughly a third" | corrected | https://www150.statcan.gc.ca/n1/daily-quotidien/220817/dq220817a-eng.htm ("first official language spoken by 30.0%", 2021) | "roughly a third" → "about 3 in 10 people" |
| 77 local governments, 12 rural districts, 12 regional service commissions | confirmed | https://laws.gnb.ca/en/showfulldoc/cr/2022-50 (77; consolidated to Dec 31, 2025); https://laws.gnb.ca/en/showfulldoc/cr/2022-45 (12); https://laws.gnb.ca/en/showfulldoc/cr/2022-46 (12) | |

**content/provinces/nova-scotia.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| "55 seats, a number first used in the 2021 general election" (unmarked; discrepancy #1) | corrected | nslegislature.ca profiles (56); news.novascotia.ca Feb 26, 2026 ("out of the existing Inverness riding"; "56 MLAs"); https://news.novascotia.ca/en/2026/05/24/byelection-called-cheticamp-margarees-pleasant-bay (byelection June 23) | see section 3 |

**content/provinces/prince-edward-island.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| 1873 terms: railway debts and buying out landlords | corrected (wording) | https://www.justice.gc.ca/eng/rp-pr/csj-sjc/constitution/lawreg-loireg/p1t62.html (railways become Canada's property; advance "not exceeding eight hundred thousand dollars") | see section 3 |
| Lands Protection Act year and limits | unresolved: blocked | princeedwardisland.ca, irac.pe.ca and CanLII all blocked | |
| Court of Appeal a separate court since 2009 | unresolved: blocked (Wikipedia agrees) | courts.pe.ca blocked (Radware) | |
| Share of land and population outside municipalities | unresolved: blocked | Wikipedia: municipalities cover 34.7% of land and 73% of population (2021); PEI sources blocked. The page's historical wording is consistent with this. | |
| courts.pe.ca link | unresolved: blocked (bot challenge) | | |

**content/provinces/newfoundland-and-labrador.en.md**
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| 1997 referendum, then a constitutional amendment to Term 17 | confirmed | https://www.releases.gov.nl.ca/releases/1997/edu/Term17.htm (Sept 2, 1997: 72.7% Yes; 1995 referendum, 55%; House of Assembly resolution Sept 5, 1997) | |
| Names of the three City Acts | confirmed | https://www.assembly.nl.ca/legislation/sr/titleindex.htm | |

**Premiers (13-row status; premiers.json agrees on every row, including predecessors' end dates)**
| Jurisdiction | Premier, since | Verdict | Source |
|---|---|---|---|
| Alberta | Danielle Smith, 2022-10-11 | confirmed; in office Nov 4, 2026 | https://www.alberta.ca/premier-biography.aspx ; cp24 2026-11-04 |
| British Columbia | David Eby, 2022-11-18 | confirmed **for now**: the BC Conservatives won the Oct 24, 2026 snap election, and Lorne Doerkson is premier-designate. The swearing-in is expected after results are certified on Nov 18 (about Nov 20). | https://www.narcity.com/doerkson-wont-rule-out-early-session ; leg.bc.ca notice; search results (CBC/Global, 2022) for Nov 18, 2022 |
| Manitoba | Wab Kinew, 2023-10-18 | confirmed | cp24 2026-11-04; gov.mb.ca/minister/premier; news.gov.mb.ca (search) |
| New Brunswick | Susan Holt, 2024-11-02 | confirmed | https://www.gnb.ca/en/news/n-b.2026.11.government-releases-defence-growth-framework.html (Nov 2, 2026) |
| Newfoundland and Labrador | Tony Wakeham, 2025-10-29 (Hogan ended 2025-10-29) | confirmed | https://www.gov.nl.ca/releases/2025/exec/1028n02/ ; ntv.ca |
| Northwest Territories | R.J. Simpson, 2023-12-08 | confirmed (signs as premier Oct 16, 2026) | https://canadaspremiers.ca/wp-content/uploads/2026/10/Premiers_Write_to_the_Prime_Minister_ahead_of_the_2026_Federal_Budget.pdf ; gov.nt.ca newsroom (search) |
| Nova Scotia | Tim Houston, 2021-08-31 | confirmed | bnnbloomberg 2026-10-15; news.novascotia.ca 2021-08-31 (search) |
| Nunavut | John Main, 2025-11-20 (Akeeagok ended 2025-11-20) | confirmed | https://www.premier.gov.nu.ca/en/about/about-the-premier (elected Nov 18, sworn in Nov 20, 2025) |
| Ontario | Doug Ford, 2018-06-29 | confirmed | insauga 2026-11-04; CBC 2018 (search) |
| PEI | Rob Lantz, 2026-02-09 (earlier terms: Lantz 2025-02-21 to 2025-12-11; Bloyce Thompson 2025-12-12 to 2026-02-09) | confirmed | https://www.ctvnews.ca/atlantic/prince-edward-island/article/rob-lantz-to-be-sworn-in-as-pei-premier-monday/ ; https://www.cp24.com/news/canada/2025/12/12/bloyce-thompson-sworn-in-as-the-35th-premier-of-pei-after-lantzs-resignation |
| Quebec | Paul St-Pierre Plamondon, 2026-10-21 (Fréchette 2026-04-15 to 2026-10-21) | confirmed. Election Oct 5, 2026: PQ won 59 at the time of the report (assnat now shows a 60-seat party), short of the 64 needed for a majority. | https://www.mtlblog.com/quebec-premier-designate-to-be-sworn-in ; cp24 2026-04-15 (Fréchette) |
| Saskatchewan | Scott Moe, 2018-02-02 | confirmed | cp24 2026-11-04; saskatchewan.ca 2018 release (search) |
| Yukon | Currie Dixon, 2025-11-22 (Pemberton ended 2025-11-22) | confirmed | https://nationalnewswatch.com/2025/11/22/currie-dixon-sworn-in-as-yukons-12th-premier-appoints-eight-to-cabinet |

- The overrides in scripts/grounding/wikidata.ts are party and city tables only. They are still correct and need no premier change.
- One stale generated note in premiers.json says "Rob Lantz: Wikidata says the term began 2025-02-21, Wikipedia 2026-02-09. Using Wikidata." It is harmless: the terms themselves are right, because Lantz served two separate terms.

### Provinces (east and centre), facts registry and premiers: corrections

1. **facts.yaml `legislature.seats.nova-scotia`**: 55 → 56.
   - Sources: https://nslegislature.ca/members/profiles and https://news.novascotia.ca/en/2026/02/26/new-cheticamp-margarees-pleasant-bay-riding
2. **nova-scotia.en.md:22**
   - Before: "The House of Assembly has {{…}} seats, a number first used in the 2021 general election."
   - After: "The House of Assembly has {{…}} seats. It grew from 55 in 2026, when Inverness was split to create a new district, Chéticamp-Margarees-Pleasant Bay. Its first MLA was elected at a byelection on June 23, 2026."
   - Sources: the same two, plus https://news.novascotia.ca/en/2026/05/24/byelection-called-cheticamp-margarees-pleasant-bay
   - No general election has used 56 seats yet.
3. **new-brunswick.en.md:51**: "roughly a third" → "about 3 in 10 people".
   - Source: StatCan Daily 2022-08-17, 30.0% French first official language spoken.
4. **prince-edward-island.en.md:61**
   - Before: "terms that included help with the colony's railway debts and buying out absentee landlords"
   - After: "terms that included taking over the colony's railway and lending it up to $800,000 to buy out absentee landlords"
   - Source: https://www.justice.gc.ca/eng/rp-pr/csj-sjc/constitution/lawreg-loireg/p1t62.html
5. **ontario.en.md Sources**: https://www.lgontario.ca/en/ → https://lgontario.ca/en/

### Provinces (east and centre), facts registry and premiers: unresolved

- **Blocked:**
  - PEI Lands Protection Act year and limits.
  - PEI Court of Appeal 2009 (Wikipedia agrees).
  - PEI share of land and population outside municipalities.
- **Judgement call / future fact:** the Alberta 2027 seat count in the index row (87 is confirmed as today's count).

### Provinces (east and centre), facts registry and premiers: unverified links still marked

- yukonassembly.ca (403).
- legisquebec CCQ-1991, C-11 and C-12 (403).
- courdappelduquebec.ca, coursuperieureduquebec.ca and courduquebec.ca (403).
- courts.pe.ca (Radware bot challenge).

## Provinces (west and north) and the provinces quiz

**content/provinces/alberta.en.md**
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Final seat count for 2027 (Bill 32, 2026) | unresolved | https://www.alberta.ca/system/files/news-updating-electoral-boundaries-20260423-langes.pdf ; https://www.abmunis.ca/news/update-legislature-may-13-2026 ; https://www.assembly.ab.ca/assembly-business/committees/ceb | |
| Next election October 2027 | confirmed (Oct 18, 2027) | https://www.elections.ab.ca/elections/albertas-next-election/ | |
| Only AB and BC have recall laws | confirmed | https://globalnews.ca/news/11540768/alberta-mla-recall-petitions-what-to-know/ (Nov 25, 2025); https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96398_00 (current to Nov 10, 2026) | |
| Recall Act 2021 | confirmed (SA 2021 c R-5.7) | https://kings-printer.alberta.ca/documents/Acts/R05P7.pdf | |
| Initiative threshold changes July 4, 2025 | confirmed | https://www.elections.ab.ca/recall-initiative/initiative/ | |
| Metis Settlements Act 1990, 8 settlements, elected councils | confirmed | https://kings-printer.alberta.ca/documents/Acts/M14.pdf | |
| "Only province" with a legislated Métis land base | confirmed | https://indigenouspeoplesatlasofcanada.ca/article/metis-settlements-and-farms/ | |

**content/provinces/british-columbia.en.md**
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Railway "within ten years" (Terms of Union cl. 11) | confirmed | https://canada.justice.gc.ca/eng/rp-pr/csj-sjc/constitution/lawreg-loireg/p1t42.html | |
| Alberta is the only other province with recall | confirmed | Global News (above); BC Laws | |
| Douglas Treaties: 14, 1850s, Vancouver Island | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1360945974712/1544619909155 | |
| 93 seats, first used in 2024 | confirmed (93 seats again in the Oct 24, 2026 election) | https://thehub.ca/2026/10/26/b-c-conservatives-win-majority-as-ebys-snap-election-gamble-ends-ndp-rule/ ; https://www.leg.bc.ca/ | |
| Link bccourts.ca | unresolved (certificate failed again) | https://www.bccourts.ca/ | |

**content/provinces/manitoba.en.md**
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| "Court of King's Bench of Manitoba", Family Division | confirmed (ss. 2–4) | https://web2.gov.mb.ca/laws/statutes/ccsm/c280.php?lang=en | |
| Northern Affairs Act still governs northern communities | confirmed (current to Nov 11, 2026) | https://web2.gov.mb.ca/laws/statutes/ccsm/n100.php?lang=en | |
| Link to City of Winnipeg Charter | corrected | https://web2.gov.mb.ca/laws/statutes/2002/c03902e.php | ccsm/c010.php (that is the Canadian Mennonite University Act) → statutes/2002/c03902e.php |
| Louis Riel Act 2023, "First Premier" title | confirmed | https://web2.gov.mb.ca/laws/statutes/ccsm/l229.php?lang=en | |

**content/provinces/saskatchewan.en.md**
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Medical Care Act 1966; all provinces by early 1970s (1972) | confirmed | https://www.canada.ca/en/health-canada/services/publications/health-system-services/canada-health-act-annual-report-2022-2023.html | |
| Human Rights Code fills the Bill of Rights' role | corrected | https://publications.saskatchewan.ca/api/v1/products/91969/formats/108911/download ; https://saskhrc.ca/?p=2273 | "the Saskatchewan Human Rights Code" → "The Saskatchewan Human Rights Code, 2018, which still includes a Bill of Rights part" |
| Treaties 4, 6, 8, 10, with smaller parts under 2 and 5 | confirmed (OTC lists six treaties; see note under 4) | https://otc.ca/treaties/ | |
| 61 seats, new boundaries in 2024 | confirmed (59 southern + 2 northern) | https://elections.sk.ca/media/news-releases/new-constituency-maps-for-2024-general-election-now-online | |
| 1962 strike lasted 23 days | confirmed (July 1–23) | https://www.parks.canada.ca/culture/designation/evenement-event/greve-medecins-doctors-strike | |

**content/provinces/yukon.en.md**
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| 1979 Epp letter | unresolved (blocked) | — | |
| 11 of 14 First Nations | unresolved (blocked) | https://www.rcaanc-cirnac.gc.ca/eng/1100100032275/1529354547314 (says only "most") | |
| Languages Act wording | corrected | https://axl.cefan.ulaval.ca/amnord/Yukon-loi1988.htm ; https://cmfc-mccf.ca/micro/portrait-juridique-2025/en/yukon/ | "English and French are Yukon's official languages…" → English and French can be used in the Legislature and courts, laws are published in both, and Indigenous languages can be used in Assembly debates (the Act "accepts" them as Canada's official languages) |
| Court of Appeal of Yukon composition | corrected | https://www.yukoncourts.ca/en/court-appeal | "judges largely come from the BC Court of Appeal" → drawn from the BC Court of Appeal and from the courts of Yukon, the NWT and Nunavut |
| Eight municipalities | confirmed | https://ayc-yk.ca/about-ayc/ | |
| Devolution April 1, 2003, first territory | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1352470994098 | |
| Yukon Act preamble, ss. 4, 8, 17 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/Y-2.01/page-1.html | |
| Seats grew 19→21 for the Nov 2025 election | unresolved (blocked; new marker added) | Wikipedia pointer only: Nov 3, 2025, 19→21 | |
| 3 links: yukonassembly.ca, yukon.ca/how-government-works, electionsyukon.ca 21 districts | unresolved (blocked, 403) | | |

**content/provinces/northwest-territories.en.md**
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Administration and control, not title | confirmed (s. 2 "belong to Her Majesty in right of Canada"; s. 51) | https://laws-lois.justice.gc.ca/eng/acts/N-27.05/FullText.html | |
| About half Indigenous | confirmed (49.6%, 2021) | https://www150.statcan.gc.ca/n1/daily-quotidien/220921/dq220921a-eng.htm | |
| Court of Appeal composition | confirmed | https://www.nwtcourts.ca/en/courts/court-of-appeal/ | |
| 33 communities; government types | count confirmed, types corrected | https://www.maca.gov.nt.ca/en/communitylist | "cities, towns and villages, as well as hamlets, charter communities and settlements" → "a city, towns and a village, as well as hamlets and a charter community" (MACA: 1 city, 4 towns, 1 village, 12 hamlets, 1 charter, 9 designated authorities, 5 self-government; no settlements) |
| 19 MLAs, 6 ministers, secret ballots | confirmed | https://www.ntlegislativeassembly.ca/node/2966 | |
| Devolution April 1, 2014 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1352398433161 | |
| 11 official languages (spellings) | confirmed | https://www.ece.gov.nt.ca/en/services/official-languages | |

**content/provinces/nunavut.en.md**
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| Inuit about 85% | corrected | https://www150.statcan.gc.ca/n1/daily-quotidien/220921/dq220921a-eng.htm ; https://www150.statcan.gc.ca/n1/daily-quotidien/220209/dq220209a-eng.htm | "roughly 85%" → "about 84% in the 2021 census" (30,865 Inuit of 36,858 people; 85.8% is all Indigenous people) |
| Both language Acts passed 2008 | confirmed (OLA June 4, 2008; ILPA Sept 17, 2008) | https://www.langcom.nu.ca/about/olc-history | |
| Inuit Language Protection Act name / "Inuit language" | corrected | https://www.nunavutlegislation.ca/en/consolidated-law/inuktut-protection-act-official-consolidation ; https://www.nunavutlegislation.ca/sites/default/files/legal-notices/consolidated-law/noticeCSNucI140.pdf ; https://www.langcom.nu.ca/ | Now the "Inuktut Protection Act" (C.S.Nu., c.I-140; amendments in force Sept 18, 2025); text now says official languages are Inuktut (the Inuit language), English and French |
| 25 communities | confirmed | https://www.nunavut.ca/nunavut-communities | |
| A fifth of Canada's area | confirmed (21.0%) | https://www150.statcan.gc.ca/n1/pub/11-402-x/2012000/chap/geo/tbl/tbl06-eng.htm | |
| Iqaluit only city; others hamlets; no roads | unresolved (gov.nu.ca blocked) | | |
| Devolution signed Jan 18, 2024; transfer April 1, 2027 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1352471770723 ; https://www.rcaanc-cirnac.gc.ca/eng/1702495657169 | |
| Court of Appeal composition; NCJ single-level court | confirmed | https://www.nunavutcourts.ca/ ; https://www.nunavutcourts.ca/nunavut-court-justice | |
| Leadership Forum, secret ballot | confirmed | https://www.assembly.nu.ca/faq | |

**content/quizzes/provinces.en.yaml** (42 questions)
| id | Verdict | Source URL |
|---|---|---|
| provinces-power-source | confirmed | canada.ca provinces-territories |
| provinces-crown-rep | confirmed | Yukon Act s.4; NWT Act s.4; Nunavut Act s.5 |
| provinces-unicameral | confirmed (weak) | canada.ca lists one assembly each; NS Council abolished 1928 (nslegislature); Quebec last in 1968 (Wikipedia pointer only) |
| alberta-resources-1930 | confirmed | laws-lois const page-14 (Schedule) |
| alberta-section-92a | confirmed | laws-lois const page-3 |
| alberta-recall | confirmed | AB Recall Act |
| british-columbia-unceded | partly confirmed; source changed; marker added | CIRNAC Douglas Treaties page |
| british-columbia-dripa | confirmed | bclaws 19044 (ss. 3–7) |
| british-columbia-supreme-court | unresolved (bccourts certificate failure); marker added | |
| manitoba-red-river | confirmed | Louis Riel Act preamble |
| manitoba-language-rights | confirmed for s.23 (1985 Reference not fetched: SCC blocked); source changed | justice.gc.ca p1t22 |
| manitoba-kings-bench | confirmed | Manitoba c280 |
| new-brunswick-bilingual | confirmed | Charter s.16(2) |
| new-brunswick-charter-protection | confirmed | Charter ss.16(2)–20(2), 16.1 |
| new-brunswick-communities | confirmed (added 1993: endnote 86) | laws-lois const FullText |
| newfoundland-and-labrador-referendum | confirmed (two referenda, small majority, March 31, 1949); source changed | assembly.nl.ca History |
| newfoundland-and-labrador-commission | confirmed (Commission inaugurated Feb 16, 1934, until 1949); source changed | assembly.nl.ca History |
| newfoundland-and-labrador-mha | confirmed | assembly.nl.ca |
| nova-scotia-responsible-government | confirmed (Feb 2, 1848); source changed | nslegislature responsible_government |
| nova-scotia-responsible-meaning | confirmed; source changed | same |
| nova-scotia-supreme-court | confirmed; source changed | courts.ns.ca/courts/court-appeal |
| ontario-mpp | confirmed | ola.org |
| ontario-french-services | unresolved (e-Laws shows no text to fetch); marker added | |
| ontario-toronto-council | confirmed; source changed | scc-csc.ca case in brief 38921 |
| prince-edward-island-joined-late | confirmed (1873) | Discover Canada history |
| prince-edward-island-bridge-amendment | confirmed | canada.ca confederation-bridge |
| prince-edward-island-guaranteed-mps | confirmed (s.51A); source changed | laws-lois const page-2 |
| quebec-civil-law | confirmed | justice.gc.ca 07 |
| quebec-1982-not-signed | confirmed (answer) | Charter page |
| quebec-secession-reference | confirmed via Clarity Act preamble (SCC blocked) | laws-lois C-31.8 |
| saskatchewan-medicare | confirmed | Health Canada CHA report; Parks Canada |
| saskatchewan-created-by-parliament | confirmed | const Schedule item 13 |
| saskatchewan-kings-bench | confirmed | sasklawcourts.ca |
| northwest-territories-consensus | confirmed (19 MLAs) | ntlegislativeassembly node/2966 |
| northwest-territories-powers-source | confirmed | NWT Act |
| northwest-territories-languages | confirmed | ece.gov.nt.ca |
| nunavut-land-claim | confirmed; source changed | tunngavik.com/about/history-mandate |
| nunavut-court-of-justice | confirmed | justice.gc.ca 07; nunavutcourts |
| nunavut-devolution | confirmed | CIRNAC |
| yukon-party-politics | confirmed for NWT/Nunavut side; Yukon parties only via Wikipedia pointer (2025 results by party) | |
| yukon-commissioner | confirmed | Yukon Act s.4 |
| yukon-devolution-first | confirmed | CIRNAC Yukon |

### Provinces (west and north) and the provinces quiz: corrections

1. **Yukon Languages Act.** The text "English and French are Yukon's official languages…" is replaced by text saying both languages can be used in the Legislature and courts, laws are published in both, and Yukon Indigenous languages can be used in Assembly debates. Sources: CEFAN 1988 text ss.1(1), 1(3), 3(1); CMFC 2025 portrait.
2. **Court of Appeal of Yukon.** "largely come from the BC Court of Appeal" becomes "drawn from the British Columbia Court of Appeal and from the courts of Yukon, the Northwest Territories and Nunavut". Source: https://www.yukoncourts.ca/en/court-appeal
3. **NWT community types.** "cities, towns and villages, as well as hamlets, charter communities and settlements" becomes "a city, towns and a village, as well as hamlets and a charter community". Source: https://www.maca.gov.nt.ca/en/communitylist
4. **Nunavut Inuit share.** "roughly 85%" becomes "about 84% in the 2021 census". Source: StatCan Daily 2022-09-21 and 2022-02-09.
5. **Nunavut language laws.** "Inuit Language Protection Act" becomes "Inuktut Protection Act (called the Inuit Language Protection Act until 2025)". The official languages now read as Inuktut (the Inuit language), English and French. I also added "passed both Acts in 2008". Sources: nunavutlegislation.ca consolidation and notice; langcom.nu.ca.
6. **Saskatchewan Human Rights Code.** "the Saskatchewan Human Rights Code" becomes "The Saskatchewan Human Rights Code, 2018, which still includes a Bill of Rights part". Source: Publications Saskatchewan (Part 1 Bill of Rights; s.59 repeals SS 1979 c S-24.1).
7. **Manitoba link.** The City of Winnipeg Charter link pointed at ccsm/c010.php, which is the Canadian Mennonite University Act. It now points to https://web2.gov.mb.ca/laws/statutes/2002/c03902e.php.

### Provinces (west and north) and the provinces quiz: unresolved

- **Blocked to automated fetch:**
  - Yukon Epp letter.
  - Yukon 11 of 14 First Nations, which also affects the "11 self-governing First Nations" in the front-matter summary.
  - Yukon seats going from 19 to 21 for the November 2025 election (new marker added).
  - Nunavut community types and the "no road" claim.
  - Quiz `british-columbia-supreme-court` (bccourts.ca certificate).
  - Quiz `ontario-french-services` (e-Laws page has no fetchable text).
- **Not final / not found:**
  - Alberta's 2027 seat count. Bill 32 proposes 91 and the panel's 91-seat report was tabled November 2, 2026, but no fetched source confirms royal assent.
  - Quiz `british-columbia-unceded`: Treaty 8 in northeastern BC and "most of BC never ceded" were not confirmed, because web search ran out.
- **Sources conflict (no edit made):** a sliver of Treaty 7 in southwest Saskatchewan. The OTC map image and the USask page show it; the OTC text and the province list six treaties (2, 4, 5, 6, 8, 10). The page wording matches OTC.

### Provinces (west and north) and the provinces quiz: unverified links still marked

- https://www.bccourts.ca/ — certificate failed again.
- https://yukonassembly.ca/ — 403.
- https://yukon.ca/en/how-government-works — 403.
- https://electionsyukon.ca/en/electoral-districts-21 — 403.

## Events, timeline tagging, myths and entity files

All accessed 2026-11-13.

#### content/entities/events.yaml
**Common sources**
- CIRNAC: https://www.rcaanc-cirnac.gc.ca/eng/1100100028574/1529354437231
- TCE-AT: https://www.thecanadianencyclopedia.ca/en/timeline/acts-and-treaties
- JUS-CIV: https://justice.gc.ca/eng/rp-pr/other-autre/civil/civil.html
- ENDN: https://laws-lois.justice.gc.ca/eng/const/endNotes.html
- NCTR: https://nctr.ca/exhibits/residential-school-timeline/
- SCC-n: https://www.scc-csc.gc.ca/cases-dossiers/search-recherche/n
- MT: https://www.rcaanc-cirnac.gc.ca/eng/1677073191939
- HC-TL: the Health Canada timeline, archived at bac-lac.wayback.archive-it.org/web/20061211144345/http:/www.hc-sc.gc.ca/hcs-sss/pubs/care-soins/2005-hcs-sss/time-chron_e.html
- WP: Wikipedia, used for an uncontroversial fact only

| Claim (short) | Verdict | Source URL | Before → After |
|---|---|---|---|
| historic-treaties-begin 1701–1923 | confirmed | CIRNAC | |
| nova-scotia-assembly-1758 Oct 2, oldest elected legislature | confirmed | https://nslegislature.ca/about/history ; https://news.novascotia.ca/en/2022/09/21/journals-dating-1758-available-online | |
| royal-proclamation-1763 Oct 7 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1370355181092 ; TCE-AT | |
| treaty-of-niagara 1764 | confirmed (year); "many see… nation to nation" is hedged wording, left as is | https://www.rcaanc-cirnac.gc.ca/eng/1370355181092 | |
| quebec-act-1774 | confirmed | https://justice.gc.ca/eng/csj-sjc/harmonization/services_information/fundamentals-fondements.html ; JUS-CIV | |
| new-brunswick-colony-1784 | confirmed | https://www.canada.ca/en/canadian-heritage/services/provincial-territorial-symbols-canada/new-brunswick.htm | |
| upper-canada-1791 | confirmed | TCE-AT | |
| province-of-canada-1841 | confirmed | TCE-AT | |
| responsible-government-1848 Feb, NS first; Canada weeks later | confirmed | https://www.nslegislature.ca/about/history/responsible_government ; https://www.biographi.ca/en/theme_gouvernement.html?p=13 | |
| newfoundland-responsible-government-1855 | confirmed | https://assembly.nl.ca/VisitLearn/History.aspx | |
| charlottetown-conference Sept 1864 | confirmed | https://www.canada.ca/en/parks-canada/news/2016/02/charlottetown-and-quebec-conferences-of-1864.html | |
| civil-code-of-lower-canada 1866 | confirmed (in force Aug 1, 1866) | JUS-CIV | |
| confederation July 1, 1867 | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-1.html | |
| red-river-resistance 1869 | confirmed | https://www.thecanadianencyclopedia.ca/en/timeline/louis-riel | |
| ruperts-land-1870 | confirmed (in effect July 15, 1870) | https://justice.gc.ca/eng/rp-pr/csj-sjc/constitution/lawreg-loireg/p1t31.html | |
| manitoba-act-1870 July 15 | confirmed (royal assent May 12; in effect July 15) | https://www.justice.gc.ca/eng/rp-pr/csj-sjc/constitution/lawreg-loireg/p1t22.html ; TCE-AT | |
| british-columbia-joins-1871 | confirmed | https://www.canada.ca/en/canadian-heritage/services/provincial-territorial-symbols-canada/british-columbia.htm | |
| treaty-1 1871; Numbered Treaties to 1921 | confirmed | TCE-AT ; CIRNAC | |
| prince-edward-island-joins-1873 | confirmed | https://www.canada.ca/en/canadian-heritage/services/provincial-territorial-symbols-canada/prince-edward-island.htm | |
| supreme-court-created 1875 | confirmed | https://www.scc-csc.ca/visit-visitez/history-histoire/ | |
| indian-act-1876 | confirmed | TCE-AT ; NCTR | |
| potlatch-ban-1884, lasting to 1951 | confirmed | https://indigenousfoundations.arts.ubc.ca/the_indian_act/ | |
| riel-executed-1885 | confirmed (Nov 16, 1885) | https://www.thecanadianencyclopedia.ca/en/timeline/louis-riel ; https://mhs.mb.ca/docs/people/riel_l.shtml | |
| criminal-code-1892 | confirmed | https://justice.gc.ca/eng/csj-sjc/ccc/index.html | |
| yukon-territory-1898 | confirmed | https://www.canada.ca/en/canadian-heritage/services/provincial-territorial-symbols-canada/yukon.htm | |
| alberta-and-saskatchewan-1905 | confirmed | https://laws-lois.justice.gc.ca/eng/Const/page-14.html | |
| residential-schools-mandatory-1920 | confirmed | NCTR | |
| williams-treaties-1923 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1360941656761 | |
| king-byng-affair: date | corrected | http://www.biographi.ca/en/bio/byng_julian_hedworth_george_16E.html ; https://parl.canadiana.ca/view/oop.HOC_1501_63_01/460 | `1926` → `1926-06-28`; text gains "on June 28" |
| king-byng-affair: "last time this happened federally" | unresolved | not found | marker kept and narrowed |
| imperial-conference-1926 | confirmed | foundingdocs.gov.au/resources/transcripts/cth11_doc_1926.pdf | |
| persons-case 1929, "living tree" | confirmed | WP Edwards v Canada (AG) | |
| natural-resources-transfer-1930 | confirmed | WP Natural Resources Acts | |
| statute-of-westminster 1931 | confirmed | https://www.canada.ca/en/intergovernmental-affairs/services/federation/statute-westminster.html ; https://www.legislation.gov.uk/ukpga/Geo5/22-23/4 | |
| criminal-appeals-to-london-end-1933 | confirmed | archived SCC history page (bac-lac archive-it) | |
| commission-of-government-1934 | confirmed | WP | |
| bank-of-canada-1935, public 1938 | confirmed | https://www.bankofcanada.ca/about/our-history/ | |
| inuit-reference-1939 | confirmed | https://www.lawnow.org/famous-cases-the-inuit-status-case/ | |
| saskatchewan-hospital-insurance-1947 | confirmed | https://esask.uregina.ca/entry/hospital_services_plan.html ; https://esask.uregina.ca/entry/saskatchewan_bill_of_rights.html | |
| newfoundland-referendums-1948 June 3 / July 22 | confirmed | WP | |
| newfoundland-joins-1949 Mar 31 | confirmed | WP | |
| privy-council-appeals-end-1949 | confirmed (cases already under way could still go to London; wording left as is) | archived SCC history page | |
| indian-act-changes-1951 | confirmed | https://www.ubcic.bc.ca/indian_act_prohibits_raising_money_or_hiring_lawyers_to_pursue_land_claims_to_1951 | |
| equalization-begins-1957 | confirmed | https://www.canada.ca/en/department-finance/programs/federal-transfers/equalization.html | |
| canadian-bill-of-rights 1960 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/c-12.3/page-1.html | |
| first-nations-federal-vote-1960 | confirmed | diefenbaker.usask.ca enfranchisement exhibit | |
| last-reservation-1961 | confirmed (Apr 8, 1961, Bill 56) | https://esask.uregina.ca/entry/bastedo_frank_lindsay_1886-1973.html | |
| senate-retirement-age-1965 | corrected | https://laws-lois.justice.gc.ca/eng/const/page-1.html (s. 29) ; ENDN note 18 | "…instead of serving for life." → "…instead of serving for life (senators already sitting are not affected)." |
| saskatchewan-medicare-1962 | confirmed | https://parks.canada.ca/culture/designation/evenement-event/greve-medecins-doctors-strike | |
| medical-care-act-1966 | confirmed | HC-TL | |
| national-assembly-1968 | confirmed | https://www.revparl.ca/english/issue_param_210_art_1478.html | |
| white-paper-1969 | confirmed | https://historyofrights.ca/encyclopaedia/main-events/1969-white-paper-indian-policy/ | |
| calder 1973 | confirmed | MT | |
| james-bay-agreement-1975, first modern treaty | confirmed | MT | |
| quebec-charter-of-rights-1975 | confirmed | https://www.cdpdj.qc.ca/en/your-rights/the-laws-protecting-your-rights/charter | |
| bill-101 1977 | confirmed | WP | |
| quebec-referendum-1980, No about 60% | confirmed (59.56%) | https://www.electionsquebec.qc.ca/en/results-and-statistics/referendum-on-the-1980-sovereignty-association-proposal-for-quebec/ | |
| patriation-reference Sept 1981 | confirmed | https://publications.gc.ca/Collection-R/LoPBdP/BP/bp295-e.htm | |
| patriation-deal-1981 Nov | confirmed | same | |
| patriation Apr 17, 1982 | confirmed | ENDN note 109 | |
| section-92a-1982 | confirmed | ENDN note 49 | |
| quebec-veto-reference Dec 1982 | confirmed | bp295-e (above) | |
| section-35-amendment-1983 | corrected | ENDN notes 97–98 (SI/84-102) ; primarydocuments.ca/constitution-amendment-proclamation-1983/ | appended "(agreed in 1983, proclaimed in 1984)" |
| equality-rights-1985 Apr 17 | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-12.html s. 32(2) | |
| bill-c-31 1985 | confirmed | prod-front.thecanadianencyclopedia.ca/en/timeline/the-indian-act | |
| manitoba-language-rights-1985 | confirmed | WP | |
| r-v-oakes 1986 | confirmed | WP | |
| meech-lake-accord 1987 | confirmed | WP | |
| r-v-morgentaler 1988 | confirmed | WP | |
| ford-v-quebec 1988; Quebec then uses s. 33 | confirmed | https://www.justice.gc.ca/eng/csj-sjc/rfc-dlc/ccrf-ccdl/check/art33.html | |
| meech-lake-fails-1990 June 23 | confirmed | https://www.thecanadianencyclopedia.ca/en/article/the-death-of-the-meech-lake-accord-feature | |
| sparrow 1990 | confirmed | SCC-20311 | |
| charlottetown-accord-1992 Oct 26 | confirmed | https://www.electionsquebec.qc.ca/en/results-and-statistics/referendum-on-the-charlottetown-constitutional-accord/ | |
| nunavut-agreement-1993 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/N-28.7/page-1.html ; https://laws-lois.justice.gc.ca/eng/acts/N-28.6/page-1.html | |
| new-brunswick-amendment-1993 | confirmed | ENDN note 86 | |
| civil-code-of-quebec-1994 Jan 1 | confirmed | https://www.courthouselibrary.ca/node/1903 | |
| quebec-referendum-1995 50.6/49.4 | confirmed | https://www.electionsquebec.qc.ca/en/results-and-statistics/1995-referendum-on-quebecs-accession-to-sovereignty/ | |
| inherent-right-policy-1995 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100031843/1539869205136 | |
| regional-veto-1996 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/C-36.7/page-1.html | |
| delgamuukw 1997 | confirmed | SCC-23799 | |
| secession-reference 1998 | confirmed | SCC-25506 | |
| vriend-v-alberta 1998 | confirmed | SCC-25285 | |
| nunavut-created-1999 Apr 1 | confirmed | https://publications.gc.ca/Collection-R/LoPBdP/EB/prb9919-e.htm | |
| r-v-marshall 1999 | confirmed | SCC-26014 | |
| clarity-act 2000 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/C-31.8/page-1.html | |
| nisgaa-final-agreement 2000, BC's first modern treaty | confirmed | gov.bc.ca Nisga'a Lisims Government page | |
| newfoundland-and-labrador-2001 | confirmed | https://www.assembly.nl.ca/legislation/sr/statutes/n03-1.htm | |
| yukon-devolution-2003 Apr 1 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1352470994098 | |
| council-of-the-federation 2003 | confirmed | https://www.canadaspremiers.ca/about/ | |
| haida-nation 2004 | confirmed | SCC-29419 | |
| same-sex-marriage-reference 2004 | confirmed | SCC-29866 | |
| labrador-inuit-agreement-2005 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1328023902556 | |
| quebecois-nation-2006 | confirmed | openparliament.ca/debates/2006/11/27/stephen-harper-6/only | |
| fixed-election-dates-2007 | confirmed | https://www.parl.ca/legisinfo/en/bill/39-1/c-16 | |
| residential-schools-apology-2008 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1100100015644/1571589171655 | |
| prorogation-2008 Dec 4 | confirmed | https://www.ourcommons.ca/procedure/procedure-and-practice-3/ch_08_2-e.html | |
| succession-to-the-throne-act-2013 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/S-23.5/FullText.html | |
| senate-reform-reference 2014 | confirmed | SCC-35203 | |
| tsilhqotin 2014 | confirmed | SCC-34986 | |
| northwest-territories-devolution-2014 Apr 1 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1352398433161 | |
| trc-calls-to-action-2015, 94 | confirmed | https://www.rcaanc-cirnac.gc.ca/eng/1450124405592/1529106060525 | |
| carter-v-canada 2015 | confirmed | SCC-35591 | |
| daniels 2016 | confirmed | SCC-35945 | |
| r-v-jordan 2016 | confirmed | SCC-36068 | |
| assisted-dying-law-2016 | confirmed | https://laws-lois.justice.gc.ca/eng/AnnualStatutes/2016_3/page-1.html | |
| senate-advisory-board-2016 | confirmed | https://www.canada.ca/en/campaign/independent-advisory-board-for-senate-appointments/members.html | |
| electoral-reform-dropped-2017 | confirmed | pm.gc.ca archived 2017 democratic institutions mandate letter | |
| bc-dripa-2019 | confirmed (year and content); "first Canadian law" not in a fetched page, judged acceptable | https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/19044 | |
| child-and-family-services-act-2019 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/F-11.73/page-1.html | |
| quebec-secularism-law-2019 | confirmed | https://www.assnat.qc.ca/en/travaux-parlementaires/projets-loi/projet-loi-21-42-1.html (the s. 33 use rests on WP) | |
| undrip-act-2021 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/U-2.2/page-1.html | |
| carbon-pricing-reference-2021 | confirmed | https://www.scc-csc.gc.ca/judgments-jugements/cb/2021/38663-38781-39116/ | |
| toronto-city-council-2021 | confirmed | https://www.scc-csc.gc.ca/judgments-jugements/cb/2021/38921 | |
| alberta-equalization-referendum-2021 | unresolved (only WP agrees: 61.7% Yes; the Elections Alberta page returned 404) | WP | |
| charles-iii-accession Sept 2022 | unresolved (only WP agrees: Sept 8; canada.ca and pm.gc.ca returned 404) | WP | |
| quebec-bill-96-2022 | confirmed | assnat Bill 96 page ; ENDN note 113 | |
| nunavut-devolution-agreement-2024 Jan 18 | confirmed | https://globalnews.ca/news/10235637/nunavut-land-transfer | |
| child-and-family-services-reference-2024 | confirmed | https://www.scc-csc.ca/case-dossier/cb/2024/40061-eng.aspx | |
| alberta-notwithstanding-2025 | confirmed | https://www.cba-alberta.org/news/cba-alberta-statement-on-the-use-of-the-notwithstanding-clause/ | |

No `url` fields were added to events, because how an event's `url` renders is unclear.

#### content/myths.en.md
| Claim | Verdict | Source URL | Before → After |
|---|---|---|---|
| King of Canada is a separate title; role ceremonial | confirmed | https://www.gg.ca/en/governor-general/role-and-responsibilities | |
| GG represents the King, who is head of state | confirmed | same | |
| LGs appointed by GG on PM's advice; act on provincial advice | confirmed | https://www.gg.ca/en/crown/viceregal-representatives ; https://laws-lois.justice.gc.ca/eng/const/page-2.html s. 58 | |
| s. 41(a) unanimity for the office of the Queen | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-13.html | |
| Charter is part of the 1982 Act | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-12.html | |
| Most votes but fewer seats in 2019 and 2021 | confirmed (CPC 34.3% and 121 seats vs LPC 157 seats; CPC 33.7% and 119 seats vs LPC 160 seats) | elections.ca ovr2019app/51/table8E.html and ovr2021app/53/table8E.html | |
| Parliament = King, Senate and House (s. 17) | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-1.html | |
| Senate rarely defeats bills | unresolved (not checked: search budget ran out) | | |
| Health care, CHT and Canada Health Act | confirmed | https://laws-lois.justice.gc.ca/eng/acts/C-6/FullText.html ; canada.ca CHT page | |
| Equalization paid from federal revenues; no province pays in | confirmed | https://www.canada.ca/en/department-finance/programs/federal-transfers/equalization.html | |
| A territory becoming a province needs an amendment | confirmed | page-13.html s. 42(1)(f) | |
| Toronto 2021 case | confirmed | https://www.scc-csc.gc.ca/judgments-jugements/cb/2021/38921/ | |
| NWT and Nunavut consensus government, secret ballot | confirmed | https://www.ntlegislativeassembly.ca/visitors/what-consensus ; assembly.nu.ca fact sheet | |
| Mint makes coins; Bank of Canada sets rates and issues notes | confirmed | https://www.bankofcanada.ca/about/ ; mint.ca | |
| Auditor General appointment: consultation and both Houses | confirmed | https://laws-lois.justice.gc.ca/eng/acts/A-17/page-1.html s. 3 | |
| Courts: criminal law federal (s. 91(27)), s. 96 judges | confirmed | https://laws-lois.justice.gc.ca/eng/const/page-3.html | |
| Charter binds government only (s. 32) | confirmed | page-12.html | |
| s. 33 covers ss. 2 and 7–15 for five years | confirmed | page-12.html | |
| Only some rights limited to citizens (ss. 3, 6(1), 23) | confirmed | page-12.html | |
| s. 35 "recognizes and affirms" | confirmed | page-12.html | |
| s. 87 tax exemption scope (marker) | corrected | https://www.canada.ca/en/revenue-agency/services/indigenous-peoples/information-indians.html ; https://laws-lois.justice.gc.ca/eng/acts/I-5/page-8.html | "such as income earned there" → "such as income connected to a reserve"; marker removed |
| "Most do" pay tax | confirmed by inference (status First Nations on reserve are about 17% of Indigenous people) | https://www150.statcan.gc.ca/n1/daily-quotidien/220921/dq220921a-eng.htm | |
| Other myths (conventions, leader change, minority government, public service, budget, duty to consult) | not separately sourced | | |

#### content/entities/documents.yaml
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| 1867 Act sections on page-1/2/3 (ss. 9–101, 92A, 94A, 95) | confirmed | laws-lois const page-1, page-2 and page-3 | |
| s. 29 retirement at 75 since 1965 | confirmed | ENDN note 18 | |
| s. 55 url | corrected | https://laws-lois.justice.gc.ca/eng/const/page-2.html | none (fell back to page-1) → page-2 |
| s. 133 url | corrected | https://laws-lois.justice.gc.ca/eng/const/page-4.html | none (fell back to page-1) → page-4 |
| 1982 Act page-12/13 sections (35, 36, 38, 41–45, 47 (180 days), 52) | confirmed | page-12, page-13 | |
| Charter section titles and summaries; s. 16.1 added 1993 | confirmed | page-12 ; ENDN note 86 | |
| Statute of Westminster url | confirmed | https://www.legislation.gov.uk/ukpga/Geo5/22-23/4 | |
| Indian Act 1876; url | confirmed; url added | https://laws-lois.justice.gc.ca/eng/acts/I-5/ | none → I-5 |
| Supreme Court Act ss. 5, 6 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/S-26/FullText.html | |
| Canada Elections Act s. 56.1 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/E-2.01/page-6.html | |
| Clarity Act 2000 | confirmed | https://laws-lois.justice.gc.ca/eng/acts/C-31.8/ | |
| Canada Health Act, five criteria | confirmed | https://laws-lois.justice.gc.ca/eng/acts/C-6/FullText.html | |
| UNDRIP Act 2021; url | confirmed; url added | https://laws-lois.justice.gc.ca/eng/acts/U-2.2/ | none → U-2.2 |
| Manitoba Act ss. 23 and 31 | confirmed | justice.gc.ca lawreg-loireg/p1t22.html and p1t23.html | no url added: laws-lois has no consolidation; owner decision |

#### content/entities/institutions.yaml
| Claim | Verdict | Source | Before → After |
|---|---|---|---|
| RCMP provincial policing | corrected | https://rcmp.ca/en/contract-policing/about | "most provinces other than Ontario and Quebec … their provincial police" → "every province except Ontario and Quebec, and all three territories, pay to act as their provincial or territorial police"; url added |
| Supreme Court: nine judges, three from Quebec | confirmed | S-26 ss. 4, 6 | |
| Bank of Canada a special Crown corporation | confirmed | https://www.bankofcanada.ca/about/ | |
| Elections Canada, Ethics Commissioner, Canadian Judicial Council (s. 59 Judges Act), Treasury Board, Council of the Federation (2003), TRC (2008; 94 Calls in 2015) | confirmed | elections.ca ; ethicscanada.ca ; https://laws-lois.justice.gc.ca/eng/acts/J-1/page-9.html ; canada.ca TBS ; https://www.canadaspremiers.ca/about/ ; rcaanc TRC page | |
| JCPC to 1949; criminal appeals ended 1933 | confirmed (secondary sources) | WP ; archived SCC history page | |
| National Assembly called Legislative Assembly until 1968 | confirmed (WP; assnat.qc.ca returned 500) | WP | |
| PBO as "officer of Parliament" | unresolved; check marker added | https://www.pbo-dpb.ca/en/about--a-propos ; https://laws-lois.justice.gc.ca/eng/acts/P-1/page-8.html | |
| Commissioner of Official Languages as "officer of Parliament" | confirmed in substance (appointed by resolution of both Houses, OLA s. 49); exact label not found; clo-ocol.gc.ca failed its certificate check | https://laws-lois.justice.gc.ca/eng/acts/o-3.01/fulltext.html | |
| URLs for House, Senate, GG, PCO, Bank of Canada, Mint, Auditor General | load, right pages | | |

#### content/entities/people.yaml
| Claim | Verdict | Source |
|---|---|---|
| Riel: Red River 1869–70; executed for treason 1885 | confirmed (convicted of high treason; "treason" left as is) | https://www.thecanadianencyclopedia.ca/en/timeline/louis-riel ; https://mhs.mb.ca/docs/people/riel_l.shtml |
| Byng and King overrides | no factual claims | |

#### about, home, credits, timeline and glossary pages
- **about:** no checkable facts besides the line 48 to-do.
- **home, glossary:** no counts or facts at risk.
- **timeline:** "Nunavut transfer scheduled April 1, 2027" was not separately fetched this run. It is consistent with the 2024 agreement (globalnews), but the 2027 date itself is unconfirmed and was left unmarked.
- **credits:** describes the site's own build, so there is nothing external to check.

### Events, timeline tagging, myths and entity files: corrections

1. **King–Byng date** (events.yaml): `date: 1926` → `date: 1926-06-28`. Text "…request for an election, the last time…" → "…request for an election on June 28, the last time…".
   - Source: http://www.biographi.ca/en/bio/byng_julian_hedworth_george_16E.html
   - DCB: King "formally asked that parliament be dissolved" on June 28. Byng refused, and King resigned the same day.
2. **senate-retirement-age-1965:** appended "(senators already sitting are not affected)". Source: laws-lois const page-1.html s. 29(1)–(2) and endnote 18.
3. **section-35-amendment-1983:** appended "(agreed in 1983, proclaimed in 1984)". Sources: laws-lois endNotes notes 97–98 (SI/84-102); primarydocuments.ca gives the proclamation as dated June 21, 1984.
4. **myths s. 87:** "such as income earned there" → "such as income connected to a reserve". Source: CRA information-indians page (connecting-factors test).
5. **institutions RCMP:** as in the table above. Source: https://rcmp.ca/en/contract-policing/about ("eight provinces and three territories").
6. **documents:** urls added for s. 55 (page-2) and s. 133 (page-4), the Indian Act (I-5) and the UNDRIP Act (U-2.2).

**King–Byng dates in full**, for the reserve-powers owner:
- **June 26, 1926:** King first raised dissolution with Byng. Wikipedia only.
- **June 28:** formal request, Byng's refusal and King's resignation (DCB).
- **June 28 or 29:** Meighen takes office. DCB says he accepted before midnight on June 28. The Parliament record on canadiana.ca dates his ministry from 1926-06-29 (King's ends 1926-06-28).
- **July 2:** the Meighen government is defeated by one vote, around 2 a.m. (DCB).
- **July 2:** dissolution. canadiana gives Meighen's term as running to July 2, and DCB says Byng granted dissolution after the defeat. The exact day is stated only by Wikipedia.
- **September 14, 1926:** election day (DCB).

### Events, timeline tagging, myths and entity files: unresolved

- **Not found in a fetched source:**
  - King–Byng "the last time this happened federally" (marker kept and narrowed in events.yaml; the same doubt is marked on reserve-powers line 67).
  - PBO's "officer of Parliament" label (marker added).
  - "Senate rarely defeats bills" in myths (not checked).
- **Only Wikipedia agrees (official pages 404):** alberta-equalization-referendum-2021 and charles-iii-accession. I did not add markers, because both are uncontroversial and Wikipedia agrees.
- **Owner decision:** about.en.md line 48 to-do (contact or repository link). Left as is.
- **Blocked to automated fetch:** decisions.scc-csc.ca, CanLII, lop.parl.ca (ParlInfo), cbc.ca and the bodies of thecanadianencyclopedia.ca articles.

### Events, timeline tagging, myths and entity files: unverified links still marked

None in my files.

## Links checked in a real browser (2026-11-13)

These were blocked to automated fetches. Each was opened in a normal browser and its title confirmed.

| Link | Verdict |
|---|---|
| bccourts.ca | confirmed: "The Courts of British Columbia - Home" |
| courts.pe.ca | confirmed: "Courts of PEI" |
| legisquebec CCQ-1991, C-11, C-12 | confirmed: Civil Code of Québec; Charter of the French language; Charter of human rights and freedoms (the site redirects to its `/fr/document/lc/…?langCont=en` form) |
| courdappelduquebec.ca/en | confirmed: Court of Appeal of Quebec |
| coursuperieureduquebec.ca/en | confirmed: Superior Court of Québec |
| courduquebec.ca/en | confirmed: Court of Québec site |
| yukonassembly.ca | confirmed: Yukon Legislative Assembly |
| yukon.ca how-government-works | corrected: moved to `/en/your-government/about-yukon/how-government-works` |
| electionsyukon.ca electoral-districts-21 | confirmed: "2025 Electoral Districts - 21 Districts" |
| decisions.scc-csc.ca item 2519 | confirmed: "Re: Resolution to amend the Constitution" |
| www12.statcan.gc.ca boundary files | unresolved: the site shows a bot challenge; not attempted. The files used were downloaded from this page by hand. |

## Note on the Supreme Court case confirmations (content/entities/cases.yaml)

The decisions site (decisions.scc-csc.ca) returned 403 to automated fetches of its case pages. During the
accuracy pass the case texts were read through each page's embedded `?iframe=true` frame instead. In a real
browser on 2026-11-13, that frame shows a CAPTCHA asking automated readers to stop, so that route should not be
relied on and was not used again. The case confirmations above that cite only decisions.scc-csc.ca should be
treated as unconfirmed until a person checks them in a browser. The ones also confirmed elsewhere (SCC "case in
brief" pages, DFO, Charterpedia) stand on those sources.

## Uncertain items rewritten (2026-11-13)

The owner's rule: say the uncertainty in the text instead of leaving a hidden marker. Where sources
disagree, the sentence keeps the best-supported value and names the alternative. Where only a secondary
or older source supports a claim, the claim is attributed to it and the source is cited. Where nothing
supports a detail, the detail was softened or dropped. "Wikipedia" here means the November 2026 snapshot
in `grounding/wikipedia/` unless noted. The only page fetched for this pass was the Department of
Justice's "The judicial structure" (https://www.justice.gc.ca/eng/csj-sjc/just/07.html).

| File | Before (short) | After (short) | Basis |
|---|---|---|---|
| content/entities/events.yaml (`king-byng-affair`) | "It was the last time this happened federally." | "House of Commons Procedure and Practice gives it as its only example of a refused dissolution." | Softened to what PP4-1 supports |
| content/entities/events.yaml (`alberta-equalization-referendum-2021`) | "holds a non-binding referendum" | "holds a provincial referendum … A referendum on its own doesn't amend the Constitution." | Same wording as money-and-equalization; legacy anchor fixture updated (see below) |
| content/learn/01-constitution/conventions.en.md (Senate row) | "The appointed Senate generally doesn't block bills" | "In practice, the appointed Senate rarely blocks bills" | Judgement call; no source settles "convention" or "practice", so it is stated as practice. The conventions-toggle widget already files it under "As practised" (marker removed, widget unchanged) |
| conventions.en.md (Patriation quote) | a "substantial measure" of provincial consent | in its words, "at least a substantial measure of provincial consent" (some summaries render it "substantial degree") | Lederman (1982) quoting the judgment at p. 103; the "substantial degree" check went through the iframe route now treated as unconfirmed |
| conventions.en.md | legal but "unconstitutional in the conventional sense" | the Court found it legal but contrary to a constitutional convention | Exact wording unconfirmed; quote replaced by paraphrase |
| content/learn/01-constitution/patriation-1982.en.md | a "substantial measure" | "at least a substantial measure of provincial consent" (some summaries say "substantial degree") | As above |
| content/entities/cases.yaml (`patriation-reference`) | "substantial degree" | in the judgment's words, "a substantial measure of provincial consent" | As above |
| content/glossary/patriation-reference.en.md | "substantial degree" | "at least a substantial measure of provincial consent" (some summaries say "substantial degree") | As above |
| content/learn/02-crown/governor-general.en.md | By custom, often alternated between anglophone and francophone holders | Wikipedia describes a practice of alternating, begun when Vanier succeeded Massey | Wikipedia, Governor General of Canada |
| governor-general.en.md | premier has no formal say, "although consultation is common" | no formal say; Wikipedia says there is no consistent practice of consulting the premier | Wikipedia, Lieutenant governor (Canada); it contradicts "common", so "common" was dropped |
| governor-general.en.md (Maritime Bank) | marker only | case cited in Sources, noting that Wikipedia's text dates the ruling 1882 while the law-report citation is 1892 | Wikipedia, Lieutenant governor (Canada); citation [1892] A.C. 437 |
| content/learn/02-crown/reserve-powers.en.md | Since then, no Governor General has refused a dissolution | PP4 gives 1926 as its only example of a refused federal dissolution | PP4-1, added to Sources |
| reserve-powers.en.md | challenge dismissed by the Federal Court | dismissed in March 2025, according to Wikipedia (*MacKinnon v. Canada*, 2025 FC 422) | Wikipedia, Prorogation in Canada |
| reserve-powers.en.md (King–Byng) | request June 26; defeat July 1 | unchanged, plus "(The Dictionary of Canadian Biography dates King's formal request June 28.)" and "(… puts the vote at about 2 a.m. on July 2.)" | Sources disagree (House sources vs DCB); DCB added to Sources |
| content/learn/03-parliament/senate.en.md | As of 2026: most senators belong to non-party groups | As of November 2024, according to House of Commons Procedure and Practice | PP4-1 (dated November 2024) |
| content/learn/04-elections/first-past-the-post.en.md | All federal, provincial and territorial elections use FPTP | Federal elections use FPTP; Wikipedia says every province and territory does too | Wikipedia, Elections in Canada |
| content/learn/04-elections/party-leaders.en.md | leaders "often control" who runs; "in many parties that includes the leader" | "can have a say"; each party tells Elections Canada who endorses (s. 406(2)) and decides who that is | Unsupported detail dropped; s. 406(2) confirmed |
| party-leaders.en.md | membership cheap or free, open to non-citizens and under-18s | depends on party rules; Wikipedia gives minimum ages of 14 (Conservatives) and 12 to 14 (NDP) | Wikipedia, Conservative Party of Canada and New Democratic Party; "cheap or free" and non-citizens dropped |
| party-leaders.en.md | Some parties weight votes by riding | Some parties have weighted votes by riding; Wikipedia: PCs in 1998 (100 points per riding), Conservatives in 2004 | Wikipedia, Progressive Conservative Party of Canada |
| src/widgets/power-sorter/cards.ts (driver's licences) | section "s. 92(13) and (16)" | section "s. 92" | Heads of power unconfirmed; provincial jurisdiction is confirmed |
| content/learn/06-government/crown-corporations.en.md | BC (ICBC), Saskatchewan (SGI) and Manitoba (MPI) | BC (ICBC) and Manitoba (MPI), among others | ICBC and MPI confirmed; SGI's insurance role not confirmed |
| crown-corporations.en.md | CN (1995) | CN (1995, according to Wikipedia) | Wikipedia, Canadian National Railway (as reported in the accuracy pass) |
| content/learn/06-government/departments.en.md | code lists five values | the Values and Ethics Code for the Public Sector sets out values; the Treasury Board has administered it since 2009, per Wikipedia | Wikipedia, Treasury Board of Canada; the five values were not confirmed |
| content/learn/07-law/judges.en.md | marker about a claim not on the page | marker removed, text unchanged | The page never states the "never removed" claim |
| content/provinces/alberta.en.md | a 2026 bill proposed 91 | Bill 32 (April 2026) would raise it to 91; a panel recommended 91 in November 2026; final number not settled as of mid-November 2026 | alberta.ca news release (April 23, 2026); Western Standard (November 2, 2026) |
| content/provinces/index.en.md (Alberta row) | marker | "(a bill introduced in 2026 would raise this to 91 for the 2027 election)" | As above |
| content/provinces/nunavut.en.md | no roads; Iqaluit the only city; hamlets | 25 communities per the Nunavut Planning Commission; Wikipedia: few or no road or rail links | Wikipedia, Nunavut; "only city" and "hamlets" dropped |
| content/provinces/prince-edward-island.en.md | Lands Protection Act (marker on adding the year) | Wikipedia dates the Act to 1982 | Wikipedia, Prince Edward Island |
| prince-edward-island.en.md | separate Court of Appeal in 2009 | 2009, according to Wikipedia (citing the Judicature Act) | Wikipedia, Court of Appeal of Prince Edward Island |
| prince-edward-island.en.md | marker on today's municipal coverage | per Wikipedia, in 2021 municipalities covered about 35% of the land and 73% of the people | Wikipedia (figures as reported in the accuracy pass; cited as the list of municipalities in PEI) |
| content/provinces/yukon.en.md | grew from 19 to 21 for the November 2025 election | one seat for each district Elections Yukon set for the 2025 election | Elections Yukon "2025 Electoral Districts - 21 Districts" (browser check); "19" and "November" dropped |
| yukon.en.md | 1979 letter of instruction told the Commissioner to follow advice | per Wikipedia, a 1979 letter from Jake Epp moved power to the elected legislature | Wikipedia, Yukon |
| yukon.en.md (body and `summary`) | 11 of Yukon's 14 First Nations | most of Yukon's First Nations, per CIRNAC | CIRNAC self-government page ("most First Nations in the Yukon") |
| content/quizzes/constitution.en.yaml (`constitution-quebec-bound`) | source page-13 plus marker | source: Wikipedia, Meech Lake Accord | It says the Quebec Veto Reference found no veto and the 1982 Act operative in Quebec |
| constitution.en.yaml (`constitution-why-uk-amended`) | left the BNA Acts out "at Canada's request" because… | left them out because… (no agreed formula) | Request not confirmed; Wikipedia, Statute of Westminster 1931, gives the disagreement as the reason |
| content/quizzes/crown.en.yaml (`crown-what-the-crown-means`) | "R" is short for Rex or Regina | "R" stands for the Crown: the King or Queen | Latin expansion not confirmed; Justice Canada confirms Crown prosecutions |
| content/quizzes/provinces.en.yaml (`british-columbia-unceded`) | CIRNAC Douglas Treaties source plus marker | source: The Canadian Encyclopedia, comprehensive land claims and modern treaties | The same source confirmed the same facts for `indigenous-unceded-bc` |
| provinces.en.yaml (`british-columbia-supreme-court`) | bccourts.ca plus marker | source: Justice Canada, The judicial structure | Fetched 2026-11-13: superior trial courts "may be called the Supreme Court"; appeal courts are a level above |
| provinces.en.yaml (`ontario-french-services`) | e-Laws source plus marker | source: Wikipedia, Official bilingualism in Canada | It describes services guaranteed in designated areas |
| content/governors-general.en.md | — | note under the governors general table on Jean and Payette end dates | DISCREPANCIES data items; data not changed |
| content/governors-general.en.md | — | note under the chief justices table on Duff, Dickson and McLachlin; Court's list added to Sources | As above |
| content/prime-ministers.en.md | — | note under the table on Macdonald's 1878–1891 party label | As above |

Still marked: `content/about.en.md` (contact link, for the owner) and *Democracy Watch v. Canada (Prime
Minister)*, 2023 FCA 41, in `content/learn/04-elections/election-day.en.md` and `content/sources.en.md`.
Nothing supports the style of cause or that it concerned the 2021 election, and dropping the line would
leave the 2021 row of the page's table with no source at all. A web search found nothing.

Test fixture: `tests/unit/fixtures/timeline-legacy-anchors.json` now has
`event-2021-alberta-holds-provincial-referendum` in place of `event-2021-alberta-holds-non-binding`.
"non-binding" was among the first four words that build the anchor, so the wording couldn't change
without it. The old `#event-2021-alberta-holds-non-binding` link no longer resolves; no page on the site
uses it.

Noticed, not changed: patriation-1982 still says the Statute of Westminster left the BNA Acts out at
Canada's request (unmarked).
