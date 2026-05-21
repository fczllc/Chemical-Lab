import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

test.describe('Lab 3D simulation UI', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);
  });

    // This test relies on data-lab-start and data-launch-simulation buttons which are part of the removed animation flow
    test('apparatus recognition simulation launches and shows equipment', async ({ page }) => {
      test.skip(true, 'Experiment animations removed; completion is confirmed in detail modal');
    });

    test('sodium-water simulation shows parameter controls', async ({ page }) => {
      test.skip(true, 'Experiment animations removed; completion is confirmed in detail modal');
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

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}
