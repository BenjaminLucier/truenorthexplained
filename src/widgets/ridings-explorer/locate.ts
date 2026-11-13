/**
 * "Find my riding", entirely in the browser. Loaded on demand by the ridings
 * explorer when the reader asks for it, together with /data/ridings.topo.json.
 *
 * The reader's position is only ever compared with the downloaded boundaries
 * here. It is never sent anywhere.
 */
import { feature } from "topojson-client";
import type { MultiPolygon, Polygon, Position } from "geojson";

type Ring = Position[];
interface Shape {
  fed: number;
  bbox: [number, number, number, number];
  rings: Ring[];
}

export type Match = { fed: number; exact: true } | { fed: number; exact: false; km: number };

/** How far outside the simplified coastline or border a point can be and still count. */
const NEAR_KM = 2;

let shapes: Shape[] | undefined;

export async function loadShapes(url: string): Promise<void> {
  if (shapes) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const topo = (await res.json()) as Parameters<typeof feature>[0];
  const fc = feature(topo, topo.objects.ridings!) as unknown as {
    features: { geometry: Polygon | MultiPolygon; properties: { fed: number } }[];
  };
  shapes = fc.features.map((f) => {
    const g = f.geometry;
    const rings = g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    for (const ring of rings) {
      for (const [x, y] of ring as [number, number][]) {
        if (x < w) w = x;
        if (x > e) e = x;
        if (y < s) s = y;
        if (y > n) n = y;
      }
    }
    return { fed: f.properties.fed, bbox: [w, s, e, n], rings };
  });
}

/** Even-odd ray casting over every ring, so holes (lakes, enclaves) are handled too. */
function contains(rings: Ring[], x: number, y: number): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] as [number, number];
      const [xj, yj] = ring[j] as [number, number];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Distance in km from a point to the nearest edge, on a local flat approximation. */
function distanceKm(rings: Ring[], lon: number, lat: number): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = ring[i - 1] as [number, number];
      const [bx, by] = ring[i] as [number, number];
      const x1 = (ax - lon) * kx;
      const y1 = (ay - lat) * ky;
      const dx = (bx - ax) * kx;
      const dy = (by - ay) * ky;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / len)) : 0;
      const d = Math.hypot(x1 + t * dx, y1 + t * dy);
      if (d < best) best = d;
    }
  }
  return best;
}

/** The riding containing a point, or the nearest one within NEAR_KM, or null (outside Canada). */
export function ridingAt(lon: number, lat: number): Match | null {
  if (!shapes) throw new Error("Boundaries not loaded");
  for (const s of shapes) {
    const [w, so, e, n] = s.bbox;
    if (lon >= w && lon <= e && lat >= so && lat <= n && contains(s.rings, lon, lat)) return { fed: s.fed, exact: true };
  }
  const pad = 0.05; // About 4 to 5 km at Canadian latitudes: enough for the bounding-box pre-filter.
  let best: Match | null = null;
  for (const s of shapes) {
    const [w, so, e, n] = s.bbox;
    if (lon < w - pad || lon > e + pad || lat < so - pad || lat > n + pad) continue;
    const km = distanceKm(s.rings, lon, lat);
    if (km <= NEAR_KM && (!best || (!best.exact && km < best.km))) best = { fed: s.fed, exact: false, km };
  }
  return best;
}
