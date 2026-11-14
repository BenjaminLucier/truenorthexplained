/**
 * `pnpm data:treaties`: download Crown–Indigenous Relations and Northern
 * Affairs Canada's treaty boundaries and build the TopoJSON the treaty map uses.
 *
 *   src/data/geo/treaties.topo.json   (+ .meta.json)
 *     treaties   one feature per treaty (historic, pre-1975, and modern,
 *                post-1975), clipped to the same land outline as the
 *                province map
 *     outside    land not inside any historic treaty area, for the map's
 *                "not covered by a historic treaty" layer
 *
 * Sources (Open Government Licence – Canada): the "Historic treaties" and
 * "Modern treaties" datasets on open.canada.ca, read from their ArcGIS REST
 * distributions on geo.sac-isc.gc.ca. Each feature is requested on its own
 * with a 250 m server-side generalization, so no request is large.
 *
 * The boundary data has a name, a short type and an id for each area, nothing
 * more. The map also shows who the parties were and links to a CIRNAC page,
 * so this script carries a small annotation table (ANNOTATIONS below), written
 * from CIRNAC's treaty pages. The script fails if a feature has no annotation
 * or an annotation matches no feature, so a change upstream can't slip by.
 *
 * Downloads go to a temporary folder (or GEO_CACHE=<dir> to keep them).
 */
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import mapshaper from "mapshaper";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = resolve(ROOT, "src/data/geo");
const UA = "tne-data-scripts/1.0 (educational static site build script)";
const LICENCE = "Open Government Licence – Canada";
const LICENCE_URL = "https://open.canada.ca/en/open-government-licence-canada";
const today = new Date().toISOString().slice(0, 10);

const SERVICE = "https://geo.sac-isc.gc.ca/geomatics/rest/services/Donnees_Ouvertes-Open_Data";
const LAYERS = {
  historic: { url: `${SERVICE}/Historic_Treaty_E/MapServer/0`, dataset: "https://open.canada.ca/data/en/dataset/f281b150-0645-48e4-9c30-01f55f93f78e" },
  modern: { url: `${SERVICE}/Modern_Treaty_E/MapServer/0`, dataset: "https://open.canada.ca/data/en/dataset/be54680b-ea62-46f3-aaa9-7644ed970aef" },
} as const;
type Era = keyof typeof LAYERS;

const CIRNAC = "https://www.rcaanc-cirnac.gc.ca";
const NUMBERED = `${CIRNAC}/eng/1360948213124/1544620003549`;
const FINAL_AGREEMENTS: Record<string, string> = {
  bc: `${CIRNAC}/eng/1100100030588/1542730442128`,
  nl: `${CIRNAC}/eng/1100100030595/1542737592596`,
  nt: `${CIRNAC}/eng/1100100030598/1542738100588`,
  nu: `${CIRNAC}/eng/1100100030601/1542738744002`,
  qc: `${CIRNAC}/eng/1100100030604/1542740089024`,
  sk: `${CIRNAC}/eng/1715889537716/1715889559217`,
  yt: `${CIRNAC}/eng/1100100030607/1542805716353`,
};

interface Annotation {
  /** Stable id. Features sharing one (a treaty drawn as two areas) are merged. */
  id: string;
  /** Display name, tidied from the dataset's. */
  name: string;
  /** Year for ordering and display. Defaults to the first year in the dataset's name. */
  year?: number;
  /** Shown beside the year, e.g. when signing and taking effect differ. */
  yearNote?: string;
  /** Who made the treaty, in plain words. */
  parties: string;
  /** A page with the treaty text or CIRNAC's description. */
  link: { href: string; label: string };
  /** Peace and Friendship Treaties did not surrender land. */
  noSurrender?: boolean;
}

const crown = (when: number) => (when < 1867 ? "the British Crown" : "the Crown (Canada)");
const numbered = (n: string, href: string, nations: string, year: number): Annotation => ({
  id: `treaty-${n}`,
  name: `Treaty ${n}`,
  parties: `${nations}, and ${crown(year)}`,
  link: { href: `${CIRNAC}${href}`, label: `Text of Treaty ${n} (CIRNAC)` },
});

/** Keyed by the dataset's TAG_ID. Parties follow CIRNAC's treaty pages and treaty texts. */
const ANNOTATIONS: Record<string, Annotation> = {
  // ---- Historic (pre-1975)
  GP0009b: {
    id: "peace-and-friendship",
    name: "Peace and Friendship Treaties",
    parties: "Mi'kmaq, Wolastoqiyik (Maliseet) and Peskotomuhkati (Passamaquoddy) nations, and the British Crown",
    link: { href: `${CIRNAC}/eng/1360937048903/1544619681681`, label: "Peace and Friendship Treaties (CIRNAC)" },
    noSurrender: true,
  },
  HT03: {
    id: "upper-canada",
    name: "Upper Canada land surrenders",
    parties: "Anishinaabe nations, including the Mississauga and Chippewa, and other First Nations, and the British Crown (many separate agreements)",
    link: { href: `${CIRNAC}/eng/1360941656761/1544619778887#uc`, label: "Upper Canada land surrenders (CIRNAC)" },
  },
  PT0002a: {
    id: "robinson-huron",
    name: "Robinson-Huron Treaty",
    parties: "Anishinaabe (Ojibwe) First Nations of Lake Huron and Georgian Bay, and William Benjamin Robinson for the British Crown",
    link: { href: `${CIRNAC}/eng/1360945974712/1544619909155#rt`, label: "Robinson Treaties (CIRNAC)" },
  },
  HT05: {
    id: "robinson-superior",
    name: "Robinson-Superior Treaty",
    parties: "Anishinaabe (Ojibwe) First Nations of Lake Superior, and William Benjamin Robinson for the British Crown",
    link: { href: `${CIRNAC}/eng/1360945974712/1544619909155#rt`, label: "Robinson Treaties (CIRNAC)" },
  },
  HT06: {
    id: "douglas",
    name: "Douglas Treaties",
    parties: "First Nations of Vancouver Island (14 treaties), and James Douglas for the Hudson's Bay Company and the British Crown",
    link: { href: `${CIRNAC}/eng/1360945974712/1544619909155#dt`, label: "Douglas Treaties (CIRNAC)" },
  },
  HT07: numbered("1", "/eng/1100100028664/1581294165927", "Anishinaabe (Ojibwe) and Swampy Cree First Nations of southern Manitoba", 1871),
  HT08: numbered("2", "/eng/1100100028664/1581294165927", "Anishinaabe (Ojibwe) First Nations of Manitoba", 1871),
  HT09: numbered("3", "/eng/1100100028675/1581294028469", "Saulteaux (Ojibwe) First Nations of northwestern Ontario and Manitoba", 1873),
  HT10: numbered("4", "/eng/1100100028689/1581293019940", "Cree and Saulteaux First Nations", 1874),
  PT0011a: numbered("5", "/eng/1100100028699/1581292696320", "Saulteaux and Swampy Cree First Nations around Lake Winnipeg", 1875),
  PT0012a: numbered("6", "/eng/1100100028710/1581292569426", "Plains and Woods Cree, Assiniboine (Nakoda) and other First Nations", 1876),
  HT13: numbered("7", "/eng/1100100028793/1581292336658", "The Siksika, Kainai and Piikani (Blackfoot Confederacy), Tsuut'ina and Stoney Nakoda", 1877),
  HT14: numbered("8", "/eng/1100100028813/1581293624572", "Cree, Dane-zaa (Beaver), Denesuline (Chipewyan) and other First Nations", 1899),
  PT0015a: numbered("9", "/eng/1100100028863/1581293189896", "Anishinaabe (Ojibwe) and Cree First Nations of northern Ontario", 1905),
  HT16: numbered("10", "/eng/1100100028874/1581292941464", "Cree and Denesuline (Chipewyan) First Nations of northern Saskatchewan and Alberta", 1906),
  GP0010a: numbered("11", "/eng/1100100028916/1581294101357", "Dene First Nations of the Mackenzie Valley", 1921),
  HT18: {
    id: "williams",
    name: "Williams Treaties",
    parties: "Seven Chippewa and Mississauga First Nations of central Ontario, and the Crown (Canada and Ontario)",
    link: { href: `${CIRNAC}/eng/1360941656761/1544619778887#wt`, label: "Williams Treaties (CIRNAC)" },
  },

  // ---- Modern (comprehensive land claim agreements)
  GP0025a: {
    id: "jbnqa",
    name: "James Bay and Northern Quebec Agreement",
    year: 1975,
    yearNote: "signed 1975, in effect 1977",
    parties: "The Cree and Inuit of northern Quebec, Quebec, Canada and Quebec Crown corporations",
    link: { href: FINAL_AGREEMENTS.qc!, label: "Final agreements in Quebec (CIRNAC)" },
  },
  GP0026a: {
    id: "nqa",
    name: "Northeastern Quebec Agreement",
    parties: "The Naskapi of Kawawachikamach (then of Schefferville), Quebec, Canada, Quebec Crown corporations, and the Cree and Inuit parties to the James Bay agreement",
    link: { href: FINAL_AGREEMENTS.qc!, label: "Final agreements in Quebec (CIRNAC)" },
  },
  NT01: {
    id: "inuvialuit",
    name: "Inuvialuit Final Agreement",
    parties: "The Inuvialuit of the western Arctic and Canada",
    link: { href: FINAL_AGREEMENTS.nt!, label: "Final agreements in the Northwest Territories (CIRNAC)" },
  },
  YT15: {
    id: "inuvialuit",
    name: "Inuvialuit Final Agreement",
    parties: "The Inuvialuit of the western Arctic and Canada",
    link: { href: FINAL_AGREEMENTS.nt!, label: "Final agreements in the Northwest Territories (CIRNAC)" },
  },
  GP0013a: {
    id: "gwichin",
    name: "Gwich'in Comprehensive Land Claim Agreement",
    parties: "The Gwich'in of the Northwest Territories and Canada",
    link: { href: FINAL_AGREEMENTS.nt!, label: "Final agreements in the Northwest Territories (CIRNAC)" },
  },
  GP0022a: {
    id: "nunavut",
    name: "Nunavut Agreement",
    parties: "The Inuit of the Nunavut Settlement Area and Canada",
    link: { href: "https://laws-lois.justice.gc.ca/eng/acts/N-28.7/", label: "Nunavut Land Claims Agreement Act (Justice Laws)" },
  },
  GP0014a: {
    id: "sahtu",
    name: "Sahtu Dene and Metis Comprehensive Land Claim Agreement",
    yearNote: "signed 1993",
    parties: "The Sahtu Dene and Métis and Canada",
    link: { href: FINAL_AGREEMENTS.nt!, label: "Final agreements in the Northwest Territories (CIRNAC)" },
  },
  GP0005a: {
    id: "nisgaa",
    name: "Nisga'a Final Agreement",
    yearNote: "signed 1999, in effect 2000",
    parties: "The Nisga'a Nation, British Columbia and Canada",
    link: { href: "https://laws-lois.justice.gc.ca/eng/acts/N-23.3/", label: "Nisga'a Final Agreement Act (Justice Laws)" },
  },
  NT04: {
    id: "tlicho",
    name: "Tłı̨chǫ Agreement",
    yearNote: "signed 2003",
    parties:"The Tłı̨chǫ, the Northwest Territories and Canada",
    link: { href: FINAL_AGREEMENTS.nt!, label: "Final agreements in the Northwest Territories (CIRNAC)" },
  },
  CL1601a: {
    id: "tlicho",
    name: "Tłı̨chǫ Agreement",
    year: 2005,
    yearNote: "signed 2003",
    parties: "The Tłı̨chǫ, the Northwest Territories and Canada",
    link: { href: FINAL_AGREEMENTS.nt!, label: "Final agreements in the Northwest Territories (CIRNAC)" },
  },
  GP0012a: {
    id: "labrador-inuit",
    name: "Labrador Inuit Land Claims Agreement",
    parties: "The Labrador Inuit, Newfoundland and Labrador, and Canada",
    link: { href: FINAL_AGREEMENTS.nl!, label: "Final agreements in Newfoundland and Labrador (CIRNAC)" },
  },
  GP0023a: {
    id: "nunavik-inuit",
    name: "Nunavik Inuit Land Claims Agreement",
    yearNote: "signed 2006",
    parties: "The Inuit of Nunavik and Canada",
    link: { href: FINAL_AGREEMENTS.nu!, label: "Final agreements in Nunavut (CIRNAC)" },
  },
  NU05: {
    id: "eeyou-marine",
    name: "Eeyou Marine Region Land Claims Agreement",
    yearNote: "signed 2010",
    parties: "The Cree of Eeyou Istchee and Canada",
    link: { href: FINAL_AGREEMENTS.nu!, label: "Final agreements in Nunavut (CIRNAC)" },
  },
  BC52: {
    id: "tsawwassen",
    name: "Tsawwassen First Nation Final Agreement",
    yearNote: "signed 2007",
    parties: "Tsawwassen First Nation, British Columbia and Canada",
    link: { href: FINAL_AGREEMENTS.bc!, label: "Final agreements in British Columbia (CIRNAC)" },
  },
  BC30: {
    id: "maa-nulth",
    name: "Maa-nulth First Nations Final Agreement",
    yearNote: "signed 2008",
    parties: "Five Maa-nulth First Nations of western Vancouver Island, British Columbia and Canada",
    link: { href: FINAL_AGREEMENTS.bc!, label: "Final agreements in British Columbia (CIRNAC)" },
  },
  SA0002c: {
    id: "tlaamin",
    name: "Tla'amin Nation Final Agreement",
    yearNote: "signed 2014",
    parties: "Tla'amin Nation, British Columbia and Canada",
    link: { href: FINAL_AGREEMENTS.bc!, label: "Final agreements in British Columbia (CIRNAC)" },
  },
  SG1601a: {
    id: "deline",
    name: "Délı̨nę Final Self-Government Agreement",
    year: 2016,
    yearNote: "signed 2015",
    parties: "The Délı̨nę First Nation and Délı̨nę Land Corporation, the Northwest Territories and Canada",
    link: { href: FINAL_AGREEMENTS.nt!, label: "Final agreements in the Northwest Territories (CIRNAC)" },
  },
  SG2301a: {
    id: "whitecap-dakota",
    name: "Whitecap Dakota Nation self-government treaty",
    year: 2023,
    parties: "Whitecap Dakota Nation and Canada",
    link: { href: FINAL_AGREEMENTS.sk!, label: "Final agreements in Saskatchewan (CIRNAC)" },
  },
};

/** The Yukon First Nations final agreements all share one shape of annotation. */
const YUKON: Record<string, string> = {
  YT01: "Carcross/Tagish First Nation",
  YT02: "Champagne and Aishihik First Nations",
  YT04: "Kluane First Nation",
  YT05: "Kwanlin Dün First Nation",
  YT06: "Little Salmon/Carmacks First Nation",
  YT08: "Selkirk First Nation",
  YT09: "Ta'an Kwäch'än Council",
  YT10: "Teslin Tlingit Council",
  YT12: "Tr'ondëk Hwëch'in",
  YT14: "Vuntut Gwitchin First Nation",
  GP0029a: "First Nation of Na-Cho Nyäk Dun",
};
/** Signing years (CIRNAC's modern treaty list) where the dataset's year is a later one. */
const YUKON_SIGNED: Record<string, string> = { YT01: "signed 2005", YT02: "signed 1993", YT10: "signed 1993", GP0029a: "signed 1993" };
for (const [tag, nation] of Object.entries(YUKON)) {
  ANNOTATIONS[tag] = {
    id: `yukon-${tag.toLowerCase()}`,
    name: `${nation} Final Agreement`,
    ...(YUKON_SIGNED[tag] ? { yearNote: YUKON_SIGNED[tag] } : {}),
    parties: `${nation}, Yukon and Canada`,
    link: { href: FINAL_AGREEMENTS.yt!, label: "Final agreements in Yukon (CIRNAC)" },
  };
}

// ---------------------------------------------------------------------------

async function get(url: string, tries = 3): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120_000) }).catch((e: Error) => e);
    if (res instanceof Response && res.ok) return res;
    const why = res instanceof Response ? `${res.status} ${res.statusText}` : res.message;
    if (attempt >= tries) throw new Error(`${why} for ${url}`);
    console.warn(`  ${why} for ${url}, retrying`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}
const kb = async (path: string) => `${((await stat(path)).size / 1024).toFixed(1)} KB`;
const writeJson = (path: string, data: unknown) => writeFile(path, JSON.stringify(data, null, 2) + "\n");
function ms(cmd: string): Promise<void> {
  return new Promise((ok, fail) => mapshaper.runCommands(cmd, (err) => (err ? fail(err) : ok())));
}

const cache = process.env.GEO_CACHE;
const tmp = cache ? resolve(cache) : await mkdtemp(join(tmpdir(), "tne-treaties-"));
await mkdir(tmp, { recursive: true });
const exists = async (p: string) => (await stat(p).catch(() => null)) !== null;

try {
  type Attr = { OBJECTID: number; TAG_ID: string; ENAME: string; SUBTYPE_ENAME: string };
  const features: { type: "Feature"; properties: Record<string, unknown>; geometry: unknown }[] = [];
  const seenTags = new Set<string>();

  for (const era of Object.keys(LAYERS) as Era[]) {
    const layer = LAYERS[era];
    console.log(`${era === "historic" ? "Historic" : "Modern"} treaties: ${layer.url}`);
    const raw = join(tmp, `${era}.json`);
    let list: { attributes: Attr }[];
    let geoms: Record<number, unknown> = {};
    if (cache && (await exists(raw))) {
      ({ list, geoms } = JSON.parse(await readFile(raw, "utf8")));
    } else {
      const q = new URLSearchParams({ where: "1=1", outFields: "OBJECTID,TAG_ID,ENAME,SUBTYPE_ENAME", returnGeometry: "false", f: "json" });
      list = ((await (await get(`${layer.url}/query?${q}`)).json()) as { features: { attributes: Attr }[] }).features;
      for (const { attributes: a } of list) {
        const gq = new URLSearchParams({
          objectIds: String(a.OBJECTID),
          outFields: "OBJECTID",
          outSR: "3347",
          maxAllowableOffset: "250",
          f: "geojson",
        });
        const json = (await (await get(`${layer.url}/query?${gq}`)).json()) as { features?: { geometry: unknown }[] };
        const g = json.features?.[0]?.geometry;
        if (!g) throw new Error(`No geometry for ${a.TAG_ID} (${a.ENAME})`);
        geoms[a.OBJECTID] = g;
        console.log(`  ${a.TAG_ID.padEnd(8)} ${a.ENAME}`);
      }
      await writeFile(raw, JSON.stringify({ list, geoms }));
    }
    if (list.length < (era === "historic" ? 15 : 25)) throw new Error(`Only ${list.length} ${era} treaties: has the service changed?`);

    for (const { attributes: a } of list) {
      const note = ANNOTATIONS[a.TAG_ID];
      if (!note) throw new Error(`No annotation for ${a.TAG_ID} "${a.ENAME}". Add one to ANNOTATIONS.`);
      seenTags.add(a.TAG_ID);
      const years = [...a.ENAME.matchAll(/\b(1[6-9]\d\d|20\d\d)\b/g)].map((m) => Number(m[1]));
      const year = note.year ?? years[0];
      if (!year) throw new Error(`No year for ${a.TAG_ID} "${a.ENAME}"`);
      // The years as the dataset labels them ("1764-1862"), unless the annotation overrides.
      const label = note.year ? String(note.year) : (a.ENAME.match(/\((\d{4}(?:-\d{4})?)\)/)?.[1] ?? String(year)).replace("-", "–");
      features.push({
        type: "Feature",
        properties: {
          id: note.id,
          name: note.name,
          era,
          kind: a.SUBTYPE_ENAME.replace(/\s+/g, " ").trim(),
          year,
          years: label,
          yearNote: note.yearNote ?? "",
          parties: note.parties,
          href: note.link.href,
          linkLabel: note.link.label,
          noSurrender: note.noSurrender ? 1 : 0,
          source: a.ENAME.replace(/\s+/g, " ").trim(),
        },
        geometry: geoms[a.OBJECTID],
      });
    }
  }
  const unused = Object.keys(ANNOTATIONS).filter((t) => !seenTags.has(t));
  if (unused.length) throw new Error(`Annotations match no feature: ${unused.join(", ")}`);

  // Mapshaper's polygon tools build one planar topology per layer, which
  // hands overlapping areas to just one feature, and treaties overlap (modern
  // treaties sit inside historic ones). So each treaty is processed on its own.
  const land3347 = join(tmp, "land-3347.json");
  // The province map's own land outline (already simplified), so treaty
  // coastlines line up with the provinces drawn on top.
  await ms(`-i "${resolve(OUT, "provinces.topo.json")}" name=land -dissolve2 -proj EPSG:3347 -o "${land3347}" format=geojson`);

  const fields = "id,name,era,kind,year,years,yearNote,parties,href,linkLabel,noSurrender";
  const ringArea = (ring: number[][]) =>
    Math.abs(
      ring.reduce((a, p, i) => {
        const q = ring[(i + 1) % ring.length]!;
        return a + p[0]! * q[1]! - q[0]! * p[1]!;
      }, 0) / 2,
    );
  type Geom = { type: string; coordinates: unknown };
  const polys = (g: Geom) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];
  type Out = { type: "Feature"; properties: Record<string, unknown>; geometry: Geom | null };
  const order = [...new Set(features.map((f) => f.properties.id as string))];
  const done: Out[] = [];
  for (const id of order) {
    const parts = features.filter((f) => f.properties.id === id);
    const src = join(tmp, `t-${id}.json`);
    const dst = join(tmp, `t-${id}.out.json`);
    await writeFile(src, JSON.stringify({ type: "FeatureCollection", features: parts }));
    // Islands under 20 km² vanish at this scale, but a treaty that is small
    // overall (a few reserves or a community) keeps its pieces and its detail.
    const area = Math.max(...parts.flatMap((f) => polys(f.geometry as Geom).map((p) => ringArea(p[0]!))));
    const small = area < 2e8;
    const minArea = small ? "0.01km2" : "20km2";
    await ms(
      [
        `-i "${land3347}" name=land`,
        `-i "${src}" name=t`,
        `-proj init=EPSG:3347 target=land,t`,
        // A treaty drawn as two areas (Inuvialuit, Tłı̨chǫ) becomes one shape.
        `-dissolve2 copy-fields=${fields} target=t`,
        `-simplify weighted interval=${small ? 200 : 3000} keep-shapes target=t`,
        `-clip land remove-slivers target=t`,
        `-filter-islands min-area=${minArea} target=t`,
        `-filter-slivers min-area=${minArea} sliver-control=0 target=t`,
        `-filter-fields ${fields} target=t`,
        `-o "${dst}" format=geojson target=t`,
      ].join(" "),
    );
    const fc = JSON.parse(await readFile(dst, "utf8")) as { features: Out[] };
    done.push(fc.features[0] ?? { type: "Feature", properties: parts[0]!.properties, geometry: null });
  }
  const eraRank = (f: Out) => (f.properties.era === "historic" ? 0 : 1);
  done.sort((a, b) => eraRank(a) - eraRank(b) || (a.properties.year as number) - (b.properties.year as number));
  const clean = join(tmp, "treaties-3347-clean.json");
  const treatiesWgs = join(tmp, "treaties.json");
  const outsideWgs = join(tmp, "outside.json");
  await writeFile(clean, JSON.stringify({ type: "FeatureCollection", features: done.filter((f) => f.geometry) }));
  // Land with no historic treaty: the land outline minus the union of every historic area.
  await ms(
    [
      `-i "${land3347}" name=land`,
      `-i "${clean}" name=historic`,
      `-proj init=EPSG:3347 target=land,historic`,
      `-filter "era === 'historic'" target=historic`,
      `-dissolve2 target=historic`,
      `-erase historic target=land`,
      `-filter-islands min-area=150km2 remove-empty target=land`,
      `-filter-slivers min-area=150km2 sliver-control=0 target=land`,
      `-each "id = 'outside'" target=land`,
      `-filter-fields id target=land`,
      `-proj wgs84 target=land`,
      `-o "${outsideWgs}" format=geojson target=land`,
    ].join(" "),
  );
  await ms(`-i "${clean}" -proj init=EPSG:3347 -proj wgs84 -o "${treatiesWgs}" format=geojson`);
  const out = join(OUT, "treaties.topo.json");
  await ms(`-i "${treatiesWgs}" "${outsideWgs}" combine-files -o "${out}" target=* format=topojson quantization=10000 id-field=id`);
  const topo = JSON.parse(await readFile(out, "utf8"));
  const geoms = topo.objects.treaties.geometries as { type: string | null; id: string; properties: { era: string; name: string } }[];
  const ids = new Set(Object.values(ANNOTATIONS).map((a) => a.id));
  const missing = [...ids].filter((id) => !geoms.some((g) => g.id === id && g.type));
  // A marine-only treaty can lose its area to the land clip; say so rather than fail.
  if (missing.length) console.warn(`  ! No land area after clipping: ${missing.join(", ")}`);
  if (missing.some((id) => id !== "eeyou-marine")) throw new Error(`Lost the geometry of ${missing.join(", ")}`);
  const historic = geoms.filter((g) => g.properties.era === "historic").length;
  const modern = geoms.filter((g) => g.properties.era === "modern").length;
  if (historic !== 17) throw new Error(`Expected 17 historic treaty areas, got ${historic}`);
  if (modern < 25) throw new Error(`Expected at least 25 modern treaty areas, got ${modern}`);
  if (!topo.objects.outside?.geometries?.[0]?.type) throw new Error("The 'outside' layer is empty");

  await writeJson(join(OUT, "treaties.topo.meta.json"), {
    source: "Crown–Indigenous Relations and Northern Affairs Canada, Historic treaties and Modern treaties datasets",
    url: LAYERS.historic.url,
    urls: [LAYERS.historic.url, LAYERS.modern.url],
    datasets: [LAYERS.historic.dataset, LAYERS.modern.dataset],
    licence: LICENCE,
    licenceUrl: LICENCE_URL,
    fetched: today,
    notes: [
      "Read per feature from the ArcGIS REST distributions with a 250 m generalization in Statistics Canada Lambert (EPSG:3347), merged where one treaty is drawn as two areas, simplified with mapshaper (weighted Visvalingam, 3 km interval, keep-shapes), clipped to the province map's land outline, islands and slivers under 20 km² dropped, reprojected to WGS84, quantized to 1e4.",
      "outside: land not inside any historic (pre-1975) treaty area, computed here. It is not an official CIRNAC layer, and parts of it are covered by modern treaties.",
      "Names, parties and links come from the ANNOTATIONS table in scripts/data/treaties.ts, written from CIRNAC's treaty pages. Years are from the dataset's names unless the table overrides them; for several modern treaties that is the year the agreement took effect rather than the year it was signed.",
      `Treaty areas with no land left after clipping: ${missing.join(", ") || "none"}.`,
    ],
    script: "scripts/data/treaties.ts",
    objects: { treaties: "one feature per treaty", outside: "land outside every historic treaty area" },
    properties: {
      id: "stable id",
      name: "display name",
      era: "historic (pre-1975) or modern (comprehensive land claim agreement)",
      kind: "the dataset's subtype",
      year: "year used for ordering",
      years: "years as displayed (e.g. 1764–1862)",
      yearNote: "extra note on the year, or empty",
      parties: "who made the treaty",
      href: "link to the treaty text or a CIRNAC page",
      linkLabel: "text for that link",
      noSurrender: "1 for treaties that did not surrender land (Peace and Friendship)",
    },
  });
  console.log(`  → treaties.topo.json ${await kb(out)} (${historic} historic, ${modern} modern)`);
} finally {
  if (!cache) await rm(tmp, { recursive: true, force: true });
}
