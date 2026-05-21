import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_KEY = 'element-explorer-kids-state';

async function waitForAppReady(page: any) {
  // Directly try to poll appState
  await page.goto('/');
  await expect.poll(async () => {
    return await page.evaluate(() => {
      // The app initialization sets up window.appState
      // Sometimes it is attached to the window, sometimes accessible through global variable
      const state = (window as any).appState;
      return !!state;
    });
  }, { timeout: 30000 }).toBe(true);
}



test.describe('Experiment completion date contract', () => {
  test('markExperimentCompleted persists completion date and prevents duplicates', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Freeze date to test YYYY-MM-DD
    await page.addInitScript(() => {
      const RealDate = Date;
      class MockDate extends Date {
        constructor() { super(); return new RealDate('2026-05-20T12:00:00Z'); }
      }
      (window as any).Date = MockDate;
    });

    const experimentId = 'fixture-exp';

    const result = await page.evaluate(({ experimentId }) => {
      const hook = window.__elementExplorerTestHooks?.storage?.markExperimentCompleted;
      const getDateHook = window.__elementExplorerTestHooks?.storage?.getExperimentCompletionDate;
      
      return {
        firstResult: hook(experimentId),
        secondResult: hook(experimentId),
        date: getDateHook(experimentId),
        appStateDate: window.appState.experimentCompletionDates[experimentId]
      };
    }, { experimentId });

    expect(result.firstResult).toBe(true);
    expect(result.secondResult).toBe(false);
    expect(result.date).toBe('2026-05-20');
    expect(result.appStateDate).toBe('2026-05-20');
  });

  test('legacy experiment completion preserves state without backfilling dates', async ({ browser }) => {
    const legacyFixture = {
      version: 'v3',
      data: {
        completedExperiments: ['legacy-exp'],
        experimentCompletionDates: {}
      }
    };
    
    const context = await browser.newContext();
    await context.addInitScript(({ key, value }) => {
        window.localStorage.setItem(key, JSON.stringify(value));
    }, { key: STORAGE_KEY, value: legacyFixture });

    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const result = await page.evaluate((key) => {
      const state = window.appState;
      const rawEnvelope = window.localStorage.getItem(key);
      const envelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
      return {
        completedExperiments: Array.from(state.completedExperiments),
        completionDates: state.experimentCompletionDates,
        storedDates: envelope?.data?.experimentCompletionDates
      };
    }, STORAGE_KEY);

    expect(result.completedExperiments).toContain('legacy-exp');
    expect(result.completionDates).toEqual({});
    expect(result.storedDates).toEqual({});
  });
});
