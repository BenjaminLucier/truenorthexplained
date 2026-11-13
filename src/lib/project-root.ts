/**
 * The project root, for plain-Node modules that read files at build time
 * (src/lib/entities.ts, src/lib/facts.ts).
 *
 * Those modules run from the Astro config, from tsx scripts, from vitest and,
 * bundled, from the prerender chunks under dist/. So rather than trusting one
 * relative path, walk up from this file (then from the working directory)
 * until a folder holds both package.json and content/.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findUp(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "content"))) return dir;
    const up = dirname(dir);
    if (up === dir) return undefined;
    dir = up;
  }
}

let cached: string | undefined;

export function projectRoot(): string {
  if (cached) return cached;
  let here: string | undefined;
  try {
    here = dirname(fileURLToPath(import.meta.url));
  } catch {
    here = undefined;
  }
  cached = (here && findUp(here)) ?? findUp(process.cwd());
  if (!cached) throw new Error(`Can't find the project root (a folder with package.json and content/) from ${here ?? process.cwd()}`);
  return cached;
}

/** A path inside the project: `fromRoot("content", "facts.yaml")`. */
export const fromRoot = (...parts: string[]) => join(projectRoot(), ...parts);
