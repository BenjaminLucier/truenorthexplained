/**
 * Smoke tests for the interactive parts: each drives a feature the way a
 * visitor would and checks the visible result. Every test also fails on
 * console errors and bad requests, like the page sweep.
 */
import { expect, test, type Page } from "@playwright/test";
import { watchPage } from "./helpers";

let problems: string[] = [];
test.beforeEach(({ page }) => {
  problems = watchPage(page);
});
test.afterEach(() => {
  expect(problems, "console errors and failed requests").toEqual([]);
});

/** Presses Tab until focus is inside `selector`, as a keyboard user would get there. */
async function tabInto(page: Page, selector: string, max = 300): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((s) => !!document.activeElement?.closest(s), selector)) return;
  }
  throw new Error(`Tab never reached ${selector}`);
}

test("theme toggle cycles system → light → dark and persists across reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  const button = page.locator("theme-toggle button");
  await expect(html).toHaveAttribute("data-theme-pref", "system");
  await expect(html).toHaveAttribute("data-theme", "light");

  await button.click();
  await expect(html).toHaveAttribute("data-theme-pref", "light");
  await button.click();
  await expect(html).toHaveAttribute("data-theme-pref", "dark");
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(button).toHaveAccessibleName(/dark/i);

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("tne-theme"))).toBe("dark");

  // Back to "system": nothing stored, and the OS scheme wins again.
  await button.click();
  await expect(html).toHaveAttribute("data-theme-pref", "system");
  await expect(html).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("tne-theme"))).toBeNull();
});

test("width toggle switches a content page to full width and remembers it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/learn/crown/");
  const html = page.locator("html");
  const toggle = page.locator("[data-width-toggle]").first();
  const col = page.locator(".tn-col").first();
  const narrow = (await col.boundingBox())!.width;

  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(html).toHaveAttribute("data-width", "full");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await col.boundingBox())!.width).toBeGreaterThan(narrow + 100);

  await page.goto("/learn/parliament/");
  await expect(html).toHaveAttribute("data-width", "full");
  await page.locator("[data-width-toggle]").first().click();
  await expect(html).not.toHaveAttribute("data-width", "full");
  await page.reload();
  await expect(html).not.toHaveAttribute("data-width", "full");
});

test("module menu is a popover below 106rem", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/learn/crown/reserve-powers/");
  await expect(page.locator(".module-rail")).toBeHidden();
  const menu = page.locator("#module-menu");
  await expect(menu).toBeHidden();
  await page.locator('[popovertarget="module-menu"]').click();
  await expect(menu).toBeVisible();
  await expect(menu.locator('[aria-current="page"]')).toHaveText(/reserve powers/i);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("module menu is a rail at 106rem and wider", async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 1000 });
  await page.goto("/learn/crown/reserve-powers/");
  const rail = page.locator(".module-rail");
  await expect(rail).toBeVisible();
  await expect(rail.locator('[aria-current="page"]')).toHaveText(/reserve powers/i);
  await expect(page.locator('[popovertarget="module-menu"]')).toBeHidden();
});

test("search dialog opens, finds pages with Pagefind, and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const dialog = page.locator("dialog.search-dialog");
  const opener = page.locator("[data-search-open]:visible").first();
  await opener.click();
  await expect(dialog).toBeVisible();
  await expect(page.locator("#search-input")).toBeFocused();

  await page.locator("#search-input").fill("senate");
  const results = page.locator("#search-results [role=option]");
  await expect(results.first()).toBeVisible();
  await expect(results.first()).toContainText(/senate/i);
  expect(await results.count()).toBeGreaterThan(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("ridings explorer finds a riding by name", async ({ page }) => {
  await page.goto("/ridings/");
  const explorer = page.locator("tn-ridings-explorer");
  await expect(explorer).toBeVisible();
  const search = explorer.locator("form.re-search");
  await search.locator("input").fill("Halifax West");
  await search.getByRole("button", { name: "Show" }).click();
  await expect(page.locator(".re-status")).toContainText("Showing Halifax West");
  const panel = page.locator(".re-panel");
  await expect(panel).toHaveAttribute("data-state", "shown");
  await expect(panel.locator(".re-details")).toBeVisible();
  await expect(panel.locator(".re-details")).toContainText("Halifax West");
  expect(page.url()).toMatch(/#r-\d+$/);

  await search.locator("input").fill("Nowhere-at-all");
  await search.getByRole("button", { name: "Show" }).click();
  await expect(page.locator(".re-status")).toContainText("No riding matches");
});

test("power sorter: sort every card with its buttons, then check", async ({ page }) => {
  await page.goto("/learn/federalism/division-of-powers/");
  const sorter = page.locator("tn-power-sorter").first();
  await sorter.scrollIntoViewIfNeeded();
  const pile = sorter.locator('[data-zone="pile"] [data-card]');
  const total = await pile.count();
  expect(total).toBeGreaterThan(3);
  const check = sorter.locator("[data-check]");
  await expect(check).toHaveAttribute("aria-disabled", "true");

  // Put every card in the column its data says is right, by keyboard-accessible buttons.
  for (let i = 0; i < total; i++) {
    const card = pile.first();
    const answer = await card.getAttribute("data-answer");
    await card.locator(`[data-move="${answer}"]`).click();
  }
  await expect(pile).toHaveCount(0);
  await expect(check).toHaveAttribute("aria-disabled", "false");
  await check.click();
  await expect(sorter.locator("[data-score-text]")).toHaveText(`All ${total} right. Well done!`);
  await expect(sorter.locator("[data-verdict-text]").first()).toHaveText("Correct");
  await expect(sorter.locator("[data-retry]")).toBeFocused();
});

test("chart tooltip works by keyboard", async ({ page }) => {
  await page.goto("/learn/elections/");
  await tabInto(page, "tn-chart");
  const chart = page.locator("tn-chart", { has: page.locator(":focus") });
  const tip = chart.locator(".ct-tip");
  await expect(tip).toBeVisible();
  const first = (await tip.textContent())?.trim() ?? "";
  expect(first.length).toBeGreaterThan(0);
  const firstStop = await page.evaluate(() => document.activeElement?.outerHTML);

  await page.keyboard.press("ArrowRight");
  await expect(tip).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.outerHTML)).not.toBe(firstStop);
  await expect(tip).not.toHaveText(first);
  await expect(chart).toHaveAttribute("data-active", /.*/);

  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
});

test("quiz: answering shows feedback and the attempt is remembered", async ({ page }) => {
  await page.goto("/learn/crown/");
  const question = page.locator("quiz-question").first();
  const id = (await question.getAttribute("data-id"))!;
  await question.scrollIntoViewIfNeeded();
  await question.locator("[data-option] input").first().check();
  await question.locator("[data-check]").click();

  const feedback = question.locator("[data-feedback] > div");
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute("data-result", /^(correct|incorrect)$/);
  await expect(question.locator("[data-retry]")).toBeVisible();
  const result = await feedback.getAttribute("data-result");

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("tne-quiz-v1") ?? "{}") as Record<string, { correct: boolean }>);
  expect(stored[id]?.correct).toBe(result === "correct");

  await page.reload();
  const badge = page.locator(`quiz-question[data-id="${id}"] [data-history]`);
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(result === "correct" ? /✓/ : /.+/);
});
