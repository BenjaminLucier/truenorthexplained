/**
 * The "empty portrait" drawn when there's no free photo of someone: a head
 * and shoulders in the strong border colour on a sunken background. Shared
 * by src/components/Portrait.astro and client scripts (the ridings explorer)
 * so both draw exactly the same thing. Static markup only, no user input.
 */
export const SILHOUETTE_SVG =
  '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" class="portrait-silhouette">' +
  '<circle cx="32" cy="25" r="11.5"/>' +
  '<path d="M9 68c0-15.5 10.3-26 23-26s23 10.5 23 26z"/>' +
  "</svg>";
