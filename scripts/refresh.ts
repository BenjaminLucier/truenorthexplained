/**
 * `pnpm refresh`: re-run every data script in dependency order, then show
 * what changed and what's still out of date.
 *
 *   pnpm refresh                     everything
 *   pnpm refresh --only premiers,elections
 *   pnpm refresh --skip portraits    (e.g. when Commons is rate-limiting)
 *
 * Each step's output goes to .refresh-logs/<step>.log (gitignored); a failed
 * step doesn't stop the rest unless a later step depends on it. Review the
 * result with `git diff` as usual: the scripts fail loudly when their sources
 * disagree, and the diff is where you check what changed.
 */
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fromRoot } from "../src/lib/project-root.ts";
import { freshnessReport } from "../src/lib/freshness.ts";
import { printFreshness } from "./freshness.ts";

interface Step {
  id: string;
  script: string;
  /** Steps whose output this one reads; it's skipped if any of them failed. */
  needs: string[];
}

/** In dependency order. */
export const STEPS: Step[] = [
  { id: "grounding", script: "grounding", needs: [] },
  { id: "premiers", script: "data:premiers", needs: ["grounding"] },
  { id: "elections", script: "data:elections", needs: [] },
  { id: "election-history", script: "data:election-history", needs: ["grounding", "elections"] },
  { id: "population", script: "data:population", needs: [] },
  { id: "geo", script: "data:geo", needs: ["elections"] },
  { id: "treaties", script: "data:treaties", needs: [] },
  { id: "money", script: "data:money", needs: [] },
  { id: "demographics", script: "data:demographics", needs: [] },
  { id: "portraits", script: "data:portraits", needs: ["grounding", "elections", "premiers"] },
];

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : undefined;
};

function run(step: Step, logDir: string): Promise<{ ok: boolean; ms: number; log: string }> {
  const log = `${logDir}/${step.id}.log`;
  const out = createWriteStream(log);
  const started = Date.now();
  // Inside `pnpm run`, npm_execpath points at pnpm itself: a JS file for older
  // pnpm (run it with this Node), a native binary for pnpm 12+ (run it as is).
  const pnpm = process.env.npm_execpath;
  const [cmd, args]: [string, string[]] = !pnpm
    ? ["pnpm", ["run", step.script]]
    : /\.[cm]?js$/.test(pnpm)
      ? [process.execPath, [pnpm, "run", step.script]]
      : [pnpm, ["run", step.script]];
  return new Promise((done) => {
    const child = spawn(cmd, args, { cwd: fromRoot(), env: process.env });
    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });
    child.on("close", (code) => {
      out.end();
      done({ ok: code === 0, ms: Date.now() - started, log });
    });
  });
}

async function main() {
  const only = arg("--only");
  const skip = new Set(arg("--skip") ?? []);
  const unknown = [...(only ?? []), ...skip].filter((id) => !STEPS.some((s) => s.id === id));
  if (unknown.length) {
    console.error(`Unknown step(s): ${unknown.join(", ")}. Steps: ${STEPS.map((s) => s.id).join(", ")}`);
    process.exit(2);
  }
  const steps = STEPS.filter((s) => (!only || only.includes(s.id)) && !skip.has(s.id));
  const logDir = fromRoot(".refresh-logs");
  mkdirSync(logDir, { recursive: true });

  const failed = new Set<string>();
  const results: string[] = [];
  for (const step of steps) {
    const blocked = step.needs.filter((n) => failed.has(n));
    if (blocked.length) {
      failed.add(step.id);
      results.push(`  skip  ${step.id.padEnd(17)} (needs ${blocked.join(", ")}, which failed)`);
      console.log(`- ${step.id}: skipped`);
      continue;
    }
    process.stdout.write(`- ${step.id} (pnpm ${step.script}) … `);
    const r = await run(step, logDir);
    if (!r.ok) failed.add(step.id);
    const secs = (r.ms / 1000).toFixed(0);
    console.log(r.ok ? `ok (${secs}s)` : `FAILED (${secs}s), see ${r.log.replace(fromRoot() + "/", "")}`);
    results.push(`  ${r.ok ? "ok  " : "FAIL"}  ${step.id.padEnd(17)} ${secs}s`);
  }

  console.log("\nSteps\n" + results.join("\n"));
  console.log("\nChanged files");
  try {
    const stat = execFileSync("git", ["diff", "--stat", "--", "src/data", "public", "grounding"], { cwd: fromRoot(), encoding: "utf8" });
    console.log(stat.trim() || "  nothing changed");
  } catch {
    console.log("  (git diff unavailable)");
  }
  console.log("\nNext: review the diff (git diff src/data grounding), then pnpm check && pnpm validate && pnpm build && pnpm test.");

  printFreshness(freshnessReport());
  if (failed.size) process.exit(1);
}

await main();
