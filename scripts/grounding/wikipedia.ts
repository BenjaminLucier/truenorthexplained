/**
 * Wikipedia corpus: every page listed in grounding/sources.yaml, saved as raw
 * wikitext (<slug>.wiki) and a plain-text extract (<slug>.txt, one paragraph
 * per line). Pages whose revision hasn't changed since the last run are not
 * downloaded again.
 */
import { resolve } from "node:path";
import { parse } from "yaml";
import { mapLimit, mediawiki } from "./http.ts";
import { GROUNDING, pruneDir, readText, slugify, stamp, writeIfChanged, type Manifest, type PageEntry } from "./util.ts";

const API = "https://en.wikipedia.org/w/api.php";
const OUT = resolve(GROUNDING, "wikipedia");

interface Requested {
  topic: string;
  title: string;
}

async function loadSources(): Promise<Requested[]> {
  const text = await readText(resolve(GROUNDING, "sources.yaml"));
  if (!text) throw new Error("grounding/sources.yaml is missing");
  const doc = parse(text) as Record<string, string[]>;
  const out: Requested[] = [];
  for (const [topic, titles] of Object.entries(doc)) {
    for (const title of titles ?? []) out.push({ topic, title: String(title).replace(/_/g, " ").trim() });
  }
  return out;
}

interface InfoResponse {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string; tofragment?: string }[];
    pages: { title: string; pageid?: number; missing?: boolean; invalid?: boolean; lastrevid?: number }[];
  };
}

interface Resolved {
  requested: string;
  topic: string;
  title: string;
  pageid: number;
  revid: number;
}

/** Resolves titles (normalization + redirects) and reads each page's latest revid, 50 at a time. */
async function resolveTitles(reqs: Requested[]): Promise<{ found: Resolved[]; missing: string[] }> {
  const found: Resolved[] = [];
  const missing: string[] = [];
  const batches: Requested[][] = [];
  for (let i = 0; i < reqs.length; i += 50) batches.push(reqs.slice(i, i + 50));
  const results = await mapLimit(batches, (batch) =>
    mediawiki<InfoResponse>(API, {
      action: "query",
      prop: "info",
      redirects: "1",
      titles: batch.map((r) => r.title).join("|"),
    }),
  );
  results.forEach((res, b) => {
    const q = res.query!;
    const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((q.redirects ?? []).map((r) => [r.from, r.to]));
    const pages = new Map(q.pages.map((p) => [p.title, p]));
    for (const r of batches[b]!) {
      let t = norm.get(r.title) ?? r.title;
      t = redir.get(t) ?? t;
      const page = pages.get(t);
      if (!page || page.missing || page.invalid || !page.pageid || !page.lastrevid) {
        missing.push(r.title);
        continue;
      }
      found.push({ requested: r.title, topic: r.topic, title: page.title, pageid: page.pageid, revid: page.lastrevid });
    }
  });
  return { found, missing };
}

interface ContentResponse {
  query: {
    pages: {
      title: string;
      extract?: string;
      revisions?: { revid: number; slots: { main: { content: string } } }[];
    }[];
  };
}

/** One paragraph per line, headings kept as "== Heading ==", no blank lines. */
export function tidyExtract(extract: string): string {
  return (
    extract
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter((l) => l !== "" && !/^=+\s*=+$/.test(l))
      .join("\n") + "\n"
  );
}

async function fetchPage(title: string): Promise<{ revid: number; wikitext: string; text: string }> {
  const res = await mediawiki<ContentResponse>(API, {
    action: "query",
    titles: title,
    prop: "revisions|extracts",
    rvprop: "ids|content",
    rvslots: "main",
    explaintext: "1",
    exsectionformat: "wiki",
  });
  const page = res.query.pages[0]!;
  const rev = page.revisions?.[0];
  if (!rev) throw new Error(`No revision returned for ${title}`);
  const wikitext = rev.slots.main.content.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n";
  return { revid: rev.revid, wikitext, text: tidyExtract(page.extract ?? "") };
}

export async function runWikipedia(manifest: Manifest): Promise<void> {
  const reqs = await loadSources();
  console.log(`Wikipedia: resolving ${reqs.length} titles…`);
  const { found, missing } = await resolveTitles(reqs);
  for (const m of missing) console.warn(`  ! not found on Wikipedia: "${m}"`);

  // Deduplicate pages that several requested titles resolve to (keep the first).
  const bySlug = new Map<string, Resolved>();
  for (const r of found) {
    const slug = slugify(r.title);
    const prev = bySlug.get(slug);
    if (prev) {
      if (prev.title !== r.title) throw new Error(`Slug clash: "${prev.title}" and "${r.title}" both → ${slug}`);
      console.warn(`  ~ "${r.requested}" duplicates "${prev.requested}" (both → ${r.title})`);
      continue;
    }
    if (r.requested !== r.title) console.log(`  → "${r.requested}" resolves to "${r.title}"`);
    bySlug.set(slug, r);
  }

  const old = manifest.wikipedia.pages;
  const todo = [...bySlug.entries()].filter(([slug, r]) => old[slug]?.revid !== r.revid);
  // Also re-fetch anything whose files went missing locally.
  for (const [slug, r] of bySlug) {
    if (todo.some(([s]) => s === slug)) continue;
    const wiki = await readText(resolve(OUT, `${slug}.wiki`));
    const txt = await readText(resolve(OUT, `${slug}.txt`));
    if (wiki === undefined || txt === undefined) todo.push([slug, r]);
  }
  console.log(`Wikipedia: ${bySlug.size} pages, ${todo.length} new or changed`);

  const pages: Record<string, PageEntry> = {};
  await mapLimit(todo, async ([slug, r]) => {
    const page = await fetchPage(r.title);
    r.revid = page.revid;
    const a = await writeIfChanged(resolve(OUT, `${slug}.wiki`), page.wikitext);
    const b = await writeIfChanged(resolve(OUT, `${slug}.txt`), page.text);
    if (a || b) console.log(`  ✓ ${slug} (rev ${page.revid})`);
  });

  for (const [slug, r] of bySlug) {
    pages[slug] = stamp<PageEntry>(
      old[slug],
      {
        title: r.title,
        requested: r.requested,
        topic: r.topic,
        pageid: r.pageid,
        revid: r.revid,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      },
      (o) => o.revid === r.revid,
    );
  }

  const removed = await pruneDir(OUT, new Set(bySlug.keys()), [".wiki", ".txt"]);
  for (const f of removed) console.log(`  − removed ${f} (no longer in sources.yaml)`);

  manifest.wikipedia = { pages, missing };
}
