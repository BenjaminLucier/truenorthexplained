// Runs a pnpm script from a Claude Code hook with the project's Node version
// (.nvmrc via fnm when it's installed; otherwise whatever node is on PATH).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const has = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" }).status === 0;

export function pnpm(...args) {
  let cmd = "pnpm";
  let argv = ["-s", ...args];
  if (has("fnm")) {
    const version = readFileSync(join(root, ".nvmrc"), "utf8").trim();
    cmd = "fnm";
    argv = ["exec", `--using=${version}`, "pnpm", ...argv];
  }
  return spawnSync(cmd, argv, { cwd: root, encoding: "utf8", timeout: 60_000 });
}
