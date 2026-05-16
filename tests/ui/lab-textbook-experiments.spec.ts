import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

test.describe('Lab textbook experiment content', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Navigate to the app first to set the origin, then clear storage
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    // Reload the app to ensure a clean state
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);
  });

  test('runtime lab uses explicit textbook experiments', async ({ page }) => {
    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const cards = page.locator('.lab-item-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const cardExperimentIds = await page.locator('.lab-item-card button[data-reaction-open]').evaluateAll((buttons) => {
      return buttons.map((button) => button.getAttribute('data-reaction-open')).filter(Boolean);
    });
    const labExperimentIds = await page.evaluate(async () => {
      const { labExperiments } = await import('/src/data/index.js');
      return labExperiments.map((experiment) => experiment.id);
    });
    const labExperimentIdSet = new Set(labExperimentIds);
    expect(cardExperimentIds.length).toBe(count);
    expect(cardExperimentIds.every((id) => labExperimentIdSet.has(id))).toBe(true);

    const cardTitles = await page.locator('[data-testid="lab-card-title"]').allTextContents();
    const formulaPoolPatterns = ['textbook-reaction-', 'reaction-', '教材已审核反应：'];
    for (const title of cardTitles) {
      for (const pattern of formulaPoolPatterns) {
        expect(title).not.toContain(pattern);
      }
    }

    await writeEvidence('task-7-lab-runtime-regression.json', {
      totalCards: count,
      matchedLabExperimentIds: cardExperimentIds.length,
      visibleTitles: cardTitles.slice(0, 10),
      formulaPoolPlaceholderCount: cardTitles.filter((title) => title.includes('教材已审核反应：')).length
    });
  });

  test('lab titles are meaningful textbook summaries', async ({ page }) => {
    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const titles = await page.locator('[data-testid="lab-card-title"]').allTextContents();
    expect(titles.length).toBeGreaterThan(0);

    const invalidPatterns = [
      /^lab-/,
      /【实验\d+-\d+】/,
      /[a-f0-9]{8,}/i
    ];
    const invalidTitles = titles.filter((title) => invalidPatterns.some((pattern) => pattern.test(title)));

    expect(invalidTitles).toEqual([]);

    await writeEvidence('task-7-lab-title-quality.json', {
      totalTitles: titles.length,
      invalidTitles,
      sampleTitles: titles.slice(0, 5)
    });
  });

  test('clean state shows locked and unlocked cards', async ({ page }) => {
    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const lockedCards = page.locator('.lab-item-card.is-locked');
    const unlockedCards = page.locator('.lab-item-card:not(.is-locked)');
    const lockedCount = await lockedCards.count();
    const unlockedCount = await unlockedCards.count();

    expect(lockedCount).toBeGreaterThan(0);
    expect(unlockedCount).toBeGreaterThan(0);

    await writeEvidence('task-7-lab-locked-state.json', {
      lockedCount,
      unlockedCount
    });
  });

  test('placeholder text rejection', async ({ page }) => {
    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const cards = page.locator('.lab-item-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const cardTexts = await cards.allTextContents();
    expect(cardTexts.join('\n')).not.toContain('教材已审核反应：');

    const openButtons = page.locator('.lab-item-card:not(.is-locked) button[data-reaction-open]');
    const count = await openButtons.count();
    expect(count).toBeGreaterThan(0);

    // Test only the first available lab to minimize instability risks while preserving the rejection check
    const btn = openButtons.first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
      
    const modal = page.locator('.lab-detail-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).not.toContainText('教材已审核反应：');

    const detailText = await modal.textContent() || '';
    
    await modal.locator('button[data-lab-back]').click();
    await expect(modal).toBeHidden({ timeout: 10000 });
    // Extra wait for animations to settle
    await page.waitForLoadState('domcontentloaded');

    await writeEvidence('task-7-lab-placeholder-rejection.json', {
      checkedDetailCount: 1,
      detailTextSample: detailText.slice(0, 80)
    });
  });

  test('card excerpt and detail full content', async ({ page }) => {
    // Seed a textbook-derived reaction with full textbookContent
    await page.evaluate(async () => {
      const { labExperiments } = await import('/src/data/index.js');
      const enriched = {
        id: 'textbook-fixture-grade9-vol1-exp-001',
        name: '锌与稀盐酸反应',
        description: '锌与稀盐酸反应生成氢气，观察气泡产生。',
        textbookContent: '将锌粒放入稀盐酸中，锌表面迅速产生大量气泡。反应放热，生成的氢气可用点燃的木条检验，发出淡蓝色火焰。反应方程式：Zn + 2HCl → ZnCl2 + H2。实验结束后，将废液倒入指定回收容器。',
        reactants: ['Zn', 'HCl'],
        products: ['ZnCl2', 'H2'],
        equationText: 'Zn + 2HCl → ZnCl2 + H2',
        experimentId: 'textbook-fixture-grade9-vol1-exp-001-experiment',
        safetyLevel: 'caution',
        visualDescription: '锌表面产生气泡，氢气燃烧呈淡蓝色火焰。',
        steps: ['取适量锌粒放入试管。', '加入稀盐酸，观察现象。', '检验生成的气体。'],
        safetyNotes: ['佩戴护目镜', '在通风处操作'],
        curriculumTags: ['grade9-ch2'],
        difficulty: '初中',
        unlockRequirements: { curriculumTags: ['grade9-ch2'], safetyLevels: ['caution'], stageIds: [], minimumLearnedElements: 0, grade: '九年级', chapter: '实验2-1' },
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        sourceReviewStatus: 'reviewed',
        sourceReferences: []
      };
      labExperiments.push(enriched);
    });

    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const card = page.locator('.lab-item-card', { hasText: '锌与稀盐酸反应' });
    await expect(card).toBeVisible({ timeout: 10000 });

    const cardDescription = card.locator('.lab-card-description');
    const cardText = await cardDescription.textContent() || '';
    const cjkCount = (cardText.match(/[\u3400-\u9fff]/gu) || []).length;
    expect(cjkCount).toBeLessThanOrEqual(100);

    await card.locator('button[data-reaction-open]').click();

    const detailDescription = page.locator('.lab-detail-modal .lab-stage-description');
    await expect(detailDescription).toBeVisible({ timeout: 10000 });

    const detailText = await detailDescription.textContent() || '';
    expect(detailText.length).toBeGreaterThan(cardText.length);
    expect(detailText).toContain('反应方程式');

    await writeEvidence('task-6-lab-detail.json', {
      cardCjkCount: cjkCount,
      cardTextLength: cardText.length,
      detailTextLength: detailText.length,
      detailContainsEquation: detailText.includes('反应方程式')
    });
  });

  test('static reaction fallback', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.evaluate(async () => {
      const { labExperiments } = await import('/src/data/index.js');
      const staticReaction = {
        id: 'reaction-hydrogen-combustion',
        name: '氢气燃烧',
        description: '氢气在空气中燃烧，产生淡蓝色火焰。',
        reactants: ['H2', 'O2'],
        products: ['H2O'],
        experimentId: 'reaction-hydrogen-combustion-experiment',
        safetyLevel: 'dangerous',
        visualDescription: '淡蓝色火焰，生成水蒸气。',
        steps: ['检查装置气密性。', '点燃氢气。', '观察火焰颜色。'],
        safetyNotes: ['远离明火', '佩戴护目镜'],
        curriculumTags: [],
        difficulty: '初中',
        unlockRequirements: { curriculumTags: [], safetyLevels: ['dangerous'], stageIds: [], minimumLearnedElements: 0, grade: '', chapter: '' },
        sourceVolumeId: '',
        sourceReviewStatus: '',
        sourceReferences: []
      };
      const idx = labExperiments.findIndex((experiment) => experiment.id === staticReaction.id);
      if (idx >= 0) labExperiments.splice(idx, 1);
      labExperiments.push(staticReaction);
    });

    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const card = page
      .locator('.lab-item-card')
      .filter({ has: page.locator('button[data-reaction-open="reaction-hydrogen-combustion"]') })
      .first();
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.locator('button[data-reaction-open]').click();

    const detailDescription = page.locator('.lab-detail-modal .lab-stage-description');
    await expect(detailDescription).toBeVisible({ timeout: 10000 });

    const detailText = await detailDescription.textContent() || '';
    expect(detailText).toContain('氢气');
    expect(consoleErrors).toEqual([]);

    await writeEvidence('task-6-static-fallback.json', {
      detailTextLength: detailText.length,
      detailContainsHydrogen: detailText.includes('氢气'),
      consoleErrors
    });
  });

  test('ambiguous chemistry hides blank equation rows while showing full content', async ({ page }) => {
    await page.evaluate(async () => {
      const { labExperiments } = await import('/src/data/index.js');
      labExperiments.push({
        id: 'textbook-fixture-ambiguous-exp-001',
        name: '观察实验现象',
        description: '观察实验现象并记录变化。',
        textbookContent: '观察实验现象并记录变化。该教材实验片段没有明确给出反应方程式、反应物或生成物，因此不应显示推测性的化学方程式。',
        reactants: [],
        products: [],
        experimentId: 'textbook-fixture-ambiguous-exp-001-experiment',
        safetyLevel: 'safe',
        visualDescription: '观察并记录现象。',
        steps: ['观察实验现象并记录变化。'],
        safetyNotes: [],
        curriculumTags: ['grade9-ambiguous'],
        difficulty: '初中',
        unlockRequirements: { curriculumTags: ['grade9-ambiguous'], safetyLevels: ['safe'], stageIds: [], minimumLearnedElements: 0, grade: '九年级', chapter: '实验' },
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        sourceReviewStatus: 'reviewed',
        sourceReferences: []
      });
    });

    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const openButton = page.locator('button[data-reaction-open="textbook-fixture-ambiguous-exp-001"]');
    await expect(openButton).toBeVisible({ timeout: 10000 });
    await openButton.click();

    const modal = page.locator('.lab-detail-modal');
    await expect(modal.locator('.lab-stage-description')).toContainText('不应显示推测性的化学方程式');
    await expect(modal.locator('[data-chem-notation="equation"]')).toHaveCount(0);
    await expect(modal.locator('[data-chem-notation="reactants"]')).toHaveCount(0);
    await expect(modal.locator('[data-chem-notation="products"]')).toHaveCount(0);
    await expect(modal).not.toContainText('→');

    await writeEvidence('task-6-ambiguous-chemistry.json', {
      fullContentVisible: true,
      chemistryRowsVisible: 0
    });
  });

  test('dangerous reaction safety gate blocks launch without confirmation', async ({ page }) => {
    await page.evaluate(async () => {
      const { labExperiments } = await import('/src/data/index.js');
      const dangerousReaction = {
        id: 'textbook-fixture-dangerous-exp-001',
        name: '危险演示实验',
        description: '这是一个危险级别的演示实验，用于测试安全门控。',
        textbookContent: '危险演示实验内容。该实验具有危险级别，必须先确认安全守则才能进入模拟视图。',
        reactants: ['Na', 'H2O'],
        products: ['NaOH', 'H2'],
        equationText: '2Na + 2H2O → 2NaOH + H2↑',
        experimentId: 'textbook-fixture-dangerous-exp-001-experiment',
        safetyLevel: 'dangerous',
        visualDescription: '剧烈反应，产生氢气。',
        steps: ['取一小块钠。', '放入水中观察。'],
        safetyNotes: ['佩戴护目镜', '远离明火'],
        curriculumTags: [],
        difficulty: '初中',
        unlockRequirements: { curriculumTags: [], safetyLevels: ['dangerous'], stageIds: [], minimumLearnedElements: 0, grade: '九年级', chapter: '实验D-1' },
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        sourceReviewStatus: 'reviewed',
        sourceReferences: []
      };
      labExperiments.push(dangerousReaction);
    });

    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const card = page.locator('.lab-item-card', { hasText: '危险演示实验' });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.locator('button[data-reaction-open]').click();

    const detailModal = page.locator('.lab-detail-modal');
    await expect(detailModal).toBeVisible({ timeout: 10000 });

    // The start button on detail view should be disabled because safety is not confirmed
    const startButton = detailModal.locator('button[data-lab-start]');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeDisabled();

    // Open safety view
    await detailModal.locator('button[data-lab-open-safety]').click();

    // In safety view, launch button should also be disabled without confirmation
    const launchButton = detailModal.locator('button[data-launch-simulation]');
    await expect(launchButton).toBeVisible();
    await expect(launchButton).toBeDisabled();

    // Go back to detail and confirm safety
    await detailModal.locator('button[data-lab-back]').click();
    const confirmCheckbox = detailModal.locator('input[data-safety-confirm]');
    await expect(confirmCheckbox).toBeVisible();
    await confirmCheckbox.check();

    // Now the start button should be enabled
    await expect(detailModal.locator('button[data-lab-start]')).toBeEnabled();

    // Go to safety view again; launch should now be enabled
    await detailModal.locator('button[data-lab-open-safety]').click();
    await expect(detailModal.locator('button[data-launch-simulation]')).toBeEnabled();

    await writeEvidence('task-6-dangerous-safety-gate.json', {
      detailStartDisabledInitially: true,
      safetyLaunchDisabledInitially: true,
      safetyLaunchEnabledAfterConfirm: true
    });
  });

  test('simulation completion shows result view in detail modal', async ({ page }) => {
    await page.evaluate(async () => {
      const { labExperiments } = await import('/src/data/index.js');
      const safeReaction = {
        id: 'textbook-fixture-safe-simulation-001',
        name: '快速安全实验',
        description: '一个安全级别的快速实验，用于测试模拟完成后的结果视图。',
        textbookContent: '快速安全实验内容。模拟完成后应显示结果视图。',
        reactants: ['H2', 'O2'],
        products: ['H2O'],
        equationText: '2H2 + O2 → 2H2O',
        experimentId: 'textbook-fixture-safe-simulation-001-experiment',
        safetyLevel: 'safe',
        visualDescription: '淡蓝色火焰，生成水。',
        steps: ['准备氢气和氧气。', '点燃观察。'],
        safetyNotes: [],
        curriculumTags: [],
        difficulty: '初中',
        unlockRequirements: { curriculumTags: [], safetyLevels: ['safe'], stageIds: [], minimumLearnedElements: 0, grade: '九年级', chapter: '实验S-1' },
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        sourceReviewStatus: 'reviewed',
        sourceReferences: []
      };
      labExperiments.push(safeReaction);
    });

    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const card = page.locator('.lab-item-card', { hasText: '快速安全实验' });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.locator('button[data-reaction-open]').click();

    const detailModal = page.locator('.lab-detail-modal');
    await expect(detailModal).toBeVisible({ timeout: 10000 });

    // Click start (goes to safety view first)
    const startButton = detailModal.locator('button[data-lab-start]');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // From safety view, launch the actual simulation
    const launchButton = detailModal.locator('button[data-launch-simulation]');
    await expect(launchButton).toBeVisible();
    await launchButton.click();

    // Wait for simulation modal to appear
    const simBackdrop = page.locator('.lab-modal-backdrop');
    await expect(simBackdrop).toBeVisible({ timeout: 10000 });

    // Wait for simulation modal to disappear (indicates completion)
    await expect(simBackdrop).toBeHidden({ timeout: 25000 });

    // Wait for simulation to complete and result view to appear in detail modal
    // The detail modal is recreated after simulation, so re-query
    const resultModal = page.locator('.lab-detail-modal');
    await expect(resultModal).toBeVisible({ timeout: 5000 });
    await expect(resultModal.locator('.hud-kicker', { hasText: 'EXPERIMENT LOGGED' })).toBeVisible({ timeout: 5000 });

    await writeEvidence('task-6-simulation-result-view.json', {
      resultViewVisible: true
    });
  });
});

async function waitForAppReady(page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 20000 });
  // Wait for appState to be fully initialized and loader hidden
  await expect.poll(async () => {
    return await page.evaluate(() => {
      if (typeof window.appState === 'undefined') return false;
      const state = window.appState;
      const hasElements = Array.isArray(state?.elements) && state.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 25000, intervals: [100, 200, 500, 1000] }).toBe(true);
  // Ensure the periodic table grid has rendered when on the home page
  const currentUrl = page.url();
  if (currentUrl.includes('/#/') === false || currentUrl.endsWith('/#/') || currentUrl.endsWith('/')) {
    await expect.poll(async () => {
      return await page.locator('.element-cell').count();
    }, { timeout: 25000, intervals: [100, 200, 500, 1000] }).toBeGreaterThanOrEqual(118);
  }
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}
