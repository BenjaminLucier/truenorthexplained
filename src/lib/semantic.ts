/**
 * Backlinks and related pages (Astro side). See ARCHITECTURE.md, "Backlinks
 * and related pages".
 *
 * One index per build, from every page's `about` front matter and the
 * `data-entity` attributes the entityLinks plugin puts in its rendered HTML.
 * In dev it is rebuilt on each call, so edits show up (it's cheap: one regex
 * pass over the rendered pages). The ranking itself is the pure rankRelated()
 * in src/lib/related.ts.
 */
import { allEntities, getEntity, type Entity } from "./entities";
import { rankRelated, type RelatedResult } from "./related";
import { allPages, moduleFor, sequenceFor, type Page } from "./site";

/** Pages that index other pages; never suggested as related. */
export const HUB_PAGES = new Set(["home", "glossary", "timeline", "sources", "myths", "credits", "about"]);

interface SemanticIndex {
  pages: Map<string, Page>;
  /** Page id → entity ids from its `about` front matter. */
  about: Map<string, string[]>;
  /** Page id → `about` plus the entities whose home is on that page (used for ranking). */
  aboutOrHome: Map<string, string[]>;
  /** Page id → entity ids it links to, in first-seen order. */
  links: Map<string, string[]>;
}

const ENTITY_ATTR = /\bdata-entity="([^"]+)"/g;

/** The page id an entity's home is on ("/learn/crown#oaths" → "learn/crown"), if it's a content page. */
export function homePageId(entity: Entity): string {
  const path = entity.href.replace(/[#?].*$/, "").replace(/^\/|\/$/g, "");
  return path === "" ? "home" : path;
}

async function buildIndex(): Promise<SemanticIndex> {
  const list = await allPages();
  const pages = new Map(list.map((p) => [p.id, p]));
  const about = new Map<string, string[]>();
  const aboutOrHome = new Map<string, string[]>();
  const links = new Map<string, string[]>();
  for (const page of list) {
    about.set(page.id, page.data.about ?? []);
    aboutOrHome.set(page.id, [...(page.data.about ?? [])]);
    const html = page.rendered?.html ?? "";
    links.set(page.id, [...new Set([...html.matchAll(ENTITY_ATTR)].map((m) => m[1]!))]);
    // A placeholder the facts plugin couldn't see (split across nodes, say) would
    // otherwise reach readers as "{{…}}". Code is allowed to show the syntax.
    const leftover = html.replace(/<code\b[\s\S]*?<\/code>/g, "").match(/\{\{[^{}\n]*\}\}/);
    if (leftover) throw new Error(`${page.filePath ?? page.id}: unresolved fact placeholder ${leftover[0]} in the rendered page`);
  }
  for (const entity of allEntities()) {
    const id = homePageId(entity);
    if (pages.has(id)) aboutOrHome.get(id)!.push(entity.id);
  }
  return { pages, about, aboutOrHome, links };
}

let built: Promise<SemanticIndex> | undefined;

function index(): Promise<SemanticIndex> {
  if (!import.meta.env.PROD) return buildIndex();
  built ??= buildIndex();
  return built;
}

/** Pages that list the entity in their `about` front matter. */
export async function pagesAbout(id: string): Promise<Page[]> {
  getEntity(id);
  const { pages, about } = await index();
  return [...about].filter(([, ids]) => ids.includes(id)).map(([pageId]) => pages.get(pageId)!);
}

/**
 * What refers to an entity: pages that link to it (`data-entity`), and other
 * entities that list it in `people`, `entities` or `sections`.
 */
export async function mentions(id: string): Promise<{ pages: Page[]; entities: Entity[] }> {
  getEntity(id);
  const { pages, links } = await index();
  const linking = [...links].filter(([, ids]) => ids.includes(id)).map(([pageId]) => pages.get(pageId)!);
  const entities = allEntities().filter((e) => {
    const refs = [
      ...("people" in e ? e.people : []),
      ...("entities" in e ? e.entities : []),
      ...(e.type === "case" ? e.sections : []),
    ];
    return refs.includes(id);
  });
  return { pages: linking, entities };
}

export interface RelatedPage {
  page: Page;
  /** The entities that connect it to the page being read, strongest first. */
  via: Entity[];
  score: number;
}

/**
 * Pages related to this one: pages about the entities it links to, then pages
 * that share or link to what it's about. A page counts as "about" the entities
 * in its `about` front matter and the entities whose home is on it. Leaves out
 * the page itself, hub pages, its module's main page and its neighbours in the
 * reading order (already linked from the page). Hub pages get no suggestions.
 */
export async function relatedPages(page: Page, limit = 4): Promise<RelatedPage[]> {
  const idx = await index();
  if (HUB_PAGES.has(page.id)) return [];
  const exclude = new Set(HUB_PAGES);
  const mod = page.id.startsWith("learn/") ? await moduleFor(page.id) : undefined;
  if (mod) exclude.add(mod.page.id);
  const sequence = await sequenceFor(page.id);
  const at = sequence.findIndex((p) => p.id === page.id);
  if (at >= 0) {
    if (at > 0) exclude.add(sequence[at - 1]!.id);
    if (sequence[at + 1]) exclude.add(sequence[at + 1]!.id);
  }
  const ranked: RelatedResult[] = rankRelated({ pageId: page.id, about: idx.aboutOrHome, links: idx.links, exclude, limit });
  return ranked.map((r) => ({ page: idx.pages.get(r.id)!, via: r.via.map((id) => getEntity(id)), score: r.score }));
}
