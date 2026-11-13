/**
 * Turns a content file path into its site path (the entry id), e.g.
 *   learn/03-parliament/senate.en.md -> learn/parliament/senate
 *   learn/03-parliament/index.en.md  -> learn/parliament
 *   provinces/index.en.md            -> provinces
 *   home.en.md                       -> home
 *
 * Shared by the content config and scripts/validate.ts, so it must not
 * import anything from Astro.
 */
export function sitePathFromEntry(entry: string): string {
  const parts = entry.replace(/\.en\.md$/, "").split("/");
  if (parts[0] === "learn" && parts[1]) parts[1] = parts[1].replace(/^\d+-/, "");
  if (parts.at(-1) === "index") parts.pop();
  return parts.join("/");
}
