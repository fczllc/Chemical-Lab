import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_KEY = 'element-explorer-kids-state';
const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

type StoredFixture = Record<string, unknown>;

test.describe('Storage migration compatibility', () => {
  test('old localStorage state survives schema upgrade', async ({ browser }) => {
    const legacyFixture = await readFixture('storage-legacy-state.json');
    const v1Fixture = await readFixture('storage-v1-state.json');

    const legacyResult = await runSeededStorageCase(browser, legacyFixture);
    const v1Result = await runSeededStorageCase(browser, v1Fixture);

    expect(legacyResult.learnedElements).toEqual([1, 8]);
    expect(legacyResult.completedExperiments).toEqual(['reaction-fe-oxygen', 'acid-base-neutralization']);
    expect(legacyResult.gameScores).toEqual(legacyFixture.gameScores);
    expect(legacyResult.settings.difficulty).toBe('初中');
    expect(legacyResult.storedEnvelope.version).toBe('v2');

    expect(v1Result.learnedElements).toEqual([6, 7]);
    expect(v1Result.completedExperiments).toEqual(['redox-valence-demo']);
    expect(v1Result.gameScores).toEqual(v1Fixture.data.gameScores);
    expect(v1Result.settings.difficulty).toBe('高中基础');
    expect(v1Result.storedEnvelope.version).toBe('v2');

    await writeEvidence('task-9-storage-migration.json', {
      legacy: legacyResult,
      versioned: v1Result
    });
  });

  test('empty localStorage initializes safely with defaults', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const result = await readStorageState(page);

    expect(result.learnedElements).toEqual([]);
    expect(result.completedExperiments).toEqual([]);
    expect(result.gameScores).toEqual({});
    expect(result.settings.difficulty).toBe('normal');
    expect(result.storedEnvelope.version).toBe('v2');

    await writeEvidence('task-9-empty-storage.json', result);
    await context.close();
  });
});

async function readFixture(fileName: string): Promise<StoredFixture> {
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', fileName);
  return JSON.parse(await readFile(fixturePath, 'utf8'));
}

async function runSeededStorageCase(browser, fixture: StoredFixture) {
  const context = await browser.newContext();
  await context.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: fixture });

  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);

  const result = await readStorageState(page);
  await context.close();
  return result;
}

async function waitForAppReady(page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.element-cell').first()).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const state = window.appState;
      const hasElements = Array.isArray(state?.elements) && state.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 15000 }).toBe(true);
}

async function readStorageState(page) {
  return await page.evaluate((key) => {
    const state = window.appState;
    const rawEnvelope = window.localStorage.getItem(key);
    return {
      learnedElements: Array.from(state.learnedElements).sort((a, b) => a - b),
      completedExperiments: Array.from(state.completedExperiments),
      gameScores: { ...state.gameScores },
      settings: { ...state.settings },
      storedEnvelope: rawEnvelope ? JSON.parse(rawEnvelope) : null
    };
  }, STORAGE_KEY);
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}
