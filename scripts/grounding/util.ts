/** File helpers that keep re-runs deterministic: stable JSON, write-if-changed, preserved fetch dates. */
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");
export const GROUNDING = resolve(ROOT, "grounding");
export const DATA = resolve(ROOT, "src/data");

/** Today's date as YYYY-MM-DD (UTC). */
export const today = () => new Date().toISOString().slice(0, 10);

/** Turns a page title into a file-safe slug: "Constitution Act, 1867" → "constitution-act-1867". */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** JSON with two-space indent and a trailing newline. Key order is the caller's insertion order. */
export const toJson = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

export async function readText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

export async function readJson<T>(path: string): Promise<T | undefined> {
  const text = await readText(path);
  return text === undefined ? undefined : (JSON.parse(text) as T);
}

/** Writes only when the content differs. Returns true if the file changed. */
export async function writeIfChanged(path: string, content: string | Uint8Array): Promise<boolean> {
  try {
    const old = await readFile(path);
    const next = typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
    if (old.equals(next)) return false;
  } catch {
    // New file.
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  return true;
}

export interface Meta {
  source: string;
  url: string;
  licence: string;
  fetched: string;
  [key: string]: unknown;
}

/**
 * Writes a dataset as { _meta, ...data }. `_meta.fetched` keeps its previous
 * value when nothing else in the file changed, so a re-run with no upstream
 * changes leaves the file byte-for-byte identical.
 */
export async function writeDataset(path: string, meta: Omit<Meta, "fetched">, data: Record<string, unknown>): Promise<boolean> {
  const old = await readJson<{ _meta?: Meta }>(path);
  const draft = (fetched: string) => toJson({ _meta: { ...meta, fetched }, ...data });
  const previous = old?._meta?.fetched;
  if (previous && draft(previous) === (await readText(path))) return false;
  return writeIfChanged(path, draft(today()));
}

/** Deletes files in `dir` with one of `exts` whose basename isn't in `keep`. Returns the names removed. */
export async function pruneDir(dir: string, keep: Set<string>, exts: string[]): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const removed: string[] = [];
  for (const name of names.sort()) {
    const ext = exts.find((e) => name.endsWith(e));
    if (!ext) continue;
    if (keep.has(name.slice(0, -ext.length))) continue;
    await rm(resolve(dir, name));
    removed.push(name);
  }
  return removed;
}

/** Sort helper: compare by a string key using a fixed, locale-independent order. */
export const byKey =
  <T>(key: (t: T) => string | number) =>
  (a: T, b: T) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  };

// ---------------------------------------------------------------------------
// Manifest: the only place run times are recorded.
// ---------------------------------------------------------------------------

export interface PageEntry {
  title: string;
  requested: string;
  topic: string;
  pageid: number;
  revid: number;
  /** When this revision was first downloaded. Unchanged while the revid stays the same. */
  fetched: string;
  url: string;
}

export interface FileEntry {
  file: string;
  sha1?: string;
  revid?: number;
  fetched: string;
  [key: string]: unknown;
}

export interface Manifest {
  description: string;
  runs: Record<string, string>;
  wikipedia: { pages: Record<string, PageEntry>; missing: string[] };
  wikidata: Record<string, FileEntry>;
  flags: Record<string, FileEntry>;
  statcan: Record<string, FileEntry>;
}

const MANIFEST = resolve(GROUNDING, "manifest.json");

export async function loadManifest(): Promise<Manifest> {
  const m = await readJson<Partial<Manifest>>(MANIFEST);
  return {
    description:
      "Fetch log for `pnpm grounding`. Run times live here and nowhere else, so per-page files stay diff-friendly.",
    runs: m?.runs ?? {},
    wikipedia: m?.wikipedia ?? { pages: {}, missing: [] },
    wikidata: m?.wikidata ?? {},
    flags: m?.flags ?? {},
    statcan: m?.statcan ?? {},
  };
}

function sortObject<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export async function saveManifest(m: Manifest): Promise<void> {
  await writeIfChanged(
    MANIFEST,
    toJson({
      description: m.description,
      runs: sortObject(m.runs),
      wikipedia: { pages: sortObject(m.wikipedia.pages), missing: [...m.wikipedia.missing].sort() },
      wikidata: sortObject(m.wikidata),
      flags: sortObject(m.flags),
      statcan: sortObject(m.statcan),
    }),
  );
}

/** Keeps the old `fetched` time for an entry whose content fingerprint didn't change. */
export function stamp<T extends { fetched: string }>(old: T | undefined, next: Omit<T, "fetched">, same: (o: T) => boolean): T {
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  return { ...next, fetched: old && same(old) ? old.fetched : now } as T;
}
