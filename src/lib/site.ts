import { getCollection, type CollectionEntry } from "astro:content";
import { resolveFacts } from "./facts";

export type Page = CollectionEntry<"pages">;
export type Question = CollectionEntry<"quizzes">;

export const href = (id: string) => (id === "home" ? "/" : `/${id}`);

/**
 * Every page, with `{{fact}}` placeholders in its front-matter strings (title,
 * summary, and the home page's hero and ideas) resolved. Everything that
 * prints front matter gets its pages from here, so this is the one place that
 * happens. Not memoised: Astro already caches collections, and a module-level
 * cache would hide edits in dev.
 */
export async function allPages(): Promise<Page[]> {
  return (await getCollection("pages")).map(withFacts);
}

function withFacts(page: Page): Page {
  const d = page.data;
  const strings = [d.title, d.summary, d.hero?.title, d.hero?.lede, ...(d.ideas ?? []).flatMap((i) => [i.title, i.text])];
  if (!strings.some((s) => s?.includes("{{"))) return page;
  try {
    return {
      ...page,
      data: {
        ...d,
        title: resolveFacts(d.title),
        summary: resolveFacts(d.summary),
        hero: d.hero && { ...d.hero, title: resolveFacts(d.hero.title), lede: resolveFacts(d.hero.lede) },
        ideas: d.ideas?.map((i) => ({ ...i, title: resolveFacts(i.title), text: resolveFacts(i.text) })),
      },
    };
  } catch (e) {
    throw new Error(`${page.filePath ?? page.id}: ${(e as Error).message}`);
  }
}

export async function getPage(id: string): Promise<Page> {
  const page = (await allPages()).find((p) => p.id === id);
  if (!page) throw new Error(`No page with id "${id}"`);
  return page;
}

/** A module main page plus its deep dives, in reading order. */
export interface Module {
  page: Page;
  deepDives: Page[];
}

export async function modules(): Promise<Module[]> {
  const pages = await allPages();
  const mains = pages
    .filter((p) => /^learn\/[^/]+$/.test(p.id))
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
  return mains.map((page) => ({
    page,
    deepDives: (page.data.deep_dives ?? []).map((slug) => {
      const dive = pages.find((p) => p.id === `${page.id}/${slug}`);
      if (!dive) throw new Error(`${page.id} lists missing deep dive "${slug}"`);
      return dive;
    }),
  }));
}

export async function provinces(): Promise<Page[]> {
  return (await allPages())
    .filter((p) => p.id.startsWith("provinces/"))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
}

/** The module a learn page belongs to, if any. */
export async function moduleFor(id: string): Promise<Module | undefined> {
  const root = id.split("/").slice(0, 2).join("/");
  return (await modules()).find((m) => m.page.id === root);
}

/** Linear reading order used for previous/next links. */
export async function sequenceFor(id: string): Promise<Page[]> {
  if (id.startsWith("learn/")) return (await modules()).flatMap((m) => [m.page, ...m.deepDives]);
  if (id.startsWith("provinces/")) return provinces();
  return [];
}

export interface Crumb {
  label: string;
  href?: string;
}

export async function breadcrumbsFor(page: Page): Promise<Crumb[]> {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  if (page.id.startsWith("learn/")) {
    crumbs.push({ label: "Learn", href: "/learn" });
    const mod = await moduleFor(page.id);
    if (mod && mod.page.id !== page.id) crumbs.push({ label: mod.page.data.title, href: href(mod.page.id) });
  } else if (page.id.startsWith("provinces/")) {
    crumbs.push({ label: "Provinces and territories", href: "/provinces" });
  }
  crumbs.push({ label: page.data.title });
  return crumbs;
}

/** Extracts the HTML between `<h2 id="tldr">` and the next `<h2`. */
export function tldrHtml(page: Page): string {
  const html = page.rendered?.html ?? "";
  const match = html.match(/<h2[^>]*id="tldr"[^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2|$)/);
  return match?.[1]?.trim() ?? "";
}

/**
 * The module key for a learn page id ("learn/crown/reserve-powers" → "crown"),
 * used as data-module="…" to pick up that module's colour tokens.
 */
export function moduleKey(id: string): string | undefined {
  return id.match(/^learn\/([^/]+)/)?.[1];
}

/** Every quiz question tagged with a module's main page or any of its deep dives. */
export async function moduleQuestionIds(moduleId: string): Promise<string[]> {
  const all = await getCollection("quizzes");
  return all
    .filter((q) => q.data.pages.some((p) => p === moduleId || p.startsWith(`${moduleId}/`)))
    .map((q) => q.id);
}

/** Questions for a page: hand-picked via front matter, else everything tagged with it. */
export async function questionsFor(page: Page): Promise<Question[]> {
  const all = await getCollection("quizzes");
  if (page.data.quiz) {
    return page.data.quiz.map((id) => {
      const q = all.find((x) => x.id === id);
      if (!q) throw new Error(`${page.id} picks missing question "${id}"`);
      return q;
    });
  }
  return all.filter((q) => q.data.pages.includes(page.id));
}
