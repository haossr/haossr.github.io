const { test, expect } = require('@playwright/test');

const zh = require('./fixtures/reading-zh.json');
const en = require('./fixtures/reading-en.json');
const es = require('./fixtures/reading-es.json');
const fr = require('./fixtures/reading-fr.json');

const fulfillJson = (route, data) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data)
  });

test.describe('reading page', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.route('**/assets/json/reading.json', (route) => fulfillJson(route, zh));
    await page.route('**/assets/json/reading-en.json', (route) => fulfillJson(route, en));
    await page.route('**/assets/json/reading-es.json', (route) => fulfillJson(route, es));
    await page.route('**/assets/json/reading-fr.json', (route) => fulfillJson(route, fr));
    await page.goto(`${baseURL}/reading/?id=r1&lang=zh`);
    await page.waitForSelector('.reading-quote');
  });

  test('renders initial excerpt and timeline markers', async ({ page }) => {
    await expect(page.locator('.reading-quote')).toHaveText(/摘录 zh 1/);
    await expect(page.locator('.timeline-mark')).toHaveCount(zh.length);
  });

  test('language switch keeps id and updates content', async ({ page }) => {
    await page.click('#lang-trigger');
    await page.click('.lang-menu-item[data-lang="en"]');
    await expect(page.locator('.reading-quote')).toHaveText(/quote en 1/);
    const url = new URL(page.url());
    expect(url.searchParams.get('id')).toBe('r1');
    expect(url.searchParams.get('lang')).toBe('en');
  });

  test('keyboard shortcuts change language', async ({ page }) => {
    await page.keyboard.press('f');
    await expect(page.locator('.reading-quote')).toHaveText(/citation fr 1/);
    const url = new URL(page.url());
    expect(url.searchParams.get('lang')).toBe('fr');
  });

  test('chrono navigation follows timestamps', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.reading-quote')).toHaveText(/摘录 zh 2/);
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.reading-quote')).toHaveText(/摘录 zh 3/);
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.reading-quote')).toHaveText(/摘录 zh 2/);
  });

  test('share link updates when moving chronologically', async ({ page }) => {
    const shareButton = page.locator('#share-reading');
    await expect(shareButton).toBeEnabled();

    const initialShare = await shareButton.getAttribute('data-share-url');
    expect(initialShare).not.toBeNull();
    if (initialShare) {
      const params = new URL(initialShare).searchParams;
      expect(params.get('id')).toBe('r1');
      expect(params.get('lang')).toBe('zh');
    }

    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.reading-quote')).toHaveText(/摘录 zh 2/);

    const updatedShare = await shareButton.getAttribute('data-share-url');
    expect(updatedShare).not.toBeNull();
    if (updatedShare) {
      const params = new URL(updatedShare).searchParams;
      expect(params.get('id')).toBe('r2');
      expect(params.get('lang')).toBe('zh');
    }
    const url = new URL(page.url());
    expect(url.searchParams.get('id')).toBe('r2');
    expect(url.searchParams.get('lang')).toBe('zh');
  });

  test('keyboard shortcut selects Spanish and preserves id', async ({ page }) => {
    await page.keyboard.press('s');
    await expect(page.locator('.reading-quote')).toHaveText(/cita es 1/);
    const url = new URL(page.url());
    expect(url.searchParams.get('id')).toBe('r1');
    expect(url.searchParams.get('lang')).toBe('es');

    const shareUrl = await page.locator('#share-reading').getAttribute('data-share-url');
    expect(shareUrl).not.toBeNull();
    if (shareUrl) {
      const params = new URL(shareUrl).searchParams;
      expect(params.get('id')).toBe('r1');
      expect(params.get('lang')).toBe('es');
    }
  });
});
