// SessionStart: one line on what may be out of date, so a session knows
// whether to suggest /current-events. Never blocks the session.
import { pnpm } from "./pnpm.mjs";

const r = pnpm("freshness", "--summary");
const line = (r.stdout ?? "").split("\n").find((l) => l.startsWith("Freshness:"));
if (line) console.log(`${line}\nRun /current-events to work through what's due.`);
