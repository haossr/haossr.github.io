const { test, expect } = require('@playwright/test');

const articlePath = '/writing/data-structures-for-the-agentic-age/';
const englishPath = `${articlePath}en/`;

const versions = [
  {
    name: 'Chinese',
    path: articlePath,
    htmlLang: 'zh-CN',
    title: 'Agentic 时代，Human Attention 的数据结构',
    image: 'calendar-thread-filesystem-attention-zh.png',
    modelPrompt: '【大模型提示词】',
    counterpart: englishPath
  },
  {
    name: 'English',
    path: englishPath,
    htmlLang: 'en',
    title: 'The Data Structures of Human Attention in the Agentic Age',
    image: 'calendar-thread-filesystem-attention-en.png',
    modelPrompt: '[Prompt for language models]',
    counterpart: articlePath
  }
];

for (const version of versions) {
  test(`${version.name} article renders as a complete localized page`, async ({ page }) => {
    const response = await page.goto(version.path);

    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', version.htmlLang);
    await expect(page.locator('h1')).toHaveText(version.title);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${version.path.replaceAll('/', '\\/')}$`));

    const alternates = page.locator('link[rel="alternate"]');
    await expect(alternates).toHaveCount(3);
    await expect(page.locator('link[hreflang="zh-Hans"]')).toHaveAttribute('href', new RegExp(`${articlePath.replaceAll('/', '\\/')}$`));
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', new RegExp(`${englishPath.replaceAll('/', '\\/')}$`));
    await expect(page.locator('.language-switch')).toHaveAttribute('href', version.counterpart);

    const figure = page.locator('.attention-figure img');
    await expect(figure).toHaveAttribute('src', new RegExp(version.image));
    await figure.scrollIntoViewIfNeeded();
    await expect.poll(() => figure.evaluate((img) => img.naturalWidth)).toBeGreaterThan(1000);

    await expect(page.locator('.intersection-card')).toHaveCount(3);
    await expect(page.locator('.references > li')).toHaveCount(14);
    await expect(page.locator('.model-prompt')).toContainText(version.modelPrompt);

    const missingTargets = await page.locator('sup a[href^="#ref-"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href) => !document.querySelector(href))
    );
    expect(missingTargets).toEqual([]);
  });

  for (const width of [390, 320]) {
    test(`${version.name} article has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(version.path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
}
