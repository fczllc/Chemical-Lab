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
    const progressPanel = page.locator('#progress');
    await expect(progressPanel).toBeVisible({ timeout: 10000 });
    await expect(progressPanel).toContainText('教材复习确认');
    await expect(progressPanel).not.toContainText('五阶段学习路径');
    await expect(progressPanel).not.toContainText('初级探索者');
    await expect(page.locator('#progress [data-stage-select]')).toHaveCount(0);
    await expect(page.locator('#progress .progress-stage-card')).toHaveCount(0);
    await expect(page.locator('#progress .progress-stage-detail')).toHaveCount(0);
    await expect(page.locator('#progress .progress-learning-path')).toHaveCount(0);

    const oldRewardCopyTerms = ['解锁 0 个游戏', '项功能', '个实验', '需要元素'];
    for (const term of oldRewardCopyTerms) {
      await expect(progressPanel, `Progress page should not contain old stage copy "${term}"`).not.toContainText(term);
    }

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
    const removedExperimentCardTitles = ['【实验1-1】', '【实验2-1】', '【实验】', '【实验目的】', '【实验用品】', '【实验步骤】'];

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
        const visibleCount = await page.locator(`${cardSelector}:visible`).count();
        if (visibleCount > 0) {
          visibleCards = visibleCount;
          usedCardSelector = cardSelector;
          break;
        }
      }

      expect(visibleCards, `Active panel for "${targetLabel}" should have at least 1 visible learning card`).toBeGreaterThan(0);
      visibleCardCounts[targetLabel] = visibleCards;

      const visibleCardTitles = (await page.locator(`#progress ${usedCardSelector}:visible h5`).allTextContents())
        .map((title) => title.trim())
        .filter(Boolean);
      const experimentStyleTitles = visibleCardTitles.filter((title) => /^【实验/.test(title));
      expect(experimentStyleTitles, `Active panel for "${targetLabel}" should not show experiment learning cards`).toEqual([]);
      for (const removedTitle of removedExperimentCardTitles) {
        expect(visibleCardTitles, `Active panel for "${targetLabel}" should not include experiment card title "${removedTitle}"`).not.toContain(removedTitle);
      }

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

    const progressText = await progressPanel.textContent() || '';
    const removedStageSelectorCount = await page.locator('#progress [data-stage-select]').count();
    const removedStageCardCount = await page.locator('#progress .progress-stage-card').count();
    const removedStageDetailCount = await page.locator('#progress .progress-stage-detail').count();
    const hasFiveStageText = progressText.includes('五阶段学习路径');
    const hasJuniorExplorerText = progressText.includes('初级探索者');
    const hasOldRewardCopy = oldRewardCopyTerms.some((term) => progressText.includes(term));

    // Write evidence JSON
    await writeEvidence('task-10-learning-tabs.json', {
      tabCount: tabButtons.length,
      tabLabels,
      clickedLabels,
      visibleCardCounts,
      bannedTermBooleans,
      removedStageSelectorCount,
      removedStageCardCount,
      removedStageDetailCount,
      hasFiveStageText,
      hasJuniorExplorerText,
      hasOldRewardCopy,
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
