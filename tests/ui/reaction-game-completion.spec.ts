import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_KEY = 'element-explorer-kids-state';
const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');
const COMPLETION_SCREENSHOT = path.join(EVIDENCE_DIR, 'task-5-reaction-completion.png');
const REACTION_TEXTBOOK_EVIDENCE = 'task-9-reaction-textbook-runtime.json';
const REACTIONS_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'reactions.json');

test.describe('Reaction pairing completion', () => {
  test('completes reaction pairing and persists the score', async ({ page }) => {
    await openReactionGame(page);

    await assertVisibleReactionsUseReviewedTextbookRecords(page);
    const completedIds = await completeVisibleReactionPairs(page);

    await expect(activeGameStage(page).locator('.hud-shell-header h3')).toHaveText('反应配对完成');
    await expect(activeGameStage(page).locator('.game-result-panel--reaction')).toBeVisible();
    await expect.poll(async () => activeGameStage(page).locator('.reaction-summary-chip').count()).toBeGreaterThan(0);
    await expect(activeGameStage(page).locator('.game-scoreboard .quiz-stat-card').filter({ hasText: '正确配对' }).locator('strong')).toHaveText(String(completedIds.length));

    const expectedScore = completedIds.length * 10;
    await expect.poll(async () => {
      const { appStateScore, storedScore } = await readReactionScore(page);
      return appStateScore >= expectedScore && storedScore >= expectedScore;
    }).toBe(true);

    const persistedScore = await readReactionScore(page);
    expect(persistedScore.appStateScore).toBeGreaterThanOrEqual(expectedScore);
    expect(persistedScore.storedScore).toBeGreaterThanOrEqual(expectedScore);

    await mkdir(EVIDENCE_DIR, { recursive: true });
    await page.screenshot({ path: COMPLETION_SCREENSHOT, fullPage: true });
  });

  test('rejects incorrect reaction pairing without changing progress', async ({ page }) => {
    await openReactionGame(page);

    const beforeScore = await readStatValue(page, '当前得分');
    const beforeMatched = await readStatValue(page, '已配对');
    const beforeMatchedChips = await reactionBoard(page).locator('.reaction-chip.is-matched').count();
    const mismatch = await chooseVisibleMismatch(page);

    await reactionBoard(page).locator(reactionSelector('data-reaction-id', mismatch.reactantId)).click();
    await reactionBoard(page).locator(reactionSelector('data-reaction-product', mismatch.productId)).click();

    await expect(activeGameStage(page).locator('.game-feedback')).toHaveAttribute('data-reaction-result', 'incorrect');
    await expect(activeGameStage(page).locator('.game-feedback')).toContainText('不是一组');
    await expect(activeGameStage(page).locator('.hud-shell-header h3')).not.toHaveText('反应配对完成');
    await expect(activeGameStage(page).locator('.game-result-panel--reaction')).toHaveCount(0);
    await expect.poll(async () => readStatValue(page, '当前得分')).toBe(beforeScore);
    await expect.poll(async () => readStatValue(page, '已配对')).toBe(beforeMatched);
    await expect(reactionBoard(page).locator('.reaction-chip.is-matched')).toHaveCount(beforeMatchedChips);

    const persistedScore = await readReactionScore(page);
    expect(persistedScore.appStateScore ?? 0).toBe(0);
    expect(persistedScore.storedScore ?? 0).toBe(0);
  });
});

async function openReactionGame(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Clear storage on the app origin, then reload so the app initializes with a clean slate
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForShellReady(page);

  await page.getByTestId('nav-games').click();
  await expect(page).toHaveURL(/#\/games$/);
  await expect(page.locator('#games')).toHaveClass(/active/);

  await page
    .getByTestId('games-primary-grid')
    .locator(':scope > .game-card[data-game="reaction"] .play-btn')
    .click();

  await expect(activeGameStage(page)).toHaveClass(/active/);
  await expect(reactionBoard(page)).toBeVisible({ timeout: 10000 });
  await expect.poll(async () => reactionBoard(page).locator('[data-reaction-id]').count()).toBeGreaterThan(0);
  await expect.poll(async () => reactionBoard(page).locator('[data-reaction-product]').count()).toBeGreaterThan(0);
}

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('detail-panel')).toBeVisible({ timeout: 20000 });
  // Wait for appState to be fully initialized before checking DOM elements
  await expect.poll(async () => {
    return await page.evaluate(() => {
      if (typeof window.appState === 'undefined') return false;
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 25000, intervals: [100, 200, 500, 1000] }).toBe(true);
  // Ensure the periodic table grid has rendered with enough cells
  await expect.poll(async () => {
    return await page.locator('.element-cell').count();
  }, { timeout: 25000, intervals: [100, 200, 500, 1000] }).toBeGreaterThanOrEqual(118);
}

function activeGameStage(page: Page) {
  return page.getByTestId('active-game-stage');
}

function reactionBoard(page: Page) {
  return page.getByTestId('reaction-board');
}

async function completeVisibleReactionPairs(page: Page) {
  const reactionIds = await reactionBoard(page).locator('[data-reaction-id]').evaluateAll((buttons) => (
    buttons
      .map((button) => button.getAttribute('data-reaction-id'))
      .filter((id): id is string => Boolean(id))
  ));

  for (const reactionId of reactionIds) {
    await reactionBoard(page).locator(reactionSelector('data-reaction-id', reactionId)).click();
    await reactionBoard(page).locator(reactionSelector('data-reaction-product', reactionId)).click();
  }

  return reactionIds;
}

async function chooseVisibleMismatch(page: Page) {
  return await reactionBoard(page).evaluate((board) => {
    const reactantIds = Array.from(board.querySelectorAll('[data-reaction-id]'))
      .map((button) => button.getAttribute('data-reaction-id'))
      .filter((id): id is string => Boolean(id));
    const productIds = Array.from(board.querySelectorAll('[data-reaction-product]'))
      .map((button) => button.getAttribute('data-reaction-product'))
      .filter((id): id is string => Boolean(id));

    for (const reactantId of reactantIds) {
      const productId = productIds.find((candidate) => candidate !== reactantId);
      if (productId) {
        return { reactantId, productId };
      }
    }

    throw new Error('Could not find a visible mismatched reaction pair.');
  });
}

async function readStatValue(page: Page, label: string) {
  const value = await page
    .getByTestId('active-game-stage')
    .locator('.game-scoreboard .quiz-stat-card')
    .filter({ hasText: label })
    .locator('strong')
    .textContent();

  return Number(value?.trim() ?? 0);
}

async function readReactionScore(page: Page) {
  return await page.evaluate((storageKey) => {
    const rawEnvelope = window.localStorage.getItem(storageKey);
    const envelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
    const storedScores = envelope?.data?.gameScores ?? envelope?.gameScores ?? {};
    return {
      appStateScore: Number(window.appState?.gameScores?.['game-reaction'] ?? 0),
      storedScore: Number(storedScores['game-reaction'] ?? 0)
    };
  }, STORAGE_KEY);
}

async function assertVisibleReactionsUseReviewedTextbookRecords(page: Page) {
  const visibleReactionIds = await getVisibleReactionIds(page);
  expect(visibleReactionIds.length).toBeGreaterThan(0);

  const sourceData = JSON.parse(await readFile(REACTIONS_DATA_PATH, 'utf8'));
  const sourceReactions = Array.isArray(sourceData) ? sourceData : sourceData.reactions;
  const sourceById = new Map(sourceReactions.map((reaction) => [reaction.id, reaction]));

  const verifiedRecords = visibleReactionIds.map((reactionId) => {
    const sourceRecord = sourceById.get(reactionId);
    expect(sourceRecord).toBeTruthy();
    expect(sourceRecord.sourceKind).toBe('textbook');
    expect(sourceRecord.sourceReviewStatus).toBe('reviewed');
    return {
      id: sourceRecord.id,
      name: sourceRecord.name,
      sourceKind: sourceRecord.sourceKind,
      sourceReviewStatus: sourceRecord.sourceReviewStatus,
      reactants: sourceRecord.reactants,
      products: sourceRecord.products,
      sourceReferenceCount: Array.isArray(sourceRecord.sourceReferences) ? sourceRecord.sourceReferences.length : 0,
      sourceJsonSourceKind: sourceRecord.sourceKind,
      sourceJsonReviewStatus: sourceRecord.sourceReviewStatus
    };
  });

  await writeEvidence(REACTION_TEXTBOOK_EVIDENCE, {
    checkedAt: new Date().toISOString(),
    source: 'tests/ui/reaction-game-completion.spec.ts',
    sourceJsonPath: 'src/data/reactions.json',
    visibleReactionIds,
    visibleReactionCount: visibleReactionIds.length,
    sourceJsonReactionCount: sourceReactions.length,
    verifiedRecords
  });
}

async function getVisibleReactionIds(page: Page) {
  return await reactionBoard(page).locator('[data-reaction-id]').evaluateAll((buttons) => (
    buttons
      .map((button) => button.getAttribute('data-reaction-id'))
      .filter((id): id is string => Boolean(id))
  ));
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

function reactionSelector(attributeName: 'data-reaction-id' | 'data-reaction-product', value: string) {
  return `[${attributeName}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
}
