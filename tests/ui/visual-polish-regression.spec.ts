import { expect, test, type Page } from '@playwright/test';

test.describe('Visual polish regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test('keeps the final dark-shell contract on key routes', async ({ page }) => {
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
      `Expected #bg-canvas to stay visually hidden, received opacity=${canvasPolicy.opacity}, visibility=${canvasPolicy.visibility}`,
    ).toBe(true);

    await expect(page.locator('.main-header')).toBeVisible();
    await expect(page.locator('#bottom-modules')).toBeVisible();

    await assertActiveRoute(page, {
      hash: /#\/compare$/,
      sectionSelector: '#compare',
      anchorSelector: '#compare-container',
    });

    await assertActiveRoute(page, {
      hash: /#\/timeline$/,
      navTestId: 'nav-timeline',
      sectionSelector: '#timeline',
      anchorSelector: '#timeline-container .timeline-page-shell',
    });

    await assertActiveRoute(page, {
      hash: /#\/progress$/,
      navTestId: 'nav-progress',
      sectionSelector: '#progress',
      anchorSelector: '#progress .progress-dashboard',
    });
  });

  test('keeps the shell understandable when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        });
      })
      .toBe(true);

    const shellContract = await page.evaluate(() => {
      const bgCanvas = document.getElementById('bg-canvas');
      const bodyStyles = window.getComputedStyle(document.body);
      const canvasStyles = bgCanvas ? window.getComputedStyle(bgCanvas) : null;

      return {
        bodyBackgroundImage: bodyStyles.backgroundImage,
        canvasOpacity: canvasStyles?.opacity ?? null,
        canvasVisibility: canvasStyles?.visibility ?? null,
        canvasPointerEvents: canvasStyles?.pointerEvents ?? null,
      };
    });

    expect(shellContract.bodyBackgroundImage).toBe('none');
    expect(shellContract.canvasPointerEvents).toBe('none');
    expect(
      shellContract.canvasOpacity === '0' || shellContract.canvasVisibility === 'hidden',
      `Expected #bg-canvas to stay visually hidden for reduced motion, received opacity=${shellContract.canvasOpacity}, visibility=${shellContract.canvasVisibility}`,
    ).toBe(true);

    await expect(page.locator('.main-header')).toBeVisible();
    await expect(page.getByTestId('detail-panel')).toBeVisible();
    await expect(page.locator('#bottom-modules')).toBeVisible();

    await assertActiveRoute(page, {
      hash: /#\/compare$/,
      sectionSelector: '#compare',
      anchorSelector: '#compare-container',
    });
  });
});

async function assertActiveRoute(
  page: Page,
  contract: {
    hash: RegExp;
    navTestId?: string;
    sectionSelector: string;
    anchorSelector: string;
  },
) {
  if (contract.navTestId) {
    await page.getByTestId(contract.navTestId).click();
  } else {
    await page.evaluate(() => {
      window.location.hash = '#/compare';
    });
  }
  await expect(page).toHaveURL(contract.hash);
  if (contract.navTestId) {
    await expect(page.getByTestId(contract.navTestId)).toHaveClass(/active/);
  }
  await expect(page.locator(`${contract.sectionSelector}.page-section.active`)).toBeVisible();
  await expect(page.locator(contract.anchorSelector)).toBeVisible({ timeout: 15000 });
}

async function waitForShellReady(page: Page) {
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
