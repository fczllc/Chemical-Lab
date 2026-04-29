import { test, expect, type Page } from '@playwright/test';

type ConsoleIssue = {
  text: string;
  url: string;
};

type FilteredItem = {
  atomicNumber: string | undefined;
  category: string | undefined;
  period: string | undefined;
};

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

async function expectNoCatastrophicHorizontalOverflow(page: Page) {
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

async function expectPrimaryNavigationVisible(page: Page) {
  await expect(page.locator('.main-nav')).toBeVisible();
  await expect(page.getByTestId('nav-home')).toBeVisible();
  await expect(page.getByTestId('nav-compare')).toHaveCount(0);
  await expect(page.getByTestId('nav-timeline')).toBeVisible();
  await expect(page.getByTestId('nav-games')).toBeVisible();
  await expect(page.getByTestId('nav-lab')).toBeVisible();
  await expect(page.getByTestId('nav-achievements')).toBeVisible();
  await expect(page.getByTestId('nav-progress')).toBeVisible();
  await expect(page.getByTestId('nav-story')).toBeVisible();
}

async function visibleGridCells(page: Page): Promise<FilteredItem[]> {
  return await page.locator('.periodic-table-wrapper .element-cell:not(.filtered-out)').evaluateAll((cells) => (
    cells.map((cell) => ({
      atomicNumber: (cell as HTMLElement).dataset.atomicNumber,
      category: (cell as HTMLElement).dataset.category,
      period: (cell as HTMLElement).dataset.period,
    }))
  ));
}

async function visibleListRows(page: Page): Promise<FilteredItem[]> {
  return await page.locator('#periodic-list .element-list-row:not(.filtered-out)').evaluateAll((rows) => (
    rows.map((row) => ({
      atomicNumber: (row as HTMLElement).dataset.atomicNumber,
      category: (row as HTMLElement).dataset.category,
      period: (row as HTMLElement).dataset.period,
    }))
  ));
}

async function visibleGridCount(page: Page) {
  return (await visibleGridCells(page)).length;
}

function expectItemsMatch(items: FilteredItem[], predicate: (item: FilteredItem) => boolean) {
  expect(items.length).toBeGreaterThan(0);
  expect(items.every(predicate)).toBe(true);
}

function legendChip(page: Page, category: string) {
  return page.locator(`.legend-item[data-category="${category}"]`);
}

test.describe('periodic table controls', () => {
  const consoleIssues: ConsoleIssue[] = [];
  const pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleIssues.length = 0;
    pageErrors.length = 0;

    page.on('console', (message) => {
      if (message.type() !== 'error') return;

      const issue = {
        text: message.text(),
        url: message.location().url,
      };
      const isKnownFavicon404 = issue.url.endsWith('/favicon.ico')
        && issue.text.includes('Failed to load resource')
        && issue.text.includes('404');

      if (!isKnownFavicon404) {
        consoleIssues.push(issue);
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test.afterEach(() => {
    expect(pageErrors).toEqual([]);
    expect(consoleIssues).toEqual([]);
  });

  test('keeps removed controls absent and positions the legend beside the period filter', async ({ page }) => {
    await expect(page.locator('#category-filter')).toHaveCount(0);
    await expect(page.locator('#element-search')).toHaveCount(0);
    await expect(page.locator('#search-clear')).toHaveCount(0);
    await expect(page.locator('#reset-filters')).toHaveCount(0);

    const periodFilter = page.locator('#period-filter');
    await expect(periodFilter).toBeVisible();
    await expect(periodFilter).toBeEnabled();
    const periodOptionValues = await periodFilter.locator('option').evaluateAll((options) => (
      options.map((option) => (option as HTMLOptionElement).value)
    ));
    expect(periodOptionValues).toEqual(['all', '1', '2', '3', '4', '5', '6', '7']);

    const legend = page.locator('.table-controls .category-legend');
    await expect(legend).toBeVisible();
    await expect(legendChip(page, 'alkali metal')).toBeVisible();

    const placement = await page.evaluate(() => {
      const filter = document.querySelector('#period-filter')?.getBoundingClientRect();
      const legendBox = document.querySelector('.table-controls .category-legend')?.getBoundingClientRect();

      if (!filter || !legendBox) {
        return { valid: false, overlaps: true };
      }

      const overlaps = !(legendBox.left >= filter.right
        || filter.left >= legendBox.right
        || legendBox.top >= filter.bottom
        || filter.top >= legendBox.bottom);
      const isRightAligned = legendBox.left >= filter.right;
      const isValidWrappedRow = legendBox.top >= filter.bottom - 1;

      return { valid: !overlaps && (isRightAligned || isValidWrappedRow), overlaps };
    });

    expect(placement.overlaps).toBe(false);
    expect(placement.valid).toBe(true);
  });

  test('multi-select legend chips OR category filters in the grid', async ({ page }) => {
    const alkali = legendChip(page, 'alkali metal');
    const nobleGas = legendChip(page, 'noble gas');

    await alkali.click();
    await expect(alkali).toHaveAttribute('aria-pressed', 'true');
    expectItemsMatch(await visibleGridCells(page), (cell) => cell.category === 'alkali metal');

    await nobleGas.click();
    await expect(alkali).toHaveAttribute('aria-pressed', 'true');
    await expect(nobleGas).toHaveAttribute('aria-pressed', 'true');
    expectItemsMatch(await visibleGridCells(page), (cell) => (
      cell.category === 'alkali metal' || cell.category === 'noble gas'
    ));
  });

  test('deselecting the last category restores the current period-only result set', async ({ page }) => {
    await page.locator('#period-filter').selectOption('2');
    const periodOnlyCount = await visibleGridCount(page);

    const reactiveNonmetal = legendChip(page, 'reactive nonmetal');
    await reactiveNonmetal.click();
    await expect(reactiveNonmetal).toHaveAttribute('aria-pressed', 'true');
    expectItemsMatch(await visibleGridCells(page), (cell) => (
      cell.period === '2' && cell.category === 'reactive nonmetal'
    ));

    await reactiveNonmetal.click();
    await expect(reactiveNonmetal).toHaveAttribute('aria-pressed', 'false');
    expect(await visibleGridCount(page)).toBe(periodOnlyCount);
    expectItemsMatch(await visibleGridCells(page), (cell) => cell.period === '2');
  });

  test('combines period and category filters with AND semantics', async ({ page }) => {
    await page.locator('#period-filter').selectOption('2');
    await legendChip(page, 'noble gas').click();

    await expect(legendChip(page, 'noble gas')).toHaveAttribute('aria-pressed', 'true');
    expectItemsMatch(await visibleGridCells(page), (cell) => (
      cell.period === '2' && cell.category === 'noble gas'
    ));
  });

  test('keyboard activation toggles legend chip state and updates filtering', async ({ page }) => {
    const chip = legendChip(page, 'alkaline earth metal');
    await chip.focus();
    await page.keyboard.press('Enter');

    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    expectItemsMatch(await visibleGridCells(page), (cell) => cell.category === 'alkaline earth metal');

    await page.keyboard.press('Space');
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(await visibleGridCount(page)).toBeGreaterThan(50);
  });

  test('preserves active period and category filters when switching between grid and list views', async ({ page }) => {
    await page.locator('#period-filter').selectOption('2');
    await legendChip(page, 'reactive nonmetal').click();

    const gridItems = await visibleGridCells(page);
    expectItemsMatch(gridItems, (cell) => cell.period === '2' && cell.category === 'reactive nonmetal');

    await page.locator('.view-modes .control-btn[data-view="list"]').click();
    await expect(page.locator('#periodic-list')).toBeVisible();
    await expect(page.locator('.periodic-table-wrapper')).toHaveClass(/hidden/);

    const listItems = await visibleListRows(page);
    expectItemsMatch(listItems, (row) => row.period === '2' && row.category === 'reactive nonmetal');
    expect(listItems.map((item) => item.atomicNumber).sort()).toEqual(
      gridItems.map((item) => item.atomicNumber).sort()
    );

    await page.locator('.view-modes .control-btn[data-view="grid"]').click();
    await expect(page.locator('.periodic-table-wrapper')).toBeVisible();
    expectItemsMatch(await visibleGridCells(page), (cell) => (
      cell.period === '2' && cell.category === 'reactive nonmetal'
    ));
  });

  test('keeps tablet portrait table controls usable without phone navigation', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);

    const tableWrapper = page.locator('.periodic-table-wrapper');
    await expect(tableWrapper).toBeVisible();
    await expect(page.locator('#period-filter')).toBeVisible();
    await expect(legendChip(page, 'alkali metal')).toBeVisible();

    const tableScrollMetrics = await tableWrapper.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      hasUsableWidth: element.clientWidth >= 700,
    }));

    expect(tableScrollMetrics.scrollWidth).toBeGreaterThan(0);
    expect(tableScrollMetrics.hasUsableWidth).toBe(true);
    await expectNoCatastrophicHorizontalOverflow(page);
  });
});
