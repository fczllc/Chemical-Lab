import { test, expect } from '@playwright/test';

test.describe('Background Policy', () => {
  test('bg canvas stays hidden and shell background stays dark', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    const bgCanvas = page.locator('#bg-canvas');
    await expect(bgCanvas).toBeAttached();

    const canvasPolicy = await bgCanvas.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        opacity: computed.opacity,
        visibility: computed.visibility,
        pointerEvents: computed.pointerEvents,
      };
    });

    expect(canvasPolicy.pointerEvents).toBe('none');
    expect(
      canvasPolicy.opacity === '0' || canvasPolicy.visibility === 'hidden',
      `Expected #bg-canvas to be visually hidden, received opacity=${canvasPolicy.opacity}, visibility=${canvasPolicy.visibility}`,
    ).toBe(true);

    const bodyBackground = await page.evaluate(() => {
      const computed = window.getComputedStyle(document.body);
      return {
        backgroundColor: computed.backgroundColor,
        backgroundImage: computed.backgroundImage,
      };
    });

    expect(bodyBackground.backgroundImage).toBe('none');

    const rgbMatch = bodyBackground.backgroundColor.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/,
    );

    expect(
      rgbMatch,
      `Expected an opaque rgb/rgba body background, received ${bodyBackground.backgroundColor}`,
    ).not.toBeNull();

    const [, red, green, blue, alpha] = rgbMatch!;
    const channels = [Number(red), Number(green), Number(blue)];
    const opacity = alpha === undefined ? 1 : Number(alpha);

    expect(opacity).toBe(1);
    expect(Math.max(...channels)).toBeLessThanOrEqual(32);
  });
});

async function waitForShellReady(page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('detail-panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.element-cell').first()).toBeVisible({ timeout: 15000 });
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
        const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
        return hasElements && loaderHidden;
      });
    }, { timeout: 15000 })
    .toBe(true);
}
