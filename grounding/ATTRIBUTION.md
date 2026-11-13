# Attribution

True North Explained is licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The third-party
material that `pnpm grounding` downloads keeps its own licence, listed here. The same
information is shown to readers on the site's [credits page](https://truenorthexplained.ca/credits),
generated from the datasets' `_meta` blocks and `src/data/flags.json`.

## Wikipedia

`grounding/wikipedia/*.wiki` and `*.txt` are copies of English Wikipedia articles.

- **Licence:** [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
  (text). Wikipedia text is also available under the GFDL; we use it under CC BY-SA.
- **Authors:** the Wikipedia contributors to each article. Each page's URL is in
  `grounding/manifest.json`; its full list of authors is in the article's history
  (`?action=history`) at the revision id recorded there.
- **Changes:** converted to plain text (`.txt`) or stored as fetched (`.wiki`). No other
  edits.
- Share-alike is compatible with this project's own CC BY-SA 4.0 licence, so content
  pages may adapt Wikipedia text, with a link to the article in their sources.

## Wikidata

`src/data/wikidata/*.json` comes from the [Wikidata Query Service](https://query.wikidata.org/).

- **Licence:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public
  domain dedication). Attribution isn't required; we give it anyway.
- Current premiers, and the check of current federal officeholders, also use the
  `incumbent` field of the English Wikipedia article for each office (CC BY-SA 4.0).

## Elections Canada

`src/data/elections/history.json` (`pnpm data:election-history`) uses two Elections
Canada publications:

- [Voter Turnout at Federal Elections and Referendums](https://www.elections.ca/content.aspx?section=ele&dir=turn&document=index&lang=e):
  dates, registered electors, ballots cast and turnout for every general election.
- [A History of the Vote in Canada](https://www.elections.ca/content.aspx?section=res&dir=his&document=index&lang=e):
  the milestones in who could vote shown on the turnout chart. The script checks each
  against a sentence in the book; the short descriptions are our own.

**Licence:** [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).
This site is not endorsed by Elections Canada. The figures are unchanged.

The same file's seats, vote shares and women elected come from Wikipedia (CC BY-SA 4.0):
"List of Canadian federal elections", each election's article and "List of women elected
to Canadian Parliament", read from `grounding/wikipedia/`.

## Premiers

`src/data/wikidata/premiers.json` (`pnpm data:premiers`) combines Wikidata (CC0) with
the infoboxes of each premier's English Wikipedia article and the "List of premiers of …"
page for each province and territory (CC BY-SA 4.0). Wikipedia fills dates and parties
that Wikidata lacks; the current premier comes from `src/data/wikidata/provinces.json`
when Wikidata is behind.

## Statistics Canada

`src/data/statcan/*.json` comes from these Statistics Canada tables:

- 17-10-0005-01 Population estimates on July 1, by age and gender
- 17-10-0008-01 Estimates of the components of demographic growth, annual
- 17-10-0009-01 Population estimates, quarterly
- 17-10-0063-01 Historical statistics, estimated population and immigrant arrivals
- 17-10-0067-01 Historical statistics, population and population density

**Licence:** [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence),
consistent with the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).
The licence asks for an acknowledgement such as: *Source: Statistics Canada. Reproduced and distributed on an "as is"
basis with the permission of Statistics Canada.* This site is not endorsed by Statistics
Canada. The data has been filtered and reshaped (and shares and rates calculated from
it); the figures themselves are unchanged.

## Flags

`public/flags/*.svg` are from Wikimedia Commons, via each place's flag image (P41) on
Wikidata. Licence and author are as recorded in the file's Commons metadata at fetch
time (`src/data/flags.json`). The files were lightly optimized: metadata, comments and
editor data removed, path coordinates rounded to three decimals, and a `viewBox` added
where missing. The drawings are otherwise unchanged.

| Flag | Commons file | Licence | Author (as listed on Commons) |
|---|---|---|---|
| Canada | [Flag of Canada (Pantone).svg](https://commons.wikimedia.org/wiki/File:Flag_of_Canada_(Pantone).svg) | Public domain | Original: George F. G. Stanley. Modified by: the original uploader was Illegitimate Barrister at Wikimedia Commons. The current SVG encoding is a rewrite performed by MapGrid. |
| Alberta | [Flag of Alberta.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Alberta.svg) | Public domain | Kooma (original) |
| British Columbia | [Flag of British Columbia.svg](https://commons.wikimedia.org/wiki/File:Flag_of_British_Columbia.svg) | Public domain | Kooma (original), Sshu94 (current) |
| Manitoba | [Flag of the Province of Manitoba.svg](https://commons.wikimedia.org/wiki/File:Flag_of_the_Province_of_Manitoba.svg) | **CC BY-SA 4.0** | Echando una mano |
| New Brunswick | [Flag of New Brunswick.svg](https://commons.wikimedia.org/wiki/File:Flag_of_New_Brunswick.svg) | Public domain | Dbenbenn (original), E Pluribus Anthony (current) |
| Newfoundland and Labrador | [Flag of Newfoundland and Labrador.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Newfoundland_and_Labrador.svg) | Public domain | Robert Crosbie (2005 original, uploaded by Kooma); redrawn by MapGrid, colours by Great Brightstar (2019) |
| Northwest Territories | [Flag of the Northwest Territories.svg](https://commons.wikimedia.org/wiki/File:Flag_of_the_Northwest_Territories.svg) | Public domain | Kooma (original), MapGrid (update) |
| Nova Scotia | [Flag of Nova Scotia.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Nova_Scotia.svg) | Public domain | Original: unknown. Vector: Kooma, FJDEACKB, Zscout370 and Denelson83 |
| Nunavut | [Flag of Nunavut.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Nunavut.svg) | Public domain | Kooma (original) |
| Ontario | [Flag of Ontario.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Ontario.svg) | Public domain | Kooma |
| Prince Edward Island | [Flag of Prince Edward Island.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Prince_Edward_Island.svg) | Public domain | E Pluribus Anthony |
| Quebec | [Flag of Quebec.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Quebec.svg) | Public domain | Original: René Chaloult. Vector: Krun |
| Saskatchewan | [Flag of Saskatchewan.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Saskatchewan.svg) | Public domain | Kooma |
| Yukon | [Flag of Yukon.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Yukon.svg) | Public domain | Kooma (original) |

The **Manitoba** file needs attribution and share-alike: credit "Echando una mano,
CC BY-SA 4.0, via Wikimedia Commons" wherever it's shown with a link to the credits page
or the Commons file. Our optimized copy is shared under the same licence.

Flags are also official symbols. Their use may be governed by the governments that own
them, separately from copyright.

If this table and `src/data/flags.json` ever disagree, the JSON is current (it's
regenerated by `pnpm grounding --only flags`); update this table to match.
