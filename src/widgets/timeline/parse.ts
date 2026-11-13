/**
 * Turns the rendered markdown wrapped by <tn-widget name="timeline"> into
 * timeline data. The page's own markdown stays the single source of truth.
 *
 * Two shapes are understood:
 *
 * 1. Eras and entries (content/timeline.en.md): each `## Era` heading starts
 *    an era, followed by a list of entries written as
 *        - **1867** — What happened. [Read more](/learn/…) · [Other](/provinces/…)
 *    The text before the first link is the event; the links after it say which
 *    pages (and so which modules) it belongs to.
 *
 * 2. A table (landmark cases, uses of s. 33): the first column is the year
 *    (a single year or a range like 1982–1987); other columns are picked by
 *    their header text.
 */

export interface TimelineLink {
  href: string;
  label: string;
}

export interface TimelineEvent {
  year: number;
  /** As written: "1867" or "1982–1987". */
  yearLabel: string;
  endYear?: number;
  /** Optional title (inline HTML), e.g. a case name. */
  title?: string;
  /** Inline HTML. */
  text: string;
  /** Raw tag text shown on the card, e.g. "s. 2(b), s. 33". */
  tag?: string;
  /** Group keys this event belongs to; the first one sets its colour. */
  groups: string[];
  links: TimelineLink[];
}

export interface TimelineEra {
  id?: string;
  title?: string;
  events: TimelineEvent[];
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
export const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const YEAR = /(\d{4})(?:\s*[–-]\s*(\d{4}))?/;

function parseYear(label: string): { year: number; endYear?: number } | undefined {
  const m = label.match(YEAR);
  if (!m) return undefined;
  return { year: Number(m[1]), endYear: m[2] ? Number(m[2]) : undefined };
}

/** Group key for a site path: the module for /learn/…, or "provinces". */
export function groupForHref(href: string): string | undefined {
  const learn = href.match(/^\/learn\/([^/#?]+)/);
  if (learn) return learn[1];
  if (/^\/provinces(\/|$|#)/.test(href)) return "provinces";
  return undefined;
}

const LINK = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;

export function parseEraList(html: string): TimelineEra[] {
  const eras: TimelineEra[] = [];
  // Split on h2s, keeping each heading with the content after it.
  const parts = html.split(/(?=<h2\b)/);
  for (const part of parts) {
    const heading = part.match(/^<h2\b([^>]*)>([\s\S]*?)<\/h2>/);
    const id = heading?.[1]?.match(/\bid="([^"]*)"/)?.[1];
    const era: TimelineEra = heading ? { id, title: textOf(heading[2] ?? ""), events: [] } : { events: [] };
    for (const [, li] of part.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
      const m = (li ?? "").match(/^\s*<strong>([^<]+)<\/strong>\s*[—–-]\s*([\s\S]*)$/);
      if (!m) throw new Error(`Timeline entry not in "**year** — text" form: ${textOf(li ?? "").slice(0, 80)}`);
      const when = parseYear(m[1]!);
      if (!when) throw new Error(`Timeline entry has no year: ${m[1]}`);
      const rest = m[2]!;
      const firstLink = rest.search(/<a\b/);
      const text = (firstLink >= 0 ? rest.slice(0, firstLink) : rest).trim();
      const linkHtml = firstLink >= 0 ? rest.slice(firstLink) : "";
      const links = [...linkHtml.matchAll(LINK)].map(([, href, label]) => ({ href: href ?? "", label: textOf(label ?? "") }));
      const groups = [...new Set(links.map((l) => groupForHref(l.href)).filter((g): g is string => !!g))];
      era.events.push({ ...when, yearLabel: textOf(m[1]!), text, groups, links });
    }
    if (era.events.length || era.title) eras.push(era);
  }
  return eras.filter((e) => e.events.length > 0);
}

export interface TableColumns {
  title?: string;
  text?: string;
  /** Column whose value becomes the event's tag and groups. */
  group?: string;
}

export function parseTable(
  html: string,
  columns: TableColumns,
  groupsFor: (cell: string) => string[],
): TimelineEra[] {
  const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];
  if (!table) throw new Error("Timeline widget: no table found inside the placeholder");
  const header = [...(table.match(/<thead>[\s\S]*?<\/thead>/)?.[0] ?? "").matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(
    ([, h]) => textOf(h ?? ""),
  );
  const col = (name?: string) => {
    if (!name) return -1;
    const i = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    if (i < 0) throw new Error(`Timeline widget: no "${name}" column (have: ${header.join(", ")})`);
    return i;
  };
  const [titleCol, textCol, groupCol] = [col(columns.title), col(columns.text), col(columns.group)];
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const events: TimelineEvent[] = [];
  for (const [, row] of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...(row ?? "").matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(([, c]) => (c ?? "").trim());
    const yearLabel = textOf(cells[0] ?? "");
    const when = parseYear(yearLabel);
    if (!when) throw new Error(`Timeline widget: row without a year: ${yearLabel}`);
    const tag = groupCol >= 0 ? textOf(cells[groupCol] ?? "") : undefined;
    events.push({
      ...when,
      yearLabel,
      title: titleCol >= 0 ? cells[titleCol] : undefined,
      text: textCol >= 0 ? (cells[textCol] ?? "") : "",
      tag,
      groups: tag ? groupsFor(tag) : [],
      links: [],
    });
  }
  return [{ events }];
}

/**
 * Charter grouping: sorts "s. 2(b), s. 33" style references into the parts of
 * the Charter they belong to.
 */
export const charterParts: { key: string; label: string; test: (n: number) => boolean }[] = [
  { key: "limits", label: "Reasonable limits (s. 1)", test: (n) => n === 1 },
  { key: "freedoms", label: "Fundamental freedoms (s. 2)", test: (n) => n === 2 },
  { key: "legal", label: "Legal rights (ss. 7–14)", test: (n) => n >= 7 && n <= 14 },
  { key: "equality", label: "Equality (s. 15)", test: (n) => n === 15 },
  { key: "override", label: "Notwithstanding clause (s. 33)", test: (n) => n === 33 },
];

export function charterGroups(cell: string): string[] {
  const sections = [...cell.matchAll(/\bs\.\s*(\d+)/g)].map((m) => Number(m[1]));
  const keys = sections.flatMap((n) => charterParts.filter((p) => p.test(n)).map((p) => p.key));
  return keys.length ? [...new Set(keys)] : ["other"];
}
