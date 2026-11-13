/**
 * Build-time map helpers: geometry, projection and compact SVG paths.
 * Runs only in Astro frontmatter, so none of this ships to the browser.
 *
 *   provinceFeatures()   13 provinces and territories (src/data/geo/provinces.topo.json)
 *   ridingFeatures()     343 federal electoral districts, 2023 Representation Order
 *   treatyFeatures()     historic and modern treaty areas (src/data/geo/treaties.topo.json)
 *   outsideHistoricTreaties()  land outside every historic treaty area (same file)
 *   INSETS               lon/lat boxes for the dense cities, for <CanadaMap bounds=…>
 *
 * See CanadaMap.astro for the component and examples.
 */
import { geoBounds, geoConicConformal, geoStream, type GeoProjection, type GeoStream } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import provincesTopo from "../../data/geo/provinces.topo.json";
import ridingsTopo from "../../data/geo/ridings.topo.json";
import treatiesTopo from "../../data/geo/treaties.topo.json";
import populationData from "../../data/population/provinces.json";
import { PROVINCES, type ProvinceCode } from "../../lib/elections-constants";

export type ProvinceProps = {
  /** PRUID, e.g. "35". */
  id: string;
  /** DGUID, e.g. "2021A000235". */
  uid: string;
  name_en: string;
  name_fr: string;
  /** Page slug, e.g. "ontario" (also the feature id). */
  slug: string;
}

export type RidingProps = {
  /** Federal electoral district number, e.g. 35100. The first two digits are the PRUID. */
  fed: number;
  name_en: string;
  name_fr: string;
  /** Province or territory page slug. */
  province: string;
}

export type TreatyProps = {
  /** Stable id, e.g. "treaty-6" (also the feature id). */
  id: string;
  name: string;
  /** Historic (pre-1975) or modern (a comprehensive land claim agreement). */
  era: "historic" | "modern";
  /** The dataset's subtype, e.g. "Numbered Treaty". */
  kind: string;
  /** Year used for ordering. */
  year: number;
  /** Years as displayed, e.g. "1764–1862". */
  years: string;
  /** Extra note on the year, or "". */
  yearNote: string;
  parties: string;
  href: string;
  linkLabel: string;
  /** 1 for treaties that did not surrender land (Peace and Friendship). */
  noSurrender: 0 | 1;
}

export type MapFeature<P extends GeoJsonProperties = GeoJsonProperties> = Feature<Polygon | MultiPolygon, P>;

type Topo = Parameters<typeof feature>[0];

function toFeatures<P extends GeoJsonProperties>(topo: unknown, object: string): MapFeature<P>[] {
  const t = topo as Topo;
  const fc = feature(t, t.objects[object]!) as unknown as FeatureCollection<Polygon | MultiPolygon, P>;
  return fc.features;
}

let provinceCache: MapFeature<ProvinceProps>[] | undefined;
let ridingCache: MapFeature<RidingProps>[] | undefined;
let treatyCache: MapFeature<TreatyProps>[] | undefined;
let outsideCache: MapFeature[] | undefined;

/** The 13 provinces and territories, sorted by PRUID (east to west, then the North). */
export function provinceFeatures(): MapFeature<ProvinceProps>[] {
  return (provinceCache ??= toFeatures<ProvinceProps>(provincesTopo, "provinces"));
}

/** The 343 federal electoral districts, sorted by district number. */
export function ridingFeatures(): MapFeature<RidingProps>[] {
  return (ridingCache ??= toFeatures<RidingProps>(ridingsTopo, "ridings"));
}

/** Latest quarterly population estimate per province slug (plus "canada"), and its reference date. */
export const population: Record<string, number> = Object.fromEntries([
  ["canada", populationData.canada],
  ...populationData.provinces.map((p) => [PROVINCES[p.province as ProvinceCode].slug, p.population]),
]);
export const populationPeriod: string = populationData.refDate;

/** Historic treaties by year, then modern treaties by year (a treaty drawn as two areas is one feature). */
export function treatyFeatures(): MapFeature<TreatyProps>[] {
  return (treatyCache ??= toFeatures<TreatyProps>(treatiesTopo, "treaties"));
}

/** Land outside every historic treaty area. Not an official layer: see treaties.topo.meta.json. */
export function outsideHistoricTreaties(): MapFeature[] {
  return (outsideCache ??= toFeatures(treatiesTopo, "outside"));
}

/**
 * Statistics Canada Lambert conformal conic (EPSG:3347): standard parallels
 * 49° and 77°, central meridian −91° 52′. Scale and translation come from
 * fitSize/fitExtent/fitWidth.
 */
export function canadaProjection(): GeoProjection {
  return geoConicConformal().parallels([49, 77]).rotate([91.866667, 0]);
}

/** [west, south, east, north] in degrees. */
export type Bounds = [number, number, number, number];

/** A GeoJSON outline of a lon/lat box, densified so it projects to a smooth shape. */
export function boundsOutline([w, s, e, n]: Bounds): Feature<Polygon> {
  const steps = 8;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) ring.push([w + ((e - w) * i) / steps, s]);
  for (let i = 1; i <= steps; i++) ring.push([e, s + ((n - s) * i) / steps]);
  for (let i = 1; i <= steps; i++) ring.push([e - ((e - w) * i) / steps, n]);
  for (let i = 1; i <= steps; i++) ring.push([w, n - ((n - s) * i) / steps]);
  // d3 wants clockwise exterior rings; this one runs counter-clockwise, so reverse it.
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring.reverse()] } };
}

/** Features whose bounding box overlaps a lon/lat box. */
export function featuresInBounds<F extends MapFeature>(features: F[], [w, s, e, n]: Bounds): F[] {
  return features.filter((f) => {
    const [[fw, fs], [fe, fn]] = geoBounds(f);
    return fw <= e && fe >= w && fs <= n && fn >= s;
  });
}

/** City insets for ridings maps, as lon/lat boxes. Dense enough that the national view can't show them. */
export interface Inset {
  id: string;
  label: string;
  /** Province slug, handy for filtering ridings before the bounds check. */
  province: string;
  bounds: Bounds;
}

export const INSETS: Inset[] = [
  { id: "toronto", label: "Toronto", province: "ontario", bounds: [-79.82, 43.47, -79.08, 43.97] },
  { id: "montreal", label: "Montréal", province: "quebec", bounds: [-74.0, 45.38, -73.4, 45.72] },
  { id: "vancouver", label: "Vancouver", province: "british-columbia", bounds: [-123.28, 49.08, -122.7, 49.35] },
  { id: "ottawa-gatineau", label: "Ottawa–Gatineau", province: "ontario", bounds: [-76.02, 45.2, -75.42, 45.56] },
  { id: "calgary", label: "Calgary", province: "alberta", bounds: [-114.33, 50.84, -113.85, 51.22] },
  { id: "edmonton", label: "Edmonton", province: "alberta", bounds: [-113.75, 53.38, -113.24, 53.72] },
  { id: "winnipeg", label: "Winnipeg", province: "manitoba", bounds: [-97.36, 49.74, -96.94, 50.0] },
];

export function inset(id: string): Inset {
  const found = INSETS.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown inset "${id}". Known: ${INSETS.map((i) => i.id).join(", ")}`);
  return found;
}

/**
 * Compact SVG path data for a projected feature.
 *
 * Coordinates are rounded to `digits` decimals in viewBox units, consecutive
 * duplicates (and points within `tolerance` units of the previous one) are
 * dropped, and every point after the first in a ring is
 * written relative ("l dx dy"), which is far shorter than d3's absolute
 * "L x,y" output. Rings that collapse to under three points, or whose area is
 * under `minArea` square viewBox units (specks of islands, tiny lakes), are
 * skipped, except that a feature always keeps its largest ring. A feature
 * too small to draw at all comes back as "".
 */
export function pathData(
  projection: GeoProjection,
  digits = 1,
  minArea = 0,
  tolerance = 0,
): (object: MapFeature) => string {
  const k = 10 ** digits;
  const tol2 = tolerance * tolerance;
  let lastX = NaN;
  let lastY = NaN;
  const minScaled = minArea * k * k;
  const num = (n: number) => {
    const s = String(n / k);
    return s.startsWith("0.") ? s.slice(1) : s.startsWith("-0.") ? "-" + s.slice(2) : s;
  };
  const join = (parts: string[]) => parts.reduce((acc, p) => (acc && !p.startsWith("-") ? `${acc} ${p}` : acc + p), "");
  const write = (ring: number[], closed: boolean) => {
    const deltas: string[] = [];
    for (let i = 2; i < ring.length; i += 2) deltas.push(num(ring[i]! - ring[i - 2]!), num(ring[i + 1]! - ring[i - 1]!));
    return "M" + join([num(ring[0]!), num(ring[1]!)]) + "l" + join(deltas) + (closed ? "z" : "");
  };
  const area = (ring: number[]) => {
    let a = 0;
    for (let i = 0, n = ring.length; i < n; i += 2) {
      const j = (i + 2) % n;
      a += ring[i]! * ring[j + 1]! - ring[j]! * ring[i + 1]!;
    }
    return Math.abs(a / 2);
  };

  let rings: { ring: number[]; area: number; closed: boolean }[] = [];
  let ring: number[] = [];
  let polygon = false;
  const sink: GeoStream = {
    point(x, y) {
      // Radial-distance thinning: skip points within `tolerance` of the last kept one.
      if (tol2 && ring.length && (x - lastX) ** 2 + (y - lastY) ** 2 < tol2) return;
      const rx = Math.round(x * k);
      const ry = Math.round(y * k);
      const n = ring.length;
      if (n && ring[n - 2] === rx && ring[n - 1] === ry) return;
      ring.push(rx, ry);
      lastX = x;
      lastY = y;
    },
    lineStart() {
      ring = [];
    },
    lineEnd() {
      const n = ring.length;
      if (polygon && n >= 4 && ring[0] === ring[n - 2] && ring[1] === ring[n - 1]) ring.length = n - 2;
      if (ring.length < (polygon ? 6 : 4)) return;
      rings.push({ ring, area: polygon ? area(ring) : Infinity, closed: polygon });
    },
    polygonStart() {
      polygon = true;
    },
    polygonEnd() {
      polygon = false;
    },
    sphere() {},
  };
  const stream = projection.stream(sink);
  return (object) => {
    rings = [];
    geoStream(object, stream);
    if (!rings.length) return "";
    const largest = rings.reduce((a, b) => (b.area > a.area ? b : a));
    return rings
      .filter((r) => r === largest || r.area >= minScaled)
      .map((r) => write(r.ring, r.closed))
      .join("");
  };
}
