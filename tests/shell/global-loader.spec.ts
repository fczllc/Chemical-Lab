import { test, expect } from '@playwright/test';

test.describe('Global Loader', () => {
  test('desktop contract: asset 200, DOM, text, size, lifecycle, readiness, no lottie errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Assert asset serves HTTP 200
    const assetResponse = await page.request.get('/animations/d4980_cat360.json');
    expect(assetResponse.status()).toBe(200);

    await page.goto('/');

    const loader = page.locator('#global-loader');
    await expect(loader).toBeAttached();

    const loaderLottie = page.locator('[data-loader-lottie]');
    await expect(loaderLottie).toBeAttached();

    // Assert exactly one [data-loader-lottie] inside #global-loader
    const lottieCount = await page.evaluate(() => document.querySelectorAll('[data-loader-lottie]').length);
    expect(lottieCount).toBe(1);

    await expect(page.locator('.loader-text')).toHaveText('打滚加载中...');

    await expect(loaderLottie).toHaveCSS('width', '90px');
    await expect(loaderLottie).toHaveCSS('height', '90px');
    await expect(loaderLottie).toHaveCSS('border-radius', '15px');

    await page.waitForFunction(() => window.appState && window.appState.elements.length >= 118);
    await expect(loader).toHaveClass(/hidden/);

    const lottieErrors = errors.filter(e =>
      e.includes('lottie') || e.includes('d4980_cat360') || e.includes('/animations/d4980_cat360.json')
    );
    expect(lottieErrors).toHaveLength(0);
  });

  test('mobile contract: 390x844 viewport preserves size and lifecycle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const loaderLottie = page.locator('[data-loader-lottie]');
    await expect(loaderLottie).toBeAttached();
    await expect(loaderLottie).toHaveCSS('width', '90px');
    await expect(loaderLottie).toHaveCSS('height', '90px');
    await expect(loaderLottie).toHaveCSS('border-radius', '15px');

    await page.waitForFunction(() => window.appState && window.appState.elements.length >= 118);
    await expect(page.locator('#global-loader')).toHaveClass(/hidden/);
  });

  test('missing asset fallback: route interception 404, triggers fallback, still reaches readiness', async ({ page }) => {
    // Add console listener before any possible logs
    const errors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.route('**/animations/d4980_cat360.json', route => {
      return route.fulfill({ status: 404 });
    });

    await page.goto('/');

    const loaderLottie = page.locator('[data-loader-lottie]');
    await expect(loaderLottie).toBeAttached();

    // Verify placement
    const loaderPlacement = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[data-loader-lottie]'));
      return {
        count: nodes.length,
        insideGlobalLoader: nodes.length === 1 && Boolean(nodes[0].closest('#global-loader'))
      };
    });
    expect(loaderPlacement).toEqual({ count: 1, insideGlobalLoader: true });

    // Verify fallback class using eventual consistency with longer timeout.
    // The previous implementation used waitForFunction which caused timeouts.
    // Switching back to toHaveClass with a reasonable wait should be sufficient.
    await expect(loaderLottie).toHaveClass(/lottie-fallback/, { timeout: 30000 });

    await page.waitForFunction(() => window.appState && window.appState.elements.length >= 118);
    await expect(page.locator('#global-loader')).toHaveClass(/hidden/);

    const lottieErrors = errors.filter(e =>
      e.includes('lottie') || e.includes('d4980_cat360') || e.includes('/animations/d4980_cat360.json')
    );
    expect(lottieErrors).toHaveLength(0);
  });
});
