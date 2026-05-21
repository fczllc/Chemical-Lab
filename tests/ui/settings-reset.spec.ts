import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'element-explorer-kids-state';
const SEEDED_PERFORMANCE_MODE = 'high-performance';
const SEEDED_QUIZ_SCORE = {
  quizId: 'basic-elements',
  score: 80,
  completedAt: '2026-01-01T00:00:00.000Z'
};
const SEEDED_ACTIVITY = {
  id: 'activity-seeded-settings-reset',
  type: 'test',
  title: 'seed',
  description: 'seeded',
  timestamp: '2026-01-01T00:00:00.000Z',
  meta: {}
};
const SEEDED_UNLOCKED_ACHIEVEMENTS = [
  'first-element',
  'achievement-first-element',
  'achievement-first-experiment',
  'achievement-first-quiz',
  'achievement-first-game'
];
const SEEDED_ACHIEVEMENT_DATES = Object.fromEntries(
  SEEDED_UNLOCKED_ACHIEVEMENTS.map((achievementId) => [achievementId, '2026-01-01T00:00:00.000Z'])
);

const SEEDED_PROGRESS_STATE = {
  learnedElements: [1],
  collectedElements: [1, 8],
  quizScores: [SEEDED_QUIZ_SCORE],
  completedExperiments: ['water-cycle'],
  completedLearningSegments: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45'],
  experimentTitleOverrides: { 'water-cycle': '旧标题' },
  experimentCompletionDates: { 'water-cycle': '2026-05-20' },
  unlockedAchievements: SEEDED_UNLOCKED_ACHIEVEMENTS,
  achievementDates: SEEDED_ACHIEVEMENT_DATES,
  gameScores: { 'game-reaction': 30 },
  gamePlays: { 'game-reaction': 2 },
  activityLog: [SEEDED_ACTIVITY]
};

const SEEDED_SETTINGS = {
  performanceMode: SEEDED_PERFORMANCE_MODE,
  particleDensity: 'high',
  soundEnabled: true,
  difficulty: 'normal'
};

test.describe('Settings data reset flow', () => {
  test('shows requested settings layout and preserves settings while clearing learning data', async ({ page }) => {
    await seedStoredState(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    }, {
      key: STORAGE_KEY,
      value: {
        version: 'v2',
        data: {
          currentElement: 1,
          compareList: [1, 8],
          ...SEEDED_PROGRESS_STATE,
          settings: SEEDED_SETTINGS
        }
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.getByTestId('settings-btn').click();
    const modal = page.getByTestId('settings-modal');
    await expect(modal).toBeVisible();

    const catImage = page.getByTestId('settings-cat-image');
    await expect(catImage).toBeVisible();
    const catMetrics = await catImage.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        borderRadius: styles.borderRadius,
        width: styles.width,
        height: styles.height,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight
      };
    });
    expect(catMetrics.borderRadius).toBe('5px');
    expect(catMetrics.naturalWidth).toBeGreaterThan(0);
    expect(catMetrics.naturalHeight).toBeGreaterThan(0);

    await expect(page.getByTestId('settings-version')).toHaveText('版本：1.0');
    await expect(page.getByTestId('settings-reference')).toHaveText('内容参考人教版教材');
    await expect(page.locator('.setting-item').filter({ hasText: '性能模式' })).toBeVisible();
    await expect(page.getByTestId('performance-mode-toggle')).toBeAttached();
    await expect(page.locator('.toggle-switch:has([data-testid="performance-mode-toggle"])')).toBeVisible();
    await expect(page.getByTestId('settings-clear-data')).toBeVisible();
    await expect(page.getByTestId('settings-clear-data')).toContainText('清除数据');
    await expect(page.getByTestId('settings-clear-data')).toContainText('清除所有学习进度和成绩，系统初始化');
    await expect(page.getByTestId('settings-clear-data')).toContainText('清除');

    await page.getByTestId('settings-clear-data').locator('button').click();
    await expect(page.getByTestId('settings-clear-confirm-dialog')).toBeVisible();
    await expect(page.getByTestId('settings-clear-confirm-dialog')).toContainText('确认清除学习数据？');
    await expect(page.getByTestId('settings-clear-confirm-dialog')).toContainText('这会清除学习进度、成绩、收集、成就和游戏记录，但会保留当前设置。此操作不可撤销。');

    await page.getByTestId('settings-clear-cancel').click();
    await expect(page.getByTestId('settings-clear-confirm-dialog')).toBeHidden();

    await page.getByTestId('settings-clear-data').locator('button').click();
    await page.getByTestId('settings-clear-confirm').click();
    await waitForStoredProgressReset(page);

    const afterConfirm = await readState(page);
    expect(afterConfirm.learnedElements).toEqual([]);
    expect(afterConfirm.collectedElements).toEqual([]);
    expect(afterConfirm.quizScores).toEqual([]);
    expect(afterConfirm.completedExperiments).toEqual([]);
    expect(afterConfirm.experimentCompletionDates).toEqual({});
    expect(afterConfirm.completedLearningSegments).toEqual([]);
    expect(afterConfirm.experimentTitleOverrides).toEqual({});
    expect(afterConfirm.unlockedAchievements).toEqual([]);
    expect(afterConfirm.achievementDates).toEqual({});
    expect(afterConfirm.gameScores).toEqual({});
    expect(afterConfirm.gamePlays).toEqual({});
    expect(afterConfirm.activityLog).toEqual([]);
    expect(afterConfirm.settings).toEqual(SEEDED_SETTINGS);
    expect(afterConfirm.storedEnvelope.version).toBe('v3');
    expect(afterConfirm.storedEnvelope.data.learnedElements).toEqual([]);
    expect(afterConfirm.storedEnvelope.data.collectedElements).toEqual([]);
    expect(afterConfirm.storedEnvelope.data.quizScores).toEqual([]);
    expect(afterConfirm.storedEnvelope.data.completedExperiments).toEqual([]);
    expect(afterConfirm.storedEnvelope.data.experimentCompletionDates).toEqual({});
    expect(afterConfirm.storedEnvelope.data.completedLearningSegments).toEqual([]);
    expect(afterConfirm.storedEnvelope.data.experimentTitleOverrides).toEqual({});
    expect(afterConfirm.storedEnvelope.data.unlockedAchievements).toEqual([]);
    expect(afterConfirm.storedEnvelope.data.achievementDates).toEqual({});
    expect(afterConfirm.storedEnvelope.data.gameScores).toEqual({});
    expect(afterConfirm.storedEnvelope.data.gamePlays).toEqual({});
    expect(afterConfirm.storedEnvelope.data.activityLog).toEqual([]);
    expect(afterConfirm.storedEnvelope.data.settings).toEqual(SEEDED_SETTINGS);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('settings-btn').click();

    const afterReload = await readState(page);
    expect(afterReload.learnedElements).toEqual([]);
    expect(afterReload.collectedElements).toEqual([]);
    expect(afterReload.quizScores).toEqual([]);
    expect(afterReload.completedExperiments).toEqual([]);
    expect(afterReload.experimentCompletionDates).toEqual({});
    expect(afterReload.completedLearningSegments).toEqual([]);
    expect(afterReload.experimentTitleOverrides).toEqual({});
    expect(afterReload.unlockedAchievements).toEqual([]);
    expect(afterReload.achievementDates).toEqual({});
    expect(afterReload.gameScores).toEqual({});
    expect(afterReload.gamePlays).toEqual({});
    expect(afterReload.activityLog).toEqual([]);
    expect(afterReload.settings).toEqual(SEEDED_SETTINGS);
    expect(afterReload.storedEnvelope.version).toBe('v3');
    expect(afterReload.storedEnvelope.data.learnedElements).toEqual([]);
    expect(afterReload.storedEnvelope.data.collectedElements).toEqual([]);
    expect(afterReload.storedEnvelope.data.quizScores).toEqual([]);
    expect(afterReload.storedEnvelope.data.completedExperiments).toEqual([]);
    expect(afterReload.storedEnvelope.data.experimentCompletionDates).toEqual({});
    expect(afterReload.storedEnvelope.data.completedLearningSegments).toEqual([]);
    expect(afterReload.storedEnvelope.data.experimentTitleOverrides).toEqual({});
    expect(afterReload.storedEnvelope.data.unlockedAchievements).toEqual([]);
    expect(afterReload.storedEnvelope.data.achievementDates).toEqual({});
    expect(afterReload.storedEnvelope.data.gameScores).toEqual({});
    expect(afterReload.storedEnvelope.data.gamePlays).toEqual({});
    expect(afterReload.storedEnvelope.data.activityLog).toEqual([]);
    expect(afterReload.storedEnvelope.data.settings).toEqual(SEEDED_SETTINGS);
  });
});

async function seedStoredState(page: Page) {
  await page.context().addInitScript(({ key, value }) => {
    if (window.localStorage.getItem(key) === null) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, {
    key: STORAGE_KEY,
    value: {
      version: 'v2',
      data: {
        currentElement: 1,
        compareList: [1, 8],
        ...SEEDED_PROGRESS_STATE,
        settings: SEEDED_SETTINGS
      }
    }
  });
}

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

async function readState(page: Page) {
  return await page.evaluate((key) => {
    const rawEnvelope = window.localStorage.getItem(key);
    return {
      learnedElements: Array.from(window.appState.learnedElements).sort((a, b) => a - b),
      collectedElements: Array.from(window.appState.collectedElements).sort((a, b) => a - b),
      quizScores: window.appState.quizScores.map((entry) => ({ ...entry })),
      completedExperiments: Array.from(window.appState.completedExperiments),
      experimentCompletionDates: { ...window.appState.experimentCompletionDates },
      completedLearningSegments: Array.from(window.appState.completedLearningSegments),
      experimentTitleOverrides: { ...window.appState.experimentTitleOverrides },
      unlockedAchievements: Array.from(window.appState.unlockedAchievements),
      achievementDates: { ...window.appState.achievementDates },
      gameScores: { ...window.appState.gameScores },
      gamePlays: { ...window.appState.gamePlays },
      activityLog: window.appState.activityLog.map((entry) => ({ ...entry, meta: { ...entry.meta } })),
      settings: { ...window.appState.settings },
      storedEnvelope: rawEnvelope ? JSON.parse(rawEnvelope) : null
    };
  }, STORAGE_KEY);
}

async function waitForStoredProgressReset(page: Page) {
  await page.waitForFunction((key) => {
    const rawEnvelope = window.localStorage.getItem(key);
    if (!rawEnvelope) {
      return false;
    }

    const envelope = JSON.parse(rawEnvelope);
    return envelope?.version === 'v3'
      && Array.isArray(envelope?.data?.learnedElements)
      && envelope.data.learnedElements.length === 0
      && Array.isArray(envelope?.data?.collectedElements)
      && envelope.data.collectedElements.length === 0
      && Array.isArray(envelope?.data?.completedExperiments)
      && envelope.data.completedExperiments.length === 0
      && Object.keys(envelope?.data?.experimentCompletionDates || {}).length === 0;
  }, STORAGE_KEY);
}

function expectSeededState(state) {
  expect(state.learnedElements).toEqual(SEEDED_PROGRESS_STATE.learnedElements);
  expect(state.collectedElements).toEqual(SEEDED_PROGRESS_STATE.collectedElements);
  expect(state.quizScores).toEqual(SEEDED_PROGRESS_STATE.quizScores);
  expect(state.completedExperiments).toEqual(SEEDED_PROGRESS_STATE.completedExperiments);
  expect(state.experimentCompletionDates).toEqual(SEEDED_PROGRESS_STATE.experimentCompletionDates);
  expect(state.completedLearningSegments).toEqual(SEEDED_PROGRESS_STATE.completedLearningSegments);
  expect(state.experimentTitleOverrides).toEqual(SEEDED_PROGRESS_STATE.experimentTitleOverrides);
  expect(state.unlockedAchievements).toEqual(SEEDED_PROGRESS_STATE.unlockedAchievements);
  expect(state.achievementDates).toEqual(SEEDED_PROGRESS_STATE.achievementDates);
  expect(state.gameScores).toEqual(SEEDED_PROGRESS_STATE.gameScores);
  expect(state.gamePlays).toEqual(SEEDED_PROGRESS_STATE.gamePlays);
  expect(state.activityLog).toEqual(SEEDED_PROGRESS_STATE.activityLog);
  expect(state.settings).toEqual(SEEDED_SETTINGS);
  expect(state.storedEnvelope.version).toBe('v2');
  expect(state.storedEnvelope.data.learnedElements).toEqual(SEEDED_PROGRESS_STATE.learnedElements);
  expect(state.storedEnvelope.data.collectedElements).toEqual(SEEDED_PROGRESS_STATE.collectedElements);
  expect(state.storedEnvelope.data.quizScores).toEqual(SEEDED_PROGRESS_STATE.quizScores);
  expect(state.storedEnvelope.data.completedExperiments).toEqual(SEEDED_PROGRESS_STATE.completedExperiments);
  expect(state.storedEnvelope.data.experimentCompletionDates).toEqual(SEEDED_PROGRESS_STATE.experimentCompletionDates);
  expect(state.storedEnvelope.data.completedLearningSegments).toEqual(SEEDED_PROGRESS_STATE.completedLearningSegments);
  expect(state.storedEnvelope.data.experimentTitleOverrides).toEqual(SEEDED_PROGRESS_STATE.experimentTitleOverrides);
  expect(state.storedEnvelope.data.unlockedAchievements).toEqual(SEEDED_PROGRESS_STATE.unlockedAchievements);
  expect(state.storedEnvelope.data.achievementDates).toEqual(SEEDED_PROGRESS_STATE.achievementDates);
  expect(state.storedEnvelope.data.gameScores).toEqual(SEEDED_PROGRESS_STATE.gameScores);
  expect(state.storedEnvelope.data.gamePlays).toEqual(SEEDED_PROGRESS_STATE.gamePlays);
  expect(state.storedEnvelope.data.activityLog).toEqual(SEEDED_PROGRESS_STATE.activityLog);
  expect(state.storedEnvelope.data.settings).toEqual(SEEDED_SETTINGS);
}
