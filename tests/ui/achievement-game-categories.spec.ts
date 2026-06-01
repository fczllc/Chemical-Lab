import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

async function resetApp(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      return hasElements;
    });
  }, { timeout: 15000 }).toBe(true);
  await page.evaluate(() => {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.add('hidden');
      loader.classList.add('display-none');
    }
  });
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

test.describe('Achievement game categories rendering', () => {
  test('correctly renders game achievement categories', async ({ page }) => {
    await resetApp(page);
    await waitForShellReady(page);

    await page.getByTestId('nav-achievements').click();

    // Verify categories
    const categoryLabels = ['元素归位', '记忆翻牌', '反应配对'];
    const blocks = page.locator('.achievement-category-block');
    
    const evidence: any = {
      categoryLabels: [],
      progressText: {},
      cardTitles: [],
      hasGenericGameHeader: false
    };

    for (let i = 0; i < await blocks.count(); i++) {
        const block = blocks.nth(i);
        const header = await block.locator('.achievement-category-header h3').textContent();
        
        if (header === '游戏') {
            evidence.hasGenericGameHeader = true;
        }

        if (categoryLabels.includes(header || '')) {
            evidence.categoryLabels.push(header);
            const progress = await block.locator('.achievement-category-header strong').textContent();
            evidence.progressText[header!] = progress;
            
            const titles = await block.locator('.achievement-card-body h4').allTextContents();
            evidence.cardTitles.push(...titles);
        }
    }

    // Assertions
    for (const label of categoryLabels) {
        expect(evidence.categoryLabels).toContain(label);
        expect(evidence.progressText[label]).toBe('0/5');
    }
    expect(evidence.hasGenericGameHeader).toBe(false);

    // Assert 15 titles total
    expect(evidence.cardTitles.length).toBe(15);
    
    // Write evidence
    await writeEvidence('task-3-achievement-game-categories-ui.json', evidence);
  });
});
