import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'element-explorer-kids-state';
const CUSTOM_TITLE = '儿童火山实验';
const CANCELLED_TITLE = '不应保存的标题';
const MALICIOUS_LOOKING_TITLE = '<img src=x onerror=alert(1)>';

type BrowserIssueTracker = {
  dialogs: string[];
  pageErrors: string[];
};

type OpenedExperiment = {
  canonicalTitle: string;
  reactionId: string;
};

test.describe('experiment detail editable title', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await clearStoredState(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await openLabRoute(page);
  });

  test('saves and persists custom title after reload', async ({ page }) => {
    const experiment = await openFirstExperimentDetail(page);

    await enterTitleEditMode(page);
    await page.getByTestId('experiment-title-input').fill(CUSTOM_TITLE);
    await page.getByTestId('experiment-title-save').click();

    await expectExperimentTitle(page, CUSTOM_TITLE);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await openLabRoute(page);
    await openFirstExperimentDetail(page);

    await expectExperimentTitle(page, CUSTOM_TITLE);

    await clearExperimentTitleOverride(page, experiment.reactionId);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await openLabRoute(page);
    await openFirstExperimentDetail(page);

    await expectExperimentTitle(page, experiment.canonicalTitle);
  });

  test('rejects invalid and cancels safely while escaping malicious-looking title', async ({ page }) => {
    const issues = trackBrowserIssues(page);
    const { canonicalTitle } = await openFirstExperimentDetail(page);

    await enterTitleEditMode(page);
    await page.getByTestId('experiment-title-input').fill(CANCELLED_TITLE);
    await page.getByTestId('experiment-title-cancel').click();
    await expectExperimentTitle(page, canonicalTitle);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await openLabRoute(page);
    await openFirstExperimentDetail(page);
    await expectExperimentTitle(page, canonicalTitle);

    await enterTitleEditMode(page);
    await page.getByTestId('experiment-title-input').fill('   ');
    await page.getByTestId('experiment-title-save').click();

    await expect(page.getByTestId('experiment-title-input')).toBeVisible();
    await expect(page.getByTestId('experiment-title-input')).toHaveValue('   ');
    await expect(page.getByTestId('experiment-title-error')).toHaveText('标题不能为空');

    await page.getByTestId('experiment-title-input').fill(MALICIOUS_LOOKING_TITLE);
    await page.getByTestId('experiment-title-save').click();

    await expectExperimentTitle(page, MALICIOUS_LOOKING_TITLE);
    await expect(page.getByTestId('experiment-title').locator('img')).toHaveCount(0);
    expect(issues.dialogs).toEqual([]);
    expect(issues.pageErrors).toEqual([]);
  });

  test('supports keyboard Enter save and Escape cancel', async ({ page }) => {
    await openFirstExperimentDetail(page);

    await enterTitleEditMode(page);
    await page.getByTestId('experiment-title-input').fill('键盘保存标题');
    await page.keyboard.press('Enter');
    await expectExperimentTitle(page, '键盘保存标题');

    await enterTitleEditMode(page);
    await page.getByTestId('experiment-title-input').fill('键盘取消标题');
    await page.keyboard.press('Escape');
    await expectExperimentTitle(page, '键盘保存标题');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await openLabRoute(page);
    await openFirstExperimentDetail(page);
    await expectExperimentTitle(page, '键盘保存标题');
  });
});

async function waitForAppReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 30000 }).toBe(true);
  await expect(page.getByTestId('element-cell-1')).toBeVisible({ timeout: 30000 });
}

async function clearStoredState(page: Page) {
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, STORAGE_KEY);
}

async function openLabRoute(page: Page) {
  await page.getByTestId('nav-lab').click();
  await expect(page).toHaveURL(/#\/lab$/);
  await expect(page.locator('#lab')).toHaveClass(/active/);
  await expect(page.locator('#lab .lab-toolbar')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#lab [data-reaction-open]').first()).toBeVisible({ timeout: 15000 });
}

async function openFirstExperimentDetail(page: Page): Promise<OpenedExperiment> {
  const openButton = page.locator('#lab [data-reaction-open]').first();
  const reactionId = await openButton.getAttribute('data-reaction-open');

  expect(reactionId).toBeTruthy();
  await openButton.click();
  await expect(page.locator('.lab-detail-modal')).toBeVisible({ timeout: 15000 });

  const title = page.getByTestId('experiment-title');
  await expect(title).toBeVisible();
  return {
    canonicalTitle: normalizeText(await title.textContent()),
    reactionId: reactionId || ''
  };
}

async function clearExperimentTitleOverride(page: Page, reactionId: string) {
  await page.evaluate(async (key) => {
    const storage = await import('/src/modules/storage.js');
    storage.clearExperimentTitleOverride(key);
    storage.saveProgress();
  }, reactionId);
}

async function enterTitleEditMode(page: Page) {
  await page.getByTestId('experiment-title').dblclick();
  await expect(page.getByTestId('experiment-title-input')).toBeVisible();
  await expect(page.getByTestId('experiment-title-save')).toBeVisible();
  await expect(page.getByTestId('experiment-title-cancel')).toBeVisible();
}

async function expectExperimentTitle(page: Page, expectedTitle: string) {
  await expect(page.getByTestId('experiment-title')).toHaveText(expectedTitle);
  await expect(page.getByTestId('experiment-title-input')).toHaveCount(0);
}

function trackBrowserIssues(page: Page): BrowserIssueTracker {
  const issues: BrowserIssueTracker = {
    dialogs: [],
    pageErrors: []
  };

  page.on('dialog', async (dialog) => {
    issues.dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  page.on('pageerror', (error) => {
    issues.pageErrors.push(error.message);
  });

  return issues;
}

function normalizeText(value: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}
