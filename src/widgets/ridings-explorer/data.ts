/**
 * Build-time join of the 2025 results, the current House and the riding
 * geometry, shared by the ridings-explorer widget, the riding-share-map widget
 * and the static data endpoints in src/pages/data/.
 */
import { PARTIES, PROVINCES, commons, ridings, winners, type PartyKey, type ProvinceCode } from "../../lib/elections";

export const ELECTION_DATE = "2025-04-28";

/** The current MP, when it isn't simply the person elected in 2025 for the same party. */
export type NowStatus =
  | { kind: "vacant" }
  | { kind: "new"; name: string; party: PartyKey; since: string }
  | { kind: "switched"; name: string; party: PartyKey };

export interface CandidateRow {
  name: string;
  party: PartyKey;
  /** Short party label: the main parties' names, or Elections Canada's own label for the rest. */
  label: string;
  votes: number;
  share: number;
  elected: boolean;
}

export interface RidingResult {
  fed: number;
  nameEn: string;
  nameFr: string;
  /** Parliament renamed the district after the election. */
  renamed?: { en: string; fr: string };
  province: ProvinceCode;
  party: PartyKey;
  winner: string;
  /** Points of valid votes. */
  margin: number;
  marginVotes: number;
  turnout: number;
  electors: number;
  validVotes: number;
  /** The winner's share of valid votes. */
  winnerShare: number;
  candidates: CandidateRow[];
  now?: NowStatus;
}

const byFed = new Map(ridings.map((r) => [r.fed, r]));
const members = new Map(commons.members.map((m) => [m.fed, m]));
const vacant = new Set(commons.vacancies.map((v) => v.fed));
const cleanName = (name: string) => name.replace(/^(Right )?Hon\.\s+/, "");

const partyLabel = (party: PartyKey, affiliation: string) => (party === "other" ? affiliation : PARTIES[party].en);

function nowFor(fed: number, party: PartyKey): NowStatus | undefined {
  if (vacant.has(fed)) return { kind: "vacant" };
  const m = members.get(fed);
  if (!m) return { kind: "vacant" };
  // The House lists the start of each member's current membership. A later
  // date means someone new won the seat; the same date with a new party means
  // the member changed caucus. (Names are spelled differently between Elections
  // Canada and the House, "Hon." and middle names, so they can't be compared.)
  if (m.since > ELECTION_DATE) return { kind: "new", name: cleanName(m.name), party: m.party, since: m.since };
  if (m.party !== party) return { kind: "switched", name: cleanName(m.name), party: m.party };
  return undefined;
}

export const results: RidingResult[] = winners.map((w) => {
  const r = byFed.get(w.fed);
  if (!r) throw new Error(`ridings-explorer: no results for district ${w.fed}`);
  return {
    fed: w.fed,
    nameEn: r.nameEn,
    nameFr: r.nameFr,
    renamed: r.currentName,
    province: r.province,
    party: w.party,
    winner: w.winner,
    margin: w.margin,
    marginVotes: w.marginVotes,
    turnout: w.turnout,
    electors: r.electors,
    validVotes: r.validVotes,
    winnerShare: r.candidates[0]?.share ?? 0,
    candidates: r.candidates.map((c) => ({
      name: c.name,
      party: c.party,
      label: partyLabel(c.party, c.affiliationEn),
      votes: c.votes,
      share: c.share,
      elected: c.elected,
    })),
    now: nowFor(w.fed, w.party),
  };
});

export const resultByFed = new Map(results.map((r) => [r.fed, r]));

export const provinceShort = (code: ProvinceCode) => PROVINCES[code].short;
export const provinceName = (code: ProvinceCode) => PROVINCES[code].en;

/** A sequential colour step, 1 (lightest) to 6 (darkest). */
export interface Bin {
  step: number;
  label: string;
  test: (v: number) => boolean;
}

/** Margin of victory, in points. Closer races are darker. */
export const MARGIN_BINS: Bin[] = [
  { step: 6, label: "Under 2 points", test: (v) => v < 2 },
  { step: 5, label: "2 to 5 points", test: (v) => v >= 2 && v < 5 },
  { step: 4, label: "5 to 10 points", test: (v) => v >= 5 && v < 10 },
  { step: 3, label: "10 to 20 points", test: (v) => v >= 10 && v < 20 },
  { step: 2, label: "20 to 35 points", test: (v) => v >= 20 && v < 35 },
  { step: 1, label: "35 points or more", test: (v) => v >= 35 },
];

/** Turnout, percent of electors. Higher is darker. */
export const TURNOUT_BINS: Bin[] = [
  { step: 1, label: "Under 60%", test: (v) => v < 60 },
  { step: 2, label: "60% to 65%", test: (v) => v >= 60 && v < 65 },
  { step: 3, label: "65% to 68%", test: (v) => v >= 65 && v < 68 },
  { step: 4, label: "68% to 71%", test: (v) => v >= 68 && v < 71 },
  { step: 5, label: "71% to 74%", test: (v) => v >= 71 && v < 74 },
  { step: 6, label: "74% or more", test: (v) => v >= 74 },
];

/** The winner's share of the vote: who won with a majority, and who with a plurality. */
export const SHARE_BINS: Bin[] = [
  { step: 6, label: "Under 40%", test: (v) => v < 40 },
  { step: 4, label: "40% to 50%", test: (v) => v >= 40 && v < 50 },
  { step: 2, label: "50% to 60%", test: (v) => v >= 50 && v < 60 },
  { step: 1, label: "60% or more", test: (v) => v >= 60 },
];

export function binFor(bins: Bin[], v: number): Bin {
  const bin = bins.find((b) => b.test(v));
  if (!bin) throw new Error(`No colour bin for ${v}`);
  return bin;
}

/** The compact, client-side shape served at /data/riding-results.json. */
export function clientResults() {
  return {
    _meta: {
      source: "Elections Canada, Official Voting Results, 45th General Election (April 28, 2025); House of Commons, Members of Parliament",
      licence: "Open Government Licence – Canada (election results); House of Commons open data (current members)",
      membersAsOf: commons._meta.fetched,
    },
    ridings: results,
  };
}
