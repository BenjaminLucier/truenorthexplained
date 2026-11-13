/**
 * Party families for the historical charts: how 150 years of federal and
 * provincial parties map onto a handful of colours. Pure constants, shared by
 * the data scripts (scripts/data/election-history.ts, scripts/data/premiers.ts)
 * and the widgets, so a party is classified the same way everywhere.
 *
 * Each family's colour is a design token in src/styles/global.css (data
 * colours section), with a light and a dark value.
 */

// ---------------------------------------------------------------------------
// Federal
// ---------------------------------------------------------------------------

export const FEDERAL_FAMILIES = ["lpc", "cpc", "progressive", "socred", "ndp", "bq", "gpc", "other"] as const;
export type FederalFamily = (typeof FEDERAL_FAMILIES)[number];

export interface FamilyInfo {
  /** Short label for legends. */
  label: string;
  /** Longer description of what the family covers. */
  covers: string;
  /** CSS colour, always a token. */
  color: string;
}

/**
 * Federal families, in stacking order (bottom to top in the seat chart).
 *
 * Choices, documented on the page too:
 * - Conservative family: the Conservative and Liberal-Conservative parties
 *   (1867–1942), the Unionists (1917), the National Government label (1940),
 *   the Progressive Conservatives (1942–2003), Reform (1987–2000), the
 *   Canadian Alliance (2000–2003) and today's Conservative Party (2003–).
 *   Same rule as the prime-ministers data (scripts/grounding/wikidata.ts),
 *   extended to Reform and the Alliance, which merged with the PCs in 2003.
 * - Liberal family: the Liberal Party itself, including the anti-conscription
 *   Laurier Liberals of 1917. Liberal-Progressives (1926–1953) go with the
 *   Progressives, the movement they came from, and the Independent Liberals
 *   elected in 1945 go with "other", so the Liberal bar is always the party's
 *   own seats and can be read against the majority line.
 * - Progressive family: the Progressive Party, United Farmers MPs and
 *   Liberal-Progressives.
 * - Social Credit family: Social Credit, New Democracy (its 1940 label) and the
 *   Ralliement créditiste.
 * - CCF/NDP family: the Co-operative Commonwealth Federation (1932–1961) and
 *   the New Democratic Party. Earlier Labour MPs count as "other".
 * - Bloc Québécois (1991–). The Anti-Confederation Party (1867) and the Bloc
 *   populaire (1945) count as "other".
 */
export const FEDERAL: Record<FederalFamily, FamilyInfo> = {
  lpc: { label: "Liberal", covers: "Liberal Party", color: "var(--tn-party-lpc)" },
  cpc: {
    label: "Conservative",
    covers: "Conservative, Liberal-Conservative, Unionist, Progressive Conservative, Reform, Canadian Alliance",
    color: "var(--tn-party-cpc)",
  },
  progressive: {
    label: "Progressive",
    covers: "Progressive Party, United Farmers, Liberal-Progressive",
    color: "var(--tn-party-progressive)",
  },
  socred: { label: "Social Credit", covers: "Social Credit, New Democracy, Ralliement créditiste", color: "var(--tn-party-socred)" },
  ndp: { label: "CCF / NDP", covers: "Co-operative Commonwealth Federation, New Democratic Party", color: "var(--tn-party-ndp)" },
  bq: { label: "Bloc Québécois", covers: "Bloc Québécois", color: "var(--tn-party-bq)" },
  gpc: { label: "Green", covers: "Green Party", color: "var(--tn-party-gpc)" },
  other: {
    label: "Other",
    covers: "Independents, Labour, Anti-Confederation, Bloc populaire, Independent Liberals and smaller parties",
    color: "var(--tn-party-other)",
  },
};

/**
 * Party keys used by Wikipedia's {{Canadian party colour|CA|<key>}} template
 * in election infoboxes, mapped to a display name and a family. An unknown key
 * fails the data script, so a new party is always classified on purpose.
 */
export const FEDERAL_PARTY_KEYS: Record<string, { name: string; family: FederalFamily }> = {
  Liberal: { name: "Liberal", family: "lpc" },
  "Laurier Liberals": { name: "Laurier Liberals", family: "lpc" },
  "Conservative (historical)": { name: "Conservative", family: "cpc" },
  "Liberal-Conservative": { name: "Liberal-Conservative", family: "cpc" },
  Unionist: { name: "Unionist", family: "cpc" },
  "National Government": { name: "National Government (Conservative)", family: "cpc" },
  PC: { name: "Progressive Conservative", family: "cpc" },
  Reform: { name: "Reform", family: "cpc" },
  "Canadian Alliance": { name: "Canadian Alliance", family: "cpc" },
  Conservative: { name: "Conservative", family: "cpc" },
  Progressive: { name: "Progressive", family: "progressive" },
  "United Farmers of Alberta": { name: "United Farmers of Alberta", family: "progressive" },
  "AB United Farmers": { name: "United Farmers of Alberta", family: "progressive" },
  "United Farmers of Ontario": { name: "United Farmers of Ontario", family: "progressive" },
  "Social Credit": { name: "Social Credit", family: "socred" },
  "New Democracy": { name: "New Democracy (Social Credit)", family: "socred" },
  "Ralliement créditiste": { name: "Ralliement créditiste", family: "socred" },
  CCF: { name: "CCF", family: "ndp" },
  NDP: { name: "NDP", family: "ndp" },
  BQ: { name: "Bloc Québécois", family: "bq" },
  Green: { name: "Green", family: "gpc" },
  PPC: { name: "People's Party", family: "other" },
  "Anti-Confederation": { name: "Anti-Confederation", family: "other" },
  Reconstruction: { name: "Reconstruction", family: "other" },
  "Bloc populaire": { name: "Bloc populaire", family: "other" },
  "Labor-Progressive": { name: "Labor-Progressive (Communist)", family: "other" },
  Labour: { name: "Labour", family: "other" },
  "Independent Labour": { name: "Independent Labour", family: "other" },
};

// ---------------------------------------------------------------------------
// Provincial and territorial
// ---------------------------------------------------------------------------

export const PROVINCIAL_FAMILIES = [
  "lpc",
  "cpc",
  "coalition",
  "progressive",
  "socred",
  "ndp",
  "sovereigntist",
  "autonomist",
  "other",
  "nonpartisan",
] as const;
export type ProvincialFamily = (typeof PROVINCIAL_FAMILIES)[number];

/**
 * Provincial parties are separate organizations from the federal ones, even
 * when they share a name, so the families describe where a party sits rather
 * than who it's affiliated with:
 *
 * - Liberal: each province's Liberal party, until 1991 in British Columbia
 *   (see coalition).
 * - Conservative: Conservative, Liberal-Conservative and Progressive
 *   Conservative parties, Alberta's United Conservative Party (the 2017 merger
 *   of the PCs and Wildrose) and the Yukon Party (the Yukon PCs, renamed in
 *   1991).
 * - Centre-right coalition: parties built to unite the centre-right against
 *   the NDP that aren't the old Conservative party: the BC Liberals (from 1991,
 *   when the party was rebuilt as a free-enterprise coalition; renamed BC
 *   United in 2023) and the Saskatchewan Party (founded 1997 by PC and Liberal
 *   MLAs).
 * - Farmer / Progressive: the United Farmers of Ontario and of Alberta, and
 *   Manitoba's Progressives and Liberal-Progressives.
 * - Social Credit: Alberta and British Columbia Social Credit.
 * - CCF/NDP: the CCF and the NDP.
 * - Sovereigntist: the Parti Québécois, coloured like the Bloc Québécois,
 *   which the PQ helped found.
 * - Quebec autonomist: the Union Nationale (1935–1989) and the Coalition
 *   Avenir Québec (2011–), nationalist parties of the centre-right that seek
 *   more powers for Quebec within Canada.
 * - Non-partisan: consensus government (Northwest Territories since 1905 in
 *   practice, Nunavut) and the years before party lines formed (British
 *   Columbia before 1903, the North-West Territories before 1905).
 * - Other: Confederation-era governments that predate the party system: New
 *   Brunswick's pro-Confederation coalition and Nova Scotia's Anti-Confederates.
 */
export const PROVINCIAL: Record<ProvincialFamily, FamilyInfo> = {
  lpc: { label: "Liberal", covers: "Provincial Liberal parties", color: "var(--tn-party-lpc)" },
  cpc: {
    label: "Conservative",
    covers: "Conservative and Progressive Conservative parties, United Conservative (Alberta), Yukon Party",
    color: "var(--tn-party-cpc)",
  },
  coalition: {
    label: "Centre-right coalition",
    covers: "BC Liberals since 1991 (BC United), Saskatchewan Party",
    color: "var(--tn-party-coalition)",
  },
  progressive: {
    label: "Farmer / Progressive",
    covers: "United Farmers (Ontario, Alberta), Progressives and Liberal-Progressives (Manitoba)",
    color: "var(--tn-party-progressive)",
  },
  socred: { label: "Social Credit", covers: "Social Credit (Alberta, British Columbia)", color: "var(--tn-party-socred)" },
  ndp: { label: "CCF / NDP", covers: "Co-operative Commonwealth Federation, New Democratic Party", color: "var(--tn-party-ndp)" },
  sovereigntist: { label: "Parti Québécois", covers: "Parti Québécois", color: "var(--tn-party-bq)" },
  autonomist: {
    label: "Quebec autonomist",
    covers: "Union Nationale, Coalition Avenir Québec",
    color: "var(--tn-party-autonomist)",
  },
  other: {
    label: "Other",
    covers: "Confederation-era governments: the pro-Confederation coalition (New Brunswick) and the Anti-Confederates (Nova Scotia)",
    color: "var(--tn-party-other)",
  },
  nonpartisan: {
    label: "Non-partisan",
    covers: "Consensus government, and the years before party lines formed",
    color: "var(--tn-party-nonpartisan)",
  },
};
