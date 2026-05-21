import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_KEY = 'element-explorer-kids-state';
const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

type StoredFixture = Record<string, unknown>;

test.describe('Storage migration compatibility', () => {
  test('markLearningSegmentCompleted trims ids and persists the completed segment once', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    }, { key: STORAGE_KEY, value: await readFixture('storage-legacy-state.json') });
    await page.evaluate(() => {
      window.__elementExplorerTestHooks?.storage?.reloadProgress?.();
    });
    await waitForAppReady(page);
    await page.waitForFunction(() => typeof window.__elementExplorerTestHooks?.storage?.markLearningSegmentCompleted === 'function');

    const result = await page.evaluate(({ segmentId }) => {
      const hook = window.__elementExplorerTestHooks?.storage?.markLearningSegmentCompleted;

      return {
        firstResult: hook(segmentId, { source: 'storage-migration-test' }),
        secondResult: hook(segmentId, { source: 'storage-migration-test' })
      };
    }, { segmentId: '  knowledge-topic-0001-source-section-l1-l5-bd27b23b45  ' });

    expect(result.firstResult).toBe(true);
    expect(result.secondResult).toBe(false);
    await page.waitForFunction((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return false;
      }

      try {
        const envelope = JSON.parse(raw);
        return Array.isArray(envelope?.data?.completedLearningSegments)
          && envelope.data.completedLearningSegments.includes('knowledge-topic-0001-source-section-l1-l5-bd27b23b45');
      } catch {
        return false;
      }
    }, STORAGE_KEY);

    const snapshot = await page.evaluate((key) => ({
      completedLearningSegments: Array.from(window.appState.completedLearningSegments),
      activityLog: window.appState.activityLog.map((entry) => ({ ...entry, meta: { ...entry.meta } })),
      storedEnvelope: JSON.parse(window.localStorage.getItem(key)!)
    }), STORAGE_KEY);

    expect(snapshot.completedLearningSegments).toEqual(['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']);
    expect(snapshot.activityLog.filter((entry) => entry.type === 'learningsegmentcompleted')).toHaveLength(1);
    expect(snapshot.activityLog).toContainEqual(expect.objectContaining({
      type: 'learningsegmentcompleted',
      title: '完成了一个学习环节',
      meta: {
        segmentId: 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45',
        source: 'storage-migration-test'
      }
    }));
    expect(snapshot.storedEnvelope.version).toBe('v3');
    expect(snapshot.storedEnvelope.data.completedLearningSegments).toEqual(['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']);

    await context.close();
  });

  test('old localStorage state survives schema upgrade to v3', async ({ browser }) => {
    const legacyFixture = await readFixture('storage-legacy-state.json');

    const result = await runSeededStorageCase(browser, legacyFixture);

    expect(result.learnedElements).toEqual([1, 8]);
    expect(result.completedExperiments).toEqual(['reaction-fe-oxygen', 'acid-base-neutralization']);
    // New field should be initialized empty for legacy data
    expect(result.completedLearningSegments).toEqual([]);
    expect(result.experimentCompletionDates).toEqual({});
    expect(result.storedEnvelope.version).toBe('v3');

    await writeEvidence('task-2-storage-migration.json', result);
  });

  test('experiment completion date uses deterministic local date and persists once', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
      const RealDate = Date;
      class FixedDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            super('2026-05-20T12:00:00');
            return;
          }
          super(...args);
        }

        static now() {
          return new RealDate('2026-05-20T12:00:00').getTime();
        }
      }

      Object.setPrototypeOf(FixedDate, RealDate);
      window.Date = FixedDate;
    }, { key: STORAGE_KEY, value: createEmptyV3Fixture() });

    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.waitForFunction(() => typeof window.__elementExplorerTestHooks?.storage?.markExperimentCompleted === 'function');

    const mutationResult = await page.evaluate((key) => {
      const experimentId = 'water-cycle';
      const hook = window.__elementExplorerTestHooks.storage.markExperimentCompleted;
      const getDateHook = window.__elementExplorerTestHooks.storage.getExperimentCompletionDate;
      const firstResult = hook(experimentId);
      const secondResult = hook(experimentId);

      return {
        firstResult,
        secondResult,
        completedExperiments: Array.from(window.appState.completedExperiments),
        completionDates: { ...window.appState.experimentCompletionDates },
        hookDate: getDateHook(experimentId),
        activityLog: window.appState.activityLog.map((entry) => ({ ...entry, meta: { ...entry.meta } }))
      };
    }, STORAGE_KEY);

    await page.waitForFunction((key) => {
      const rawEnvelope = window.localStorage.getItem(key);
      if (!rawEnvelope) {
        return false;
      }

      const storedEnvelope = JSON.parse(rawEnvelope);
      return storedEnvelope?.data?.completedExperiments?.includes('water-cycle')
        && storedEnvelope?.data?.experimentCompletionDates?.['water-cycle'] === '2026-05-20';
    }, STORAGE_KEY);

    const storedEnvelope = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), STORAGE_KEY);
    const result = { ...mutationResult, storedEnvelope };
    const experimentActivities = result.activityLog.filter((entry) => entry.type === 'experimentcompleted');

    expect(result.firstResult).toBe(true);
    expect(result.secondResult).toBe(false);
    expect(result.completedExperiments).toEqual(['water-cycle']);
    expect(result.completionDates).toEqual({ 'water-cycle': '2026-05-20' });
    expect(result.hookDate).toBe('2026-05-20');
    expect(experimentActivities).toHaveLength(1);
    expect(experimentActivities[0]).toMatchObject({
      type: 'experimentcompleted',
      meta: { experimentId: 'water-cycle' }
    });
    expect(result.storedEnvelope.version).toBe('v3');
    expect(result.storedEnvelope.data.completedExperiments).toEqual(['water-cycle']);
    expect(result.storedEnvelope.data.experimentCompletionDates).toEqual({ 'water-cycle': '2026-05-20' });

    await writeEvidence('task-1-storage-completion-date.json', result);
    await context.close();
  });

  test('experiment completion date migration keeps legacy completions without fabricating dates and drops invalid dates', async ({ browser }) => {
    const result = await runSeededStorageCase(browser, {
      version: 'v3',
      data: {
        ...createEmptyV3Fixture().data,
        completedExperiments: ['legacy-exp'],
        experimentCompletionDates: {
          'legacy-exp': '2026-05-20T12:00:00.000Z',
          'bad-month': '2026-13-20',
          'bad-shape': 'May 20 2026',
          '': '2026-05-20'
        }
      }
    });

    expect(result.completedExperiments).toEqual(['legacy-exp']);
    expect(result.experimentCompletionDates).toEqual({});
    expect(result.storedEnvelope.version).toBe('v3');
    expect(result.storedEnvelope.data.completedExperiments).toEqual(['legacy-exp']);
    expect(result.storedEnvelope.data.experimentCompletionDates).toEqual({});

    await writeEvidence('task-1-storage-legacy-date.json', result);
  });

  test('invalid learning segment ids are ignored during migration', async ({ browser }) => {
    const result = await runSeededStorageCase(browser, {
      version: 'v3',
      data: {
        currentElement: null,
        compareList: [],
        learnedElements: [],
        collectedElements: [],
        quizScores: [],
        completedExperiments: [],
        completedLearningSegments: [null, '', 123, ' valid-tag ', 'valid-tag'],
        experimentTitleOverrides: {},
        unlockedAchievements: [],
        achievementDates: {},
        gameScores: {},
        gamePlays: {},
        activityLog: [],
        settings: {}
      }
    });

    expect(result.completedLearningSegments).toEqual(['valid-tag']);
    expect(result.storedEnvelope.version).toBe('v3');
    expect(result.storedEnvelope.data.completedLearningSegments).toEqual(['valid-tag']);

    await writeEvidence('task-6-invalid-segments.json', result);
  });

  test('quiz score writes include learner-state contract fields', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.waitForFunction(() => typeof window.__elementExplorerTestHooks?.storage?.addQuizScore === 'function');

    const result = await page.evaluate(async (key) => {
      window.__elementExplorerTestHooks?.storage?.addQuizScore?.({
        mode: 'quick',
        score: 4,
        total: 5,
        accuracy: 80,
        relatedElement: 8,
        completedAt: '2026-02-03T04:05:06.000Z'
      });
      await new Promise((resolve) => window.setTimeout(resolve, 700));

      const rawEnvelope = window.localStorage.getItem(key);
      const storedEnvelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
      return {
        score: window.appState.quizScores[0],
        appStateScore: window.appState.quizScores[0],
        storedScore: storedEnvelope?.data?.quizScores?.[0] || null,
        quizActivity: window.appState.activityLog.find((entry) => entry.type === 'quizcompleted')
      };
    }, STORAGE_KEY);

    expect(result.score).toMatchObject({
      score: 4,
      total: 5,
      percentage: 80,
      sourceElement: 8,
      timestamp: '2026-02-03T04:05:06.000Z'
    });
    expect(result.score).toMatchObject({
      accuracy: 80,
      relatedElement: 8,
      completedAt: '2026-02-03T04:05:06.000Z'
    });
    expect(result.storedScore).toMatchObject({
      score: 4,
      total: 5,
      percentage: 80,
      sourceElement: 8,
      timestamp: '2026-02-03T04:05:06.000Z'
    });
    expect(result.quizActivity.meta).toMatchObject({
      percentage: 80,
      sourceElement: 8,
      timestamp: '2026-02-03T04:05:06.000Z'
    });

    await context.close();
  });

  test('legacy quiz score fields normalize to learner-state contract fields', async ({ browser }) => {
    const result = await runSeededStorageCase(browser, {
      version: 'v3',
      data: {
        currentElement: null,
        compareList: [],
        learnedElements: [],
        collectedElements: [],
        quizScores: [{
          mode: 'quick',
          score: 3,
          total: 5,
          accuracy: 60,
          relatedElement: 1,
          completedAt: '2026-03-04T05:06:07.000Z'
        }],
        completedExperiments: [],
        completedLearningSegments: [],
        experimentTitleOverrides: {},
        unlockedAchievements: [],
        achievementDates: {},
        gameScores: {},
        gamePlays: {},
        activityLog: [],
        settings: {}
      }
    });

    expect(result.quizScores[0]).toMatchObject({
      score: 3,
      total: 5,
      percentage: 60,
      sourceElement: 1,
      timestamp: '2026-03-04T05:06:07.000Z'
    });
    expect(result.storedEnvelope.data.quizScores[0]).toMatchObject({
      score: 3,
      total: 5,
      percentage: 60,
      sourceElement: 1,
      timestamp: '2026-03-04T05:06:07.000Z'
    });
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

function createEmptyV3Fixture() {
  return {
    version: 'v3',
    data: {
      currentElement: null,
      compareList: [],
      learnedElements: [],
      collectedElements: [],
      quizScores: [],
      completedExperiments: [],
      completedLearningSegments: [],
      experimentTitleOverrides: {},
      experimentCompletionDates: {},
      unlockedAchievements: [],
      achievementDates: {},
      gameScores: {},
      gamePlays: {},
      activityLog: [],
      settings: {}
    }
  };
}

async function waitForAppReady(page: any) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return Boolean(window.appState) && loaderHidden;
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
      experimentCompletionDates: { ...state.experimentCompletionDates },
      quizScores: state.quizScores.map((score) => ({ ...score })),
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
