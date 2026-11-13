/**
 * Fixed reference tables shared by the data script (scripts/data/elections.ts)
 * and the typed loader (src/lib/elections.ts). Pure constants, no data imports,
 * so the script can use them before any dataset exists.
 */

export const PARTY_KEYS = ["lpc", "cpc", "bq", "ndp", "gpc", "other"] as const;
export type PartyKey = (typeof PARTY_KEYS)[number];

export interface PartyInfo {
  key: PartyKey;
  /** Short display name, as used in seat charts. */
  en: string;
  fr: string;
  /** Full name. */
  nameEn: string;
  nameFr: string;
}

export const PARTIES: Record<PartyKey, PartyInfo> = {
  lpc: { key: "lpc", en: "Liberal", fr: "Libéral", nameEn: "Liberal Party of Canada", nameFr: "Parti libéral du Canada" },
  cpc: {
    key: "cpc",
    en: "Conservative",
    fr: "Conservateur",
    nameEn: "Conservative Party of Canada",
    nameFr: "Parti conservateur du Canada",
  },
  bq: { key: "bq", en: "Bloc Québécois", fr: "Bloc Québécois", nameEn: "Bloc Québécois", nameFr: "Bloc Québécois" },
  ndp: { key: "ndp", en: "NDP", fr: "NPD", nameEn: "New Democratic Party", nameFr: "Nouveau Parti démocratique" },
  gpc: { key: "gpc", en: "Green", fr: "Vert", nameEn: "Green Party of Canada", nameFr: "Parti vert du Canada" },
  other: {
    key: "other",
    en: "Other",
    fr: "Autres",
    nameEn: "Other parties and independents",
    nameFr: "Autres partis et indépendants",
  },
};

export const PROVINCE_CODES = ["NL", "PE", "NS", "NB", "QC", "ON", "MB", "SK", "AB", "BC", "YT", "NT", "NU"] as const;
export type ProvinceCode = (typeof PROVINCE_CODES)[number];

export interface ProvinceInfo {
  code: ProvinceCode;
  /** Statistics Canada Standard Geographical Classification code; the first two digits of every FED number. */
  pruid: string;
  /** Page id under /provinces/. */
  slug: string;
  en: string;
  fr: string;
  /** Short English label for tight chart axes. */
  short: string;
  territory: boolean;
}

const p = (code: ProvinceCode, pruid: string, slug: string, en: string, fr: string, short: string, territory = false): ProvinceInfo => ({
  code,
  pruid,
  slug,
  en,
  fr,
  short,
  territory,
});

/** In the order Statistics Canada and Elections Canada use (east to west, then the territories). */
export const PROVINCES: Record<ProvinceCode, ProvinceInfo> = {
  NL: p("NL", "10", "newfoundland-and-labrador", "Newfoundland and Labrador", "Terre-Neuve-et-Labrador", "N.L."),
  PE: p("PE", "11", "prince-edward-island", "Prince Edward Island", "Île-du-Prince-Édouard", "P.E.I."),
  NS: p("NS", "12", "nova-scotia", "Nova Scotia", "Nouvelle-Écosse", "N.S."),
  NB: p("NB", "13", "new-brunswick", "New Brunswick", "Nouveau-Brunswick", "N.B."),
  QC: p("QC", "24", "quebec", "Quebec", "Québec", "Que."),
  ON: p("ON", "35", "ontario", "Ontario", "Ontario", "Ont."),
  MB: p("MB", "46", "manitoba", "Manitoba", "Manitoba", "Man."),
  SK: p("SK", "47", "saskatchewan", "Saskatchewan", "Saskatchewan", "Sask."),
  AB: p("AB", "48", "alberta", "Alberta", "Alberta", "Alta."),
  BC: p("BC", "59", "british-columbia", "British Columbia", "Colombie-Britannique", "B.C."),
  YT: p("YT", "60", "yukon", "Yukon", "Yukon", "Y.T.", true),
  NT: p("NT", "61", "northwest-territories", "Northwest Territories", "Territoires du Nord-Ouest", "N.W.T.", true),
  NU: p("NU", "62", "nunavut", "Nunavut", "Nunavut", "Nvt.", true),
};

/** Look up a province by its English name, as Elections Canada, the House and the Senate write it. */
export function provinceByName(name: string): ProvinceInfo | undefined {
  const n = name.split("/")[0]!.trim().toLowerCase();
  return Object.values(PROVINCES).find((pr) => pr.en.toLowerCase() === n);
}

/** Smallest number of seats that is more than half. */
export const majorityOf = (seats: number) => Math.floor(seats / 2) + 1;
