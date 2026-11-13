/**
 * Shared pieces for the end-to-end tests: the list of built pages, theme
 * setup, and a collector for console errors and bad requests.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Page } from "@playwright/test";

const DIST = join(import.meta.dirname, "../../dist");

/**
 * Every built page as a site path ("/", "/learn/crown/", "/404.html"), found by
 * walking dist/ so new pages are covered without editing the tests.
 */
export function builtPages(): string[] {
  if (!existsSync(DIST)) throw new Error("dist/ is missing: run `pnpm build` first (or use `pnpm test:e2e`, which builds).");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Pagefind's index and Astro's bundles hold no pages.
        if (entry.name !== "pagefind" && entry.name !== "_astro") walk(full);
      } else if (entry.name.endsWith(".html")) {
        const rel = relative(DIST, full).split(sep).join("/");
        out.push(rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -"index.html".length)}` : `/${rel}`);
      }
    }
  };
  walk(DIST);
  return out.sort();
}

export type Theme = "light" | "dark";

/**
 * Sets the theme the way a visitor's choice is stored (localStorage "tne-theme",
 * read by src/components/ThemeScript.astro before first paint), and emulates the
 * matching OS colour scheme.
 */
export async function useTheme(page: Page, theme: Theme): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("tne-theme", t);
    } catch {
      /* about:blank has no storage */
    }
  }, theme);
}

/**
 * Records console errors, uncaught exceptions, failed requests and 4xx/5xx
 * responses. Requests to other hosts are blocked (the site must be
 * self-contained) and reported.
 */
export function watchPage(page: Page, { allowStatus }: { allowStatus?: (url: string, status: number) => boolean } = {}) {
  const problems: string[] = [];
  const blocked = new Set<string>();
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console error: ${msg.text()} (${msg.location().url || "inline"})`);
  });
  page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
  page.on("requestfailed", (req) => {
    const failure = req.failure()?.errorText ?? "failed";
    // Navigations cut short by the test itself aren't the site's fault.
    if (failure === "net::ERR_ABORTED" && req.isNavigationRequest()) return;
    if (blocked.has(req.url())) return;
    problems.push(`request failed: ${req.url()} (${failure})`);
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400 && !allowStatus?.(res.url(), status)) problems.push(`HTTP ${status}: ${res.url()}`);
  });
  void page.route(
    (url) => url.protocol.startsWith("http") && !/^(localhost|127\.0\.0\.1)$/.test(url.hostname),
    (route) => {
      blocked.add(route.request().url());
      problems.push(`request to another host: ${route.request().url()}`);
      void route.abort("blockedbyclient");
    },
  );
  return problems;
}
