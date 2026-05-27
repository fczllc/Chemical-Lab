import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

async function waitForAppReady(page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      if (typeof window.appState === 'undefined') return false;
      const state = window.appState;
      const hasElements = Array.isArray(state?.elements) && state.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 25000, intervals: [100, 200, 500, 1000] }).toBe(true);
}

async function writeEvidence(fileName, payload) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

test.describe('PEP Learning Tabs', () => {
  test.setTimeout(120000);

  test('学习 page renders eight textbook tabs with non-empty cards', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Navigate to 学习/progress page
    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    // Wait for progress page to render
    await expect(page.locator('#progress')).toBeVisible({ timeout: 10000 });

    // Find textbook tabs using both plan and real selectors
    const tabSelectors = [
      '.progress-textbook-tabs',
      '.textbook-tab-bar',
      '[data-textbook-tab]'
    ];

    let tabs = null;
    let tabButtons = [];
    let usedSelector = '';

    for (const selector of tabSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        tabs = element;
        usedSelector = selector;
        if (selector === '[data-textbook-tab]') {
          tabButtons = await page.locator('[data-textbook-tab]').all();
        } else {
          tabButtons = await element.locator('button').all();
        }
        break;
      }
    }

    expect(tabs, 'Textbook tabs should be visible').not.toBeNull();
    expect(tabButtons.length, 'Should have exactly 8 textbook tabs').toBe(8);

    // Collect tab labels
    const tabLabels = [];
    for (const button of tabButtons) {
      const label = await button.textContent();
      tabLabels.push(label?.trim() || '');
    }

    // Check banned terms
    const bannedTerms = ['pep-chemistry', '人教版', '2019', '2024'];
    const bannedTermBooleans = {};
    for (const term of bannedTerms) {
      const found = tabLabels.some((label) => label.includes(term));
      bannedTermBooleans[term] = found;
      expect(found, `Tab labels should not contain "${term}"`).toBe(false);
    }

    // Click four specific PEP labels and verify cards
    const targetLabels = [
      '高一/10年级·必修第一册',
      '高一/10年级·必修第二册',
      '高二/11年级·选择性必修一·反应原理',
      '高二/11年级·选择性必修二·物质结构与性质'
    ];

    const clickedLabels = [];
    const visibleCardCounts = {};

    for (const targetLabel of targetLabels) {
      // Find tab button with this label
      let targetButton = null;
      for (const button of tabButtons) {
        const text = await button.textContent();
        if (text?.includes(targetLabel)) {
          targetButton = button;
          break;
        }
      }

      if (!targetButton) {
        // Try partial match
        for (const button of tabButtons) {
          const text = await button.textContent();
          // Match based on key parts of the label
          if (targetLabel.includes('必修第一册') && text?.includes('必修第一册')) {
            targetButton = button;
            break;
          }
          if (targetLabel.includes('必修第二册') && text?.includes('必修第二册')) {
            targetButton = button;
            break;
          }
          if (targetLabel.includes('反应原理') && text?.includes('反应原理')) {
            targetButton = button;
            break;
          }
          if (targetLabel.includes('物质结构与性质') && text?.includes('物质结构与性质')) {
            targetButton = button;
            break;
          }
        }
      }

      expect(targetButton, `Should find tab for "${targetLabel}"`).not.toBeNull();

      await targetButton.click();
      clickedLabels.push(targetLabel);

      // Wait for panel to update
      await page.waitForTimeout(500);

      // Check for visible learning cards
      const cardSelectors = [
        '[data-testid="learning-card"]',
        '.progress-learning-card',
        '.learning-card'
      ];

      let visibleCards = 0;
      let usedCardSelector = '';

      for (const cardSelector of cardSelectors) {
        const cards = page.locator(cardSelector);
        const count = await cards.count();
        if (count > 0) {
          // Count only visible cards
          let visibleCount = 0;
          for (let i = 0; i < count; i++) {
            const isVisible = await cards.nth(i).isVisible().catch(() => false);
            if (isVisible) visibleCount++;
          }
          if (visibleCount > 0) {
            visibleCards = visibleCount;
            usedCardSelector = cardSelector;
            break;
          }
        }
      }

      expect(visibleCards, `Active panel for "${targetLabel}" should have at least 1 visible learning card`).toBeGreaterThan(0);
      visibleCardCounts[targetLabel] = visibleCards;

      // Refresh tab buttons after click (DOM may have changed)
      if (usedSelector === '[data-textbook-tab]') {
        tabButtons = await page.locator('[data-textbook-tab]').all();
      } else {
        tabButtons = await page.locator(usedSelector).first().locator('button').all();
      }
    }

    // Verify no console/page errors
    expect(consoleErrors, 'Should have no console errors').toEqual([]);
    expect(pageErrors, 'Should have no page errors').toEqual([]);

    // Write evidence JSON
    await writeEvidence('task-10-learning-tabs.json', {
      tabCount: tabButtons.length,
      tabLabels,
      clickedLabels,
      visibleCardCounts,
      bannedTermBooleans,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      consoleErrors,
      pageErrors,
      timestamp: new Date().toISOString()
    });

    await writeEvidence('task-10-label-sanitization.json', {
      tabCount: tabButtons.length,
      tabLabels,
      bannedTermBooleans,
      allLabelsClean: !Object.values(bannedTermBooleans).some(Boolean),
      timestamp: new Date().toISOString()
    });
  });
});
