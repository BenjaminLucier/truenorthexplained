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

## Finance Canada, Statistics Canada and the Bank of Canada: public money and prices

`src/data/money/*.json` is downloaded by `pnpm data:money` (`scripts/data/money.ts`) from:

- **Finance Canada, Fiscal Reference Tables** (latest edition's Excel workbook), tables 1–3,
  6, 7, 10 and 11: federal revenue, expenses, balance and accumulated deficit, 1966-67 on,
  and the latest year's revenue and spending by category.
- **Finance Canada, Historical Transfer Tables: 1980 to present** (open.canada.ca): equalization
  entitlements from 1957-58, the Canada Health Transfer, Canada Social Transfer, Territorial
  Formula Financing and the population used to allocate them.
- **Statistics Canada, Historical Statistics of Canada** (11-516-X), series H1-18, H19-34,
  H35-51 and F14-32: federal revenue, expenditure and debt, and gross national expenditure,
  used for 1926-27 to 1965-66.
- **Statistics Canada** tables 18-10-0005-01 (Consumer Price Index, annual average) and
  18-10-0004-01 (monthly, through the Web Data Service).
- **Bank of Canada, Valet API**: the Bank Rate (V122530), the target for the overnight rate
  (V39079, end of month and decision dates).

**Licence:** Finance Canada and Statistics Canada data is under the
[Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada)
(Statistics Canada's own [open licence](https://www.statcan.gc.ca/en/reference/licence) follows it).
The Bank of Canada isn't a government department and publishes under its own
[terms of use](https://www.bankofcanada.ca/terms/): its content may be freely used, copied and
distributed with attribution, an indication of any changes, and no suggestion that the Bank
endorses the use. Its data is in `src/data/money/interest-rates.json`. The data has been
filtered and reshaped, and shares, per-person figures and inflation adjustments calculated
from it; the published figures themselves are unchanged. The inflation-control target bands
are policy settings recorded in the script from the Bank of Canada's description of the
framework. None of these organizations endorses this site.

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
