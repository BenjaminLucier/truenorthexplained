/**
 * `pnpm sources`: every external link the site cites (src/lib/sources.ts).
 *
 *   pnpm sources                     counts by host
 *   pnpm sources --list              every link and where it's cited
 *   pnpm sources --check             fetch each link and report what isn't ok
 *   pnpm sources --check --host canada.ca,parl.ca   only these hosts (suffix match)
 *   pnpm sources --check --json      machine-readable results on stdout
 *
 * Checking is polite: one generic User-Agent, at most 8 requests in flight and
 * 2 per host, HEAD first and GET when HEAD isn't allowed. Hosts known to block
 * automated requests (BLOCKING_HOSTS) are not fetched at all; they're listed
 * for a person to check in a browser. Never work around a bot check.
 *
 * Exits 0 unless --strict is given and something is broken.
 */
import { BLOCKING_HOSTS, classify, collectSources, type CheckStatus, type SourceLink } from "../src/lib/sources.ts";

const USER_AGENT = "tne-link-check/1.0 (educational static site; checks cited sources)";
const TIMEOUT_MS = 20_000;
const MAX_ACTIVE = 8;
const MAX_PER_HOST = 2;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

interface Result extends SourceLink {
  status: CheckStatus;
  code: number | null;
  finalUrl?: string;
  error?: string;
}

async function fetchOnce(url: string, method: "HEAD" | "GET"): Promise<{ code: number; finalUrl: string }> {
  const res = await fetch(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf,*/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await res.body?.cancel();
  return { code: res.status, finalUrl: res.url };
}

async function check(link: SourceLink): Promise<Result> {
  if (BLOCKING_HOSTS.includes(link.host)) return { ...link, status: "blocked", code: null, error: "host blocks automated checks; check in a browser" };
  try {
    let r = await fetchOnce(link.url, "HEAD");
    // Many servers answer HEAD wrongly (405, 403, 404 or 5xx); GET is the real answer.
    if (r.code >= 400) r = await fetchOnce(link.url, "GET");
    return { ...link, status: classify(link.url, r.code, r.finalUrl), code: r.code, finalUrl: r.finalUrl !== link.url ? r.finalUrl : undefined };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    return { ...link, status: "error", code: null, error: err.cause?.code ?? err.name ?? String(e) };
  }
}

/** Runs `check` over the links with global and per-host limits. */
async function checkAll(links: SourceLink[], onDone: (n: number) => void): Promise<Result[]> {
  const results: Result[] = [];
  const queue = [...links];
  const perHost = new Map<string, number>();
  let active = 0;
  let done = 0;
  await new Promise<void>((resolve) => {
    const pump = () => {
      if (queue.length === 0 && active === 0) return resolve();
      for (let i = 0; i < queue.length && active < MAX_ACTIVE; ) {
        const link = queue[i]!;
        if ((perHost.get(link.host) ?? 0) >= MAX_PER_HOST) {
          i++;
          continue;
        }
        queue.splice(i, 1);
        active++;
        perHost.set(link.host, (perHost.get(link.host) ?? 0) + 1);
        void check(link).then((r) => {
          results.push(r);
          active--;
          perHost.set(link.host, perHost.get(link.host)! - 1);
          onDone(++done);
          pump();
        });
      }
    };
    pump();
  });
  return results.sort((a, b) => a.host.localeCompare(b.host) || a.url.localeCompare(b.url));
}

const where = (l: SourceLink) => l.refs.map((r) => `${r.file}:${r.line}${r.unverified ? " (marked unverified)" : ""}`).join(", ");

let links = collectSources();
const hosts = option("--host")?.split(",").filter(Boolean);
if (hosts) links = links.filter((l) => hosts.some((h) => l.host === h || l.host.endsWith(`.${h}`)));

if (!flag("--check")) {
  if (flag("--list")) for (const l of links) console.log(`${l.url}\n    ${where(l)}`);
  else {
    const byHost = new Map<string, number>();
    for (const l of links) byHost.set(l.host, (byHost.get(l.host) ?? 0) + 1);
    for (const [h, n] of [...byHost].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}  ${h}`);
    console.log(`\n${links.length} links on ${byHost.size} hosts. Add --list to see where each is cited, --check to fetch them.`);
  }
  process.exit(0);
}

const json = flag("--json");
const results = await checkAll(links, (n) => {
  if (!json && process.stderr.isTTY) process.stderr.write(`\rchecked ${n}/${links.length}`);
});
if (!json && process.stderr.isTTY) process.stderr.write("\n");

if (json) {
  console.log(JSON.stringify({ checked: new Date().toISOString(), results }, null, 2));
} else {
  const order: CheckStatus[] = ["broken", "error", "moved", "blocked"];
  const label: Record<CheckStatus, string> = {
    broken: "Broken (404 or 410): find the page's new address or another source",
    error: "Errors (timeouts, server errors, DNS): retry later before changing anything",
    moved: "Moved (redirected to another page): confirm the new page says the same, then cite it",
    blocked: "Blocked (the site refuses automated checks): check these in a browser",
    ok: "",
  };
  for (const s of order) {
    const rs = results.filter((r) => r.status === s);
    if (rs.length === 0) continue;
    console.log(`\n${label[s]} (${rs.length})`);
    for (const r of rs) {
      console.log(`  ${r.code ?? r.error ?? ""} ${r.url}`);
      if (r.finalUrl) console.log(`      → ${r.finalUrl}`);
      console.log(`      ${where(r)}`);
    }
  }
  const count = (s: CheckStatus) => results.filter((r) => r.status === s).length;
  const nowOk = results.filter((r) => r.status === "ok" && r.refs.some((ref) => ref.unverified));
  if (nowOk.length) {
    console.log(`\nMarked unverified but loaded fine (${nowOk.length}): open each to confirm it says what's cited, then drop the marker`);
    for (const r of nowOk) console.log(`  ${r.url}\n      ${where(r)}`);
  }
  console.log(
    `\n${results.length} links: ${count("ok")} ok, ${count("moved")} moved, ${count("broken")} broken, ${count("error")} errors, ${count("blocked")} blocked`,
  );
}

if (flag("--strict") && results.some((r) => r.status === "broken")) process.exit(1);
