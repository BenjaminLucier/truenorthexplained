/**
 * The page sweep: every built page, at phone and desktop width, in both themes.
 *
 * Fails on console errors, uncaught exceptions, failed or 4xx/5xx requests,
 * requests to other hosts, horizontal overflow, and axe violations of impact
 * "serious" or "critical". Each failure names the page, viewport, theme, and
 * the rule and selector involved.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { builtPages, useTheme, watchPage, type Theme } from "./helpers";

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
];
const THEMES: Theme[] = ["light", "dark"];

/**
 * Deliberate, narrow axe exclusions. Each entry is a rule id and the selectors
 * it is not checked against, with the reason. Keep this list short.
 */
const AXE_EXCLUDE: { rule: string; selector: string; why: string }[] = [
];

for (const path of builtPages()) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${path} @ ${viewport.width}px, ${theme}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await useTheme(page, theme);
        // /404.html is the not-found page; serving it with a 404 is correct.
        const problems = watchPage(page, { allowStatus: (url, status) => status === 404 && new URL(url).pathname === "/404.html" });

        await page.goto(path, { waitUntil: "load" });
        // Let fonts load and entrance animations and transitions finish, so axe
        // measures colours as they end up rather than mid-fade.
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise((r) => requestAnimationFrame(r));
          const finite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
          await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
        });

        expect(await page.locator("html").getAttribute("data-theme"), "theme applied").toBe(theme);

        // Horizontal overflow, with the outermost elements that stick out.
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const limit = doc.clientWidth;
          if (doc.scrollWidth <= limit) return null;
          const describe = (el: Element) => {
            const id = el.id ? `#${el.id}` : "";
            const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
            return `${el.tagName.toLowerCase()}${id}${cls}`;
          };
          const culprits: string[] = [];
          for (const el of document.body.querySelectorAll("*")) {
            const box = el.getBoundingClientRect();
            if (box.width === 0 || box.right <= limit + 1) continue;
            // Only the outermost offender: skip it if its parent already overflows.
            const parent = el.parentElement?.getBoundingClientRect();
            if (parent && parent.right > limit + 1) continue;
            culprits.push(`${describe(el)} (right edge ${Math.round(box.right)}px)`);
            if (culprits.length >= 5) break;
          }
          return `document is ${doc.scrollWidth}px wide in a ${limit}px viewport: ${culprits.join("; ") || "no single element found"}`;
        });
        if (overflow) problems.push(`horizontal overflow: ${overflow}`);

        const axe = new AxeBuilder({ page });
        const results = await axe.analyze();
        for (const v of results.violations) {
          if (v.impact !== "serious" && v.impact !== "critical") continue;
          for (const node of v.nodes) {
            const selector = node.target.join(" ");
            if (AXE_EXCLUDE.some((x) => x.rule === v.id && selector.includes(x.selector))) continue;
            const detail = node.failureSummary?.split("\n").slice(1).join(" ").trim();
            problems.push(`axe ${v.impact} ${v.id}: ${selector}${detail ? ` (${detail})` : ""}`);
          }
        }

        expect(problems, `${path} at ${viewport.width}px in the ${theme} theme`).toEqual([]);
      });
    }
  }
}
