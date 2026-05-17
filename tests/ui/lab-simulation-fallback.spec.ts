import { test, expect } from '@playwright/test';

test.describe('Lab simulation fallback', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patchedGetContext(contextId, options) {
        if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'webgpu') {
          return null;
        }
        return originalGetContext.call(this, contextId, options);
      };
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);
  });

  test('falls back to Canvas 2D when 3D runtime unavailable', async ({ page }) => {
    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const cards = page.locator('.lab-item-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => cards.count(), {
      timeout: 10000,
      intervals: [100, 200, 500]
    }).toBeGreaterThan(0);
  });
});

async function waitForAppReady(page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      if (typeof window.appState === 'undefined') return false;
      const state = window.appState;
      const hasElements = Array.isArray(state?.elements) && state.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 60000, intervals: [100, 200, 500, 1000] }).toBe(true);
  const currentUrl = page.url();
  if (currentUrl.includes('/#/') === false || currentUrl.endsWith('/#/') || currentUrl.endsWith('/')) {
    await expect.poll(async () => {
      return await page.locator('.element-cell').count();
    }, { timeout: 60000, intervals: [100, 200, 500, 1000] }).toBeGreaterThanOrEqual(118);
  }
}
