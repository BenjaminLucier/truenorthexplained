/**
 * `pnpm data:geo`: download boundary files and build
 * the TopoJSON the maps use.
 *
 *   src/data/geo/provinces.topo.json      13 provinces and territories (+ .meta.json)
 *   src/data/geo/ridings.topo.json        343 federal electoral districts (+ .meta.json)
 *
 * Sources (all Open Government Licence – Canada):
 *
 * - Provinces: Statistics Canada's 2021 Census cartographic boundary file
 *   (lpr_000b21a, shoreline-clipped), read from Statistics Canada's own ArcGIS
 *   REST service for that file. The zip downloads on www12.statcan.gc.ca sit
 *   behind a Cloudflare browser challenge that blocks scripts, while the REST
 *   service (listed on open.canada.ca as a distribution of the same dataset)
 *   doesn't. Each province is requested on its own with a 50 m server-side
 *   generalization, because the full-resolution Arctic geometry times out.
 * - Ridings: Elections Canada's boundary file for the 343 districts of the 2023
 *   Representation Order. Statistics Canada doesn't publish a 2023-order
 *   cartographic file outside www12, so the districts are clipped to the
 *   provinces' cartographic outline here, which gives the same shoreline-clipped
 *   result.
 * - Population: Statistics Canada table 17-10-0009-01, quarterly estimates.
 *
 * Downloads go to a temporary folder, which is deleted afterwards. Only the
 * outputs are committed.
 */
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { unzipSync } from "fflate";
import mapshaper from "mapshaper";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = resolve(ROOT, "src/data/geo");
const UA = "tne-data-scripts/1.0 (educational static site build script)";
const LICENCE = "Open Government Licence – Canada";
const LICENCE_URL = "https://open.canada.ca/en/open-government-licence-canada";
const today = new Date().toISOString().slice(0, 10);

/** Province and territory codes (PRUID), in Statistics Canada's order, with our page slugs. */
const PROVINCES: Record<string, string> = {
  "10": "newfoundland-and-labrador",
  "11": "prince-edward-island",
  "12": "nova-scotia",
  "13": "new-brunswick",
  "24": "quebec",
  "35": "ontario",
  "46": "manitoba",
  "47": "saskatchewan",
  "48": "alberta",
  "59": "british-columbia",
  "60": "yukon",
  "61": "northwest-territories",
  "62": "nunavut",
};

const PR_SERVICE = "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/0";
const PR_DATASET = "https://open.canada.ca/data/en/dataset/ef70dc3b-1069-4037-9bce-61f47e628a1d";
const FED_ZIP = "https://www.elections.ca/res/cir/mapsCorner/edb/FederalElectoralDistricts_SHP.zip";
const FED_DATASET = "https://open.canada.ca/data/en/dataset/18bf3ea7-1940-46ec-af52-9ba3f77ed708";

async function get(url: string, init: RequestInit = {}, tries = 3): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers } });
    if (res.ok) return res;
    if (attempt >= tries) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    console.warn(`  ${res.status} for ${url}, retrying`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

const kb = async (path: string) => `${((await stat(path)).size / 1024).toFixed(1)} KB`;
const writeJson = (path: string, data: unknown) => writeFile(path, JSON.stringify(data, null, 2) + "\n");

/** Runs a mapshaper command line through its Node API. */
function ms(cmd: string): Promise<void> {
  return new Promise((ok, fail) => mapshaper.runCommands(cmd, (err) => (err ? fail(err) : ok())));
}

// GEO_CACHE=<dir> keeps the downloads between runs, for tuning the simplification.
const cache = process.env.GEO_CACHE;
const tmp = cache ? resolve(cache) : await mkdtemp(join(tmpdir(), "tne-geo-"));
await mkdir(tmp, { recursive: true });
const cached = async (path: string) => Boolean(cache) && (await stat(path).catch(() => null)) !== null;
await mkdir(OUT, { recursive: true });

try {
  // ---------------------------------------------------------------- provinces
  console.log("Provinces: Statistics Canada 2021 cartographic boundary file");
  const prRaw = join(tmp, "provinces-3347.json");
  const features: unknown[] = [];
  if (!(await cached(prRaw))) for (const pruid of Object.keys(PROVINCES)) {
    const q = new URLSearchParams({
      where: `PRUID='${pruid}'`,
      outFields: "PRUID,DGUID,PRENAME,PRFNAME",
      outSR: "3347",
      maxAllowableOffset: "50",
      f: "geojson",
    });
    const json = (await (await get(`${PR_SERVICE}/query?${q}`)).json()) as { features?: unknown[] };
    if (!json.features?.length) throw new Error(`No geometry for PRUID ${pruid}`);
    features.push(...json.features);
    console.log(`  ${pruid} ${PROVINCES[pruid]}`);
  }
  if (features.length) await writeFile(prRaw, JSON.stringify({ type: "FeatureCollection", features }));

  const slugMap = JSON.stringify(PROVINCES).replace(/"/g, "'");
  const prOut = join(OUT, "provinces.topo.json");
  // Islands and lakes under 150 km² vanish at this scale anyway. sliver-control=0
  // makes the lake filter use plain area: the default shape-aware threshold
  // treats Prince Edward Island's crescent as a sliver. (Snapping to
  // repair the separately generalized borders does more harm than good: the
  // borders already line up, and snapping merges nearby Arctic islands.)
  await ms(
    [
      `-i "${prRaw}" name=provinces`,
      `-proj init=EPSG:3347`,
      `-filter-islands min-area=150km2 remove-empty`,
      `-filter-slivers min-area=150km2 sliver-control=0`,
      `-simplify weighted interval=3900 keep-shapes`,
      `-proj wgs84`,
      `-each "id = PRUID, uid = DGUID, name_en = PRENAME, name_fr = PRFNAME, slug = (${slugMap})[PRUID]"`,
      `-filter-fields id,uid,name_en,name_fr,slug`,
      `-o "${prOut}" format=topojson quantization=10000 id-field=slug`,
    ].join(" "),
  );
  const pr = JSON.parse(await readFile(prOut, "utf8"));
  const prCount = pr.objects.provinces.geometries.length;
  if (prCount !== 13) throw new Error(`Expected 13 provinces, got ${prCount}`);
  const prEmpty = (pr.objects.provinces.geometries as { type: string | null; id: string }[]).filter((g) => !g.type);
  if (prEmpty.length) throw new Error(`Lost the geometry of ${prEmpty.map((g) => g.id).join(", ")}`);
  await writeJson(join(OUT, "provinces.topo.meta.json"), {
    source: "Statistics Canada, 2021 Census Provinces/territories Cartographic Boundary File (lpr_000b21a)",
    url: PR_SERVICE,
    dataset: PR_DATASET,
    licence: LICENCE,
    licenceUrl: LICENCE_URL,
    fetched: today,
    notes:
      "Shoreline-clipped cartographic file. Read per province from Statistics Canada's ArcGIS REST service with a 50 m generalization, reprojected from Statistics Canada Lambert (EPSG:3347) to WGS84, islands and lakes under 150 km² dropped, simplified with mapshaper (weighted Visvalingam, 3.9 km interval, keep-shapes), quantized to 1e4.",
    object: "provinces",
    properties: { id: "PRUID", uid: "DGUID", name_en: "English name", name_fr: "French name", slug: "page slug" },
  });
  console.log(`  → provinces.topo.json ${await kb(prOut)}`);

  // ------------------------------------------------------------------ ridings
  console.log("Ridings: Elections Canada, 2023 Representation Order");
  const zipPath = join(tmp, "fed.zip");
  if (!(await cached(zipPath))) await writeFile(zipPath, new Uint8Array(await (await get(FED_ZIP)).arrayBuffer()));
  const zip = new Uint8Array(await readFile(zipPath));
  const files = unzipSync(zip, { filter: (f) => /\.(shp|shx|dbf|prj|cpg)$/i.test(f.name) });
  let shp = "";
  for (const [name, data] of Object.entries(files)) {
    const base = name.split("/").pop()!;
    await writeFile(join(tmp, base), data);
    if (base.toLowerCase().endsWith(".shp")) shp = join(tmp, base);
  }
  if (!shp) throw new Error("No .shp in the Elections Canada zip");
  const prj = shp.replace(/\.shp$/i, ".prj");

  const ridingsOut = join(OUT, "ridings.topo.json");
  // Pass 1: clip the districts (which extend over lakes and the sea) to the
  // cartographic land outline. Both inputs are in Statistics Canada Lambert, so
  // this happens in metres.
  const clipped = join(tmp, "ridings-clipped.shp");
  await ms(
    [
      `-i "${prRaw}" name=land`,
      `-proj init="${prj}"`,
      `-filter-islands min-area=1km2 remove-empty`,
      `-dissolve2`,
      `-filter-slivers min-area=1km2 sliver-control=0`,
      `-i "${shp}" name=ridings`,
      `-clip land target=ridings remove-slivers`,
      `-o "${clipped}" target=ridings`,
    ].join(" "),
  );
  // Pass 2: simplify in proportion to each district's size. A downtown riding of
  // a few km² keeps detail down to about 80 m for city insets, while Nunavut is
  // simplified at 6 km. Islands smaller than 0.2% of their district (and under
  // 2 km² everywhere) are dropped, which removes thousands of Arctic islets
  // without touching any district's main area.
  const interval = "Math.min(Math.max(Math.sqrt(ra) / 45, 80), 6000)";
  await ms(
    [
      `-i "${clipped}" name=ridings`,
      `-each "ra = $.area"`,
      `-explode`,
      `-filter "$.area > Math.max(2e6, ra * 0.002)"`,
      `-dissolve ED_CF_NUM copy-fields=ED_NAMEE,CF_NOMF,ra`,
      `-simplify visvalingam weighted variable interval="${interval}" keep-shapes`,
      `-proj wgs84`,
      `-each "fed = ED_CF_NUM, name_en = ED_NAMEE, name_fr = CF_NOMF, province = (${slugMap})[String(ED_CF_NUM).slice(0, 2)]"`,
      `-filter-fields fed,name_en,name_fr,province`,
      `-sort fed`,
      `-o "${ridingsOut}" format=topojson quantization=100000 id-field=fed`,
    ].join(" "),
  );
  const rd = JSON.parse(await readFile(ridingsOut, "utf8"));
  const geoms = rd.objects.ridings.geometries as { type: string | null; properties: { province?: string } }[];
  if (geoms.length !== 343) throw new Error(`Expected 343 ridings, got ${geoms.length}`);
  const empty = geoms.filter((g) => !g.type);
  if (empty.length) throw new Error(`${empty.length} ridings lost their geometry`);
  if (geoms.some((g) => !g.properties.province)) throw new Error("A riding has no province");
  await writeJson(join(OUT, "ridings.topo.meta.json"), {
    source: "Elections Canada, Federal Electoral District boundaries (2023 Representation Order)",
    url: FED_ZIP,
    dataset: FED_DATASET,
    licence: LICENCE,
    licenceUrl: LICENCE_URL,
    fetched: today,
    notes:
      "343 districts. Clipped to the Statistics Canada 2021 cartographic province outline (see provinces.topo.meta.json) so coastlines match the province map, islands under 2 km² (or 0.2% of their district) dropped, simplified with mapshaper (weighted Visvalingam with keep-shapes, at an interval scaled to each district's size: 80 m for the smallest urban districts up to 6 km in the North), reprojected to WGS84, quantized to 1e5.",
    object: "ridings",
    properties: {
      fed: "federal electoral district number (ED_CF_NUM); the first two digits are the PRUID",
      name_en: "English name",
      name_fr: "French name",
      province: "province or territory page slug",
    },
  });
  console.log(`  → ridings.topo.json ${await kb(ridingsOut)}`);

  // Population estimates live in src/data/population/provinces.json, written by
  // `pnpm data:elections`; the maps read them from there.
} finally {
  if (!cache) await rm(tmp, { recursive: true, force: true });
}
