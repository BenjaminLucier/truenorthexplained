/**
 * Typed access to src/data/portraits.json, written by `pnpm data:portraits`
 * (scripts/data/portraits.ts): photo credits keyed by Wikidata QID, the
 * current Supreme Court bench, and which Wikidata person holds each seat.
 * The images themselves are public/portraits/<qid>-96.webp and -240.webp.
 */
import data from "../data/portraits.json";
import type { DatasetMeta } from "./reference";

export interface PortraitCredit {
  name: string;
  roles: string[];
  /** Commons file name, without "File:". */
  file: string;
  /** Commons file description page. */
  page: string;
  licence: string;
  licenceUrl: string | null;
  author: string | null;
  /** "<author>, <licence>, via Wikimedia Commons". */
  attribution: string;
  sha1: string;
  fetched: string;
}

export interface Judge {
  qid: string;
  name: string;
  role: "chief" | "puisne";
  since: string;
  joined: string;
  born: number | null;
  wikipedia: string | null;
}

export const PORTRAIT_SIZES = [96, 240] as const;

export const portraitsMeta = data._meta as DatasetMeta & { processing: string };
export const portraits = data.portraits as Record<string, PortraitCredit>;
export const supremeCourt = data.supremeCourt as Judge[];
/** Current MPs: FED number → QID. */
export const memberQids = data.members as Record<string, string>;
/** MPs elected on April 28, 2025: FED number → QID. */
export const elected2025Qids = data.elected2025 as Record<string, string>;

export const portraitFor = (qid: string | null | undefined): PortraitCredit | undefined =>
  qid ? portraits[qid] : undefined;

export const portraitSrc = (qid: string, size: (typeof PORTRAIT_SIZES)[number]) => `/portraits/${qid}-${size}.webp`;

/** "Photo: Jane Doe, CC BY-SA 4.0". Long Commons author fields are shortened. */
export function photoCredit(p: PortraitCredit): string {
  let who = p.author ?? "unknown author";
  if (who.length > 70) who = `${who.slice(0, 67).replace(/[\s,;:.]+\S*$/, "")}…`;
  return `Photo: ${who}, ${p.licence}`;
}
