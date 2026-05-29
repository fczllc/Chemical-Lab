const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const STORAGE_KEY = 'element-explorer-kids-state';
const MANUAL_SEGMENT_ID = 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45';
const TEXTBOOK_CONTENT_SEGMENT_ID = 'knowledge-topic-0004-source-section-l63-l74-105f9964c8';
const TEXTBOOK_CONTENT_SOURCE = '教材：2019版人教版高中化学必修第1册；范围：L63-74';
const TEXTBOOK_CONTENT_PHRASE = '世界是由物质构成的';
const FORMULA_SEGMENT_ID = 'knowledge-topic-0008-1-l94-l129-9ca678fac3';
const FORBIDDEN_BODY_STRINGS = [
  '本节要学什么',
  '关键知识点',
  '相关资料',
  '学习确认',
  '卷册 ID',
  '来源哈希',
  'reviewedBy',
  'src/data/textbooks'
];

const evidenceDir = path.resolve('.sisyphus/evidence');
const reportPath = path.join(evidenceDir, 'f3-real-qa.md');
const screenshotTextbook = path.join(evidenceDir, 'f3-textbook-modal.png');
const screenshotFormula = path.join(evidenceDir, 'f3-formula-modal.png');
const screenshotCompleted = path.join(evidenceDir, 'f3-completed-state.png');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeCssAttribute(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function waitForShellReady(page) {
  await page.getByTestId('nav-home').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => {
    const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
    const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
    return hasElements && loaderHidden;
  }, null, { timeout: 30000 });
}

async function resetApp(page) {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForShellReady(page);
}

async function showLearningCard(page, segmentId) {
  const card = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${segmentId}"]`).first();
  await card.waitFor({ state: 'attached', timeout: 15000 });
  const panelId = await card.evaluate((element) => element.closest('[data-textbook-panel]')?.getAttribute('data-textbook-panel') || '');
  if (panelId) {
    const tab = page.locator(`[data-textbook-tab="${escapeCssAttribute(panelId)}"]`).first();
    if (await tab.count()) await tab.click();
  }
  const activeCard = page.locator(`#progress [data-testid="learning-card"][data-learning-segment-id="${segmentId}"]`).first();
  await activeCard.waitFor({ state: 'visible', timeout: 15000 });
  await activeCard.scrollIntoViewIfNeeded();
  return activeCard;
}

async function openLearningCard(page, segmentId) {
  const card = await showLearningCard(page, segmentId);
  await card.evaluate((element) => element.click());
  const modal = page.locator('[data-testid="lesson-modal"]');
  await modal.waitFor({ state: 'visible', timeout: 15000 });
  return { modal, card };
}

async function closeModal(page) {
  const close = page.locator('[data-testid="lesson-modal-close"]');
  if (await close.count()) {
    await close.first().click();
    await page.locator('[data-testid="lesson-modal"]').waitFor({ state: 'hidden', timeout: 15000 });
  }
}

async function getTodayLocalDateInBrowser(page) {
  return await page.evaluate(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
}

(async () => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const evidence = {
    checkedAt: new Date().toISOString(),
    url: 'http://127.0.0.1:4173/#/progress',
    textbook: {},
    formula: {},
    confirmation: {},
    consoleErrors,
    pageErrors,
    screenshots: {
      textbook: screenshotTextbook,
      formula: screenshotFormula,
      completed: screenshotCompleted
    }
  };

  try {
    await resetApp(page);
    await page.getByTestId('nav-progress').click();
    await page.waitForURL(/#\/progress$/, { timeout: 15000 });

    const textbookOpen = await openLearningCard(page, TEXTBOOK_CONTENT_SEGMENT_ID);
    const textbookBody = textbookOpen.modal.locator('[data-testid="lesson-modal-body"]');
    await textbookBody.waitFor({ state: 'visible', timeout: 15000 });
    const headings = (await textbookBody.locator('.lesson-modal-section h5').allTextContents()).map((heading) => heading.trim());
    const bodyText = await textbookBody.textContent();
    const forbiddenHits = FORBIDDEN_BODY_STRINGS.filter((text) => bodyText.includes(text));
    evidence.textbook = {
      segmentId: TEXTBOOK_CONTENT_SEGMENT_ID,
      headings,
      hasSource: bodyText.includes(TEXTBOOK_CONTENT_SOURCE),
      hasPhrase: bodyText.includes(TEXTBOOK_CONTENT_PHRASE),
      forbiddenHits,
      bodyExcerpt: bodyText.replace(/\s+/g, ' ').trim().slice(0, 420)
    };
    assert(JSON.stringify(headings) === JSON.stringify(['章节来源', '教材内容']), `Unexpected headings: ${JSON.stringify(headings)}`);
    assert(bodyText.includes(TEXTBOOK_CONTENT_SOURCE), 'Missing required textbook source text');
    assert(bodyText.includes(TEXTBOOK_CONTENT_PHRASE), 'Missing required textbook phrase');
    assert(forbiddenHits.length === 0, `Forbidden modal body strings found: ${forbiddenHits.join(', ')}`);
    await textbookOpen.modal.screenshot({ path: screenshotTextbook });
    await closeModal(page);

    const formulaOpen = await openLearningCard(page, FORMULA_SEGMENT_ID);
    const formulaBody = formulaOpen.modal.locator('[data-testid="lesson-modal-body"]');
    const formulaContentSection = formulaBody.locator('.lesson-modal-section').filter({ has: page.locator('h5', { hasText: '教材内容' }) });
    const katexCount = await formulaContentSection.locator('.katex').count();
    const formulaText = await formulaContentSection.textContent();
    evidence.formula = {
      segmentId: FORMULA_SEGMENT_ID,
      katexCount,
      has60: formulaText.includes('60'),
      textExcerpt: formulaText.replace(/\s+/g, ' ').trim().slice(0, 300)
    };
    assert(katexCount > 0, 'Formula section did not render KaTeX');
    assert(formulaText.includes('60'), 'Formula section did not include visible/accessibility text 60');
    await formulaOpen.modal.screenshot({ path: screenshotFormula });
    await closeModal(page);

    const manualOpen = await openLearningCard(page, MANUAL_SEGMENT_ID);
    const confirmButton = manualOpen.modal.locator('[data-testid="confirm-learning"]');
    await confirmButton.waitFor({ state: 'visible', timeout: 15000 });
    const confirmText = (await confirmButton.textContent()).trim();
    assert(confirmText === '确定已学习', `Unexpected confirm text: ${confirmText}`);
    const date = await getTodayLocalDateInBrowser(page);
    await confirmButton.evaluate((element) => element.click());
    await page.waitForFunction((segmentId) => window.appState.completedLearningSegments.has(segmentId), MANUAL_SEGMENT_ID, { timeout: 10000 });
    await page.waitForFunction(({ segmentId, expectedDate }) => window.appState.learningSegmentCompletionDates?.[segmentId] === expectedDate, { segmentId: MANUAL_SEGMENT_ID, expectedDate: date }, { timeout: 10000 });
    const cardStatus = (await manualOpen.card.locator('[data-testid="learning-card-status"]').textContent()).trim();
    const footerText = (await manualOpen.modal.locator('.lesson-modal-footer').textContent()).trim();
    evidence.confirmation = {
      segmentId: MANUAL_SEGMENT_ID,
      confirmTextBeforeClick: confirmText,
      expectedDate: date,
      cardStatus,
      footerText,
      appStateCompleted: await page.evaluate((segmentId) => window.appState.completedLearningSegments.has(segmentId), MANUAL_SEGMENT_ID),
      storedDate: await page.evaluate((segmentId) => window.appState.learningSegmentCompletionDates?.[segmentId] || '', MANUAL_SEGMENT_ID)
    };
    assert(cardStatus === `学习确认：${date}`, `Unexpected card completed status: ${cardStatus}`);
    assert(footerText === `已学习：${date}`, `Unexpected modal footer completed status: ${footerText}`);
    await page.screenshot({ path: screenshotCompleted, fullPage: true });

    assert(consoleErrors.length === 0, `Console errors captured: ${consoleErrors.join('\n')}`);
    assert(pageErrors.length === 0, `Page errors captured: ${pageErrors.join('\n')}`);

    const report = [
      '# F3 Real Browser QA Evidence',
      '',
      `Checked at: ${evidence.checkedAt}`,
      `Browser URL: ${evidence.url}`,
      '',
      '## Textbook content segment',
      `Segment: ${TEXTBOOK_CONTENT_SEGMENT_ID}`,
      `Visible body section headings: ${JSON.stringify(evidence.textbook.headings)}`,
      `Contains source text: ${evidence.textbook.hasSource}`,
      `Contains phrase "${TEXTBOOK_CONTENT_PHRASE}": ${evidence.textbook.hasPhrase}`,
      `Forbidden body/internal metadata hits: ${JSON.stringify(evidence.textbook.forbiddenHits)}`,
      `Body excerpt: ${evidence.textbook.bodyExcerpt}`,
      `Screenshot: ${screenshotTextbook}`,
      '',
      '## Formula segment',
      `Segment: ${FORMULA_SEGMENT_ID}`,
      `KaTeX node count in 教材内容 section: ${evidence.formula.katexCount}`,
      `Contains visible/accessibility text "60": ${evidence.formula.has60}`,
      `Text excerpt: ${evidence.formula.textExcerpt}`,
      `Screenshot: ${screenshotFormula}`,
      '',
      '## Confirmation flow',
      `Segment: ${MANUAL_SEGMENT_ID}`,
      `Confirm button text before click: ${evidence.confirmation.confirmTextBeforeClick}`,
      `Expected browser-local date: ${evidence.confirmation.expectedDate}`,
      `Card completed state: ${evidence.confirmation.cardStatus}`,
      `Modal footer completed state: ${evidence.confirmation.footerText}`,
      `appState completed: ${evidence.confirmation.appStateCompleted}`,
      `Stored completion date: ${evidence.confirmation.storedDate}`,
      `Screenshot: ${screenshotCompleted}`,
      '',
      '## Browser errors',
      `Console errors: ${JSON.stringify(consoleErrors)}`,
      `Page errors: ${JSON.stringify(pageErrors)}`,
      ''
    ].join('\n');
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(JSON.stringify({ verdict: 'APPROVE', reportPath, evidence }, null, 2));
  } catch (error) {
    const report = [
      '# F3 Real Browser QA Evidence',
      '',
      `Checked at: ${evidence.checkedAt}`,
      'Verdict: REJECT',
      `Failure: ${error.stack || error.message}`,
      '',
      '## Partial evidence',
      '```json',
      JSON.stringify(evidence, null, 2),
      '```',
      ''
    ].join('\n');
    fs.writeFileSync(reportPath, report, 'utf8');
    console.error(JSON.stringify({ verdict: 'REJECT', reportPath, error: error.stack || error.message, evidence }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
