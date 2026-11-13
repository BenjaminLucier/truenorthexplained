/**
 * Flags of Canada and the 13 provinces and territories, from the flag image
 * (P41) on each Wikidata item. SVGs are downloaded from Wikimedia Commons,
 * stripped of metadata and editor cruft, and saved to public/flags/<slug>.svg.
 * Licence and author come from the Commons API (extmetadata) and go to
 * src/data/flags.json for the credits page.
 */
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { mediawiki, politeFetch, mapLimit } from "./http.ts";
import { DATA, ROOT, stamp, writeDataset, writeIfChanged, type FileEntry, type Manifest } from "./util.ts";
import { PROVINCES, sparql } from "./wikidata.ts";

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const OUT = resolve(ROOT, "public/flags");
const GEOS = [{ slug: "canada", qid: "Q16", name: "Canada" }, ...PROVINCES];

interface ImageInfoResponse {
  query: {
    pages: {
      title: string;
      missing?: boolean;
      imageinfo?: {
        url: string;
        descriptionurl: string;
        sha1: string;
        extmetadata?: Record<string, { value: string } | undefined>;
      }[];
    }[];
  };
}

/** Strips HTML tags and entities from Commons metadata, leaving plain text. */
export function plain(html: string | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

/**
 * Light, safe SVG clean-up: drops the XML prolog, comments, DOCTYPE,
 * <metadata>, editor namespaces (Inkscape, Sodipodi, Adobe, Sketch) and
 * their attributes, and collapses whitespace between tags. Geometry is never
 * touched, so the image renders exactly as before.
 */
export function cleanSvg(svg: string): string {
  let s = svg.replace(/^﻿/, "");
  s = s.replace(/<\?xml[\s\S]*?\?>/g, "");
  // Expand internal entities (Illustrator writes xmlns="&ns_svg;") before dropping the DOCTYPE.
  const entities = new Map<string, string>();
  for (const m of s.matchAll(/<!ENTITY\s+([\w.-]+)\s+"([^"]*)"\s*>/g)) entities.set(m[1]!, m[2]!);
  s = s.replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/g, "");
  for (const [name, value] of entities) s = s.split(`&${name};`).join(value);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<metadata[\s\S]*?<\/metadata>/g, "");
  s = s.replace(/<metadata[^>]*\/>/g, "");
  s = s.replace(/<title[\s\S]*?<\/title>/g, "");
  const editor = "(?:inkscape|sodipodi|sketch|i|x|graph|ns\\d+|serif|adobe)";
  s = s.replace(new RegExp(`<${editor}:[\\w-]+[^>]*/>`, "g"), "");
  s = s.replace(new RegExp(`<(${editor}:[\\w-]+)[^>]*>[\\s\\S]*?</\\1>`, "g"), "");
  s = s.replace(new RegExp(`\\s${editor}:[\\w-]+="[^"]*"`, "g"), "");
  s = s.replace(new RegExp(`\\sxmlns:${editor}="[^"]*"`, "g"), "");
  s = s.replace(/\sxmlns:(?:dc|cc|rdf)="[^"]*"/g, "");
  s = s.replace(/>\s+</g, "><").trim();
  // Collapse runs of whitespace (left behind by removed attributes) to one space.
  s = s.replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ").replace(/\s+>/g, ">").replace(/\s+\/>/g, "/>");
  // Trim coordinate precision beyond 3 decimals in path data: invisible at any flag size.
  s = s.replace(/\s(d|points)="([^"]*)"/g, (_, attr: string, v: string) => {
    // Tokenize numbers the way SVG does ("1.5.25" is 1.5 then .25), then round only long fractions.
    const trimmed = v.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, (n) => {
      if (/e/i.test(n) || !/\.\d{4,}/.test(n)) return n;
      const r = String(Number(Number(n).toFixed(3)));
      // Keep a leading "." form if the source used one, so the token can't merge with its neighbour.
      if (!n.startsWith(".")) return r;
      // ".99999" rounds to "1": add a separator so it can't fuse with a preceding number.
      return r.includes(".") ? r.replace(/^0\./, ".") : ` ${r}`;
    });
    return ` ${attr}="${trimmed}"`;
  });
  // Give the root a viewBox so the flag scales when sized with CSS (an <img> with no viewBox clips instead).
  s = s.replace(/<svg\b[^>]*>/, (tag) => {
    if (/\sviewBox=/.test(tag)) return tag;
    const w = tag.match(/\swidth="([\d.]+)(?:px)?"/)?.[1];
    const h = tag.match(/\sheight="([\d.]+)(?:px)?"/)?.[1];
    return w && h ? tag.replace(/^<svg/, `<svg viewBox="0 0 ${w} ${h}"`) : tag;
  });
  return s + "\n";
}

export async function runFlags(manifest: Manifest): Promise<void> {
  console.log("Flags: looking up P41 on Wikidata…");
  const rows = await sparql(`
    SELECT ?p ?flag WHERE {
      VALUES ?p { ${GEOS.map((g) => `wd:${g.qid}`).join(" ")} }
      ?p p:P41 ?s. ?s ps:P41 ?flag; wikibase:rank ?rank.
      FILTER(?rank != wikibase:DeprecatedRank)
      FILTER NOT EXISTS { ?s pq:P582 ?end }
    }`);
  const fileFor = (qid: string) => {
    const files = rows
      .filter((r) => r.p === qid)
      .map((r) => decodeURIComponent(r.flag!.replace(/^.*Special:FilePath\//, "")))
      .sort();
    if (!files.length) throw new Error(`No flag image (P41) for ${qid}`);
    return files[0]!;
  };

  const flags = await mapLimit(GEOS, async (g) => {
    const file = fileFor(g.qid);
    if (!file.toLowerCase().endsWith(".svg")) throw new Error(`Flag for ${g.name} is not an SVG: ${file}`);
    const info = await mediawiki<ImageInfoResponse>(COMMONS, {
      action: "query",
      titles: `File:${file}`,
      prop: "imageinfo",
      iiprop: "url|sha1|extmetadata",
      iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|UsageTerms|AttributionRequired|Copyrighted",
    });
    const page = info.query.pages[0]!;
    const ii = page.imageinfo?.[0];
    if (!ii) throw new Error(`No Commons image info for File:${file}`);
    const meta = ii.extmetadata ?? {};

    const previous = manifest.flags[g.slug];
    let optimizedSha = previous?.sha1;
    if (previous?.commonsSha1 !== ii.sha1 || !(await import("node:fs")).existsSync(resolve(OUT, `${g.slug}.svg`))) {
      const svg = await (await politeFetch(ii.url)).text();
      const cleaned = cleanSvg(svg);
      if (!/<svg[\s>]/.test(cleaned)) throw new Error(`Downloaded file for ${g.name} doesn't look like an SVG`);
      const changed = await writeIfChanged(resolve(OUT, `${g.slug}.svg`), cleaned);
      optimizedSha = createHash("sha1").update(cleaned).digest("hex");
      console.log(`  ${changed ? "✓" : "="} public/flags/${g.slug}.svg (${svg.length} → ${cleaned.length} bytes)`);
    } else {
      console.log(`  = public/flags/${g.slug}.svg (unchanged on Commons)`);
    }
    manifest.flags[g.slug] = stamp<FileEntry>(
      previous,
      { file: `public/flags/${g.slug}.svg`, sha1: optimizedSha, commonsSha1: ii.sha1, commons: file },
      (o) => o.commonsSha1 === ii.sha1,
    );

    return {
      slug: g.slug,
      name: g.name,
      path: `/flags/${g.slug}.svg`,
      commonsFile: file,
      commonsUrl: ii.descriptionurl,
      licence: plain(meta.LicenseShortName?.value) ?? "Unknown",
      licenceUrl: plain(meta.LicenseUrl?.value),
      author: plain(meta.Artist?.value),
      credit: plain(meta.Credit?.value),
      attributionRequired: meta.AttributionRequired?.value === "true",
    };
  });

  const changed = await writeDataset(
    resolve(DATA, "flags.json"),
    {
      source: "Wikimedia Commons (files linked from Wikidata P41 flag image)",
      url: "https://commons.wikimedia.org/",
      licence: "Per file; see each entry",
      script: "scripts/grounding/flags.ts",
    },
    { flags },
  );
  console.log(`  ${changed ? "✓" : "="} src/data/flags.json`);
}
