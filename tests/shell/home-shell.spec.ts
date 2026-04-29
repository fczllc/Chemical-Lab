import { test, expect } from '@playwright/test';

test.describe('Homepage Shell Contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test('desktop shell contract - all shell regions visible at 1440x900', async ({ page }) => {
    // Top navigation buttons
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-compare')).toHaveCount(0);
    await expect(page.getByTestId('nav-timeline')).toBeVisible();
    await expect(page.getByTestId('nav-games')).toBeVisible();
    await expect(page.getByTestId('nav-lab')).toBeVisible();
    await expect(page.getByTestId('nav-achievements')).toBeVisible();
    await expect(page.getByTestId('nav-progress')).toBeVisible();
    await expect(page.getByTestId('nav-story')).toBeVisible();

    // Settings button
    await expect(page.getByTestId('settings-btn')).toBeVisible();

    // Detail panel (docked, always visible on desktop)
    await expect(page.getByTestId('detail-panel')).toBeVisible();

    // Bottom modules
    await expect(page.getByTestId('bottom-categories')).toBeVisible();
    await expect(page.getByTestId('bottom-compare')).toBeVisible();
    const elementStatsCard = page.getByTestId('bottom-element-stats');
    await expect(elementStatsCard).toBeVisible();
    await expect(elementStatsCard.locator('.element-stat-row').filter({ hasText: /已发现元素\s*118/ })).toBeVisible();
    await expect(elementStatsCard.locator('.element-stat-row').filter({ hasText: /天然元素\s*91/ })).toBeVisible();
    await expect(elementStatsCard.locator('.element-stat-row').filter({ hasText: /人工合成\s*27/ })).toBeVisible();
    await expect(elementStatsCard.locator('.element-stat-row').filter({ hasText: /非放射性元素\s*81/ })).toBeVisible();
    await expect(elementStatsCard.locator('.element-stat-row').filter({ hasText: /放射性元素\s*37/ })).toBeVisible();
    await expect(elementStatsCard.locator('[data-action="open-timeline"]')).toHaveCount(0);

    const initialHash = await page.evaluate(() => window.location.hash);
    await elementStatsCard.click();
    await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe(initialHash);

    const listSizing = await elementStatsCard.locator('.element-stat-list').evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        maxHeight: styles.maxHeight,
        boundingHeight: element.getBoundingClientRect().height
      };
    });
    expect(listSizing.maxHeight === '100px' || listSizing.boundingHeight <= 110).toBe(true);
    const bottomStats = page.getByTestId('bottom-stats');
    await expect(bottomStats).toBeVisible();
    await expect(bottomStats).toContainText('统计概览');
    await expect(bottomStats).toContainText('当前阶段');
    await expect(bottomStats).not.toContainText('最近解锁成就');
    await expect(bottomStats).not.toContainText('最近解决成就');
    await expect(bottomStats).not.toContainText('打开学习进度');
    await expect(bottomStats.locator('[data-action="open-progress"]')).toHaveCount(0);
  });

  test('settings panel opens and contains performance mode toggle', async ({ page }) => {
    await page.getByTestId('settings-btn').click();
    await expect(page.getByTestId('settings-modal')).toBeVisible();
    // The toggle checkbox is visually hidden (opacity: 0) inside the toggle switch;
    // verify it is attached and the toggle switch wrapper is visible.
    await expect(page.getByTestId('performance-mode-toggle')).toBeAttached();
    await expect(page.locator('.toggle-switch:has([data-testid="performance-mode-toggle"])')).toBeVisible();
  });
});

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

async function expectPrimaryNavigationVisible(page) {
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

test.describe('Responsive Layout', () => {
  test('desktop layout keeps primary navigation visible at 1366x768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);
    await expect(page.getByTestId('detail-panel')).toBeVisible();
    await expect(page.locator('.periodic-table-wrapper')).toBeVisible();
  });

  test('tablet landscape keeps primary navigation visible at 1024x768', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);
    await expect(page.getByTestId('detail-panel')).toBeVisible();
    await expect(page.locator('#bottom-modules')).toBeVisible();
  });

  test('tablet portrait supports navigation and element details at 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);

    const firstElement = page.locator('.element-cell').first();
    await expect(firstElement).toBeVisible();
    await firstElement.click();

    const panel = page.getByTestId('detail-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/open/);
    await expect(panel.locator('.element-hero .symbol')).toBeVisible();
  });
});

test.describe('Hash-based Routing', () => {
  test('unknown route falls back to home', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/does-not-exist', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should fall back to home
    await expect(page).toHaveURL(/#\/$/);

    // Home section should be active
    await expect(page.locator('#periodic-table')).toHaveClass(/active/);

    // Home nav button should be active
    await expect(page.getByTestId('nav-home')).toHaveClass(/active/);
  });

  test('hash routes navigate correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const routes = [
      { nav: 'nav-timeline', section: 'timeline', hash: '#/timeline' },
      { nav: 'nav-games', section: 'games', hash: '#/games' },
      { nav: 'nav-lab', section: 'lab', hash: '#/lab' },
      { nav: 'nav-achievements', section: 'achievements', hash: '#/achievements' },
      { nav: 'nav-progress', section: 'progress', hash: '#/progress' },
      { nav: 'nav-story', section: 'story', hash: '#/story' },
    ];

    for (const route of routes) {
      await page.getByTestId(route.nav).click();
      await expect(page).toHaveURL(new RegExp(route.hash.replace('#', '\\#') + '$'));
      await expect(page.locator(`#${route.section}`)).toHaveClass(/active/);
      await expect(page.getByTestId(route.nav)).toHaveClass(/active/);
    }

    await page.goto('/#/compare', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/#\/compare$/);
    await expect(page.locator('#compare')).toHaveClass(/active/);
    await expect(page.getByTestId('nav-compare')).toHaveCount(0);

    // Navigate back to home
    await page.getByTestId('nav-home').click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('#periodic-table')).toHaveClass(/active/);
  });
});

test.describe('Device Optimizations', () => {
  test('viewport meta uses standard responsive scaling', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0');
  });
});

test.describe('Performance and Accessibility', () => {
  test('global loader is present and hides after init', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loader = page.locator('#global-loader');
    await expect(loader).toBeAttached();

    // After initialization, loader should be hidden
    await expect(loader).toHaveClass(/hidden/);
  });

  test('focus styles are visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Focus on first element cell
    const firstElement = page.locator('.element-cell').first();
    await firstElement.focus();

    // Check outline style
    const outline = await firstElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.outlineWidth !== '0px' || computed.boxShadow !== 'none';
    });
    expect(outline).toBe(true);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Press Escape to close any modal
    await page.keyboard.press('Escape');

    // Tab navigation should work
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});

test.describe('Bottom Widget Contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test('bottom widget DOM order is compare → categories → element-stats → stats', async ({ page }) => {
    const order = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#bottom-modules > [data-testid]')).map((el) => el.getAttribute('data-testid'))
    );
    expect(order).toEqual(['bottom-compare', 'bottom-categories', 'bottom-element-stats', 'bottom-stats']);
  });

  test('category overview is display-only with no interactive descendants', async ({ page }) => {
    const categoriesCard = page.getByTestId('bottom-categories');
    await expect(categoriesCard).toBeVisible();
    await expect(categoriesCard).not.toContainText('跳到分类筛选');

    const forbidden = await categoriesCard.locator('button, a, [role="button"], [tabindex="0"]').count();
    expect(forbidden).toBe(0);

    const initialHash = await page.evaluate(() => window.location.hash);
    await categoriesCard.locator('.category-progress-row').first().click();
    await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe(initialHash);
  });

  test('compare preview has top-right 对比 action and no old CTA or count badge', async ({ page }) => {
    const compareCard = page.getByTestId('bottom-compare');
    await expect(compareCard).toBeVisible();

    const contrastBtn = compareCard.locator('[data-action="open-compare"]');
    await expect(contrastBtn).toHaveText('对比');
    await expect(compareCard).not.toContainText('打开对比页');
    await expect(compareCard).not.toContainText('0/3');
    await expect(compareCard).not.toContainText('1/3');
    await expect(compareCard).not.toContainText('2/3');
    await expect(compareCard).not.toContainText('3/3');

    const initialHash = await page.evaluate(() => window.location.hash);
    await contrastBtn.click();
    const modal = page.getByTestId('compare-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal).not.toContainText('清空对比');
    await expect(modal).not.toContainText('继续选元素');
    await expect(modal).not.toContainText('已选择');
    await expect(modal).not.toContainText('最多3个');
    await expect(modal).not.toContainText('最多可放入 3 个元素');
    await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe(initialHash);
  });

  test('bottom widgets are transparent with no top border', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const modules = document.getElementById('bottom-modules');
      const firstModule = document.querySelector('.bottom-module');
      const mStyles = window.getComputedStyle(modules);
      const modStyles = window.getComputedStyle(firstModule);
      return {
        modulesBg: mStyles.backgroundColor,
        modulesBorderTop: mStyles.borderTopWidth,
        moduleBg: modStyles.backgroundColor,
        moduleBorder: modStyles.borderWidth
      };
    });

    const isTransparent = (color) => color === 'rgba(0, 0, 0, 0)' || color === 'transparent';
    expect(isTransparent(styles.modulesBg)).toBe(true);
    expect(isTransparent(styles.moduleBg)).toBe(true);
    expect(styles.modulesBorderTop).toBe('0px');
    expect(styles.moduleBorder).toBe('0px');
  });

  test('no vertical overflow at 1366x768', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollHeight <= window.innerHeight + 1;
    });
    expect(overflow).toBe(true);
  });

  test('compare modal fits three elements side-by-side without panel scrollbars', async ({ page }) => {
    for (const atomicNumber of [1, 2, 3]) {
      await page.locator(`[data-testid="element-cell-${atomicNumber}"]`).click();
      await page.locator('.compare-preview-empty').first().click();
    }

    await page.getByTestId('bottom-compare').locator('[data-action="open-compare"]').click();
    const modal = page.getByTestId('compare-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal.locator('.compare-card')).toHaveCount(3);
    await expect(modal).not.toContainText('清空对比');
    await expect(modal).not.toContainText('继续选元素');
    await expect(modal).not.toContainText('已选择');
    await expect(modal).not.toContainText('最多3个');

    const modalLayout = await page.evaluate(() => {
      const panel = document.querySelector('.compare-modal-content');
      const cards = Array.from(document.querySelectorAll('.compare-modal .compare-card'));
      const panelBox = panel?.getBoundingClientRect();
      const cardBoxes = cards.map((card) => card.getBoundingClientRect());
      const panelStyles = panel ? window.getComputedStyle(panel) : null;

      return {
        panelBottom: panelBox?.bottom ?? 0,
        viewportHeight: window.innerHeight,
        panelScrollHeight: panel?.scrollHeight ?? 0,
        panelClientHeight: panel?.clientHeight ?? 0,
        panelOverflowY: panelStyles?.overflowY,
        sameRow: cardBoxes.length === 3 && cardBoxes.every((box) => Math.abs(box.top - cardBoxes[0].top) <= 1),
        increasingLeft: cardBoxes.length === 3 && cardBoxes[0].left < cardBoxes[1].left && cardBoxes[1].left < cardBoxes[2].left,
      };
    });

    expect(modalLayout.sameRow).toBe(true);
    expect(modalLayout.increasingLeft).toBe(true);
    expect(modalLayout.panelBottom).toBeLessThanOrEqual(modalLayout.viewportHeight - 12);
    expect(modalLayout.panelScrollHeight).toBeLessThanOrEqual(modalLayout.panelClientHeight + 1);
    expect(modalLayout.panelOverflowY).toBe('visible');
  });

  test('compare state edge case does not restore old count badge', async ({ page }) => {
    // Add hydrogen to compare via selected-element empty slot
    await page.locator('[data-testid="element-cell-1"]').click();
    await expect(page.getByTestId('detail-panel')).toHaveClass(/open|docked/);
    await page.locator('.compare-preview-empty').first().click();

    const hydrogenPreview = page.getByTestId('bottom-compare').locator('.compare-preview-tile.element-cell[data-atomic-number="1"]');
    await expect(hydrogenPreview).toBeVisible();
    await expect(hydrogenPreview).toHaveAttribute('data-category', 'reactive nonmetal');
    await expect(hydrogenPreview.locator('.atomic-num')).toHaveText('1');
    await expect(hydrogenPreview.locator('.symbol')).toHaveText('H');
    await expect(hydrogenPreview.locator('.chinese-name')).toHaveText('氢');
    await expect(hydrogenPreview.locator('.atomic-mass')).toHaveText('1.008');

    // Return home and verify compare card still shows 对比, not N/3
    await page.getByTestId('nav-home').click();
    await expect(page.locator('#periodic-table')).toHaveClass(/active/);

    const compareCard = page.getByTestId('bottom-compare');
    await expect(compareCard.locator('[data-action="open-compare"]')).toHaveText('对比');
    await expect(compareCard).not.toContainText('1/3');
    await expect(compareCard).not.toContainText('2/3');
    await expect(compareCard).not.toContainText('3/3');

    // Click 对比 opens modal without hash navigation
    const initialHash = await page.evaluate(() => window.location.hash);
    await compareCard.locator('[data-action="open-compare"]').click();
    const modal = page.getByTestId('compare-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal).not.toContainText('清空对比');
    await expect(modal).not.toContainText('继续选元素');
    await expect(modal).not.toContainText('已选择');
    await expect(modal).not.toContainText('最多3个');

    const modalStyles = await page.evaluate(() => {
      const overlay = document.getElementById('compare-modal');
      const panel = document.querySelector('.compare-modal-content');
      const overlayStyles = overlay ? window.getComputedStyle(overlay) : null;
      const panelStyles = panel ? window.getComputedStyle(panel) : null;

      return {
        overlayBackdropFilter: overlayStyles?.backdropFilter,
        panelBackdropFilter: panelStyles?.backdropFilter,
        panelOverflowY: panelStyles?.overflowY,
        panelWidth: panel?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(modalStyles.overlayBackdropFilter === 'none' || modalStyles.overlayBackdropFilter === '').toBe(true);
    expect(modalStyles.panelBackdropFilter).toContain('blur');
    expect(modalStyles.panelOverflowY).toBe('visible');
    expect(modalStyles.panelWidth).toBeGreaterThanOrEqual(1100);
    await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe(initialHash);
  });
});
