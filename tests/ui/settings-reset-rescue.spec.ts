import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_KEY = 'element-explorer-kids-state';
const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

test.describe('settings reset rescue', () => {
  test('clear data resets progress while preserving settings', async ({ browser }) => {
    const seededFixture = {
      currentElement: 8,
      compareList: [1, 8],
      learnedElements: [1, 6, 8],
      collectedElements: [1, 8],
      quizScores: [
        { score: 90, total: 100, completedAt: '2026-05-07T00:00:00.000Z' }
      ],
      completedExperiments: ['reaction-fe-oxygen'],
      gameScores: {
        'game-drag': 180,
        'game-memory': 220,
        'game-reaction': 260,
        'game-collector': 300
      },
      settings: {
        performanceMode: 'high-performance',
        difficulty: '初中'
      }
    };

    const context = await browser.newContext();
    await context.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    }, { key: STORAGE_KEY, value: seededFixture });

    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expect(page.getByTestId('settings-btn')).toBeVisible();
    await page.getByTestId('settings-btn').click();
    await expect(page.getByTestId('settings-modal')).toHaveClass(/show/);

    await page.locator('#settings-modal').getByRole('button', { name: '清除' }).click();
    const confirmDialog = page.getByTestId('settings-clear-confirm-dialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toHaveAttribute('aria-hidden', 'false');

    await page.getByTestId('settings-clear-confirm').click();

    await expect(confirmDialog).toBeHidden();
    await expect(page.getByTestId('settings-modal')).toHaveClass(/show/);
    await expect(page.locator('#explored-count')).toHaveText('0');

    const result = await page.evaluate((key) => {
      const state = window.appState;
      const rawEnvelope = window.localStorage.getItem(key);

      return {
        learnedElements: Array.from(state.learnedElements).sort((a, b) => a - b),
        collectedElements: Array.from(state.collectedElements).sort((a, b) => a - b),
        compareList: Array.from(state.compareList).sort((a, b) => a - b),
        quizScores: state.quizScores,
        completedExperiments: Array.from(state.completedExperiments),
        unlockedAchievements: Array.from(state.unlockedAchievements),
        gameScores: { ...state.gameScores },
        settings: { ...state.settings },
        storedEnvelope: rawEnvelope ? JSON.parse(rawEnvelope) : null
      };
    }, STORAGE_KEY);

    expect(result.learnedElements).toEqual([]);
    expect(result.collectedElements).toEqual([]);
    expect(result.compareList).toEqual([]);
    expect(result.quizScores).toEqual([]);
    expect(result.completedExperiments).toEqual([]);
    expect(result.unlockedAchievements).toEqual([]);
    expect(result.gameScores).toEqual({});
    expect(result.settings).toEqual(expect.objectContaining({
      performanceMode: 'high-performance',
      difficulty: '初中'
    }));
    expect(result.storedEnvelope.version).toBe('v2');

    await writeEvidence('settings-reset-rescue.json', {
      seed: seededFixture,
      result
    });

    await context.close();
  });
});

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('detail-panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.element-cell').first()).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 15000 }).toBe(true);
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}
