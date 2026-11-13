/**
 * Shared by the premiers ribbon (all 13 rows, src/widgets/premiers-ribbon) and
 * the province profile (one row, src/widgets/province-profile): which rows to
 * draw, in what order, and where each premier's block sits on the time axis.
 */
import { buildDate, provinceGovernments, when, type ProvinceGovernments } from "../../lib/election-history";
import { PROVINCES, PROVINCE_CODES, type ProvinceCode } from "../../lib/elections-constants";

/** East to west, then the territories: Statistics Canada's order. */
export const RIBBON_ORDER: { slug: string; code: ProvinceCode }[] = PROVINCE_CODES.map((code) => ({ slug: PROVINCES[code].slug, code }));

const bySlug = new Map(provinceGovernments.map((p) => [p.slug, p]));
if (bySlug.size !== RIBBON_ORDER.length) throw new Error(`premiers-ribbon: expected ${RIBBON_ORDER.length} provinces and territories, found ${bySlug.size}`);

export const governmentsFor = (slug: string): ProvinceGovernments => {
  const p = bySlug.get(slug);
  if (!p) throw new Error(`premiers-ribbon: no premiers for "${slug}"`);
  return p;
};

export const termEnd = (t: { end: string | null }) => t.end ?? buildDate;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** Caretaker days between premiers are too short to draw. */
export const MIN_GAP_DAYS = 60;

/**
 * Blocks for one row on an axis from `x0` (fractional year) to `x1`, as 0–1000
 * positions. With the default axis (1867 to the end of this year) these match
 * the election-history charts' `xOf`.
 */
export function ribbonRow(slug: string, code: ProvinceCode, row: number, x0: number, x1: number) {
  const p = governmentsFor(slug);
  const xd = (iso: string) => ((when(iso) - x0) / (x1 - x0)) * 1000;
  const terms = p.terms.map((t, k) => ({ t, k, x: xd(t.start), w: xd(termEnd(t)) - xd(t.start) }));
  const gaps = p.gaps
    .filter((g) => daysBetween(g.start, g.end) >= MIN_GAP_DAYS)
    .map((g) => ({ ...g, x: Math.max(0, xd(g.start)), w: xd(g.end) - Math.max(0, xd(g.start)) }))
    // An axis that starts after a gap began (a single row starting at its first premier) cuts the gap at the start.
    .filter((g) => g.w > 0);
  return { p, code, row, terms, gaps, joinedX: Math.max(0, xd(p.joined)) };
}

export type RibbonRow = ReturnType<typeof ribbonRow>;
