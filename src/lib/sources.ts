/**
 * Every external link the site cites, and where it's cited.
 *
 * `pnpm sources` (scripts/sources.ts) lists them and, with `--check`, fetches
 * each one. The collection here is pure file reading so it can be tested:
 *
 * - markdown links `[text](https://…)` in content/**\/*.md, with line numbers
 * - any http(s) URL in content/facts.yaml and content/entities/*.yaml
 *   (`url:` fields, `sources:` lists, and URLs inside `source:` strings)
 *
 * A link marked `<!-- unverified link -->` on the same line is flagged, so a
 * check that now succeeds can drop the marker.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { projectRoot } from "./project-root.ts";

export interface SourceRef {
  /** Repository-relative path. */
  file: string;
  line: number;
  /** The line carries an `<!-- unverified link -->` marker. */
  unverified: boolean;
}

export interface SourceLink {
  url: string;
  host: string;
  refs: SourceRef[];
}

/** URLs in free text end before whitespace, quotes, brackets and trailing punctuation. */
const URL_IN_TEXT = /https?:\/\/[^\s"'<>()\]]+/g;
const MD_LINK = /\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g;

/** Trims sentence punctuation that a bare URL in prose picks up. */
export function cleanUrl(raw: string): string {
  return raw.replace(/[.,;:!?]+$/, "");
}

function walk(dir: string, ext: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, ext, out);
    else if (entry.name.endsWith(ext)) out.push(p);
  }
  return out;
}

/** Links found in one file's text. Markdown files use link syntax; YAML uses any URL. */
export function linksInText(text: string, kind: "md" | "yaml"): { url: string; line: number; unverified: boolean }[] {
  const found: { url: string; line: number; unverified: boolean }[] = [];
  const lines = text.split("\n");
  lines.forEach((l, i) => {
    if (kind === "yaml" && /^\s*#/.test(l)) return; // comments describe the format
    const unverified = /<!--\s*unverified link\s*-->/.test(l);
    const re = kind === "md" ? MD_LINK : URL_IN_TEXT;
    for (const m of l.matchAll(re)) found.push({ url: cleanUrl(kind === "md" ? m[1]! : m[0]), line: i + 1, unverified });
  });
  return found;
}

/** Every cited external link, deduplicated by URL, sorted by host then URL. */
export function collectSources(root = projectRoot()): SourceLink[] {
  const files = [
    ...walk(join(root, "content"), ".md").map((f) => ({ f, kind: "md" as const })),
    { f: join(root, "content", "facts.yaml"), kind: "yaml" as const },
    ...walk(join(root, "content", "entities"), ".yaml").map((f) => ({ f, kind: "yaml" as const })),
  ];
  const byUrl = new Map<string, SourceLink>();
  for (const { f, kind } of files) {
    const rel = relative(root, f);
    for (const { url, line, unverified } of linksInText(readFileSync(f, "utf8"), kind)) {
      let host: string;
      try {
        host = new URL(url).host;
      } catch {
        continue;
      }
      const link = byUrl.get(url) ?? { url, host, refs: [] };
      link.refs.push({ file: rel, line, unverified });
      byUrl.set(url, link);
    }
  }
  return [...byUrl.values()].sort((a, b) => a.host.localeCompare(b.host) || a.url.localeCompare(b.url));
}

/**
 * Hosts that refuse automated requests (403, a bot challenge or a CAPTCHA).
 * Their links are reported as "blocked", for a person to check in a browser,
 * never retried another way. Keep in step with STYLE.md, "Sources".
 */
export const BLOCKING_HOSTS = [
  "lop.parl.ca",
  "www.thecanadianencyclopedia.ca",
  "thecanadianencyclopedia.ca",
  "www.legisquebec.gouv.qc.ca",
  "legisquebec.gouv.qc.ca",
  "www.assembly.pe.ca",
  "www.courts.pe.ca",
  "yukonassembly.ca",
  "decisions.scc-csc.ca",
  "scc-csc.lexum.com",
  "www12.statcan.gc.ca",
];

export type CheckStatus = "ok" | "moved" | "broken" | "blocked" | "error";

/**
 * Sorts one fetch result. `finalUrl` is where redirects ended; a redirect to
 * another path (not just http→https or a trailing slash) is "moved", since the
 * cited page may no longer say what it said.
 */
export function classify(url: string, status: number | null, finalUrl?: string): CheckStatus {
  if (status === null) return "error";
  if (status === 401 || status === 403 || status === 429 || status === 451) return "blocked";
  if (status === 404 || status === 410) return "broken";
  if (status >= 200 && status < 300) {
    if (finalUrl && normalise(finalUrl) !== normalise(url)) return "moved";
    return "ok";
  }
  return "error";
}

function normalise(u: string): string {
  try {
    const x = new URL(u);
    return `${x.host.replace(/^www\./, "")}${x.pathname.replace(/\/+$/, "")}${x.search}`.toLowerCase();
  } catch {
    return u;
  }
}
