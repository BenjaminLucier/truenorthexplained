// PostToolUse (Edit|Write|MultiEdit): after a change under content/, run
// `pnpm validate` (under a second). On errors, exit 2 so they go back to
// Claude to fix; otherwise stay quiet.
import { relative } from "node:path";
import { pnpm, root } from "./pnpm.mjs";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input || "{}")?.tool_input?.file_path ?? "";
const rel = relative(root, file);
if (!rel.startsWith("content/") || !/\.(md|ya?ml)$/.test(rel)) process.exit(0);

const r = pnpm("validate");
if (r.status === 0) process.exit(0);
const out = `${r.stdout ?? ""}${r.stderr ?? ""}`
  .split("\n")
  .filter((l) => /error|ERROR|✗|not found|unknown|missing/i.test(l))
  .slice(0, 40)
  .join("\n");
console.error(`pnpm validate failed after editing ${rel}:\n${out || (r.stdout ?? "").slice(-3000)}`);
process.exit(2);
