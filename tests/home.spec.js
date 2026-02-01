const { test, expect } = require('@playwright/test');

test.describe('home page mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('avatar centered and bio left-aligned; lucky button right aligned; footer links match body typography', async ({ page, baseURL }) => {
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

    // Footer links should look like normal text links (not pill buttons).
    const bodyTypography = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight };
    });

    const footerLinkTypography = await page.locator('.primary-links a').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        borderRadius: s.borderRadius,
        borderStyle: s.borderStyle,
        backgroundColor: s.backgroundColor,
        display: s.display
      };
    });

    expect(footerLinkTypography.fontFamily).toBe(bodyTypography.fontFamily);
    expect(footerLinkTypography.fontSize).toBe(bodyTypography.fontSize);
    expect(footerLinkTypography.fontWeight).toBe(bodyTypography.fontWeight);

    // Ensure we didn't regress to the previous pill/button look.
    expect(footerLinkTypography.display).toBe('inline');
    expect(footerLinkTypography.borderStyle).toBe('none');
    expect(footerLinkTypography.borderRadius).toBe('0px');
    expect(footerLinkTypography.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});
