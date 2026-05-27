import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence', 'apply-eight-textbook-tabs-to-main');

const EXPECTED_TAB_LABELS = [
  '八年级·全册',
  '九年级·上册',
  '九年级·下册',
  '高一/10年级·必修第一册',
  '高一/10年级·必修第二册',
  '高二/11年级·选择性必修一·反应原理',
  '高二/11年级·选择性必修二·物质结构与性质',
  '高三/12年级·有机基础'
];

const PEP_TAB_LABELS = [
  '高一/10年级·必修第一册',
  '高一/10年级·必修第二册',
  '高二/11年级·选择性必修一·反应原理',
  '高二/11年级·选择性必修二·物质结构与性质'
];

const PEP_EXACT_COUNTS = {
  '高一/10年级·必修第一册': 213,
  '高一/10年级·必修第二册': 263,
  '高二/11年级·选择性必修一·反应原理': 198,
  '高二/11年级·选择性必修二·物质结构与性质': 146
};

const BANNED_TERMS = ['pep-chemistry', '人教版', '2019', '2024'];

async function writeEvidence(fileName, payload) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

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

test.describe('PEP Learning Tabs', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);
  });

  test('renders exactly eight textbook tabs with clean Chinese labels and correct card counts', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.getByTestId('nav-progress').click();
    await expect(page).toHaveURL(/#\/progress$/);

    // Wait for the textbook tab bar to render
    const tabBar = page.locator('.progress-textbook-tabs');
    await expect(tabBar).toBeVisible({ timeout: 10000 });

    // Assert exactly eight tab buttons
    const tabs = tabBar.locator('[data-textbook-tab]');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(8);

    // Collect all visible tab labels
    const cleanLabels = await tabs.evaluateAll((buttons) => buttons.map((button) => {
      const clone = button.cloneNode(true);
      clone.querySelector('.textbook-tab-count')?.remove();
      return clone.textContent.replace(/\s+/g, ' ').trim();
    }));

    // Assert exact label order and text via strict array equality
    expect(cleanLabels).toEqual(EXPECTED_TAB_LABELS);

    // Assert each tab label does not contain banned terms
    for (const label of cleanLabels) {
      for (const term of BANNED_TERMS) {
        expect(label).not.toContain(term);
      }
    }

    // Click every tab and assert active panel shows learning cards
    const cardCounts = {};
    const allTabButtons = await tabs.all();

    for (let i = 0; i < allTabButtons.length; i++) {
      const tab = allTabButtons[i];
      const label = cleanLabels[i];
      await expect(tab).toBeVisible();
      await tab.click();

      // Find the active panel
      const activePanel = page.locator('.textbook-panel.is-active');
      await expect(activePanel).toBeVisible();

      // Count visible learning cards in the active panel
      const cards = activePanel.locator('[data-testid="learning-card"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      cardCounts[label] = cardCount;
    }

    // Assert exact counts for the four new PEP tabs
    for (const [pepLabel, expectedCount] of Object.entries(PEP_EXACT_COUNTS)) {
      const actualCount = cardCounts[pepLabel];
      expect(actualCount).toBe(expectedCount);
    }

    // Re-click first tab to leave page in deterministic state
    const firstTab = tabs.first();
    await firstTab.click();

    // Fail if any page or console errors occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);

    await writeEvidence('task-5-learning-tabs-runtime.json', {
      tabCount,
      tabLabels: cleanLabels,
      expectedLabels: EXPECTED_TAB_LABELS,
      cardCountsPerLabel: cardCounts,
      bannedTermChecks: BANNED_TERMS.map((term) => ({
        term,
        foundInAnyLabel: cleanLabels.some((label) => label.includes(term))
      })),
      pageErrors,
      consoleErrors
    });
  });
});
