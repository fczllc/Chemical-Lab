import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_KEY = 'element-explorer-kids-state';
const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

type StoredFixture = Record<string, unknown>;

test.describe('Storage migration compatibility', () => {
  test('v3 schema includes completedLearningSegments', async ({ browser }) => {
    // This test ensures that when we upgrade to v3, the completedLearningSegments field exists
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check if the state initializes with the new field
    const state = await page.evaluate(() => window.appState);
    console.log('App state:', JSON.stringify(state));
    expect(state).toHaveProperty('completedLearningSegments');
    expect(Array.isArray(state.completedLearningSegments)).toBe(true);

    // Also check storage version
    const rawEnvelope = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
    const envelope = JSON.parse(rawEnvelope!);
    expect(envelope.version).toBe('v3');

    await context.close();
  });

  test('old localStorage state survives schema upgrade to v3', async ({ browser }) => {
    const legacyFixture = await readFixture('storage-legacy-state.json');

    const result = await runSeededStorageCase(browser, legacyFixture);

    expect(result.learnedElements).toEqual([1, 8]);
    expect(result.completedExperiments).toEqual(['reaction-fe-oxygen', 'acid-base-neutralization']);
    // New field should be initialized empty for legacy data
    expect(result.completedLearningSegments).toEqual([]);
    expect(result.storedEnvelope.version).toBe('v3');

    await writeEvidence('task-2-storage-migration.json', result);
  });
});

async function readFixture(fileName: string): Promise<StoredFixture> {
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', fileName);
  return JSON.parse(await readFile(fixturePath, 'utf8'));
}

async function runSeededStorageCase(browser: any, fixture: StoredFixture) {
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

async function waitForAppReady(page: any) {
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

async function readStorageState(page: any) {
  return await page.evaluate((key) => {
    const state = window.appState;
    const rawEnvelope = window.localStorage.getItem(key);
    return {
      learnedElements: Array.from(state.learnedElements).sort((a, b) => a - b),
      completedExperiments: Array.from(state.completedExperiments),
      completedLearningSegments: Array.from(state.completedLearningSegments || []),
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
