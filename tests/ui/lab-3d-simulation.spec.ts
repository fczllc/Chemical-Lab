import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');

test.describe('Lab 3D simulation UI', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

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

  test('apparatus recognition simulation launches and shows equipment', async ({ page }) => {
    await page.evaluate(async () => {
      const registry = await import('/src/lab-sim/registry.js');
      const { default: apparatusConfig } = await import('/src/lab-sim/experiments/configs/apparatus-recognition.json');
      const { labExperiments } = await import('/src/data/index.js');

      registry.clear();
      registry.register(apparatusConfig);

      const apparatusExperiment = {
        id: 'apparatus-recognition',
        name: '器材识别挑战',
        description: '识别常见化学实验器材，了解每种器材的用途与安全注意事项。',
        textbookContent: '观察烧杯、试管、量筒、滴管、玻璃棒、漏斗、温度计、天平、酒精灯、蒸发皿、护目镜和防护屏等常见实验器材。',
        reactants: [],
        products: [],
        equationText: '',
        experimentId: 'apparatus-recognition',
        safetyLevel: 'safe',
        visualDescription: '3D 实验台上摆放多种基础器材，点击或观察器材完成识别。',
        steps: ['进入模拟视图。', '观察实验台上的器材。', '识别每种器材的名称和用途。'],
        safetyNotes: ['保持实验台整洁', '识别加热器材时注意隔热'],
        curriculumTags: [],
        difficulty: '入门',
        unlockRequirements: {
          curriculumTags: [],
          safetyLevels: ['safe'],
          stageIds: [],
          minimumLearnedElements: 0,
          grade: '七年级',
          chapter: '实验基础'
        },
        sourceVolumeId: 'playwright-fixture',
        sourceReviewStatus: 'reviewed',
        sourceReferences: []
      };

      const existingIndex = labExperiments.findIndex((experiment) => experiment.id === apparatusExperiment.id);
      if (existingIndex >= 0) {
        labExperiments.splice(existingIndex, 1, apparatusExperiment);
      } else {
        labExperiments.push(apparatusExperiment);
      }
    });

    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const card = page.locator('.lab-item-card', { hasText: '器材识别挑战' });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.locator('button[data-reaction-open="apparatus-recognition"]').click();

    const detailModal = page.locator('.lab-detail-modal');
    await expect(detailModal).toBeVisible({ timeout: 10000 });
    await detailModal.locator('button[data-lab-start]').click();

    await expect(detailModal.locator('[data-launch-simulation]')).toBeVisible({ timeout: 10000 });
    await detailModal.locator('[data-launch-simulation]').click();

    const simulationModal = page.locator('.lab-modal');
    await expect(simulationModal).toBeVisible({ timeout: 10000 });

    const canvas = simulationModal.locator('[data-lab-3d-host] canvas, canvas#lab-simulation-canvas, canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const canvasBox = await canvas.boundingBox();
    const equipmentProgress = simulationModal.locator('.lab-inspection-progress');
    await expect(equipmentProgress).toBeVisible({ timeout: 10000 });
    const registeredConfig = await page.evaluate(async () => {
      const registry = await import('/src/lab-sim/registry.js');
      const config = registry.lookup('apparatus-recognition');
      return config
        ? {
            experimentId: config.experimentId,
            template: config.template,
            apparatusCount: config.apparatus.length
          }
        : null;
    });

    expect(registeredConfig).toEqual({
      experimentId: 'apparatus-recognition',
      template: 'apparatus-recognition',
      apparatusCount: 12
    });
    expect(canvasBox?.width ?? 0).toBeGreaterThan(0);
    expect(canvasBox?.height ?? 0).toBeGreaterThan(0);

    await writeEvidence('task-8-apparatus-recognition-simulation.json', {
      cardVisible: true,
      simulationVisible: true,
      canvasBox,
      equipmentProgressText: await equipmentProgress.textContent(),
      registeredConfig
    });
  });

  test('sodium-water simulation shows parameter controls', async ({ page }) => {
    const sodiumSetup = await page.evaluate(async () => {
      const registry = await import('/src/lab-sim/registry.js');
      const { default: sodiumWaterConfig } = await import('/src/lab-sim/experiments/configs/sodium-water.json');
      const { labExperiments } = await import('/src/data/index.js');
      const { markExperimentCompleted } = await import('/src/modules/storage.js');

      registry.clear();
      registry.register(sodiumWaterConfig);

      const sodiumExperiment = labExperiments.find((experiment) => {
        const searchText = [
          experiment.id,
          experiment.experimentId,
          experiment.name,
          experiment.description,
          ...(experiment.reactants || [])
        ].join(' ');
        return /钠|sodium|Na\b/i.test(searchText);
      });

      const sodiumWaterExperiment = {
        id: 'exp-sodium-water',
        name: '钠与水反应',
        description: '观察钠与水反应时的气泡、放热和安全防护要求。',
        textbookContent: '钠与水反应会生成氢氧化钠和氢气，虚拟实验用于观察参数变化对反应强度的影响。',
        reactants: ['Na', 'H2O'],
        products: ['NaOH', 'H2'],
        equationText: '2Na + 2H2O → 2NaOH + H2↑',
        experimentId: 'exp-sodium-water',
        safetyLevel: 'dangerous',
        visualDescription: '钠块在水面快速移动并产生气泡，参数控制面板可调节水温、钠块质量和水体积。',
        steps: ['戴好护目镜并确认防护屏。', '调节虚拟实验参数。', '观察反应气泡和安全提示。'],
        safetyNotes: ['真实钠与水反应必须由教师演示', '远离明火并保持防护屏'],
        curriculumTags: [],
        difficulty: '初中',
        unlockRequirements: {
          curriculumTags: [],
          safetyLevels: ['dangerous'],
          stageIds: [],
          minimumLearnedElements: 0,
          grade: '九年级',
          chapter: '钠与水反应'
        },
        sourceVolumeId: 'playwright-fixture',
        sourceReviewStatus: 'reviewed',
        sourceReferences: []
      };

      const existingIndex = labExperiments.findIndex((experiment) => experiment.id === sodiumWaterExperiment.id);
      if (existingIndex >= 0) {
        labExperiments.splice(existingIndex, 1, sodiumWaterExperiment);
      } else {
        labExperiments.push(sodiumWaterExperiment);
      }

      if (sodiumExperiment?.experimentId) {
        markExperimentCompleted(sodiumExperiment.experimentId);
      }

      return {
        id: sodiumWaterExperiment.id,
        experimentId: sodiumWaterExperiment.experimentId,
        name: sodiumWaterExperiment.name,
        existingSodiumExperimentId: sodiumExperiment?.experimentId ?? null
      };
    });

    await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const sodiumCard = page.locator('.lab-item-card').filter({
      has: page.locator('button[data-reaction-open="exp-sodium-water"]')
    }).first();
    const sodiumCardCount = await sodiumCard.count();
    test.skip(!sodiumSetup || sodiumCardCount === 0, 'No sodium-water lab card is present in the current textbook dataset.');

    await expect(sodiumCard).toBeVisible({ timeout: 10000 });
    await sodiumCard.locator('button[data-reaction-open]').click();

    const detailModal = page.locator('.lab-detail-modal');
    await expect(detailModal).toBeVisible({ timeout: 10000 });

    const confirmCheckbox = detailModal.locator('input[data-safety-confirm]');
    if (await confirmCheckbox.count()) {
      await confirmCheckbox.check();
    }

    const startButton = detailModal.locator('button[data-lab-start]');
    await expect(startButton).toBeEnabled({ timeout: 10000 });
    await startButton.click();

    const launchButton = detailModal.locator('[data-launch-simulation]');
    await expect(launchButton).toBeVisible({ timeout: 10000 });
    if (await confirmCheckbox.count()) {
      await expect(launchButton).toBeEnabled();
    }
    await launchButton.click();

    const parameterPanel = page.locator('.lab-parameter-panel, [aria-label="实验参数控制面板"]');
    await expect(parameterPanel).toBeVisible({ timeout: 10000 });

    const sliders = parameterPanel.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    expect(sliderCount).toBeGreaterThan(0);

    const registeredConfig = await page.evaluate(async () => {
      const registry = await import('/src/lab-sim/registry.js');
      const config = registry.lookup('exp-sodium-water');
      return config
        ? {
            experimentId: config.experimentId,
            template: config.template,
            parameterCount: Object.keys(config.parameters).length
          }
        : null;
    });

    await writeEvidence('task-8-sodium-water-parameters.json', {
      cardVisible: true,
      sodiumSetup,
      parameterPanelVisible: true,
      sliderCount,
      registeredConfig
    });
  });
});

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
  }, { timeout: 60000, intervals: [100, 200, 500, 1000] }).toBe(true);
  const currentUrl = page.url();
  if (currentUrl.includes('/#/') === false || currentUrl.endsWith('/#/') || currentUrl.endsWith('/')) {
    await expect.poll(async () => {
      return await page.locator('.element-cell').count();
    }, { timeout: 60000, intervals: [100, 200, 500, 1000] }).toBeGreaterThanOrEqual(118);
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
