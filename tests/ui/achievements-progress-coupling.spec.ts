import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { achievementsData } from '../../src/data/index.js';

const STORAGE_KEY = 'element-explorer-kids-state';
const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');
const MANUAL_ACHIEVEMENT_ID = 'textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-promote-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-achievement-achievement-0001-source-section-l1-l5-bd27b23b45';
const MANUAL_SEGMENT_ID = 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45';

type ManualAchievementFixture = {
  id: string;
  segmentId: string;
};

test.describe('Achievement progress coupling', () => {
  test('manual review helper extracts a trimmed single curriculum tag', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    const segmentId = await page.evaluate(async () => {
      const achievements = await import('/src/modules/achievements.js');
      return achievements.__achievementsTestHooks.getLearningSegmentIdForAchievement({
        curriculumTags: ['  knowledge-topic-0001-source-section-l1-l5-bd27b23b45  ']
      });
    });

    expect(segmentId).toBe('knowledge-topic-0001-source-section-l1-l5-bd27b23b45');
  });

  test('manual review condition rejects invalid metadata and unlocks from completed segment evidence', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    const results = await page.evaluate(async () => {
      const achievements = await import('/src/modules/achievements.js');

      const missingReviewStatus = achievements.__achievementsTestHooks.matchesCondition({
        id: 'manual-missing-review-status',
        condition: { type: 'manualReviewAfterPromotion' },
        curriculumTags: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']
      });

      const multipleTagsRejected = achievements.__achievementsTestHooks.matchesCondition({
        id: 'manual-multiple-tags',
        condition: { type: 'manualReviewAfterPromotion' },
        sourceReviewStatus: 'reviewed',
        curriculumTags: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45', 'another-segment']
      });

      const emptyTagRejected = achievements.__achievementsTestHooks.matchesCondition({
        id: 'manual-empty-tag',
        condition: { type: 'manualReviewAfterPromotion' },
        sourceReviewStatus: 'reviewed',
        curriculumTags: ['   ']
      });

      return {
        missingReviewStatus,
        multipleTagsRejected,
        emptyTagRejected
      };
    });

    expect(results.missingReviewStatus).toBe(false);
    expect(results.multipleTagsRejected).toBe(false);
    expect(results.emptyTagRejected).toBe(false);

    await page.getByTestId('nav-progress').click();
    await confirmLearningViaModal(page, MANUAL_SEGMENT_ID, MANUAL_ACHIEVEMENT_ID);

    await expect.poll(async () => page.evaluate((achievementId) => (
      window.appState.unlockedAchievements.has(achievementId)
    ), MANUAL_ACHIEVEMENT_ID), { timeout: 10000 }).toBe(true);
  });

  test('manual textbook achievement requires explicit completion', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-achievements').click();
    const card = page.locator(`article[data-achievement-id="${MANUAL_ACHIEVEMENT_ID}"]`);

    await expect(card).toHaveClass(/is-locked/);
    // Achievement module is read-only: no action buttons on cards.
    await expect(card.locator('[data-achievement-action]')).toHaveCount(0);

    // Navigate to progress directly to learn the segment through the lesson modal.
    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);
    await expectAchievementLocked(page, MANUAL_ACHIEVEMENT_ID);

    const learningCard = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(learningCard).toBeVisible();
    await expectLearningCardStatus(page, MANUAL_SEGMENT_ID, '');
    await expect(learningCard.locator('button')).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();
    await expectLearningCardStatus(page, MANUAL_SEGMENT_ID, '');
    await expectAchievementLocked(page, MANUAL_ACHIEVEMENT_ID);

    const rawStateBeforeCompletion = await page.evaluate(() => Array.from(window.appState.completedLearningSegments));
    expect(rawStateBeforeCompletion).not.toContain(MANUAL_SEGMENT_ID);

    await confirmLearningViaModal(page, MANUAL_SEGMENT_ID, MANUAL_ACHIEVEMENT_ID);

    await expect.poll(async () => page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID), { timeout: 10000 }).toBe(true);

    await expect.poll(async () => page.evaluate((achievementId) => (
      window.appState.unlockedAchievements.has(achievementId)
    ), MANUAL_ACHIEVEMENT_ID), { timeout: 10000 }).toBe(true);

    await expectLearningCardConfirmed(page, MANUAL_SEGMENT_ID);
  });

  test('modal confirmation unlocks achievement and syncs progress', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-achievements').click();
    const beforeEvidence = await page.evaluate(({ key, achievementId, segmentId }) => {
      const rawEnvelope = window.localStorage.getItem(key);
      const storedEnvelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
      const card = document.querySelector(`#achievements article[data-achievement-id="${CSS.escape(achievementId)}"]`);
      return {
        route: window.location.hash,
        cardClass: card?.className || '',
        segmentCompleted: window.appState.completedLearningSegments.has(segmentId),
        achievementUnlocked: window.appState.unlockedAchievements.has(achievementId),
        storedCompletedSegments: storedEnvelope?.data?.completedLearningSegments || [],
        storedUnlockedAchievements: storedEnvelope?.data?.unlockedAchievements || [],
        storedLearningSegmentCompletionDates: storedEnvelope?.data?.learningSegmentCompletionDates || {}
      };
    }, { key: STORAGE_KEY, achievementId: MANUAL_ACHIEVEMENT_ID, segmentId: MANUAL_SEGMENT_ID });

    // Navigate directly to progress since achievement cards are read-only.
    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const learningCard = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(learningCard).toBeVisible();
    await expectLearningCardStatus(page, MANUAL_SEGMENT_ID, '');
    await confirmLearningViaModal(page, MANUAL_SEGMENT_ID, MANUAL_ACHIEVEMENT_ID);

    await expect.poll(async () => page.evaluate(({ achievementId, segmentId }) => ({
      segmentCompleted: window.appState.completedLearningSegments.has(segmentId),
      achievementUnlocked: window.appState.unlockedAchievements.has(achievementId)
    }), { achievementId: MANUAL_ACHIEVEMENT_ID, segmentId: MANUAL_SEGMENT_ID }), { timeout: 10000 }).toEqual({
      segmentCompleted: true,
      achievementUnlocked: true
    });

    await expectLearningCardConfirmed(page, MANUAL_SEGMENT_ID);

    await page.getByTestId('nav-achievements').click();
    await expect(page.locator(`article[data-achievement-id="${MANUAL_ACHIEVEMENT_ID}"]`)).toHaveClass(/is-unlocked/);

    const afterEvidence = await page.evaluate(({ key, achievementId, segmentId }) => {
      const rawEnvelope = window.localStorage.getItem(key);
      const storedEnvelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
      const card = document.querySelector(`#achievements article[data-achievement-id="${CSS.escape(achievementId)}"]`);
      return {
        route: window.location.hash,
        cardClass: card?.className || '',
        segmentCompleted: window.appState.completedLearningSegments.has(segmentId),
        achievementUnlocked: window.appState.unlockedAchievements.has(achievementId),
        storedCompletedSegments: storedEnvelope?.data?.completedLearningSegments || [],
        storedUnlockedAchievements: storedEnvelope?.data?.unlockedAchievements || [],
        storedLearningSegmentCompletionDates: storedEnvelope?.data?.learningSegmentCompletionDates || {}
      };
    }, { key: STORAGE_KEY, achievementId: MANUAL_ACHIEVEMENT_ID, segmentId: MANUAL_SEGMENT_ID });

    await writeEvidence('task-4-manual-condition-unlocks.json', {
      achievementId: MANUAL_ACHIEVEMENT_ID,
      segmentId: MANUAL_SEGMENT_ID,
      before: beforeEvidence,
      after: afterEvidence
    });
  });

  test('learning page does not render persisted activity feed', async ({ page }) => {
    const unsafeTitle = '<img data-progress-title-xss src=x onerror="window.__progressActivityTitleXss = true">';
    const unsafeDescription = '<svg data-progress-description-xss onload="window.__progressActivityDescriptionXss = true"></svg>';

    await seedStoredState(page, {
      activityLog: [{
        id: 'unsafe-progress-activity',
        type: 'unsafe-progress-activity',
        title: unsafeTitle,
        description: unsafeDescription,
        timestamp: '<time data-progress-timestamp-xss>bad</time>',
        meta: {}
      }]
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    await expect(page.locator('#progress .activity-item')).toHaveCount(0);

    const safety = await page.evaluate(() => {
      return {
        injectedTitleNodes: document.querySelectorAll('[data-progress-title-xss]').length,
        injectedDescriptionNodes: document.querySelectorAll('[data-progress-description-xss]').length,
        injectedTimestampNodes: document.querySelectorAll('[data-progress-timestamp-xss]').length,
        titleHandlerRan: Boolean((window as any).__progressActivityTitleXss),
        descriptionHandlerRan: Boolean((window as any).__progressActivityDescriptionXss)
      };
    });

    expect(safety.injectedTitleNodes).toBe(0);
    expect(safety.injectedDescriptionNodes).toBe(0);
    expect(safety.injectedTimestampNodes).toBe(0);
    expect(safety.titleHandlerRan).toBe(false);
    expect(safety.descriptionHandlerRan).toBe(false);
  });

  test('completed learning segment persists after reload', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.getByTestId('nav-achievements').click();
    // Achievement cards are read-only; navigate directly to progress.
    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const learningCard = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(learningCard).toBeVisible();
    await expectLearningCardStatus(page, MANUAL_SEGMENT_ID, '');

    const beforeEvidence = await readStorageEvidence(page, MANUAL_SEGMENT_ID, MANUAL_ACHIEVEMENT_ID);

    await confirmLearningViaModal(page, MANUAL_SEGMENT_ID, MANUAL_ACHIEVEMENT_ID);

    const storedAfterCompletion = await waitForStoredSegment(page, MANUAL_SEGMENT_ID, MANUAL_ACHIEVEMENT_ID);
    expect(storedAfterCompletion.version).toBe('v3');
    expect(storedAfterCompletion.data.completedLearningSegments).toContain(MANUAL_SEGMENT_ID);
    expect(storedAfterCompletion.data.unlockedAchievements).toContain(MANUAL_ACHIEVEMENT_ID);
    expect(storedAfterCompletion.data.learningSegmentCompletionDates[MANUAL_SEGMENT_ID]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    const reloadedCard = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(reloadedCard).toBeVisible();
    await expectLearningCardConfirmed(page, MANUAL_SEGMENT_ID);
    await reloadedCard.click();
    const reloadedModal = page.locator('[data-testid="lesson-modal"]');
    await expect(reloadedModal).toBeVisible();
    await expect(reloadedModal.locator('[data-testid="confirm-learning"]')).toHaveCount(0);
    await expect(reloadedModal).toContainText('已学习');
    await expect.poll(async () => page.evaluate((achievementId) => (
      window.appState.unlockedAchievements.has(achievementId)
    ), MANUAL_ACHIEVEMENT_ID), { timeout: 10000 }).toBe(true);

    await page.getByTestId('nav-achievements').click();
    await expect(page.locator(`article[data-achievement-id="${MANUAL_ACHIEVEMENT_ID}"]`)).toHaveClass(/is-unlocked/);

    const afterReloadEvidence = await readStorageEvidence(page, MANUAL_SEGMENT_ID, MANUAL_ACHIEVEMENT_ID);

    await writeEvidence('task-6-persistence-reload.json', {
      before: beforeEvidence,
      afterCompletion: {
        storedEnvelope: storedAfterCompletion,
        storedLearningSegmentCompletionDates: storedAfterCompletion.data.learningSegmentCompletionDates || {}
      },
      afterReload: afterReloadEvidence
    });
  });

  test('manual topic progress is derived from unlocked achievements', async ({ page }) => {
    await seedStoredState(page, {
      completedLearningSegments: [MANUAL_SEGMENT_ID]
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    const learningCard = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(learningCard).toBeVisible();
    await expectLearningCardStatus(page, MANUAL_SEGMENT_ID, '学习确认：日期待补充');
    await expect.poll(async () => page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID), { timeout: 10000 }).toBe(true);

    const rawOnlyProgress = await readManualProgressSnapshot(page, MANUAL_SEGMENT_ID);
    expect(rawOnlyProgress).toMatchObject({
      manualCompleted: false,
      displayCompleted: false,
      stagePathCompleted: false,
      rawSegmentCompleted: true
    });

    await seedStoredState(page, {
      completedLearningSegments: [MANUAL_SEGMENT_ID],
      unlockedAchievements: [MANUAL_ACHIEVEMENT_ID]
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expectLearningCardStatus(page, MANUAL_SEGMENT_ID, '学习确认：日期待补充');

    const unlockedProgress = await readManualProgressSnapshot(page, MANUAL_SEGMENT_ID);
    expect(unlockedProgress).toMatchObject({
      manualCompleted: true,
      displayCompleted: true,
      stagePathCompleted: false
    });
    expect(unlockedProgress.stageCompletedCount).toBe(0);
    expect(unlockedProgress.completedStageIds).not.toContain(expect.stringContaining('knowledge-topic-0001'));
  });

  test('all manual review achievements expose progress rows', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);
    const manualAchievements = loadManualAchievementFixtures();
    expect(manualAchievements.length).toBeGreaterThan(0);

    await page.getByTestId('nav-progress').click();

    const audit = await page.evaluate((manuals) => {
      const invalid: string[] = [];

      for (const manual of manuals) {
        const card = document.querySelector(`#progress [data-testid="learning-card"][data-learning-segment-id="${CSS.escape(manual.segmentId)}"]`);
        const status = card?.querySelector('[data-testid="learning-card-status"]')?.textContent?.trim() || '';

        if (!card) {
          invalid.push(`${manual.id}: missing learning card ${manual.segmentId}`);
          continue;
        }

        if (
          status !== ''
          && status !== '未学习'
          && status !== '学习确认：日期待补充'
          && !/^学习确认：\\d{4}-\\d{2}-\\d{2}$/.test(status)
        ) {
          invalid.push(`${manual.id}: invalid learning status ${status}`);
        }
      }

      return {
        invalid: invalid.slice(0, 10),
        invalidCount: invalid.length,
        total: manuals.length
      };
    }, manualAchievements);

    expect(audit.invalid).toEqual([]);
    expect(audit.invalidCount).toBe(0);
    expect(audit.total).toBe(manualAchievements.length);
  });

  test('navigation to manual achievement action does not unlock without completion', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-achievements').click();
    // Achievement cards are read-only; navigate directly to progress.
    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);
    await expectAchievementLocked(page, MANUAL_ACHIEVEMENT_ID);

    await page.getByTestId('nav-achievements').click();
    await expect(page.locator(`article[data-achievement-id="${MANUAL_ACHIEVEMENT_ID}"]`)).toHaveClass(/is-locked/);
  });

  test('all manual review achievement cards carry segment id', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);
    const manualAchievements = loadManualAchievementFixtures();
    expect(manualAchievements.length).toBeGreaterThan(0);

    await page.getByTestId('nav-achievements').click();

    const audit = await page.evaluate((manuals) => {
      const invalid: string[] = [];

      for (const manual of manuals) {
        const card = document.querySelector(
          `#achievements article[data-achievement-id="${CSS.escape(manual.id)}"]`
        );

        if (!card) {
          invalid.push(`${manual.id}: missing card`);
          continue;
        }

        if (card.getAttribute('data-learning-segment-id') !== manual.segmentId) {
          invalid.push(`${manual.id}: card missing segment ${manual.segmentId}`);
        }
      }

      return {
        invalid: invalid.slice(0, 10),
        invalidCount: invalid.length,
        total: manuals.length
      };
    }, manualAchievements);

    expect(audit.invalid).toEqual([]);
    expect(audit.invalidCount).toBe(0);
    expect(audit.total).toBe(manualAchievements.length);
  });

  test('every achievement card is read-only with no action buttons', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);
    const achievements = loadAchievementFixtures();

    await page.getByTestId('nav-achievements').click();

    const actionAudit = await page.evaluate((expectedAchievements) => {
      const invalidActions: string[] = [];

      for (const achievement of expectedAchievements) {
        const card = document.querySelector(`#achievements article[data-achievement-id="${CSS.escape(achievement.id)}"]`);
        if (!card) {
          continue;
        }

        const actions = [...card.querySelectorAll('[data-achievement-action]')];
        if (actions.length !== 0) {
          invalidActions.push(`${achievement.id}: expected 0 actions, found ${actions.length}`);
        }
      }

      return {
        expectedCount: expectedAchievements.length,
        renderedCount: document.querySelectorAll('#achievements article[data-achievement-id]').length,
        invalidActions: invalidActions.slice(0, 10),
        invalidActionCount: invalidActions.length
      };
    }, achievements);

    expect(actionAudit.renderedCount).toBeGreaterThan(0);
    expect(actionAudit.renderedCount).toBeLessThanOrEqual(actionAudit.expectedCount);
    expect(actionAudit.invalidActions).toEqual([]);
    expect(actionAudit.invalidActionCount).toBe(0);
  });

  test('raw completedLearningSegments evidence does not inflate general progress', async ({ page }) => {
    await seedStoredState(page, {
      completedLearningSegments: [MANUAL_SEGMENT_ID]
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    const state = await page.evaluate(() => ({
      learnedElements: Array.from(window.appState.learnedElements),
      collectedElements: Array.from(window.appState.collectedElements),
      completedLearningSegments: Array.from(window.appState.completedLearningSegments)
    }));

    expect(state.completedLearningSegments).toEqual([MANUAL_SEGMENT_ID]);
    expect(state.learnedElements).toEqual([]);
    expect(state.collectedElements).toEqual([]);
    await expect(page.locator('#progress .progress-ring')).toHaveCount(0);
    await expect(page.locator('#progress')).not.toContainText('0 / 118');
    await expect(page.locator('#progress')).not.toContainText('0%');
    await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expectLearningCardStatus(page, MANUAL_SEGMENT_ID, '学习确认：日期待补充');
  });
});

async function resetApp(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function seedStoredState(page: Page, progressPatch: Record<string, unknown>) {
  await page.context().addInitScript(({ key, patch }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(key, JSON.stringify({
      version: 'v3',
      data: {
        currentElement: null,
        compareList: [],
        learnedElements: [],
        collectedElements: [],
        quizScores: [],
        completedExperiments: [],
        completedLearningSegments: [],
        learningSegmentCompletionDates: {},
        experimentTitleOverrides: {},
        unlockedAchievements: [],
        achievementDates: {},
        gameScores: {},
        gamePlays: {},
        activityLog: [],
        settings: {
          performanceMode: 'normal',
          particleDensity: 'medium',
          soundEnabled: false,
          difficulty: 'normal'
        },
        ...patch
      }
    }));
  }, { key: STORAGE_KEY, patch: progressPatch });
}

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      return hasElements;
    });
  }, { timeout: 15000 }).toBe(true);
  await page.evaluate(() => {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.add('hidden');
      loader.classList.add('display-none');
    }
  });
}

function getLearningCard(page: Page, segmentId: string) {
  return page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${segmentId}"]`).first();
}

async function showLearningCard(page: Page, segmentId: string) {
  const card = getLearningCard(page, segmentId);
  const sourceVolumeId = await card.evaluate((element) => (
    element.closest('[data-textbook-panel]')?.getAttribute('data-textbook-panel') || ''
  ));

  if (sourceVolumeId) {
    const tab = page.locator(`[data-textbook-tab="${sourceVolumeId}"]`);
    if (await tab.count()) {
      await tab.click();
    }
  }

  return card;
}

async function expectLearningCardStatus(page: Page, segmentId: string, expectedStatus: '' | '学习确认：日期待补充') {
  const status = getLearningCard(page, segmentId).locator('[data-testid=\"learning-card-status\"]');
  await expect(status).toHaveText(expectedStatus);
}

async function expectLearningCardConfirmed(page: Page, segmentId: string) {
  const status = getLearningCard(page, segmentId).locator('[data-testid="learning-card-status"]');
  await expect(status).toHaveText(/^学习确认：\d{4}-\d{2}-\d{2}$/);
  const text = (await status.textContent())?.trim() || '';
  return text.replace('学习确认：', '');
}

async function confirmLearningViaModal(page: Page, segmentId: string, achievementId: string) {
  const card = await showLearningCard(page, segmentId);
  await expect(card).toBeVisible();
  await expect(card.locator('[data-testid=\"learning-card-status\"]')).toHaveText('');

  await card.click();

  const modal = page.locator(`[data-testid="lesson-modal"][data-learning-segment-id="${segmentId}"]`);
  await expect(modal).toBeVisible();
  await expect(page.evaluate((targetSegmentId) => (
    window.appState.completedLearningSegments.has(targetSegmentId)
  ), segmentId)).resolves.toBe(false);

  const confirmButton = modal.locator(`[data-testid="confirm-learning"][data-manual-achievement-id="${achievementId}"]`);
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  await expect.poll(async () => page.evaluate((targetSegmentId) => (
    window.appState.completedLearningSegments.has(targetSegmentId)
  ), segmentId), { timeout: 10000 }).toBe(true);
}

async function writeStoredState(page: Page, progressPatch: Record<string, unknown>) {
  await page.evaluate(({ key, patch }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 'v3',
      data: {
        currentElement: null,
        compareList: [],
        learnedElements: [],
        collectedElements: [],
        quizScores: [],
        completedExperiments: [],
        completedLearningSegments: [],
        learningSegmentCompletionDates: {},
        experimentTitleOverrides: {},
        unlockedAchievements: [],
        achievementDates: {},
        gameScores: {},
        gamePlays: {},
        activityLog: [],
        settings: {
          performanceMode: 'normal',
          particleDensity: 'medium',
          soundEnabled: false,
          difficulty: 'normal'
        },
        ...patch
      }
    }));
  }, { key: STORAGE_KEY, patch: progressPatch });
}

function loadAchievementFixtures(): { id: string }[] {
  return achievementsData.map((achievement) => ({ id: achievement.id }));
}

function loadManualAchievementFixtures(): ManualAchievementFixture[] {
  return achievementsData
    .filter((achievement) => achievement.condition?.type === 'manualReviewAfterPromotion')
    .map((achievement) => ({
      id: achievement.id,
      segmentId: achievement.curriculumTags[0]
    }));
}

async function expectAchievementLocked(page: Page, achievementId: string) {
  await expect.poll(async () => page.evaluate((id) => (
    window.appState.unlockedAchievements.has(id)
  ), achievementId)).toBe(false);
}

async function readManualProgressSnapshot(page: Page, segmentId: string) {
  return page.evaluate(async (targetSegmentId) => {
    const progress = await import('/src/modules/progress.js');
    const { learningPath } = await import('/src/data/index.js');
    const stageStates = progress.__progressTestHooks.getStageStates(
      learningPath.stages,
      new Set(window.appState.learnedElements),
      new Set(window.appState.completedExperiments),
      window.appState.quizScores.map((score) => ({ ...score })),
      new Set(window.appState.unlockedAchievements),
      new Set(window.appState.completedLearningSegments)
    );
    const topic = stageStates
      .flatMap((stage) => stage.curriculum.topics.map((item) => ({ ...item, stageId: stage.id })))
      .find((item) => item.segmentId === targetSegmentId);

    return {
      manualCompleted: topic?.manualCompleted ?? null,
      displayCompleted: topic?.displayCompleted ?? null,
      stagePathCompleted: topic?.stagePathCompleted ?? null,
      rawSegmentCompleted: topic?.rawSegmentCompleted ?? null,
      stageCompletedCount: stageStates.find((stage) => stage.id === topic?.stageId)?.curriculum.completedCount ?? null,
      completedStageIds: stageStates.filter((stage) => stage.isComplete).map((stage) => stage.id)
    };
  }, segmentId);
}

async function readStorageEvidence(page: Page, segmentId: string, achievementId: string) {
  return page.evaluate(({ key, segmentId: targetSegmentId, achievementId: targetAchievementId }) => {
    const rawEnvelope = window.localStorage.getItem(key);
    const storedEnvelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
    const card = document.querySelector(`#progress [data-testid="learning-card"][data-learning-segment-id="${CSS.escape(targetSegmentId)}"]`);
    return {
      appState: {
        completedLearningSegments: Array.from(window.appState.completedLearningSegments),
        unlockedAchievements: Array.from(window.appState.unlockedAchievements)
      },
      storedEnvelope,
      segmentPersisted: storedEnvelope?.data?.completedLearningSegments?.includes(targetSegmentId) ?? false,
      achievementPersisted: storedEnvelope?.data?.unlockedAchievements?.includes(targetAchievementId) ?? false,
      storedLearningSegmentCompletionDates: storedEnvelope?.data?.learningSegmentCompletionDates || {},
      cardText: card?.textContent?.replace(/\s+/g, ' ').trim() || ''
    };
  }, { key: STORAGE_KEY, segmentId, achievementId });
}

async function waitForStoredSegment(page: Page, segmentId: string, achievementId: string) {
  await expect.poll(async () => page.evaluate(({ key, segmentId: targetSegmentId, achievementId: targetAchievementId }) => {
    const rawEnvelope = window.localStorage.getItem(key);
    if (!rawEnvelope) {
      return false;
    }

    const envelope = JSON.parse(rawEnvelope);
    const completedSegments = envelope?.data?.completedLearningSegments;
    const unlockedAchievements = envelope?.data?.unlockedAchievements;
    const completionDates = envelope?.data?.learningSegmentCompletionDates;
    if (
      envelope?.version !== 'v3'
      || !Array.isArray(completedSegments)
      || !Array.isArray(unlockedAchievements)
      || typeof completionDates !== 'object'
      || completionDates === null
      || !completedSegments.includes(targetSegmentId)
      || !unlockedAchievements.includes(targetAchievementId)
      || !/^\d{4}-\d{2}-\d{2}$/.test(completionDates[targetSegmentId] || '')
    ) {
      return false;
    }

    return true;
  }, { key: STORAGE_KEY, segmentId, achievementId }), { timeout: 10000 }).toBe(true);

  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), STORAGE_KEY);
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}
