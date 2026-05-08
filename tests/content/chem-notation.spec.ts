import { test, expect, type Page } from '@playwright/test';
import { equationHTML, equationToLatex, formulaHTML, formulaToLatex, plainChemText } from '../../src/modules/chemNotation.js';

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

async function expectChemMetadata(node: ReturnType<Page['locator']>, plainText: string) {
  await expect(node).toHaveAttribute('data-plain-text', plainText);
  await expect(node).toHaveAttribute('aria-label', plainText);
}

async function expectNoHorizontalOverflow(page: Page) {
  const shellMetrics = await page.evaluate(() => {
    const mainContent = document.querySelector('.main-content');
    const activeSection = document.querySelector('.page-section.active');

    return {
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      mainContentScrollWidth: mainContent?.scrollWidth ?? 0,
      activeSectionScrollWidth: activeSection?.scrollWidth ?? 0,
    };
  });

  expect(shellMetrics.documentScrollWidth).toBeLessThanOrEqual(shellMetrics.innerWidth + 1);
  expect(shellMetrics.bodyScrollWidth).toBeLessThanOrEqual(shellMetrics.innerWidth + 1);
  expect(shellMetrics.mainContentScrollWidth).toBeLessThanOrEqual(shellMetrics.innerWidth + 1);
  expect(shellMetrics.activeSectionScrollWidth).toBeLessThanOrEqual(shellMetrics.innerWidth + 1);
}

test.describe('KaTeX chemistry notation rendering', () => {
  test('lab equation card renders KaTeX', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.getByTestId('nav-lab').click();

    const equationCard = page.locator('.lab-equation-card').first();
    await expect(equationCard).toBeVisible({ timeout: 10000 });

    // Wait for KaTeX to render asynchronously
    await expect(equationCard.locator('.katex')).toBeVisible({ timeout: 10000 });

    await expectChemMetadata(equationCard.locator('.chem-notation--equation').first(), '2H2 + O2 → 2H2O');
  });

  test('detail panel electron config renders KaTeX', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.getByTestId('element-cell-1').click();
    await expect(page.getByTestId('detail-panel')).toBeVisible();

    const electronConfigRow = page.locator('.property-row').filter({ hasText: /电子排布/ });
    await expect(electronConfigRow).toBeVisible();
    await expect(electronConfigRow.locator('.katex')).toHaveCount(1);
    await expectChemMetadata(electronConfigRow.locator('.chem-notation--electron-config').first(), '1s1');
  });

  test('reaction game renders multi-product formula labels without changing matching', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.getByTestId('nav-games').click();
    await page.locator('[data-game="reaction"] .play-btn').click();

    const sodiumReactants = page.locator('[data-reaction-left="reaction-sodium-water"]');
    const sodiumProducts = page.locator('[data-reaction-right="reaction-sodium-water"]');
    const productDisplay = sodiumProducts.locator('[data-chem-notation="products"]');

    await expect(sodiumProducts).toBeVisible({ timeout: 10000 });
    await expect(productDisplay.locator('.katex')).toHaveCount(2);
    await expectChemMetadata(productDisplay.locator('.chem-notation--formula').nth(0), 'NaOH');
    await expectChemMetadata(productDisplay.locator('.chem-notation--formula').nth(1), 'H2');
    await expect(sodiumProducts).toHaveAttribute('data-reaction-right', 'reaction-sodium-water');

    await sodiumReactants.click();
    await expect(sodiumReactants).toHaveClass(/is-selected/);
    await sodiumProducts.click();
    await expect(page.locator('[data-reaction-right="reaction-sodium-water"]')).toHaveClass(/is-matched/);
    await expect(page.locator('.game-scoreboard .quiz-stat-card').filter({ hasText: '当前得分' }).locator('strong')).toHaveText('10');
  });

  test('quiz formula-token smoke keeps prose and standalone symbols plain', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.evaluate(() => {
      const hydrogen = window.appState.elements.find((element) => element.atomicNumber === 1);
      window.dispatchEvent(new CustomEvent('startquiz', { detail: { element: hydrogen } }));
    });

    const questionText = page.locator('.quiz-question-text');
    await expect(questionText).toContainText('元素符号 H');
    await expect(questionText.locator('.chem-notation')).toHaveCount(0);
    await expect(page.locator('.quiz-option-btn .chem-notation[data-plain-text="H"]')).toHaveCount(0);

    const detachedFormulaMarkup = formulaHTML('H2O');
    const detachedQuizSmokeMarkup = `水的化学式是 ${detachedFormulaMarkup}，元素符号 H 保持普通文字。`;
    expect(detachedQuizSmokeMarkup).toContain('水的化学式是 ');
    expect(detachedQuizSmokeMarkup).toContain('元素符号 H 保持普通文字。');
    expect(detachedQuizSmokeMarkup).toContain('class="katex');
    expect(detachedQuizSmokeMarkup).toContain('data-plain-text="H2O"');
    expect(detachedQuizSmokeMarkup).toContain('aria-label="H2O"');
    expect(detachedQuizSmokeMarkup).not.toContain('data-plain-text="H"');
  });

  test('story electron config renders while story symbols stay plain', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.getByTestId('element-cell-1').click();
    await page.getByTestId('nav-story').click();

    const storyHeaderConfig = page.locator('.story-transcript-header .chem-notation--electron-config').first();
    await expect(storyHeaderConfig.locator('.katex')).toBeVisible({ timeout: 10000 });
    await expectChemMetadata(storyHeaderConfig, '1s1');
    await expect(page.locator('.story-symbol')).toHaveText('H');
    await expect(page.locator('.story-symbol .katex')).toHaveCount(0);
  });

  test('periodic table cell symbol stays plain', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    const firstCell = page.locator('.element-cell').first();
    await expect(firstCell.locator('.symbol')).toHaveText('H');
    await expect(firstCell.locator('.symbol .katex')).toHaveCount(0);
  });

  test('no KaTeX console errors', async ({ page }) => {
    const katexErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().toLowerCase().includes('katex')) {
        katexErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.getByTestId('nav-lab').click();
    await expect(page.locator('.lab-equation-card').first()).toBeVisible();

    await page.getByTestId('nav-home').click();
    await page.getByTestId('element-cell-1').click();
    await expect(page.getByTestId('detail-panel')).toBeVisible();

    expect(katexErrors).toEqual([]);
  });

  test('desktop and mobile notation layouts do not overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForShellReady(page);
      await page.getByTestId('nav-lab').click();
      await expect(page.locator('.lab-equation-card .katex').first()).toBeVisible({ timeout: 10000 });
      await expectNoHorizontalOverflow(page);
    }
  });

  test('textbook-grade chemistry notation cases render through KaTeX', () => {
    const cases = [
      { kind: 'formula', value: 'CuSO4·5H2O', latexIncludes: ['\\cdot', '5H_2O'] },
      { kind: 'formula', value: 'Fe2(SO4)3', latexIncludes: ['Fe_2', '(SO_4)_3'] },
      { kind: 'formula', value: 'NH4+', latexIncludes: ['NH_4^{+}'] },
      { kind: 'formula', value: 'SO4^2-', latexIncludes: ['SO_4^{2-}'] },
      { kind: 'equation', value: 'NaOH(aq) + HCl(aq) → NaCl(aq) + H2O(l)', latexIncludes: ['\\mathrm{(aq)}', '\\mathrm{(l)}', '\\rightarrow'] },
      { kind: 'equation', value: 'CaCO3 → CaO + CO2↑', latexIncludes: ['CaCO_3', '\\uparrow'] },
      { kind: 'equation', value: 'Ag+ + Cl- → AgCl↓', latexIncludes: ['Ag^{+}', 'Cl^{-}', '\\downarrow'] },
      { kind: 'equation', value: 'N2 + 3H2 ⇌ 2NH3', latexIncludes: ['\\rightleftharpoons'] },
      { kind: 'equation', value: 'CaCO3 --heat--> CaO + CO2↑', latexIncludes: ['\\xrightarrow{\\mathrm{heat}}'] }
    ] as const;

    for (const testCase of cases) {
      const latex = testCase.kind === 'formula' ? formulaToLatex(testCase.value) : equationToLatex(testCase.value);
      const html = testCase.kind === 'formula' ? formulaHTML(testCase.value) : equationHTML(testCase.value);
      const plain = plainChemText(testCase.value);
      const escapedPlain = escapeAttribute(plain);
      const fallbackMarkup = '<span class="chem-notation chem-notation--' + testCase.kind + '" data-plain-text="' + escapedPlain + '" aria-label="' + escapedPlain + '">' + escapeHTML(plain) + '</span>';

      expect(latex).not.toBe('');
      for (const expectedLatex of testCase.latexIncludes) {
        expect(latex).toContain(expectedLatex);
      }
      expect(html).toContain('class="katex');
      expect(html).toContain('data-plain-text="' + escapedPlain + '"');
      expect(html).not.toBe(fallbackMarkup);
    }
  });
});

function escapeHTML(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value: string) {
  return escapeHTML(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
