/**
 * `pnpm grounding`: re-download the grounding corpus and the reference datasets.
 *
 *   pnpm grounding                    everything
 *   pnpm grounding --only wikipedia   grounding/wikipedia/*.wiki + *.txt
 *   pnpm grounding --only wikidata    src/data/wikidata/*.json
 *   pnpm grounding --only flags       public/flags/*.svg + src/data/flags.json
 *   pnpm grounding --only statcan     src/data/statcan/*.json
 *
 * `--only` can be repeated or comma-separated. Re-running with no upstream
 * changes produces no diff except the run times in grounding/manifest.json.
 * See grounding/README.md.
 */
import { runFlags } from "./flags.ts";
import { runStatcan } from "./statcan.ts";
import { runWikidata } from "./wikidata.ts";
import { runWikipedia } from "./wikipedia.ts";
import { loadManifest, saveManifest, type Manifest } from "./util.ts";

const STEPS: Record<string, (m: Manifest) => Promise<void>> = {
  wikipedia: runWikipedia,
  wikidata: runWikidata,
  flags: runFlags,
  statcan: runStatcan,
};

function parseArgs(argv: string[]): string[] {
  const only: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--only") only.push(...(argv[++i] ?? "").split(","));
    else if (arg.startsWith("--only=")) only.push(...arg.slice(7).split(","));
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: pnpm grounding [--only ${Object.keys(STEPS).join("|")}]`);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  const steps = only.map((s) => s.trim()).filter(Boolean);
  for (const s of steps) if (!STEPS[s]) throw new Error(`Unknown step "${s}". Use one of: ${Object.keys(STEPS).join(", ")}`);
  return steps.length ? steps : Object.keys(STEPS);
}

const steps = parseArgs(process.argv.slice(2));
const manifest = await loadManifest();
let failed = false;
for (const step of steps) {
  try {
    await STEPS[step]!(manifest);
    manifest.runs[step] = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  } catch (e) {
    failed = true;
    console.error(`✗ ${step} failed: ${(e as Error).stack ?? e}`);
  }
  await saveManifest(manifest);
}
process.exit(failed ? 1 : 0);
