/**
 * Timeline data from the entity registry (src/lib/entities.ts):
 *
 *   data-source="events"  every event in content/entities/events.yaml, in its era
 *   data-source="cases"   the cases in content/entities/cases.yaml whose home is on
 *                         the current page (the landmark-cases page)
 *
 * Pure functions: the registry lookups, page titles and the inline-markdown
 * renderer come in through `Lookup`, so tests can run them directly.
 */
import type { Case, Entity, Era, Event } from "../../lib/entities";
import {
  anchorBase,
  charterGroups,
  groupForHref,
  sortEras,
  uniqueIds,
  type TimelineEra,
  type TimelineEvent,
  type TimelinePerson,
  type TimelineRelated,
} from "./parse";

export interface Lookup {
  entity: (id: string) => Entity;
  /** The title of the page at a site path (no hash), if it is a page. */
  pageTitle: (path: string) => string | undefined;
  /** Inline markdown → inline HTML. */
  render: (md: string) => string;
}

export interface DateParts {
  year: number;
  month?: number;
  day?: number;
  precision: "year" | "month" | "day";
}

/** Reads an event date as written in events.yaml: "1926", "1926-06" or "1926-06-28". */
export function parseDate(date: string): DateParts {
  const m = date.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) throw new Error(`Not a year or ISO date: "${date}"`);
  const [year, month, day] = [Number(m[1]), m[2] ? Number(m[2]) : undefined, m[3] ? Number(m[3]) : undefined];
  return { year, month, day, precision: day ? "day" : month ? "month" : "year" };
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pathOf = (href: string) => href.replace(/[#?].*$/, "").replace(/(.)\/$/, "$1");

/**
 * The id an era heading had when the eras were `## Era` headings in the markdown
 * ("Building the country (1867–1923)" → "building-the-country-18671923").
 */
export function legacyEraId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Group keys for an event: its module (explicit, else the first `/learn/…` page),
 * then the module (or "provinces") of every page it links to. The first sets the colour.
 */
export function eventGroups(e: Pick<Event, "module" | "pages">): string[] {
  const fromPages = e.pages.map((p) => groupForHref(p.page)).filter((g): g is string => !!g);
  const module = e.module ?? fromPages.find((g) => g !== "provinces");
  return [...new Set([...(module ? [module] : []), ...fromPages])];
}

/** One event entity as a timeline card. `id` is the event's slug, its home on /timeline. */
export function eventItem(e: Event, look: Lookup): TimelineEvent {
  const endYear = e.endYear !== undefined && e.endYear > e.year ? e.endYear : undefined;
  const people: TimelinePerson[] = e.people.map((id) => {
    const p = look.entity(id);
    return { href: p.href, label: p.short ?? p.name, name: p.name, qid: p.type === "person" ? p.qid : undefined };
  });
  const related: TimelineRelated[] = [];
  for (const id of e.entities) {
    const r = look.entity(id);
    if (r.type === "case") related.push({ kind: "case", href: r.href, label: r.name });
    // Another event is a card on the same timeline.
    else if (r.type === "event") related.push({ kind: "event", href: `#${r.slug}`, label: r.title });
  }
  return {
    id: e.slug,
    year: e.year,
    endYear,
    yearLabel: endYear ? `${e.year}–${endYear}` : String(e.year),
    date: e.date,
    title: escapeHtml(e.title),
    text: look.render(e.text),
    groups: eventGroups(e),
    links: e.pages.map((p) => ({ href: p.page, label: p.label ?? look.pageTitle(pathOf(p.page)) ?? p.page })),
    people,
    related,
  };
}

/**
 * Events grouped into their eras (in the order of `eras`, empty eras left out), sorted
 * by year, keeping file order within a year. Each card also carries the anchor it had
 * when the timeline was a markdown list (anchorBase of its text), so old links work.
 */
export function eventEras(events: Event[], eras: Era[], look: Lookup): TimelineEra[] {
  const out: TimelineEra[] = eras.map((era) => {
    const legacy = legacyEraId(era.title);
    return { id: era.id, anchors: legacy !== era.id ? [legacy] : [], title: era.title, events: [] };
  });
  for (const e of events) {
    const era = out[eras.findIndex((x) => x.id === e.era)];
    if (!era) throw new Error(`${e.id}: unknown era "${e.era}"`);
    era.events.push(eventItem(e, look));
  }
  const kept = sortEras(out.filter((era) => era.events.length > 0));
  const items = kept.flatMap((era) => era.events);
  uniqueIds(items.map((it) => anchorBase({ year: it.year, text: it.text }))).forEach((legacy, i) => {
    if (legacy !== items[i]!.id) items[i]!.anchors = [legacy];
  });
  return kept;
}

/**
 * Cases as timeline cards: the case name (linking to its write-up, a `#id` link when
 * that is on `pagePath`), its holding, and its `tag` for the Charter grouping. Ids are
 * derived as for table rows (`event-1986-r-v-oakes`), as when the cases were a table.
 */
export function caseEras(cases: Case[], look: Lookup, pagePath: string): TimelineEra[] {
  const here = pathOf(pagePath);
  const events: TimelineEvent[] = cases.map((c) => {
    const href = pathOf(c.href) === here && c.href.includes("#") ? c.href.slice(c.href.indexOf("#")) : c.href;
    return {
      id: "",
      year: c.year,
      yearLabel: String(c.year),
      date: String(c.year),
      title: `<a href="${escapeHtml(href)}"><em>${escapeHtml(c.name)}</em></a>`,
      text: look.render(c.holding),
      tag: c.tag,
      groups: charterGroups(c.tag ?? ""),
      links: [],
    };
  });
  const eras = sortEras([{ events }]);
  uniqueIds(events.map(anchorBase)).forEach((id, i) => (events[i]!.id = id));
  return eras;
}

/** The cases whose home is on this page, in file order. */
export function casesOnPage(cases: Case[], pagePath: string): Case[] {
  const here = pathOf(pagePath);
  return cases.filter((c) => pathOf(c.href) === here);
}
