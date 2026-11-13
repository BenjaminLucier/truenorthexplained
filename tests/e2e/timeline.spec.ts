/**
 * The timeline built from event and case entities: deep links (new ids and the
 * older derived anchors), links from an event card to the people involved, and
 * case homes on the landmark-cases page. Like interactions.spec.ts, every test
 * also fails on console errors and bad requests.
 */
import { expect, test, type Page } from "@playwright/test";
import { getEntity } from "../../src/lib/entities";
import { watchPage } from "./helpers";

let problems: string[] = [];
test.beforeEach(({ page }) => {
  problems = watchPage(page);
});
test.afterEach(() => {
  expect(problems, "console errors and failed requests").toEqual([]);
});

/** The card is the deep-link target, the track's current stop, and on screen inside the track. */
async function expectRevealed(page: Page, id: string) {
  const card = page.locator(`li.tl-event#${id}`);
  await expect(card).toHaveAttribute("data-target", "");
  await expect(card).toHaveAttribute("tabindex", "0");
  await expect(async () => {
    const box = (await card.locator(".tl-card").boundingBox())!;
    const track = (await page.locator("[data-track]").first().boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(track.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(track.x + track.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height);
  }).toPass({ timeout: 5000 });
}

for (const width of [375, 1280]) {
  test(`/timeline#king-byng-affair reveals that event (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/timeline#king-byng-affair");
    await expectRevealed(page, "king-byng-affair");
    // Keyboard: the arrow keys move on from the revealed card.
    await page.locator("li.tl-event#king-byng-affair").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("li.tl-event#imperial-conference-1926")).toBeFocused();
  });
}

test("the timeline's older anchors still reveal the same event", async ({ page }) => {
  await page.goto("/timeline#event-1926-king-byng-affair-governor");
  await expectRevealed(page, "king-byng-affair");
  // Era headings keep their old ids too.
  await expect(page.locator("#building-the-country-18671923")).toHaveCount(1);
});

test("an event card links to the people involved", async ({ page }) => {
  await page.goto("/timeline#king-byng-affair");
  const king = getEntity("person:william-lyon-mackenzie-king");
  const link = page.locator("li#king-byng-affair .tl-rel a", { hasText: "Mackenzie King" });
  await expect(link).toHaveAttribute("href", king.href);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${king.href.replace(/[.#]/g, "\\$&")}$`));
  await expect(page.locator(`#${king.href.split("#")[1]}`)).toBeVisible();
});

test("a court-case event links to the case, and the case has its home on the landmark-cases page", async ({ page }) => {
  await page.goto("/timeline#r-v-oakes");
  const link = page.locator("li#r-v-oakes .tl-rel a", { hasText: "R. v. Oakes" });
  await expect(link).toHaveAttribute("href", "/learn/charter/landmark-cases#r-v-oakes");
  await link.click();
  await expect(page.locator("h3#r-v-oakes")).toBeInViewport();
});

test("landmark cases: each case card links to its write-up, and old heading anchors still exist", async ({ page }) => {
  await page.goto("/learn/charter/landmark-cases");
  const titles = page.locator("tn-timeline .tl-title a");
  await expect(titles).toHaveCount(8);
  for (const href of await titles.evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
    await expect(page.locator(`h3${href}`)).toHaveCount(1);
  }
  await expect(page.locator("#r-v-oakes-1986-the-test-for-reasonable-limits")).toHaveCount(1);
  // Filters still group by Charter part.
  await page.locator(".tl-chip", { hasText: "Legal rights" }).click();
  await expect(page.locator("tn-timeline [data-status]")).toHaveText("Showing 4 of 8 cases: Legal rights (ss. 7–14)");
});

test("a page lists the timeline events that link to it", async ({ page }) => {
  await page.goto("/learn/crown/reserve-powers");
  const nav = page.getByRole("navigation", { name: "On the timeline" });
  await expect(nav.getByRole("link", { name: /1926 The King–Byng affair/ })).toHaveAttribute("href", "/timeline#king-byng-affair");
});
