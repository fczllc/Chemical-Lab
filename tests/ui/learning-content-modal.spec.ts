import { expect, test, type Locator, type Page } from '@playwright/test';

const STORAGE_KEY = 'element-explorer-kids-state';
const MANUAL_SEGMENT_ID = 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45';
const TEXTBOOK_CONTENT_SEGMENT_ID = 'knowledge-topic-0004-source-section-l63-l74-105f9964c8';
const TEXTBOOK_CONTENT_SOURCE = '教材：2019版人教版高中化学必修第1册；范围：L63-74';
const TEXTBOOK_CONTENT_PHRASE = '世界是由物质构成的';
const FORMULA_SEGMENT_ID = 'knowledge-topic-0008-1-l94-l129-9ca678fac3';
const FORBIDDEN_MODAL_BODY_STRINGS = [
  '本节要学什么',
  '关键知识点',
  '相关资料',
  '学习确认',
  '卷册 ID',
  '来源哈希',
  'reviewedBy',
  'src/data/textbooks',
  '暂无已审核的结构化正文',
  '待审成就：学习并复核',
  '相邻标题',
  '图示摘要',
  '来源记录'
];

test.describe('Learning content modal interaction', () => {
  test('clicking learning card opens modal and does not complete segment', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const card = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(card).toBeVisible();

    const statusBefore = await card.locator('[data-testid="learning-card-status"]').count();
    expect(statusBefore).toBe(0);

    const completedBefore = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(completedBefore).toBe(false);

    await clickLearningCard(card);

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const completedAfterOpen = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(completedAfterOpen).toBe(false);

    const statusAfterOpen = await card.locator('[data-testid="learning-card-status"]').count();
    expect(statusAfterOpen).toBe(0);
  });

  test('closing modal without confirmation leaves segment uncompleted', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const card = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(card).toBeVisible();
    await clickLearningCard(card);

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    await modal.locator('[data-testid="lesson-modal-close"]').click();
    await expect(modal).not.toBeVisible();

    const completedAfterClose = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(completedAfterClose).toBe(false);

    const statusAfterClose = await card.locator('[data-testid="learning-card-status"]').count();
    expect(statusAfterClose).toBe(0);

    await clickLearningCard(card);
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

    const card = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(card).toBeVisible();
    await clickLearningCard(card);

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const confirmButton = modal.locator('[data-testid="confirm-learning"]');
    await expect(confirmButton).toBeVisible();
    const confirmText = await confirmButton.textContent();
    expect(confirmText?.trim()).toBe('确定已学习');

    const date = await getTodayLocalDateInBrowser(page);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await activateConfirmButton(confirmButton);

    await expect.poll(async () => page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID), { timeout: 10000 }).toBe(true);

    await expect.poll(async () => getStoredLearningDate(page, MANUAL_SEGMENT_ID), { timeout: 10000 }).toBe(date);

    const statusAfterConfirm = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(statusAfterConfirm?.trim()).toBe(`学习确认：${date}`);

    await expect.poll(async () => {
      const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
      if (!raw) return false;
      try {
        const envelope = JSON.parse(raw);
        return Array.isArray(envelope?.data?.completedLearningSegments)
          && envelope.data.completedLearningSegments.includes(MANUAL_SEGMENT_ID)
          && envelope.data.learningSegmentCompletionDates?.[MANUAL_SEGMENT_ID] === date;
      } catch {
        return false;
      }
    }, { timeout: 10000 }).toBe(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.getByTestId('nav-progress').click();

    const reloadedCard = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(reloadedCard).toBeVisible();
    const statusAfterReload = await reloadedCard.locator('[data-testid="learning-card-status"]').textContent();
    expect(statusAfterReload?.trim()).toBe(`学习确认：${date}`);

    const persistedCompleted = await page.evaluate((segmentId) => (
      window.appState.completedLearningSegments.has(segmentId)
    ), MANUAL_SEGMENT_ID);
    expect(persistedCompleted).toBe(true);
  });

  test('completed lesson can still open modal and read content', async ({ page }) => {
    await seedStoredState(page, {
      completedLearningSegments: [MANUAL_SEGMENT_ID],
      learningSegmentCompletionDates: {
        [MANUAL_SEGMENT_ID]: '2026-05-01'
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    const card = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(card).toBeVisible();
    const status = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(status?.trim()).toBe('学习确认：2026-05-01');

    await clickLearningCard(card);

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const body = modal.locator('[data-testid="lesson-modal-body"]');
    await expect(body).toBeVisible();

    const bodyText = await body.textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');

    const footer = modal.locator('.lesson-modal-footer');
    const footerText = await footer.textContent();
    expect(footerText?.trim()).toBe('已学习：2026-05-01');
    await expect(modal.locator('[data-testid="confirm-learning"]')).toHaveCount(0);
  });

  test('legacy completed lesson without stored date shows date pending', async ({ page }) => {
    await seedStoredState(page, {
      completedLearningSegments: [MANUAL_SEGMENT_ID]
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();

    const card = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(card).toBeVisible();
    const status = await card.locator('[data-testid="learning-card-status"]').textContent();
    expect(status?.trim()).toBe('学习确认：日期待补充');

    await clickLearningCard(card);

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const footer = modal.locator('.lesson-modal-footer');
    const footerText = await footer.textContent();
    expect(footerText?.trim()).toBe('已学习：日期待补充');
    await expect(modal.locator('[data-testid="confirm-learning"]')).toHaveCount(0);
  });

  test('no learning card contains a visible completion button', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const cards = page.locator('#progress [data-testid="learning-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const completionButtons = page.locator('#progress [data-testid="learning-card"] button');
    const completionCount = await completionButtons.count();
    expect(completionCount).toBe(0);
  });

  test('modal body shows exact source and textbook content sections without internal metadata', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const modal = await openLearningCard(page, TEXTBOOK_CONTENT_SEGMENT_ID);
    const body = modal.locator('[data-testid="lesson-modal-body"]');
    await expect(body).toBeVisible();

    const sectionHeadings = await body.locator('.lesson-modal-section h5').allTextContents();
    expect(sectionHeadings.map((heading) => heading.trim())).toEqual(['章节来源', '教材内容']);

    const bodyText = await body.textContent();
    expect(bodyText).toContain(TEXTBOOK_CONTENT_SOURCE);
    expect(bodyText).toContain(TEXTBOOK_CONTENT_PHRASE);
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');
    for (const forbidden of FORBIDDEN_MODAL_BODY_STRINGS) {
      expect(bodyText).not.toContain(forbidden);
    }
  });

  test('modal textbook content renders formula prose with KaTeX', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);
    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    const modal = await openLearningCard(page, FORMULA_SEGMENT_ID);
    const body = modal.locator('[data-testid="lesson-modal-body"]');

    const contentSection = body.locator('.lesson-modal-section', { has: page.locator('h5', { hasText: '教材内容' }) });
    const formula = contentSection.locator('.katex').first();
    await expect(formula).toBeVisible();

    const contentText = await contentSection.textContent();
    expect(contentText).toContain('60');
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

    const card = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(card).toBeVisible();
    await clickLearningCard(card);

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

    const card = await showLearningCard(page, MANUAL_SEGMENT_ID);
    await expect(card).toBeVisible();
    await clickLearningCard(card);

    const modal = page.locator('[data-testid="lesson-modal"]');
    await expect(modal).toBeVisible();

    const body = modal.locator('[data-testid="lesson-modal-body"]');
    await expect(body).toBeVisible();

    const scrollInfo = await body.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: window.getComputedStyle(el).overflowY
    }));

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
        learningSegmentCompletionDates: {},
        experimentCompletionDates: {},
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

async function getTodayLocalDateInBrowser(page: Page) {
  return await page.evaluate(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
}

async function getStoredLearningDate(page: Page, segmentId: string) {
  return await page.evaluate((id) => (
    window.appState.learningSegmentCompletionDates?.[id] ?? null
  ), segmentId);
}

async function showLearningCard(page: Page, segmentId: string) {
  const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${segmentId}"]`).first();
  await expect(card).toBeAttached({ timeout: 15000 });
  const panelId = await card.evaluate((element) => (
    element.closest('[data-textbook-panel]')?.getAttribute('data-textbook-panel') || ''
  ));
  if (panelId) {
    const tab = page.locator(`[data-textbook-tab="${escapeCssAttribute(panelId)}"]`);
    if (await tab.count()) {
      await tab.first().click();
    }
  }
  const activeCard = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${segmentId}"]`).first();
  await expect(activeCard).toBeAttached({ timeout: 15000 });
  await expect(activeCard).toBeVisible({ timeout: 15000 });
  await activeCard.scrollIntoViewIfNeeded();
  return activeCard;
}

async function openLearningCard(page: Page, segmentId: string): Promise<Locator> {
  const card = await showLearningCard(page, segmentId);
  await expect(card).toBeVisible();
  await clickLearningCard(card);
  const modal = page.locator('[data-testid="lesson-modal"]');
  await expect(modal).toBeVisible();
  return modal;
}

async function clickLearningCard(card: Locator) {
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.scrollIntoViewIfNeeded();
  await card.evaluate((element) => {
    (element as HTMLElement).click();
  });
}

async function activateConfirmButton(button: Locator) {
  await expect(button).toBeVisible({ timeout: 15000 });
  await button.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

function escapeCssAttribute(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 30000 }).toBe(true);
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
