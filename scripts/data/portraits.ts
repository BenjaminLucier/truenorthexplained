/**
 * `pnpm data:portraits`: photographs of the people the site lists.
 *
 *   public/portraits/<qid>-96.webp, <qid>-240.webp   square portraits
 *   src/data/portraits.json                           licence and author per file, keyed by QID,
 *                                                     plus the MP and Supreme Court lookups
 *
 * Who: prime ministers, monarchs, governors general, chief justices and
 * premiers (QIDs from src/data/wikidata/*.json), the current Supreme Court
 * bench, and every MP elected in 2025 or sitting now. MPs aren't in the
 * Wikidata datasets, so they're matched to Wikidata by name and riding on
 * "position held: Member of the House of Commons of Canada" (P39 = Q15964890)
 * statements for the 45th Parliament (P2937 = Q134270611). Anyone unmatched is
 * logged and listed in `unmatched`.
 *
 * Images: each person's Wikidata image (P18), a Wikimedia Commons file. Only
 * files under a free licence are used (the licence comes from the Commons API
 * `extmetadata`); anything else is skipped and logged. A Commons thumbnail is
 * square-cropped with sharp: top-weighted for portrait-shaped photos (faces
 * sit in the upper third), saliency-based ("attention") for landscape ones.
 *
 * Re-runs are idempotent: a file is only downloaded again when its Commons
 * SHA-1 or the processing settings change, outputs are written only when
 * their bytes change, and portraits no longer needed are removed.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { USER_AGENT, mapLimit, mediawiki } from "../grounding/http.ts";
import { DATA, ROOT, pruneDir, readJson, writeDataset, writeIfChanged } from "../grounding/util.ts";
import { sparql } from "../grounding/wikidata.ts";
import { plain } from "../grounding/flags.ts";

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const OUT_DIR = resolve(ROOT, "public/portraits");
const OUT_JSON = resolve(DATA, "portraits.json");
const SIZES = [96, 240] as const;
/** Change this whenever the crop or encoding changes, so every portrait is rebuilt. */
const PROCESSING = "v1: square crop (top-weighted portrait / attention landscape), WebP q72";
/** Wikimedia's standard thumbnail widths, so requests hit cached sizes. */
const THUMB_STEPS = [500, 960, 1280];
/** The shorter side of the source thumbnail must be at least this, for the 240px output to stay sharp. */
const MIN_SIDE = 300;

const MP_POSITION = "Q15964890";
const PARLIAMENT_45 = "Q134270611";
const ELECTION_DATE = "2025-04-28";

type Role = "prime-minister" | "monarch" | "governor-general" | "chief-justice" | "premier" | "supreme-court" | "mp";

interface Person {
  qid: string;
  name: string;
  roles: Set<Role>;
  image?: string;
}

interface PortraitEntry {
  name: string;
  roles: Role[];
  file: string;
  page: string;
  licence: string;
  licenceUrl: string | null;
  author: string | null;
  attribution: string;
  sha1: string;
  fetched: string;
}

interface Judge {
  qid: string;
  name: string;
  role: "chief" | "puisne";
  /** Start of the current position. */
  since: string;
  /** First appointment to the Court (differs from `since` for a chief justice promoted from within). */
  joined: string;
  born: number | null;
  wikipedia: string | null;
}

interface Dataset {
  portraits: Record<string, PortraitEntry>;
  supremeCourt: Judge[];
  members: Record<string, string>;
  elected2025: Record<string, string>;
  unmatched: string[];
  skipped: { qid: string; name: string; file: string; reason: string }[];
}

const today = () => new Date().toISOString().slice(0, 10);
const day = (iso?: string) => (iso ? iso.slice(0, 10) : null);
const qidNum = (q: string) => Number(q.slice(1));
const fileFromUrl = (u: string) => decodeURIComponent(u.replace(/^.*Special:FilePath\//, ""));
const values = (qids: Iterable<string>) => [...qids].map((q) => `wd:${q}`).join(" ");

/** Folds a name or riding for comparison: no accents, case, punctuation or dash differences. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(the )?(right )?hon(ourable)?\.?\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const tokens = (s: string) => fold(s).split(" ").filter((t) => t.length > 1);
const cleanName = (name: string) => name.replace(/^(Right )?Hon\.\s+/, "");

// ---------------------------------------------------------------------------
// Licences
// ---------------------------------------------------------------------------

const NOT_FREE = /\b(nc|nd)\b|non-?free|fair use|all rights reserved/i;
const FREE =
  /^(cc0|cc[ -]by|cc[ -]by[ -]sa|public domain|pd\b|pd-|pdm\b|pdm-|gfdl|fal\b|free art|ogl|open government licen[cs]e|attribution|copyrighted free use|no restrictions|kopimi)/i;

function licenceProblem(meta: Record<string, { value: string } | undefined>, licence: string): string | null {
  if (meta.NonFree?.value === "true") return "marked non-free on Commons";
  if (NOT_FREE.test(licence)) return `licence "${licence}" isn't free`;
  if (!FREE.test(licence)) return `licence "${licence}" isn't on the free-licence allowlist`;
  return null;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

interface Holder {
  qid: string;
  name: string;
}

async function knownPeople(people: Map<string, Person>) {
  const add = (qid: string, name: string, role: Role) => {
    const p = people.get(qid) ?? { qid, name, roles: new Set<Role>() };
    p.roles.add(role);
    people.set(qid, p);
  };
  const load = async <T>(file: string) => {
    const data = await readJson<T>(resolve(DATA, file));
    if (!data) throw new Error(`Missing ${file}; run pnpm grounding first`);
    return data;
  };
  for (const h of (await load<{ primeMinisters: Holder[] }>("wikidata/prime-ministers.json")).primeMinisters) add(h.qid, h.name, "prime-minister");
  for (const h of (await load<{ monarchs: Holder[] }>("wikidata/monarchs.json")).monarchs) add(h.qid, h.name, "monarch");
  for (const h of (await load<{ governorsGeneral: Holder[] }>("wikidata/governors-general.json")).governorsGeneral) add(h.qid, h.name, "governor-general");
  for (const h of (await load<{ chiefJustices: Holder[] }>("wikidata/chief-justices.json")).chiefJustices) add(h.qid, h.name, "chief-justice");
  for (const p of (await load<{ provinces: { premier: Holder | null }[] }>("wikidata/provinces.json")).provinces) {
    if (p.premier) add(p.premier.qid, p.premier.name, "premier");
  }
  return add;
}

/**
 * Corrections for when Wikidata lags behind the Court. Checked against the
 * Court's list of current and former judges
 * (https://scc-csc.ca/about-apropos/judges-juges/list-liste/, 2026-11-13).
 * Each entry stops applying once Wikidata catches up: `ended` only removes a
 * judge Wikidata still shows as sitting, and `added` only adds one it lacks.
 */
const SCC_OVERRIDES: { ended: Record<string, string>; added: Judge[] } = {
  // Sheilah Martin left the Court on May 30, 2026.
  ended: { Q44080964: "2026-05-30" },
  added: [
    {
      // Judge since July 15, 2026; birth date not published by the Court.
      qid: "Q5568908",
      name: "Glenn Joyal",
      role: "puisne",
      since: "2026-07-15",
      joined: "2026-07-15",
      born: null,
      wikipedia: "https://en.wikipedia.org/wiki/Glenn_Joyal",
    },
  ],
};

/** The current Supreme Court: living holders of "justice of the Supreme Court of Canada" or "Chief Justice of Canada" with no end date. */
async function supremeCourt(): Promise<Judge[]> {
  const rows = await sparql(`
    SELECT ?p ?pLabel ?pos ?start ?end ?born ?article WHERE {
      VALUES ?pos { wd:Q843020 wd:Q1339242 }
      ?p p:P39 ?st. ?st ps:P39 ?pos.
      FILTER NOT EXISTS { ?st wikibase:rank wikibase:DeprecatedRank }
      OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
      OPTIONAL { ?p wdt:P569 ?born }
      FILTER NOT EXISTS { ?p wdt:P570 ?died }
      OPTIONAL { ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/> }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,mul". }
    }`);
  const byPerson = new Map<string, typeof rows>();
  for (const r of rows) byPerson.set(r.p!, [...(byPerson.get(r.p!) ?? []), r]);
  let judges: Judge[] = [];
  for (const [qid, rs] of byPerson) {
    const open = rs.filter((r) => !r.end && r.start);
    if (!open.length) continue;
    const chief = open.find((r) => r.pos === "Q1339242");
    const current = chief ?? open.sort((a, b) => (a.start! < b.start! ? -1 : 1))[0]!;
    const joined = rs.map((r) => day(r.start)).filter((d): d is string => !!d).sort()[0]!;
    const article = rs.find((r) => r.article)?.article;
    judges.push({
      qid,
      name: article ? decodeURIComponent(article.replace(/^.*\/wiki\//, "")).replace(/_/g, " ").replace(/ \([^)]*\)$/, "") : rs[0]!.pLabel!,
      role: chief ? "chief" : "puisne",
      since: day(current.start)!,
      joined,
      born: rs[0]!.born ? Number(rs[0]!.born.slice(0, 4)) : null,
      wikipedia: article ?? null,
    });
  }
  judges = judges.filter((j) => !(j.qid in SCC_OVERRIDES.ended));
  for (const j of SCC_OVERRIDES.added) if (!judges.some((k) => k.qid === j.qid)) judges.push(j);
  judges.sort((a, b) => (a.role !== b.role ? (a.role === "chief" ? -1 : 1) : a.joined < b.joined ? -1 : a.joined > b.joined ? 1 : qidNum(a.qid) - qidNum(b.qid)));
  const chiefs = judges.filter((j) => j.role === "chief");
  if (judges.length !== 9 || chiefs.length !== 1)
    throw new Error(
      `Sanity check failed: expected 9 Supreme Court judges with one chief justice, got ${judges.length} (${judges.map((j) => j.name).join(", ")}). Fix Wikidata (end dates) or add an override.`,
    );
  return judges;
}

// ---------------------------------------------------------------------------
// MPs: match House of Commons and Elections Canada names to Wikidata
// ---------------------------------------------------------------------------

interface MpRow {
  qid: string;
  label: string;
  names: string[];
  districts: Set<string>;
  image?: string;
}

async function wikidataMps(): Promise<MpRow[]> {
  const rows = await sparql(`
    SELECT ?p ?pLabel ?districtLabel ?img WHERE {
      ?p p:P39 ?st. ?st ps:P39 wd:${MP_POSITION}.
      FILTER NOT EXISTS { ?st wikibase:rank wikibase:DeprecatedRank }
      { ?st pq:P2937 wd:${PARLIAMENT_45} } UNION { ?st pq:P580 ?start. FILTER(?start >= "${ELECTION_DATE}T00:00:00Z"^^xsd:dateTime) }
      OPTIONAL { ?st pq:P768 ?district }
      OPTIONAL { ?p wdt:P18 ?img }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-ca,fr,mul". }
    }`);
  const byQid = new Map<string, MpRow>();
  for (const r of rows) {
    const m = byQid.get(r.p!) ?? { qid: r.p!, label: r.pLabel!, names: [r.pLabel!], districts: new Set<string>() };
    if (r.districtLabel) m.districts.add(fold(r.districtLabel));
    if (r.img && (!m.image || fileFromUrl(r.img) < m.image)) m.image = fileFromUrl(r.img);
    byQid.set(r.p!, m);
  }
  // Alternative names ("Bob" for "Robert") help with matching.
  const qids = [...byQid.keys()];
  for (let i = 0; i < qids.length; i += 200) {
    const alts = await sparql(`
      SELECT ?p ?alt WHERE {
        VALUES ?p { ${values(qids.slice(i, i + 200))} }
        { ?p skos:altLabel ?alt } UNION { ?p rdfs:label ?alt }
        FILTER(LANG(?alt) IN ("en", "fr", "mul"))
      }`);
    for (const a of alts) byQid.get(a.p!)?.names.push(a.alt!);
  }
  return [...byQid.values()].sort((a, b) => qidNum(a.qid) - qidNum(b.qid));
}

interface Seat {
  fed: number;
  name: string;
  districts: string[];
}

/** Name plus riding first; then a unique full-name match anywhere, for ridings Wikidata names differently. */
function matchSeat(seat: Seat, mps: MpRow[]): { qid: string; how: string } | null {
  const want = tokens(seat.name);
  const first = want[0] ?? "";
  const last = want.at(-1) ?? "";
  const districts = new Set(seat.districts.map(fold));
  const inDistrict = mps.filter((m) => [...m.districts].some((d) => districts.has(d)));
  const surname = (m: MpRow) => m.names.some((n) => tokens(n).includes(last) || want.includes(tokens(n).at(-1) ?? "\0"));
  const firstName = (m: MpRow) => m.names.some((n) => tokens(n)[0] === first);
  const bySurname = inDistrict.filter(surname);
  if (bySurname.length === 1) return { qid: bySurname[0]!.qid, how: "name and riding" };
  if (bySurname.length > 1) {
    const both = bySurname.filter(firstName);
    if (both.length === 1) return { qid: both[0]!.qid, how: "name and riding" };
  }
  const exact = mps.filter((m) => m.names.some((n) => fold(n) === fold(seat.name)));
  if (exact.length === 1) return { qid: exact[0]!.qid, how: "name only (riding named differently on Wikidata)" };
  const firstLast = mps.filter((m) => m.names.some((n) => tokens(n)[0] === first && tokens(n).at(-1) === last));
  if (firstLast.length === 1) return { qid: firstLast[0]!.qid, how: "first and last name only" };
  return null;
}

async function matchMps(add: (qid: string, name: string, role: Role) => void, people: Map<string, Person>) {
  const commons = await readJson<{
    members: { fed: number; name: string; constituency: string; constituencyFr: string }[];
  }>(resolve(DATA, "parliament/commons.json"));
  const ridings = await readJson<{
    ridings: { fed: number; nameEn: string; nameFr: string; currentName?: { en: string; fr: string }; candidates: { name: string; elected: boolean }[] }[];
  }>(resolve(DATA, "elections/2025/ridings.json"));
  if (!commons || !ridings) throw new Error("Missing election data; run pnpm data:elections first");
  const ridingNames = new Map(
    ridings.ridings.map((r) => [r.fed, [r.nameEn, r.nameFr, r.currentName?.en, r.currentName?.fr].filter((x): x is string => !!x)]),
  );

  const mps = await wikidataMps();
  console.log(`  ${mps.length} people hold a 45th Parliament seat on Wikidata`);
  const members: Record<string, string> = {};
  const elected2025: Record<string, string> = {};
  const unmatched: string[] = [];
  const notes: string[] = [];

  const missing: { seat: Seat; out: Record<string, string>; label: string }[] = [];
  const run = (seats: Seat[], out: Record<string, string>, label: string) => {
    for (const seat of seats) {
      const hit = matchSeat(seat, mps);
      if (!hit) {
        missing.push({ seat, out, label });
        continue;
      }
      if (hit.how !== "name and riding") notes.push(`${label}: ${seat.name} (${seat.districts[0]}) matched on ${hit.how}`);
      out[String(seat.fed)] = hit.qid;
      const mp = mps.find((m) => m.qid === hit.qid)!;
      add(hit.qid, seat.name, "mp");
      const p = people.get(hit.qid)!;
      if (mp.image && !p.image) p.image = mp.image;
    }
  };
  run(
    commons.members.map((m) => ({
      fed: m.fed,
      name: cleanName(m.name),
      districts: [m.constituency, m.constituencyFr, ...(ridingNames.get(m.fed) ?? [])],
    })),
    members,
    "current MP",
  );
  run(
    ridings.ridings.flatMap((r) => {
      const w = r.candidates.find((c) => c.elected);
      return w ? [{ fed: r.fed, name: w.name, districts: ridingNames.get(r.fed)! }] : [];
    }),
    elected2025,
    "2025 winner",
  );
  // Fallback for new members whose Wikidata seat statement is missing or
  // incomplete: a unique Canadian politician (or any MP) with exactly that name.
  if (missing.length) {
    const names = [...new Set(missing.map((m) => m.seat.name))];
    const rows = await sparql(`
      SELECT DISTINCT ?p ?name ?img WHERE {
        VALUES ?name { ${names.map((n) => JSON.stringify(n) + "@en").join(" ")} }
        ?p rdfs:label ?name; wdt:P31 wd:Q5.
        { ?p wdt:P39 wd:${MP_POSITION} } UNION { ?p wdt:P106 wd:Q82955; wdt:P27 wd:Q16 }
        OPTIONAL { ?p wdt:P18 ?img }
      }`);
    for (const { seat, out, label } of missing) {
      const hits = [...new Set(rows.filter((r) => r.name === seat.name).map((r) => r.p!))];
      if (hits.length !== 1) {
        unmatched.push(`${label}: ${seat.name} (${seat.districts[0]}, ${seat.fed})`);
        continue;
      }
      const qid = hits[0]!;
      notes.push(`${label}: ${seat.name} (${seat.districts[0]}) matched on name only (no 45th Parliament seat on Wikidata)`);
      out[String(seat.fed)] = qid;
      add(qid, seat.name, "mp");
      const img = rows.find((r) => r.p === qid && r.img)?.img;
      const p = people.get(qid)!;
      if (img && !p.image) p.image = fileFromUrl(img);
    }
  }
  for (const n of notes) console.log(`  note: ${n}`);
  for (const u of unmatched) console.log(`  unmatched: ${u}`);
  console.log(`  matched ${Object.keys(members).length}/${commons.members.length} current MPs and ${Object.keys(elected2025).length}/${ridings.ridings.length} 2025 winners`);
  const sortFed = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => Number(a) - Number(b)));
  return { members: sortFed(members), elected2025: sortFed(elected2025), unmatched };
}

// ---------------------------------------------------------------------------
// Commons
// ---------------------------------------------------------------------------

interface ImageInfo {
  url: string;
  descriptionurl: string;
  sha1: string;
  width: number;
  height: number;
  mime: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  extmetadata?: Record<string, { value: string } | undefined>;
}
interface ImageInfoResponse {
  query: {
    normalized?: { from: string; to: string }[];
    pages: { title: string; missing?: boolean; imageinfo?: ImageInfo[] }[];
  };
}

async function imageInfo(files: string[], width: number): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const res = await mediawiki<ImageInfoResponse>(COMMONS, {
      action: "query",
      titles: batch.map((f) => `File:${f}`).join("|"),
      prop: "imageinfo",
      iiprop: "url|sha1|size|mime|extmetadata",
      iiurlwidth: String(width),
      iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Attribution|AttributionRequired|NonFree",
    });
    const to = new Map((res.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of res.query.pages) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const requested = (to.get(page.title) ?? page.title).replace(/^File:/, "");
      out.set(requested, ii);
    }
  }
  return out;
}

/**
 * Image downloads go one at a time with a pause between them. Commons
 * answers HTTP 429 for a thumbnail it won't render right now (often a large
 * original), so each file has fallbacks: the thumbnail at other standard
 * widths, then the original when it's small enough to fetch.
 */
const DOWNLOAD_GAP_MS = 1000;
let gate: Promise<void> = Promise.resolve();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function candidates(ii: ImageInfo): string[] {
  const urls: string[] = [];
  const original = ii.url.replace(/\?.*$/, "");
  const thumb = ii.thumburl?.replace(/\?.*$/, "");
  if (thumb && thumb !== original) urls.push(thumb);
  // Originals are rate-limited much harder than thumbnails, so a small
  // original is fetched as a thumbnail just under its own width.
  const name = original.split("/").at(-1)!;
  const base = original.replace("/commons/", "/commons/thumb/");
  for (const w of [...THUMB_STEPS, 330, 250]) {
    if (w >= ii.width) continue;
    const ext = /\.(tiff?|svg)$/i.test(name) ? ".png" : "";
    const alt = `${base}/${w}px-${name}${ext}`;
    if (!urls.includes(alt)) urls.push(alt);
  }
  const raster = /^image\/(jpeg|png|webp|gif)$/.test(ii.mime);
  if (raster && ii.width * ii.height <= 12_000_000) urls.push(original);
  return urls;
}

async function download(urls: string[]): Promise<Buffer> {
  const turn = gate;
  let release!: () => void;
  gate = new Promise<void>((r) => (release = r));
  await turn;
  const errors: string[] = [];
  try {
    for (const url of urls) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(60_000) }).catch(
          (e: Error) => ({ ok: false, status: 0, statusText: e.message }) as const,
        );
        if (res.ok && "arrayBuffer" in res) return Buffer.from(await res.arrayBuffer());
        errors.push(`${res.status || res.statusText} for ${url}`);
        if (res.status !== 429 && res.status < 500) break;
        await sleep(5000);
      }
    }
    throw new Error(errors.join("; "));
  } finally {
    await sleep(DOWNLOAD_GAP_MS);
    release();
  }
}

/** Square crop: top-weighted for portrait-shaped images, saliency ("attention") for landscape ones. */
async function squareCrop(input: Buffer): Promise<Buffer> {
  const oriented = await sharp(input).rotate().flatten({ background: "#ffffff" }).toBuffer({ resolveWithObject: true });
  const { width, height } = oriented.info;
  if (height >= width) {
    const side = width;
    const top = Math.max(0, Math.min(height - side, Math.round(height * 0.38 - side / 2)));
    return sharp(oriented.data).extract({ left: 0, top, width: side, height: side }).toBuffer();
  }
  return sharp(oriented.data).resize(height, height, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
}

const webp = (square: Buffer, size: number) =>
  sharp(square).resize(size, size, { kernel: "lanczos3" }).webp({ quality: 72, effort: 6, smartSubsample: true }).toBuffer();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const previous = await readJson<{ _meta?: { processing?: string } } & Partial<Dataset>>(OUT_JSON);
  const sameProcessing = previous?._meta?.processing === PROCESSING;
  const people = new Map<string, Person>();

  console.log("Portraits: collecting people…");
  const add = await knownPeople(people);
  const judges = await supremeCourt();
  for (const j of judges) add(j.qid, j.name, "supreme-court");
  console.log(`  ${judges.length} Supreme Court judges`);
  const { members, elected2025, unmatched } = await matchMps(add, people);

  // P18 for everyone not already filled in by the MP query.
  const need = [...people.values()].filter((p) => !p.image).map((p) => p.qid);
  for (let i = 0; i < need.length; i += 200) {
    const rows = await sparql(`SELECT ?p ?img WHERE { VALUES ?p { ${values(need.slice(i, i + 200))} } ?p wdt:P18 ?img }`);
    for (const r of rows) {
      const p = people.get(r.p!)!;
      const file = fileFromUrl(r.img!);
      if (!p.image || file < p.image) p.image = file;
    }
  }
  const withImage = [...people.values()].filter((p) => p.image).sort((a, b) => qidNum(a.qid) - qidNum(b.qid));
  console.log(`  ${people.size} people, ${withImage.length} with a Wikidata image`);

  console.log("Portraits: reading Commons metadata…");
  const files = [...new Set(withImage.map((p) => p.image!))];
  const info = await imageInfo(files, THUMB_STEPS[0]!);
  // Landscape files need a wider thumbnail for the square to keep MIN_SIDE pixels.
  for (const step of THUMB_STEPS.slice(1)) {
    const small = files.filter((f) => {
      const ii = info.get(f);
      return ii && (ii.thumbheight ?? ii.height) < MIN_SIDE && ii.height >= MIN_SIDE && (ii.thumbwidth ?? 0) < step;
    });
    if (!small.length) continue;
    for (const [f, ii] of await imageInfo(small, step)) info.set(f, ii);
  }

  const portraits: Record<string, PortraitEntry> = {};
  const skipped: Dataset["skipped"] = [];
  const keep = new Set<string>();
  const failed: string[] = [];
  let downloaded = 0;

  await mapLimit(withImage, async (p) => {
    const file = p.image!;
    const ii = info.get(file);
    if (!ii) {
      skipped.push({ qid: p.qid, name: p.name, file, reason: "no Commons file info (missing or deleted)" });
      return;
    }
    const meta = ii.extmetadata ?? {};
    const licence = plain(meta.LicenseShortName?.value) ?? "Unknown";
    const problem = licenceProblem(meta, licence);
    if (problem) {
      skipped.push({ qid: p.qid, name: p.name, file, reason: problem });
      return;
    }
    const author = plain(meta.Artist?.value);
    const credit = plain(meta.Attribution?.value) ?? author;
    const prev = previous?.portraits?.[p.qid];
    const paths = SIZES.map((s) => resolve(OUT_DIR, `${p.qid}-${s}.webp`));
    const exists = paths.every((f) => existsSync(f));
    // Files with no entry yet were written by an interrupted first run; keep them.
    const fresh = exists && (prev ? sameProcessing && prev.sha1 === ii.sha1 && prev.file === file : sameProcessing || !previous);
    if (!fresh) {
      try {
        const bytes = await download(candidates(ii));
        const square = await squareCrop(bytes);
        for (const [i, size] of SIZES.entries()) await writeIfChanged(paths[i]!, await webp(square, size));
        downloaded++;
        console.log(`  ✓ public/portraits/${p.qid}-*.webp (${p.name})`);
      } catch (e) {
        if (!(prev && exists)) {
          failed.push(`${p.name} (${p.qid}), File:${file}: ${(e as Error).message}`);
          return;
        }
        failed.push(`${p.name} (${p.qid}): kept the previous portrait, update failed: ${(e as Error).message}`);
        for (const s of SIZES) keep.add(`${p.qid}-${s}`);
        portraits[p.qid] = prev;
        return;
      }
    }
    for (const s of SIZES) keep.add(`${p.qid}-${s}`);
    portraits[p.qid] = {
      name: p.name,
      roles: [...p.roles].sort(),
      file,
      page: ii.descriptionurl,
      licence,
      licenceUrl: plain(meta.LicenseUrl?.value),
      author,
      attribution: `${credit ?? "Unknown author"}, ${licence}, via Wikimedia Commons`,
      sha1: ii.sha1,
      fetched: prev && prev.sha1 === ii.sha1 ? prev.fetched : today(),
    };
  });

  for (const s of skipped) console.log(`  skipped: ${s.name} (${s.qid}), File:${s.file}: ${s.reason}`);
  const removed = await pruneDir(OUT_DIR, keep, [".webp"]);
  for (const r of removed) console.log(`  removed public/portraits/${r}`);

  const sorted = Object.fromEntries(Object.entries(portraits).sort(([a], [b]) => qidNum(a) - qidNum(b)));
  const data: Dataset = {
    portraits: sorted,
    supremeCourt: judges,
    members,
    elected2025,
    unmatched,
    skipped: skipped.sort((a, b) => qidNum(a.qid) - qidNum(b.qid)),
  };
  const changed = await writeDataset(
    OUT_JSON,
    {
      source: "Wikimedia Commons (files linked from each person's Wikidata image, P18); people and MP matches from Wikidata",
      url: "https://commons.wikimedia.org/",
      licence: "Images: per file, see each entry (free licences only). Wikidata: CC0 1.0",
      processing: PROCESSING,
      script: "scripts/data/portraits.ts",
    },
    data as unknown as Record<string, unknown>,
  );

  const { statSync } = await import("node:fs");
  const bytes = [...keep].reduce((n, k) => n + statSync(resolve(OUT_DIR, `${k}.webp`)).size, 0);
  const licences = new Map<string, number>();
  for (const e of Object.values(sorted)) licences.set(e.licence, (licences.get(e.licence) ?? 0) + 1);
  console.log(`  ${changed ? "✓" : "="} src/data/portraits.json`);
  console.log(
    `Done: ${Object.keys(sorted).length} portraits (${keep.size} files, ${(bytes / 1024 / 1024).toFixed(2)} MB), ${downloaded} downloaded this run, ${skipped.length} skipped, ${unmatched.length} unmatched.`,
  );
  console.log(`  licences: ${[...licences].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l} ${n}`).join(", ")}`);
  if (failed.length) {
    for (const f of failed) console.error(`  download failed: ${f}`);
    console.error(`${failed.length} download(s) failed (usually rate limiting). Run pnpm data:portraits again to fill them in.`);
    process.exitCode = 1;
  }
}

await main();
