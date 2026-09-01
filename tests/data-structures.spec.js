const { test, expect } = require('@playwright/test');

const unpublishedPaths = [
  '/writing/data-structures-for-the-agentic-age/',
  '/writing/data-structures-for-the-agentic-age/en/',
  '/assets/css/data-structures-essay.css',
  '/assets/image/calendar-thread-filesystem-attention-zh.png',
  '/assets/image/calendar-thread-filesystem-attention-en.png'
];

for (const path of unpublishedPaths) {
  test(`${path} is not published`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  });
}
