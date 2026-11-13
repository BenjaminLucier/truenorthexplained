/**
 * Tiny helpers for build-time SVG charts. No chart library.
 *
 * The charts stretch horizontally to fit any width while text stays at its
 * real size: the outer <svg> has no viewBox and places labels with percentage
 * x positions, and the plotted marks live in a nested <svg> that uses
 * `viewBox="0 0 1000 <height>"` with `preserveAspectRatio="none"`. Lines use
 * `vector-effect: non-scaling-stroke` so they stay crisp when stretched.
 */

/** Width of the inner plotting coordinate system. */
export const PLOT_W = 1000;

/** A linear scale from [d0, d1] to [r0, r1]. */
export function scale(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** "Nice" round tick values covering [min, max], roughly `count` of them. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** The smallest nice tick at or above `max`, for a y-axis that starts at zero. */
export function niceMax(max: number, count = 4): number {
  const ticks = niceTicks(0, max, count);
  const last = ticks.at(-1) ?? max;
  if (last >= max) return last;
  const step = ticks.length > 1 ? ticks[1]! - ticks[0]! : max;
  return last + step;
}

/** An SVG path through points, as "M x y L x y …", rounded to 0.1. */
export function linePath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}

/** A closed area path from a line down to a baseline y. */
export function areaPath(points: [number, number][], baseline: number): string {
  if (!points.length) return "";
  const first = points[0]!;
  const last = points.at(-1)!;
  return `${linePath(points)}L${last[0].toFixed(1)} ${baseline}L${first[0].toFixed(1)} ${baseline}Z`;
}

/** A percentage string for an x position in [0, PLOT_W]. */
export const pct = (x: number) => `${((x / PLOT_W) * 100).toFixed(2)}%`;

/** Axis label for counts: 40000000 → "40M", 750000 → "750K", 2500 → "2.5K". */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${Number((n / 1e6).toFixed(1))}M`;
  if (a >= 1e3) return `${Number((n / 1e3).toFixed(1))}K`;
  return String(n);
}

/**
 * One line of a `<tn-chart>` tooltip: a label, an optional value and an
 * optional colour key. See ARCHITECTURE.md, "Charts".
 */
export type TipRow = [label: string, value?: string | null, color?: string | null];

/** The `data-tip-rows` attribute for a `<tn-chart>` stop. */
export const tipRows = (rows: TipRow[]) => JSON.stringify(rows);

/** How a value reads in a tooltip: "−1.5%", "+2.0%", "$12 billion". */
export interface ValueFormat {
  /** Decimal places (default 1). */
  dp?: number;
  pre?: string;
  suf?: string;
  /** Show a plus sign on positive values. */
  signed?: boolean;
  /** Multiply before formatting, e.g. 0.001 for millions to billions. */
  scale?: number;
}

export function formatValue(v: number, f: ValueFormat): string {
  const n = v * (f.scale ?? 1);
  const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: f.dp ?? 1, maximumFractionDigits: f.dp ?? 1 });
  const sign = n < 0 ? "−" : f.signed && n > 0 ? "+" : "";
  return `${sign}${f.pre ?? ""}${abs}${f.suf ?? ""}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "1981-08" → "August 1981"; anything after the month is kept ("2025-10 (latest)" → "October 2025 (latest)"). */
export function monthLabel(raw: string): string {
  return /^\d{4}-\d{2}/.test(raw) ? `${MONTHS[Number(raw.slice(5, 7)) - 1]} ${raw.slice(0, 4)}${raw.slice(7)}` : raw;
}
