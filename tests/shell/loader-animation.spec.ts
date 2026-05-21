import { test, expect } from '@playwright/test';

test.describe('Global Loader Animation', () => {
  test('Lottie animation should advance frames during loading', async ({ page }) => {
    await page.goto('/');
    
    const loaderLottie = page.locator('[data-loader-lottie]');
    await expect(loaderLottie).toBeAttached();

    // Check SVG content mutation as a proxy for animation
    const getSvgContent = async () => {
        return await page.evaluate(() => {
            const el = document.querySelector('[data-loader-lottie]');
            return el?.innerHTML || '';
        });
    };
    
    const initialContent = await getSvgContent();
    await page.waitForTimeout(1000);
    const contentAfterWait = await getSvgContent();
    
    // In Lottie, playing animations change paths, which changes innerHTML
    expect(contentAfterWait).not.toBe(initialContent);
    
    await page.waitForFunction(() => window.appState && window.appState.elements.length >= 118);
    await expect(page.locator('#global-loader')).toHaveClass(/hidden/);
  });
});
