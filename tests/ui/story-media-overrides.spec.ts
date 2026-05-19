import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'element-explorer-kids-state';

test.describe('story media overrides', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await clearStoredState(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('starts with no story media overrides', async ({ page }) => {
    const overrides = await page.evaluate(async () => {
      const storage = await import('/src/modules/storage.js');
      return {
        all: storage.getStoryMediaOverrides(),
        cuDiscovery: storage.getStoryMediaOverride(29, 'discovery'),
        snapshot: storage.getStateSnapshot().storyMediaOverrides
      };
    });

    expect(overrides.all).toEqual({});
    expect(overrides.cuDiscovery).toBeNull();
    expect(overrides.snapshot).toEqual({});
  });

  test('stores a discovery override by atomic number and side', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const storage = await import('/src/modules/storage.js');
      const override = {
        src: 'data:image/png;base64,iVBORw0KGgo=',
        source: '本机上传：显微镜照片',
        altZh: '铜发现故事图片',
        updatedAt: '2026-05-18T00:00:00.000Z'
      };
      const saved = storage.setStoryMediaOverride(29, 'discovery', override);
      return {
        saved,
        retrieved: storage.getStoryMediaOverride(29, 'discovery'),
        all: storage.getStoryMediaOverrides()
      };
    });

    expect(result.saved).toEqual({
      src: 'data:image/png;base64,iVBORw0KGgo=',
      source: '本机上传：显微镜照片',
      altZh: '铜发现故事图片',
      updatedAt: '2026-05-18T00:00:00.000Z'
    });
    expect(result.retrieved).toEqual(result.saved);
    expect(result.all).toEqual({
      '29': {
        discovery: result.saved
      }
    });
  });

  test('clears only the requested side', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const storage = await import('/src/modules/storage.js');
      const discovery = {
        src: 'data:image/png;base64,iVBORw0KGgo=',
        source: '发现图片来源',
        altZh: '铜发现故事图片',
        updatedAt: '2026-05-18T00:00:00.000Z'
      };
      const specimen = {
        src: 'data:image/jpeg;base64,/9j/4AAQ=',
        source: '样品图片来源',
        altZh: '铜样品图片',
        updatedAt: '2026-05-18T00:00:00.000Z'
      };
      storage.setStoryMediaOverride(29, 'discovery', discovery);
      storage.setStoryMediaOverride(29, 'specimen', specimen);
      storage.clearStoryMediaOverride(29, 'discovery');
      return {
        discovery: storage.getStoryMediaOverride(29, 'discovery'),
        specimen: storage.getStoryMediaOverride(29, 'specimen')
      };
    });

    expect(result.discovery).toBeNull();
    expect(result.specimen).toEqual({
      src: 'data:image/jpeg;base64,/9j/4AAQ=',
      source: '样品图片来源',
      altZh: '铜样品图片',
      updatedAt: '2026-05-18T00:00:00.000Z'
    });
  });

  test('drops invalid sides and unsafe src values during migration', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const storage = await import('/src/modules/storage.js');
      const migrated = storage.migratePersistedEnvelope({
        version: 'v2',
        data: {
          storyMediaOverrides: {
            29: {
              discovery: {
                src: 'data:image/png;base64,iVBORw0KGgo=',
                source: '本机上传：显微镜照片',
                altZh: '铜发现故事图片',
                updatedAt: '2026-05-18T00:00:00.000Z'
              },
              hero: {
                src: 'data:image/png;base64,iVBORw0KGgo=',
                source: '非法 side',
                altZh: '铜发现故事图片',
                updatedAt: '2026-05-18T00:00:00.000Z'
              },
              specimen: {
                src: 'https://example.com/image.png',
                source: '远程图片',
                altZh: '铜样品图片',
                updatedAt: '2026-05-18T00:00:00.000Z'
              }
            }
          }
        }
      });
      return migrated.storyMediaOverrides;
    });

    expect(result).toEqual({
      '29': {
        discovery: {
          src: 'data:image/png;base64,iVBORw0KGgo=',
          source: '本机上传：显微镜照片',
          altZh: '铜发现故事图片',
          updatedAt: '2026-05-18T00:00:00.000Z'
        }
      }
    });
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
