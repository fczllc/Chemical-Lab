import { test, expect } from '@playwright/test';

test.describe('Content Data Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test('detail panel opens with element content', async ({ page }) => {
    await openHydrogenDetail(page);

    await expect(page.locator('#detail-panel .element-hero .symbol')).toHaveText('H');
    await expect(page.locator('#detail-panel .element-hero .chinese-name')).toHaveText('氢');
    await expect(page.locator('#detail-panel .element-properties')).toContainText('电子排布');
    await expect(page.locator('#detail-panel .element-story')).toContainText('元素小故事');
    await expect(page.locator('#detail-panel .element-funfact')).toContainText('趣味事实');
  });

  test('story flow opens the selected element archive', async ({ page }) => {
    await openHydrogenDetail(page);
    await page.locator('#btn-story').click();

    await expect(page).toHaveURL(/#\/story$/);
    await expect(page.locator('#story')).toHaveClass(/active/);
    await expect(page.locator('#story .story-shell h3')).toContainText('氢 · H');
    await expectStoryMediaCards(page);
    await expect
      .poll(async () => ((await page.locator('#story .story-body').textContent()) || '').trim().length)
      .toBeGreaterThan(20);
  });

  test('lab flow opens related experiment content for the selected element', async ({ page }) => {
    await openHydrogenDetail(page);
    await page.locator('#btn-lab').click();

    await expect(page).toHaveURL(/#\/lab$/);
    await expect(page.locator('#lab')).toHaveClass(/active/);
    await expect(page.locator('#lab .lab-toolbar')).toContainText('当前聚焦：氢（H）');
    await expect(page.locator('#lab .lab-list .lab-item-card').first()).toBeVisible();
    await expect(page.locator('#lab #lab-stage .lab-stage-shell h3')).not.toHaveText('');
  });

  test('quiz flow opens a quick quiz for the selected element', async ({ page }) => {
    await openHydrogenDetail(page);
    await page.locator('#btn-quiz').click();

    const quizModal = page.locator('#quiz-modal');
    await expect(quizModal).toHaveClass(/show/);
    await expect(quizModal.locator('#quiz-content h3')).toContainText('氢 · H');
    await expect(quizModal.locator('.quiz-option-btn')).toHaveCount(4);

    await quizModal.locator('.quiz-option-btn').first().click();
    await expect(quizModal.locator('[data-quiz-next]')).toBeEnabled();
  });

  test('renders the selected element spectrum from real spectral data', async ({ page }) => {
    await openHydrogenDetail(page);

    const canvas = await waitForSpectrumCanvas(page);
    const metadata = await canvas.evaluate((node) => ({
      source: node.dataset.spectrumSource,
      symbol: node.dataset.spectrumSymbol,
      range: node.dataset.spectrumRange,
      lineCount: Number(node.dataset.spectrumLineCount || 0),
      wavelengths: node.dataset.spectrumWavelengths || ''
    }));

    expect(metadata.source).toBe('nist');
    expect(metadata.symbol).toBe('H');
    expect(metadata.range).toBe('380-780');
    expect(metadata.lineCount).toBeGreaterThan(0);
    expect(metadata.wavelengths).toContain('656.2790');
    expect(metadata.wavelengths).toContain('486.1350');
    expect(metadata.wavelengths).toContain('434.0472');

    const samples = await page.evaluate(() => {
      const canvas = document.querySelector('#spectrum-canvas canvas');
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Spectrum canvas is missing');
      }

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Spectrum canvas context is missing');
      }

      const margin = 24;
      const [start, end] = [380, 780];
      const width = canvas.width;
      const height = canvas.height;
      const top = 44;
      const bottom = Math.max(top + 1, height - 36);
      const wavelengthToX = (wavelength) => Math.round(margin + ((wavelength - start) / (end - start)) * (width - margin * 2));
      const brightnessAt = (wavelength) => {
        const x = wavelengthToX(wavelength);
        let maxBrightness = 0;

        for (let y = top; y < bottom; y += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const safeX = Math.min(width - 1, Math.max(0, x + dx));
            const [red, green, blue] = context.getImageData(safeX, y, 1, 1).data;
            maxBrightness = Math.max(maxBrightness, red + green + blue);
          }
        }

        return { x, brightness: maxBrightness };
      };

      return {
        control: brightnessAt(540),
        hAlpha: brightnessAt(656.279),
        hBeta: brightnessAt(486.135),
        hGamma: brightnessAt(434.0472)
      };
    });

    expect(samples.hAlpha.brightness - samples.control.brightness).toBeGreaterThan(20);
    expect(samples.hBeta.brightness - samples.control.brightness).toBeGreaterThan(20);
    expect(samples.hGamma.brightness - samples.control.brightness).toBeGreaterThan(20);
  });
});

async function openHydrogenDetail(page) {
  await page.getByTestId('element-cell-1').click();
  await expect(page.locator('#detail-panel')).toHaveClass(/open|docked/);
  await expect(page.locator('#detail-panel .element-hero .symbol')).toHaveText('H');
}

async function waitForSpectrumCanvas(page) {
  const canvas = page.locator('#spectrum-canvas canvas');
  await expect(canvas).toBeAttached({ timeout: 15000 });
  await expect.poll(async () => {
    return await canvas.evaluate((node) => {
      return node instanceof HTMLCanvasElement
        && node.width > 0
        && node.height > 0
        && node.clientWidth > 0
        && node.clientHeight > 0;
    });
  }, { timeout: 15000 }).toBe(true);
  return canvas;
}

async function expectStoryMediaCards(page) {
  const cards = page.locator('#story .story-media-card');
  await expect(cards).toHaveCount(2);

  for (let index = 0; index < 2; index += 1) {
    const card = cards.nth(index);
    const image = card.locator('img');

    await expect(card).toBeVisible();
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('alt', /\S/);
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('decoding', 'async');
    await expect(image).toHaveAttribute('width', '800');
    await expect(image).toHaveAttribute('height', '520');

    const rawSrc = await image.getAttribute('src');
    expect(rawSrc).toMatch(/^\/assets\/elements\/(discovery|specimens)\/[\w.-]+\.webp$/);
    expect(rawSrc).not.toMatch(/^https?:\/\//);

    await expect(card.locator('.story-media-attribution')).toBeVisible();
    await expect.poll(async () => {
      return ((await card.locator('.story-media-attribution').textContent()) || '').trim().length;
    }).toBeGreaterThan(0);
  }

  await expect.poll(async () => {
    return await cards.locator('img').evaluateAll((images) => {
      return images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
    });
  }, { timeout: 15000 }).toBe(true);
}

async function waitForShellReady(page) {
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
