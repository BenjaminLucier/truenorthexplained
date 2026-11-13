/**
 * scripts/validate.ts (`pnpm validate`) against the real repository, as a child
 * process: it exits 0 and prints its summary lines. Counts change with the
 * content, so only the shape of each line is checked.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const tsx = join(dirname(createRequire(import.meta.url).resolve("tsx/package.json")), "dist/cli.mjs");

describe("pnpm validate", () => {
  it("passes on the repository and prints its summary", { timeout: 60_000 }, () => {
    const run = spawnSync(process.execPath, [tsx, "scripts/validate.ts"], { cwd: root, encoding: "utf8" });
    expect(run.stderr + run.stdout).not.toMatch(/^ERROR /m);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const lines = run.stdout.trim().split("\n");
    for (const re of [
      /^Pages: \d+ {2}status: \{.*\}$/,
      /^Glossary terms: \d+ \(\d+ aliases\)$/,
      /^Quiz questions: \d+$/,
      /^Review markers: \d+ check comments, \d+ unverified links$/,
      /^Entities: \d+ \(person \d+, org \d+, doc \d+, case \d+, event \d+, term \d+\) {2}entity links: \d+ {2}about ids: \d+$/,
      /^Facts: \d+ defined, \d+ used in \d+ placeholders$/,
    ]) {
      expect(lines.some((l) => re.test(l)), `no line matching ${re}`).toBe(true);
    }
    // Anything after the summary is a NOTE or WARN line.
    for (const l of lines.filter((l) => /^[A-Z]{4,5} /.test(l))) expect(l).toMatch(/^(NOTE|WARN) {1,2}\S/);
    expect(run.stdout).toContain("NOTE  person:daniel-johnson is taken");
  });
});
