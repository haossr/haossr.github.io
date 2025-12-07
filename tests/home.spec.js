const { test, expect } = require('@playwright/test');

test.describe('home page mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('avatar centered and bio left-aligned; lucky button right aligned', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);

    const photo = page.locator('.profile-photo');
    await expect(photo).toBeVisible();
    const box = await photo.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    if (box && viewport) {
      const photoCenter = box.x + box.width / 2;
      const screenCenter = viewport.width / 2;
      expect(Math.abs(photoCenter - screenCenter)).toBeLessThanOrEqual(8);
    }

    const firstBio = page.locator('#bio').locator('p').first();
    const align = await firstBio.evaluate((el) => getComputedStyle(el).textAlign);
    expect(align).toBe('left');

    const luckyAlign = await page
      .locator('.lucky-wrapper')
      .evaluate((el) => getComputedStyle(el).textAlign);
    expect(luckyAlign).toBe('right');
  });
});
