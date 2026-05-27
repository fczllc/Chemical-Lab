import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'element-explorer-kids-state';
const MANUAL_SEGMENT_ID = 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45';
const MANUAL_ACHIEVEMENT_ID = 'textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-promote-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-achievement-achievement-0001-source-section-l1-l5-bd27b23b45';

test.describe('Learning content modal interaction', () => {
  test('clicking learning card opens modal and does not complete segment', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(card).toBeVisible();

    const statusBefore = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(statusBefore?.trim()).toBe('未学习');

    const completedBefore = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(completedBefore).toBe(false);

    await card.click();

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const completedAfterOpen = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(completedAfterOpen).toBe(false);

    const statusAfterOpen = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(statusAfterOpen?.trim()).toBe('未学习');
  });

  test('closing modal without confirmation leaves segment uncompleted', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(card).toBeVisible();
    await card.click();

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    // Close via close button
    await modal.locator('[data-testid="lesson-modal-close"]').click();
    await expect(modal).not.toBeVisible();

    const completedAfterClose = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(completedAfterClose).toBe(false);

    const statusAfterClose = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(statusAfterClose?.trim()).toBe('未学习');

    // Reopen and close via Escape
    await card.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    const completedAfterEscape = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(completedAfterEscape).toBe(false);
  });

  test('modal confirmation completes segment and persists after reload', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(card).toBeVisible();
    await card.click();

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const confirmButton = modal.locator('[data-testid="confirm-learning"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect.poll(async () => page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID), { timeout: 10000 }).toBe(true);

    const statusAfterConfirm = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(statusAfterConfirm?.trim()).toBe('已学习');

    // Wait for debounced save to flush before reloading
    await expect.poll(async () => {
      const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
      if (!raw) return false;
      try {
        const envelope = JSON.parse(raw);
        return Array.isArray(envelope?.data?.completedLearningSegments)
          && envelope.data.completedLearningSegments.includes(MANUAL_SEGMENT_ID);
      } catch {
        return false;
      }
    }, { timeout: 10000 }).toBe(true);

    // Persist after reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('nav-progress').click();

    const reloadedCard = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(reloadedCard).toBeVisible();
    const statusAfterReload = await reloadedCard.locator('[data-testid="learning-card-status"]').textContent();
    expect(statusAfterReload?.trim()).toBe('已学习');

    const persistedCompleted = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(persistedCompleted).toBe(true);
  });

  test('completed lesson can still open modal and read content', async ({ page }) => {
    await seedStoredState(page, {
      completedLearningSegments: [MANUAL_SEGMENT_ID]
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(card).toBeVisible();
    const status = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(status?.trim()).toBe('已学习');

    await card.click();

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const body = modal.locator('[data-testid="lesson-modal-body"]');
    await expect(body).toBeVisible();

    const bodyText = await body.textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');
  });

  test('no learning card contains a visible completion button', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const cards = page.locator('#progress [data-testid="learning-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Assert no card-level completion button exists in a single query
    const completionButtons = page.locator('#progress [data-testid="learning-card"] button');
    const completionCount = await completionButtons.count();
    expect(completionCount).toBe(0);
  });

  test('modal content has distinct sections without undefined or null', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(card).toBeVisible();
    await card.click();

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const body = modal.locator('[data-testid="lesson-modal-body"]');
    await expect(body).toBeVisible();

    const bodyText = await body.textContent();
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');

    // Assert at least some known section titles appear
    expect(bodyText).toContain('章节来源');
    expect(bodyText).toContain('本节要学什么');
    expect(bodyText).toContain('教材内容');
    expect(bodyText).toContain('关键知识点');
    expect(bodyText).toContain('相关资料');
    expect(bodyText).toContain('学习确认');
  });

  test('modal escapes unsafe metadata instead of rendering executable HTML', async ({ page }) => {
    const unsafeTitle = '<img data-learning-title-xss src=x onerror="window.__learningTitleXss = true">';
    const unsafeDescription = '<svg data-learning-description-xss onload="window.__learningDescriptionXss = true"></svg>';

    await seedStoredState(page, {
      activityLog: [{
        id: 'unsafe-learning-activity',
        type: 'unsafe-learning-activity',
        title: unsafeTitle,
        description: unsafeDescription,
        timestamp: '<time data-learning-timestamp-xss>bad</time>',
        meta: {}
      }]
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(card).toBeVisible();
    await card.click();

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const safety = await page.evaluate(() => {
      return {
        injectedTitleNodes: document.querySelectorAll('[data-learning-title-xss]').length,
        injectedDescriptionNodes: document.querySelectorAll('[data-learning-description-xss]').length,
        injectedTimestampNodes: document.querySelectorAll('[data-learning-timestamp-xss]').length,
        titleHandlerRan: Boolean((window as any).__learningTitleXss),
        descriptionHandlerRan: Boolean((window as any).__learningDescriptionXss)
      };
    });

    expect(safety.injectedTitleNodes).toBe(0);
    expect(safety.injectedDescriptionNodes).toBe(0);
    expect(safety.injectedTimestampNodes).toBe(0);
    expect(safety.titleHandlerRan).toBe(false);
    expect(safety.descriptionHandlerRan).toBe(false);
  });

  test('long modal content supports internal scroll', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${MANUAL_SEGMENT_ID}"]`).first();
    await expect(card).toBeVisible();
    await card.click();

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const body = modal.locator('[data-testid="lesson-modal-body"]');
    await expect(body).toBeVisible();

    const scrollInfo = await body.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: window.getComputedStyle(el).overflowY
    }));

    // Body should have scroll capability if content is long; at minimum assert overflow-y is auto/scroll
    expect(['auto', 'scroll']).toContain(scrollInfo.overflowY);
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
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 15000 }).toBe(true);
}

async function waitForAppReady(page: Page) {
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


