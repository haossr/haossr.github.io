// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4000',
    headless: true,
    viewport: { width: 1280, height: 720 }
  },
  fullyParallel: true,
  reporter: [['list']]
});
