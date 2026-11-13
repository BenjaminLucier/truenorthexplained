/**
 * Timeline data: the shapes the timeline widget renders, the table parser
 * (a markdown table wrapped by <tn-widget name="timeline">, as on the
 * notwithstanding-clause page) and the anchor ids.
 *
 * The other sources (event and case entities) are mapped in ./entities.ts.
 *
 * A table: the first column is the year (a single year or a range like
 * 1982–1987); other columns are picked by their header text.
 */

export interface TimelineLink {
  href: string;
  label: string;
}

/** A person on an event card: links to their entity home, with a small portrait. */
export interface TimelinePerson {
  href: string;
  /** Shown on the card (the entity's `short`, else its name). */
  label: string;
  /** Full name, for the portrait's text alternative. */
  name: string;
  qid?: string;
}

/** A related entity on an event card (a court case, another event). */
export interface TimelineRelated extends TimelineLink {
  kind: "case" | "event";
}

export interface TimelineEvent {
  /** Unique, stable anchor for deep links (`#king-byng-affair`, `#event-1986-r-v-oakes`). */
  id: string;
  /** Older ids of the same event, still emitted as anchors so old deep links work. */
  anchors?: string[];
  year: number;
  /** As written: "1867" or "1982–1987". */
  yearLabel: string;
  endYear?: number;
  /** ISO date with the precision known ("1926", "1867-07", "1867-07-01"), for `<time>`. */
  date?: string;
  /** Optional title (inline HTML), e.g. a case name. */
  title?: string;
  /** Inline HTML. */
  text: string;
  /** Raw tag text shown on the card, e.g. "s. 2(b), s. 33". */
  tag?: string;
  /** Group keys this event belongs to; the first one sets its colour. */
  groups: string[];
  links: TimelineLink[];
  people?: TimelinePerson[];
  related?: TimelineRelated[];
}

export interface TimelineEra {
  id?: string;
  /** Older ids of the era heading, kept as anchors. */
  anchors?: string[];
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
      id: "",
      ...when,
      yearLabel,
      title: titleCol >= 0 ? cells[titleCol] : undefined,
      text: textCol >= 0 ? (cells[textCol] ?? "") : "",
      tag,
      groups: tag ? groupsFor(tag) : [],
      links: [],
    });
  }
  return finish([{ events }]);
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Words that make poor anchors: articles, connectives, months and bare numbers.
const FILLER = new Set([
  "",
  ..."a an s the in on of and to its is for at by as with from then that this it be are was were first last new".split(" "),
  ..."january february march april may june july august september october november december".split(" "),
]);

/** Sorts each era's events by year, keeping the authored order within a year. */
export function sortEras(eras: TimelineEra[]): TimelineEra[] {
  for (const era of eras) era.events.sort((a, b) => a.year - b.year);
  return eras;
}

/**
 * The readable anchor this widget has always derived for an event: "event-", its year
 * and a few words from its title, its tag or its text ("event-1986-r-v-oakes",
 * "event-2022-ontario"), before de-duplication (see uniqueIds). Table rows and cases
 * still use it as their id; for event entities it is kept as an extra anchor, because
 * the timeline used these ids before events had ids of their own.
 */
export function anchorBase(e: { year: number; title?: string; tag?: string; text: string }): string {
  const basis = e.title ? textOf(e.title) : (e.tag ?? textOf(e.text));
  const words = slugify(basis)
    .split("-")
    .filter((w) => !FILLER.has(w) && !/^\d+$/.test(w))
    .slice(0, e.title || e.tag ? 6 : 4);
  return ["event", String(e.year), ...words].join("-");
}

/** Makes ids unique in order: a second "event-1990-oka" becomes "event-1990-oka-2". */
export function uniqueIds(bases: string[]): string[] {
  const seen = new Map<string, number>();
  return bases.map((base) => {
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/** Sorts the eras and gives every event its derived anchor as its id. */
export function finish(eras: TimelineEra[]): TimelineEra[] {
  const events = sortEras(eras).flatMap((e) => e.events);
  uniqueIds(events.map(anchorBase)).forEach((id, i) => (events[i]!.id = id));
  return eras;
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
