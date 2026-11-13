/**
 * Typed access to the election, Parliament and population datasets written by
 * `pnpm data:elections` (scripts/data/elections.ts).
 *
 *   2025 election results   ridings, nationalResult, provinceResults, winners
 *   House of Commons now    commons (current members, vacancies, standing)
 *   Senate                  senate
 *   Seat distribution       seatAllocation, population
 *
 * Election results and the current standing are deliberately separate:
 * by-elections, resignations and floor-crossings change the House after an
 * election, but never the result.
 */
import ridingsJson from "../data/elections/2025/ridings.json";
import partiesJson from "../data/elections/2025/parties.json";
import winnersJson from "../data/elections/2025/winners.json";
import commonsJson from "../data/parliament/commons.json";
import senateJson from "../data/parliament/senate.json";
import allocationJson from "../data/parliament/seat-allocation.json";
import populationJson from "../data/population/provinces.json";
import { PARTIES, PARTY_KEYS, PROVINCES, PROVINCE_CODES, majorityOf, type PartyKey, type ProvinceCode } from "./elections-constants";

export { PARTIES, PARTY_KEYS, PROVINCES, PROVINCE_CODES, majorityOf, type PartyKey, type ProvinceCode };
export type { PartyInfo, ProvinceInfo } from "./elections-constants";

export interface Meta {
  source: string;
  url: string;
  licence: string;
  fetched: string;
  status?: string;
  notes?: string;
}

// --- 2025 general election -------------------------------------------------

export interface Candidate {
  name: string;
  party: PartyKey;
  /** Elections Canada's own short affiliation label (e.g. "People's Party - PPC"). */
  affiliationEn: string;
  affiliationFr: string;
  votes: number;
  /** Percentage of valid votes. */
  share: number;
  elected: boolean;
  incumbent: boolean;
}

export interface Riding {
  /** 2023 Representation Order number, the same as Statistics Canada's FEDUID. */
  fed: number;
  nameEn: string;
  nameFr: string;
  /** Present only if Parliament renamed the district after the election. */
  currentName?: { en: string; fr: string };
  province: ProvinceCode;
  population: number;
  electors: number;
  validVotes: number;
  rejectedBallots: number;
  /** All ballots cast, including rejected ones. */
  totalVotes: number;
  /** Percentage of electors who voted. */
  turnout: number;
  /** Most votes first. */
  candidates: Candidate[];
}

export interface PartyTally {
  party: PartyKey;
  votes: number;
  /** Percentage of valid votes. */
  share: number;
  seats: number;
  /** Percentage of seats. */
  seatShare: number;
  candidates: number;
}

export interface AreaResult {
  seats: number;
  electors: number;
  totalVotes: number;
  validVotes: number;
  turnout: number;
  parties: PartyTally[];
}

export interface Winner {
  fed: number;
  name: string;
  nameFr: string;
  province: ProvinceCode;
  party: PartyKey;
  winner: string;
  /** Lead over the runner-up, in percentage points of valid votes. */
  margin: number;
  marginVotes: number;
  turnout: number;
}

export interface Affiliation {
  en: string;
  fr: string;
  party: PartyKey;
  votes: number;
  share: number;
  seats: number;
  candidates: number;
}

export const ridingsMeta = ridingsJson._meta as Meta;
export const ridings = ridingsJson.ridings as Riding[];
export const resultsMeta = partiesJson._meta as Meta;
export const nationalResult = partiesJson.national as AreaResult & { majority: number };
export const provinceResults = partiesJson.byProvince as (AreaResult & { province: ProvinceCode })[];
export const affiliations = partiesJson.affiliations as Affiliation[];
export const winnersMeta = winnersJson._meta as Meta;
export const winners = winnersJson.winners as Winner[];

/** Seats won by each party in 2025. */
export const electionSeats = Object.fromEntries(nationalResult.parties.map((p) => [p.party, p.seats])) as Record<PartyKey, number>;

// --- House of Commons today ------------------------------------------------

export interface Member {
  personId: number;
  name: string;
  party: PartyKey;
  /** The House's own caucus name. */
  caucus: string;
  fed: number;
  constituency: string;
  constituencyFr: string;
  province: ProvinceCode;
  /** Start of the current membership (YYYY-MM-DD). */
  since: string;
}

export interface Vacancy {
  fed: number;
  constituency: string;
  constituencyFr: string;
  province: ProvinceCode;
}

export const commons = commonsJson as unknown as {
  _meta: Meta;
  seats: number;
  majority: number;
  standing: Record<PartyKey, number>;
  vacant: number;
  members: Member[];
  vacancies: Vacancy[];
};

// --- Senate ----------------------------------------------------------------

export interface SenateProvince {
  province: ProvinceCode;
  /** Regional division under the Constitution Act, 1867, s. 22 (plus Newfoundland and Labrador and the territories). */
  division: string;
  seats: number;
  senators: number;
  vacant: number;
}

export const senate = senateJson as unknown as {
  _meta: Meta;
  seats: number;
  byProvince: SenateProvince[];
  affiliations: { code: string; en: string; fr: string; senators: number }[];
  vacant: number;
  senators: { name: string; affiliation: string; province: ProvinceCode }[];
};

// --- Seat distribution -----------------------------------------------------

export interface SeatAllocation {
  province: ProvinceCode;
  /** Statistics Canada estimate for July 1, 2021, used for the 2022 redistribution. */
  population2021: number;
  /** Population ÷ electoral quotient, rounded up (provinces only). */
  initial: number;
  senatorialClause: number;
  grandfatherClause: number;
  representationRule: number;
  total: number;
}

export const seatAllocation = allocationJson as unknown as {
  _meta: Meta;
  quotient: number;
  total: number;
  provinces: SeatAllocation[];
};

export const population = populationJson as unknown as {
  _meta: Meta;
  /** First day of the reference quarter (YYYY-MM-DD). */
  refDate: string;
  canada: number;
  provinces: { province: ProvinceCode; population: number; share: number }[];
};

// --- Helpers ---------------------------------------------------------------

/** "2026-07-01" → "July 1, 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export const formatNumber = (n: number) => n.toLocaleString("en-CA");
export const formatPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
