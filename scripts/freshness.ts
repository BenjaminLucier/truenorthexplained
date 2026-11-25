/**
 * `pnpm freshness`: what may be out of date, and what's coming up.
 * See src/lib/freshness.ts. `--all` includes watchlist items further out;
 * `--summary` prints one line. Always exits 0 unless the watchlist is malformed;
 * staleness is a prompt to look, not an error.
 */
import { DATASET_RULES, FACT_MAX_DAYS, TIMELINE_MAX_DAYS, freshnessReport, freshnessSummary, type FreshnessReport } from "../src/lib/freshness.ts";

const STATUS_LABEL = { overdue: "OVERDUE", due: "due today", upcoming: "coming up", later: "later" } as const;

export function printFreshness(r: FreshnessReport, { all = false } = {}): void {
  console.log(`\nFreshness report for ${r.today}\n`);

  // Datasets, grouped by the script that refreshes them.
  console.log("Datasets");
  const byScript = new Map<string, { maxDays: number; why: string; oldest: number; fetched: string; files: number; stale: number }>();
  for (const d of r.datasets) {
    const key = d.rule?.script ?? "(no refresh script)";
    const g = byScript.get(key) ?? { maxDays: d.rule?.maxDays ?? 0, why: d.rule?.why ?? "", oldest: -1, fetched: d.fetched, files: 0, stale: 0 };
    g.files += 1;
    if (d.stale) g.stale += 1;
    if (d.days > g.oldest) Object.assign(g, { oldest: d.days, fetched: d.fetched });
    byScript.set(key, g);
  }
  const order = [...DATASET_RULES.map((r) => r.script), "(no refresh script)"];
  for (const script of [...new Set(order)]) {
    const g = byScript.get(script);
    if (!g) continue;
    const mark = g.stale ? "STALE" : "ok   ";
    console.log(`  ${mark} ${script.padEnd(28)} oldest ${g.fetched} (${g.oldest} days; max ${g.maxDays}) · ${g.files} files · ${g.why}`);
  }

  console.log(`\nFacts in content/facts.yaml checked more than ${FACT_MAX_DAYS} days ago`);
  if (r.facts.length === 0) console.log("  none");
  for (const f of r.facts) console.log(`  ${f.key} (asOf ${f.asOf}, ${f.days} days)`);

  console.log("\nTimeline");
  if (r.timeline.newest) {
    const note = r.timeline.stale ? `older than ${TIMELINE_MAX_DAYS} days: add recent events to content/entities/events.yaml` : "ok";
    console.log(`  newest event ${r.timeline.newest} "${r.timeline.newestTitle}" (${r.timeline.days} days ago): ${note}`);
  } else console.log("  no events");

  console.log("\nWatchlist (content/watchlist.yaml)");
  if (r.watch.length === 0) console.log("  empty");
  for (const { item, status } of r.watch) {
    if (status === "later" && !all) continue;
    console.log(`  ${STATUS_LABEL[status].padEnd(9)} ${item.checkBy}  ${item.what}\n            then: ${item.then}`);
  }
  const later = r.watch.filter((w) => w.status === "later").length;
  if (later && !all) console.log(`  … and ${later} later (pnpm freshness --all)`);

  console.log("\nDated phrases from past years (consider a {{fact}} placeholder)");
  if (r.phrases.length === 0) console.log("  none");
  for (const p of r.phrases) console.log(`  ${p.file}:${p.line}  "${p.text}"`);

  for (const e of r.errors) console.error(`\nERROR ${e}`);
  console.log("");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = freshnessReport();
  // --summary: the one line `pnpm validate` prints (used by the Claude Code session hook).
  if (process.argv.includes("--summary")) console.log(freshnessSummary(report));
  else printFreshness(report, { all: process.argv.includes("--all") });
  if (report.errors.length) process.exit(1);
}
