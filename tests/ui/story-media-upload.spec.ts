import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'element-explorer-kids-state';

test.describe('story media upload modal', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await clearStoredState(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('story media card opens an upload modal and saves a local image override', async ({ page }) => {
    await openCopperStory(page);

    const discoveryCard = page.locator('.story-media-card-discovery').first();
    await discoveryCard.dblclick();

    const modal = page.getByRole('dialog', { name: /编辑发现故事图片/ });
    await expect(modal).toBeVisible();
    await expect(modal.locator('img')).toBeVisible();
    await modal.getByLabel(/图片来源/).fill('本机上传：铜发现照片');

    await modal.getByLabel(/选择图片/).setInputFiles({
      name: 'copper.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lXwU9wAAAABJRU5ErkJggg==',
        'base64'
      )
    });

    await modal.getByRole('button', { name: '保存' }).click();

    await expect(modal).toBeHidden();
    await expect(discoveryCard.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect(discoveryCard.locator('.story-media-attribution')).toContainText('图片来源：');
    await expect(discoveryCard.locator('.story-media-source-value')).toContainText('本机上传：铜发现照片');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await openCopperStory(page);
    await expect(page.locator('.story-media-card-discovery').first().locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  });

  test('story media upload rejects oversized files and missing source', async ({ page }) => {
    await openCopperStory(page);
    await page.locator('.story-media-card-specimen').first().dblclick();

    const modal = page.getByRole('dialog', { name: /编辑元素样品图片/ });
    await modal.getByRole('button', { name: '保存' }).click();
    await expect(modal.locator('.story-media-modal-error')).toHaveAttribute('data-error-text', '请填写图片来源。');

    await modal.getByLabel(/图片来源/).fill('本机上传：过大图片');
    await modal.getByLabel(/选择图片/).setInputFiles({
      name: 'large.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(1024 * 1024 + 1)
    });
    // Wait for validation error to appear (file validation happens asynchronously on change)
    await expect(modal.locator('.story-media-modal-error')).toHaveAttribute('data-error-text', '图片不能超过 1 MiB。');
  });

  test('keyboard Enter and Space activate story media card', async ({ page }) => {
    await openCopperStory(page);

    const discoveryCard = page.locator('.story-media-card-discovery').first();
    await discoveryCard.focus();
    await page.keyboard.press('Enter');

    const modal = page.getByRole('dialog', { name: /编辑发现故事图片/ });
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/#\/story$/);

    await discoveryCard.focus();
    await page.keyboard.press('Space');
    await expect(modal).toBeVisible();
  });

  test('modal closes via backdrop click and close button', async ({ page }) => {
    await openCopperStory(page);

    const discoveryCard = page.locator('.story-media-card-discovery').first();
    await discoveryCard.dblclick();

    const modal = page.getByRole('dialog', { name: /编辑发现故事图片/ });
    await expect(modal).toBeVisible();

    await page.locator('.story-media-modal-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(modal).toBeHidden();

    await discoveryCard.dblclick();
    await expect(modal).toBeVisible();

    await modal.locator('.story-media-modal-close').click();
    await expect(modal).toBeHidden();
  });

  test('clear local override restores canonical image', async ({ page }) => {
    await openCopperStory(page);

    const discoveryCard = page.locator('.story-media-card-discovery').first();
    await discoveryCard.dblclick();

    const modal = page.getByRole('dialog', { name: /编辑发现故事图片/ });
    await modal.getByLabel(/图片来源/).fill('本机上传：临时图片');
    await modal.getByLabel(/选择图片/).setInputFiles({
      name: 'temp.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lXwU9wAAAABJRU5ErkJggg==',
        'base64'
      )
    });
    await modal.getByRole('button', { name: '保存' }).click();
    await expect(modal).toBeHidden();

    await expect(discoveryCard.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);

    await discoveryCard.dblclick();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: '清除本地图片' }).click();
    await expect(modal).toBeHidden();

    const src = await discoveryCard.locator('img').getAttribute('src');
    expect(src).toMatch(/^\/assets\/elements\/(discovery|specimens)\/[\w.-]+\.webp$/);
  });
});

async function waitForAppReady(page) {
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

async function clearStoredState(page) {
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, STORAGE_KEY);
}

async function openCopperStory(page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-atomic-number="29"]');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.getByTestId('element-cell-29').click({ force: true });
  await expect(page.locator('#detail-panel')).toHaveClass(/open|docked/);
  await page.locator('#btn-story').click();
  await expect(page).toHaveURL(/#\/story$/);
  await expect(page.locator('#story')).toHaveClass(/active/);
  await expect(page.locator('#story .story-shell h3')).toContainText('铜 · Cu');
}
