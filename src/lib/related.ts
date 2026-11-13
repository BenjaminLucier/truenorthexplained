/**
 * Ranking for "Related pages": a pure function over plain maps, so it can be
 * tested without Astro. src/lib/semantic.ts builds the maps from the site.
 *
 * For the page being read (P) and every other page (Q):
 *
 *   3 points for each entity P links to that Q is about
 *   2 points for each entity both pages are about
 *   1 point  for each entity P is about that Q links to
 *
 * Pages scoring 0, P itself and anything in `exclude` are dropped. Ties go to
 * the page with more connecting entities, then to the id, so the order is
 * stable from build to build.
 */

export interface RelatedInput {
  /** The page being read. */
  pageId: string;
  /** Page id → entity ids the page is about. */
  about: ReadonlyMap<string, readonly string[]>;
  /** Page id → entity ids the page links to. */
  links: ReadonlyMap<string, readonly string[]>;
  /** Page ids never to suggest (the parent module, reading-order neighbours, hub pages). */
  exclude?: Iterable<string>;
  /** At most this many results (default 4). */
  limit?: number;
}

export interface RelatedResult {
  id: string;
  score: number;
  /** The entities that connect the two pages, strongest first. */
  via: string[];
}

export const RELATED_WEIGHTS = { linksToAbout: 3, sharedAbout: 2, aboutToLinks: 1 } as const;

export function rankRelated({ pageId, about, links, exclude = [], limit = 4 }: RelatedInput): RelatedResult[] {
  const skip = new Set([pageId, ...exclude]);
  const myAbout = new Set(about.get(pageId) ?? []);
  const myLinks = new Set(links.get(pageId) ?? []);
  const scores = new Map<string, { score: number; via: Map<string, number> }>();
  const bump = (id: string, entity: string, points: number) => {
    if (skip.has(id)) return;
    const s = scores.get(id) ?? { score: 0, via: new Map<string, number>() };
    s.score += points;
    s.via.set(entity, (s.via.get(entity) ?? 0) + points);
    scores.set(id, s);
  };
  for (const [id, entities] of about) {
    for (const e of new Set(entities)) {
      if (myLinks.has(e)) bump(id, e, RELATED_WEIGHTS.linksToAbout);
      if (myAbout.has(e)) bump(id, e, RELATED_WEIGHTS.sharedAbout);
    }
  }
  for (const [id, entities] of links) {
    for (const e of new Set(entities)) {
      if (myAbout.has(e)) bump(id, e, RELATED_WEIGHTS.aboutToLinks);
    }
  }
  return [...scores]
    .map(([id, { score, via }]) => ({
      id,
      score,
      via: [...via].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([e]) => e),
    }))
    .sort((a, b) => b.score - a.score || b.via.length - a.via.length || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** The fields of a timeline event that eventsMentioning() reads. */
export interface MentioningEvent {
  year: number;
  pages: readonly { page: string }[];
  people: readonly string[];
  entities: readonly string[];
}

/**
 * Events that mention an entity or a page, sorted by year (input order within a
 * year). An entity id (`type:slug`) matches `people` and `entities`; anything else
 * is a page id ("learn/crown/reserve-powers", "home") matched against `pages`,
 * ignoring any `#anchor`.
 */
export function eventsMentioning<E extends MentioningEvent>(events: readonly E[], entityOrPageId: string): E[] {
  const isEntity = /^[a-z]+:/.test(entityOrPageId);
  const path = entityOrPageId === "home" ? "" : entityOrPageId.replace(/^\/|\/$/g, "");
  const hits = events.filter((e) =>
    isEntity
      ? e.people.includes(entityOrPageId) || e.entities.includes(entityOrPageId)
      : e.pages.some((p) => p.page.replace(/[#?].*$/, "").replace(/^\/|\/$/g, "") === path),
  );
  return hits.sort((a, b) => a.year - b.year);
}
