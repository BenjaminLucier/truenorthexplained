/**
 * Stable, page-unique ids for build-time components.
 *
 *   const id = uniqueId(Astro, "chart", title);   // "chart-votes-vs-seats-2025", then "…-2"
 *
 * The id comes from the props (slugified), so the same page always builds the
 * same markup. A counter kept on `Astro.locals`, which lives for one page
 * render, adds a suffix when the same base appears twice on a page.
 */

/** Lowercase ASCII words joined by hyphens: "Votes vs seats, 2025" → "votes-vs-seats-2025". */
export function slugify(text: string, max = 40): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

const KEY = "__tnIds";

export function uniqueId(astro: { locals: object }, prefix: string, from?: string): string {
  const locals = astro.locals as Record<string, unknown>;
  const seen = (locals[KEY] ??= new Map<string, number>()) as Map<string, number>;
  const slug = from ? slugify(from) : "";
  const base = slug ? `${prefix}-${slug}` : prefix;
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}
