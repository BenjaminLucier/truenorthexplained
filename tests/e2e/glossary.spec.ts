/**
 * The glossary: definition popovers on content pages, the `/glossary#slug`
 * anchors every glossary link relies on, the filter box and search.
 * Like interactions.spec.ts, every test also fails on console errors and bad requests.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { watchPage } from "./helpers";

const SLUGS = readdirSync(join(import.meta.dirname, "../../content/glossary"))
  .filter((f) => f.endsWith(".en.md"))
  .map((f) => f.replace(/\.en\.md$/, ""));

let problems: string[] = [];
test.beforeEach(({ page }) => {
  problems = watchPage(page);
});
test.afterEach(() => {
  expect(problems, "console errors and failed requests").toEqual([]);
});

/** Presses Tab until `target` has focus, as a keyboard user would get there. */
async function tabTo(page: Page, target: Locator, max = 300): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("never reached the element by Tab");
}

test("glossary popover: hovering an entity link shows the definition", async ({ page }) => {
  await page.goto("/learn/big-picture/");
  const link = page.locator('article a[data-entity="term:riding"]').first();
  const pop = page.locator("#gloss-riding");
  await expect(pop).toBeHidden();
  await link.hover();
  await expect(pop).toBeVisible();
  await expect(pop).toContainText("Riding");
  await expect(pop).toContainText("An electoral district that elects one member.");
  await expect(pop.getByRole("link", { name: /open in glossary/i })).toHaveAttribute("href", "/glossary#riding");
  await expect(link).toHaveAttribute("aria-describedby", /gloss-riding/);
  await page.mouse.move(0, 0);
  await expect(pop).toBeHidden();
});

test("glossary popover: focusing a plain /glossary# link by keyboard shows the definition", async ({ page }) => {
  await page.goto("/learn/law/supreme-court/");
  const link = page.locator('article a[href="/glossary#puisne-judges"]').first();
  const pop = page.locator("#gloss-puisne-judges");
  await tabTo(page, link);
  await expect(pop).toBeVisible();
  await expect(pop).toContainText("Puisne judges");
  await expect(pop).toContainText("other than the Chief Justice");
  await page.keyboard.press("Escape");
  await expect(pop).toBeHidden();
});

test("/glossary has an anchor for every term, and /glossary#slug lands on it", async ({ page }) => {
  await page.goto("/glossary");
  const ids = await page.$$eval("h3[id]", (els) => els.map((e) => e.id));
  expect(SLUGS.length).toBeGreaterThan(400);
  expect(SLUGS.filter((s) => !ids.includes(s)), "terms without an anchor").toEqual([]);
  // Letter headings keep their old ids too.
  await expect(page.locator("h2#a")).toHaveText("A");

  for (const slug of ["reserve-powers", "agents-of-parliament"]) {
    await page.goto(`/glossary#${slug}`);
    const heading = page.locator(`h3#${slug}`);
    await expect(heading).toBeInViewport();
  }
  // An alias points to its target.
  await expect(page.locator(".gl-entry", { has: page.locator("h3#agents-of-parliament") }).getByRole("link", { name: "Officers of Parliament" })).toHaveAttribute(
    "href",
    "/glossary#officers-of-parliament",
  );
});

test("glossary entries list where a term is explained and mentioned", async ({ page }) => {
  await page.goto("/glossary");
  const riding = page.locator(".gl-entry", { has: page.locator("h3#riding") });
  await expect(riding.locator("dt", { hasText: "Explained in" }).locator("+ dd")).toContainText("How a federal election runs");
  await expect(riding.locator("dt", { hasText: "Mentioned in" }).locator("+ dd")).toContainText("The big picture");
});

test("glossary filter narrows the list and Escape clears it", async ({ page }) => {
  await page.goto("/glossary");
  const entries = page.locator(".gl-entry");
  const total = await entries.count();
  const input = page.getByRole("searchbox", { name: "Filter terms" });
  await input.fill("senat");
  const visible = page.locator(".gl-entry:visible h3");
  await expect(visible.first()).toBeVisible();
  const shown = await visible.allTextContents();
  expect(shown.length).toBeLessThan(total);
  for (const term of shown) expect(term.toLowerCase()).toContain("senat");
  await expect(page.getByRole("status")).toHaveText(`${shown.length} terms match`);

  await input.fill("zzzz");
  await expect(page.getByText("No terms match.")).toBeVisible();

  await input.press("Escape");
  await expect(input).toHaveValue("");
  await expect(page.locator(".gl-entry:visible")).toHaveCount(total);
});

test("search finds a word that only the glossary uses", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-search-open]:visible").first().click();
  // "Fourteen" appears only in the definition of "Douglas Treaties" (the glossary widget's content).
  await page.locator("#search-input").fill("fourteen");
  const results = page.locator("#search-results [role=option] a");
  await expect(results.first()).toBeVisible();
  // The page, and possibly the letter section it's under.
  for (const href of await results.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) expect(href).toMatch(/^\/glossary\/?(#|$)/);
});
