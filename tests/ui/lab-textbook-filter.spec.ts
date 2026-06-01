import { test, expect } from '@playwright/test';

test('lab textbook filter runtime check', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://127.0.0.1:4173/#/lab');
  await page.waitForSelector('.lab-toolbar', { timeout: 10000 });

  // Default: all cards visible
  const defaultCards = await page.locator('.lab-item-card').count();
  expect(defaultCards).toBeGreaterThan(0);

  // Select a specific textbook (first non-all option)
  const textbookSelect = page.locator('[data-lab-filter="textbook"]');
  const options = await textbookSelect.locator('option').allInnerTexts();
  const firstTextbookOption = options.find(o => o !== '全部教材');
  expect(firstTextbookOption).toBeTruthy();

  await textbookSelect.selectOption({ label: firstTextbookOption });
  await page.waitForTimeout(500);

  const filteredCards = await page.locator('.lab-item-card').count();
  // Should show fewer or equal cards than default
  expect(filteredCards).toBeLessThanOrEqual(defaultCards);

  // No console errors
  expect(errors).toEqual([]);

  // Write evidence
  const result = {
    status: 'pass',
    defaultCards,
    selectedTextbook: firstTextbookOption,
    filteredCards,
    consoleErrors: errors,
    timestamp: new Date().toISOString()
  };
  const fs = await import('fs');
  fs.writeFileSync('.sisyphus/evidence/task-3-filter-runtime.json', JSON.stringify(result, null, 2));
});
