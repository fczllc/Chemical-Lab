import { expect, test, type Page } from '@playwright/test';

const MANUAL_ACHIEVEMENT_ID = 'textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-promote-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-achievement-achievement-0001-source-section-l1-l5-bd27b23b45';
const MANUAL_SEGMENT_ID = 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45';

test.describe('Achievement progress coupling', () => {
  test('manual textbook achievement requires explicit completion', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-achievements').click();
    const card = page.locator(`article[data-achievement-id="${MANUAL_ACHIEVEMENT_ID}"]`);
    const action = card.getByRole('button', { name: '查看进度' });

    await expect(card).toHaveClass(/is-locked/);
    await expect(action).toBeVisible();

    await action.click();
    await expect(page).toHaveURL(/#\/progress$/);
    await expect(card).toHaveClass(/is-locked/);
    await expect.poll(async () => page.evaluate((achievementId) => (
      window.appState.unlockedAchievements.has(achievementId)
    ), MANUAL_ACHIEVEMENT_ID)).toBe(false);

    await page.evaluate(async (segmentId) => {
      const storage = await import('/src/modules/storage.js');
      storage.markLearningSegmentCompleted(segmentId);
    }, MANUAL_SEGMENT_ID);

    await expect.poll(async () => page.evaluate((achievementId) => (
      window.appState.unlockedAchievements.has(achievementId)
    ), MANUAL_ACHIEVEMENT_ID), { timeout: 10000 }).toBe(true);
    await expect(card).toHaveClass(/is-unlocked/);
  });

  test('manual review helper rejects invalid curriculum metadata', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    const results = await page.evaluate(async () => {
      const achievements = await import('/src/modules/achievements.js');
      const storage = await import('/src/modules/storage.js');

      storage.markLearningSegmentCompleted('knowledge-topic-0001-source-section-l1-l5-bd27b23b45');

      return {
        missingReviewStatus: achievements.__achievementsTestHooks.matchesCondition({ type: 'manualReviewAfterPromotion' }, {
          condition: { type: 'manualReviewAfterPromotion' },
          sourceReviewStatus: 'pending',
          curriculumTags: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']
        }),
        multipleTagsRejected: achievements.__achievementsTestHooks.matchesCondition({ type: 'manualReviewAfterPromotion' }, {
          condition: { type: 'manualReviewAfterPromotion' },
          sourceReviewStatus: 'reviewed',
          curriculumTags: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45', 'another-segment']
        }),
        validManualReview: achievements.__achievementsTestHooks.matchesCondition({ type: 'manualReviewAfterPromotion' }, {
          condition: { type: 'manualReviewAfterPromotion' },
          sourceReviewStatus: 'reviewed',
          curriculumTags: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']
        })
      };
    });

    expect(results.missingReviewStatus).toBe(false);
    expect(results.multipleTagsRejected).toBe(false);
    expect(results.validManualReview).toBe(true);
  });
});

async function resetApp(page: Page) {
  await page.context().addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
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
