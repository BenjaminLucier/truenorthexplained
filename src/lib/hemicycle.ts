/**
 * Seat positions for a hemicycle (half-circle) seat chart, computed at build time.
 *
 * Seats sit on concentric arcs. Each row gets seats in proportion to its
 * length, so spacing stays even. Seats are then ordered by angle, left to
 * right, so that filling them in order gives each group a wedge. With an odd
 * number of seats the middle seat sits exactly on the vertical centre line,
 * which is where a majority line belongs.
 */

export interface Seat {
  x: number;
  y: number;
  /** Angle from the left end, 0 to π. */
  angle: number;
  row: number;
}

export interface HemicycleLayout {
  seats: Seat[];
  /** Radius of each dot. */
  r: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  inner: number;
  outer: number;
}

/**
 * @param total  number of seats
 * @param rows   number of arcs
 * @param outer  outer radius in SVG units
 * @param innerRatio  inner radius as a share of the outer one
 */
export function hemicycle(total: number, rows: number, outer = 300, innerRatio = 0.36): HemicycleLayout {
  const inner = outer * innerRatio;
  const radii = Array.from({ length: rows }, (_, i) => inner + ((outer - inner) * i) / Math.max(rows - 1, 1));
  const sum = radii.reduce((s, r) => s + r, 0);

  // Seats per row, proportional to arc length, rounded so they add up to the total.
  const exact = radii.map((r) => (total * r) / sum);
  const counts = exact.map(Math.floor);
  let left = total - counts.reduce((s, n) => s + n, 0);
  const byRemainder = exact.map((e, i) => ({ i, rem: e - Math.floor(e) })).sort((a, b) => b.rem - a.rem);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    counts[i]! += 1;
    left -= 1;
  }

  const rowGap = rows > 1 ? (outer - inner) / (rows - 1) : outer;
  const arcGap = Math.min(...radii.map((r, i) => (Math.PI * r) / Math.max(counts[i]! - 1, 1)));
  const r = Math.min(rowGap, arcGap) * 0.42;
  const pad = r + 2;
  const cx = outer + pad;
  const cy = outer + pad;

  const seats: Seat[] = [];
  radii.forEach((radius, row) => {
    const n = counts[row]!;
    for (let j = 0; j < n; j++) {
      const angle = n === 1 ? Math.PI / 2 : (Math.PI * j) / (n - 1);
      seats.push({ x: cx - radius * Math.cos(angle), y: cy - radius * Math.sin(angle), angle, row });
    }
  });
  // Left to right; within the same angle, inner rows first.
  seats.sort((a, b) => a.angle - b.angle || a.row - b.row);

  return { seats, r, width: cx * 2, height: cy + pad, cx, cy, inner, outer };
}

/** Assign groups to seats in order: [{key, count}] → key per seat. Leftover seats get `fallback`. */
export function fillSeats<K extends string>(layout: HemicycleLayout, groups: { key: K; count: number }[], fallback: K): K[] {
  const keys: K[] = [];
  for (const g of groups) for (let i = 0; i < g.count; i++) keys.push(g.key);
  while (keys.length < layout.seats.length) keys.push(fallback);
  return keys.slice(0, layout.seats.length);
}

/** Round to 2 decimals for compact SVG output. */
export const r2 = (n: number) => Math.round(n * 100) / 100;
