const { test, expect } = require('@playwright/test');

test.describe('writing comments fail-closed defaults', () => {
  test('does not render or load Disqus when comments are globally disabled', async ({ page, baseURL }) => {
    let disqusRequests = 0;
    const disqusErrors = [];

    page.on('request', (request) => {
      if (request.url().includes('.disqus.com/embed.js')) {
        disqusRequests += 1;
      }
    });

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text().toLowerCase();
      if (text.includes('disqus') || text.includes('comments')) {
        disqusErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      const text = String(error).toLowerCase();
      if (text.includes('disqus') || text.includes('comments')) {
        disqusErrors.push(String(error));
      }
    });

    await page.goto(`${baseURL}/writing/the-real-flywheel/`);

    await expect(page.locator('section[aria-label="Comments"]')).toHaveCount(0);
    expect(disqusRequests).toBe(0);
    expect(disqusErrors).toEqual([]);
  });
});
