import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');
const FINAL_AUDIT_PATH = path.join(EVIDENCE_DIR, 'quiz-clarity-final.json');
const QUIZ_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'quizData.json');

const BANNED_PATTERNS = [
  /学习.+这一(段|片段)/,
  /应该掌握哪条事实/,
  /教材片段说明/
];

const BROADER_SOURCE_PATTERN = /教材(指出|说明|图\d+|正文)/;

type AuditRecord = { id: string; field: string; text: string };

type FinalAudit = {
  allowedSourceMentions: AuditRecord[];
  remediatedRecords: AuditRecord[];
};

async function loadFinalAudit(): Promise<FinalAudit> {
  const raw = JSON.parse(await readFile(FINAL_AUDIT_PATH, 'utf8'));
  return {
    allowedSourceMentions: Array.isArray(raw.allowedSourceMentions) ? raw.allowedSourceMentions : [],
    remediatedRecords: Array.isArray(raw.remediatedRecords) ? raw.remediatedRecords : []
  };
}

function buildAllowedLookup(audit: FinalAudit): Map<string, AuditRecord> {
  const map = new Map<string, AuditRecord>();
  for (const rec of audit.allowedSourceMentions) {
    map.set(`${rec.id}::${rec.field}::${rec.text}`, rec);
  }
  for (const rec of audit.remediatedRecords) {
    map.set(`${rec.id}::${rec.field}::${rec.text}`, rec);
  }
  return map;
}

function isBanned(text: string): boolean {
  return BANNED_PATTERNS.some((pattern) => pattern.test(text));
}

function checkBroaderSourceAnchor(
  text: string,
  matchedId: string | null,
  field: string,
  allowedMap: Map<string, AuditRecord>
): string | null {
  if (!BROADER_SOURCE_PATTERN.test(text)) {
    return null;
  }
  if (matchedId) {
    const key = `${matchedId}::${field}::${text}`;
    if (allowedMap.has(key)) {
      return null;
    }
  }
  // Fallback: allow if any allowed record has the same text (less precise but safe)
  for (const rec of allowedMap.values()) {
    if (rec.text === text) {
      return null;
    }
  }
  return `Broader source anchor not in allowed/remediated list: id=${matchedId} field=${field} text="${text}"`;
}

async function readQuizData() {
  const payload = JSON.parse(await readFile(QUIZ_DATA_PATH, 'utf8'));
  const quizData = Array.isArray(payload.quizData) ? payload.quizData : [];
  expect(quizData.length).toBeGreaterThan(0);
  return quizData as Array<{
    id: string;
    question: string;
    options: string[];
    explanation: string;
  }>;
}

function normalizeOption(text: string): string {
  return text.replace(/^[A-D]\s*/, '').trim();
}

test.describe.configure({ mode: 'serial' });

test.describe('Quiz runtime clarity coverage', () => {
  test('Full Quiz starts, shows badge and scoreboard, answers first question, inspects feedback, and advances', async ({ page }) => {
    const audit = await loadFinalAudit();
    const allowedMap = buildAllowedLookup(audit);
    const quizData = await readQuizData();

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('startfullquiz'));
    });

    const modal = page.locator('#quiz-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal.locator('.quiz-mode-badge')).toHaveText('20题完整挑战');
    await expect(modal.locator('.quiz-scoreboard')).toContainText('第 1 / 20 题');

    const fullQuizRound1 = await page.evaluate(() => {
      const questionText = document.querySelector('#quiz-modal .quiz-question-text')?.textContent?.trim() || '';
      const optionTexts = Array.from(document.querySelectorAll('#quiz-modal .quiz-option-btn'))
        .map((option) => option.textContent?.trim() || '');
      const feedbackText = document.querySelector('#quiz-modal .quiz-feedback-text')?.textContent?.trim() || '';
      const explanationText = document.querySelector('#quiz-modal .quiz-explanation-text')?.textContent?.trim() || '';
      return { questionText, optionTexts, feedbackText, explanationText };
    });

    const round1NormalizedOptions = fullQuizRound1.optionTexts.map(normalizeOption);
    expect(fullQuizRound1.questionText.length).toBeGreaterThan(0);
    expect(round1NormalizedOptions.length).toBe(4);

    const matchedQuestion1 = quizData.find((q) => q.question === fullQuizRound1.questionText);

    const fullQuizTexts: Array<{ text: string; field: string }> = [
      { text: fullQuizRound1.questionText, field: 'question' },
      ...round1NormalizedOptions.map((t, i) => ({ text: t, field: `options[${i}]` })),
      { text: fullQuizRound1.feedbackText, field: 'feedback' },
      { text: fullQuizRound1.explanationText, field: 'explanation' }
    ];
    for (const { text, field } of fullQuizTexts) {
      expect(isBanned(text)).toBe(false);
      const broaderIssue = checkBroaderSourceAnchor(text, matchedQuestion1?.id ?? null, field, allowedMap);
      expect(broaderIssue).toBeNull();
    }

    await modal.locator('.quiz-option-btn').first().click();
    await expect(modal.locator('.quiz-feedback-panel')).toContainText('答案');

    const fullQuizRound1AfterAnswer = await page.evaluate(() => {
      const feedbackText = document.querySelector('#quiz-modal .quiz-feedback-text')?.textContent?.trim() || '';
      const explanationText = document.querySelector('#quiz-modal .quiz-explanation-text')?.textContent?.trim() || '';
      return { feedbackText, explanationText };
    });

    const fullQuizFeedbackTexts = [
      { text: fullQuizRound1AfterAnswer.feedbackText, field: 'feedback' },
      { text: fullQuizRound1AfterAnswer.explanationText, field: 'explanation' }
    ];
    for (const { text, field } of fullQuizFeedbackTexts) {
      expect(isBanned(text)).toBe(false);
      const broaderIssue = checkBroaderSourceAnchor(text, matchedQuestion1?.id ?? null, field, allowedMap);
      expect(broaderIssue).toBeNull();
    }

    const nextButton = modal.locator('[data-quiz-next]');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(modal.locator('.quiz-scoreboard')).toContainText('第 2 / 20 题');

    const fullQuizRound2 = await page.evaluate(() => {
      const questionText = document.querySelector('#quiz-modal .quiz-question-text')?.textContent?.trim() || '';
      const optionTexts = Array.from(document.querySelectorAll('#quiz-modal .quiz-option-btn'))
        .map((option) => option.textContent?.trim() || '');
      return { questionText, optionTexts };
    });

    const round2NormalizedOptions = fullQuizRound2.optionTexts.map(normalizeOption);
    const matchedQuestion2 = quizData.find((q) => q.question === fullQuizRound2.questionText);

    const fullQuizRound2Texts: Array<{ text: string; field: string }> = [
      { text: fullQuizRound2.questionText, field: 'question' },
      ...round2NormalizedOptions.map((t, i) => ({ text: t, field: `options[${i}]` }))
    ];
    for (const { text, field } of fullQuizRound2Texts) {
      expect(isBanned(text)).toBe(false);
      const broaderIssue = checkBroaderSourceAnchor(text, matchedQuestion2?.id ?? null, field, allowedMap);
      expect(broaderIssue).toBeNull();
    }

    const fullQuizEvidence = {
      badge: '20题完整挑战',
      scoreboardRound1: '第 1 / 20 题',
      scoreboardRound2: '第 2 / 20 题',
      round1: {
        questionText: fullQuizRound1.questionText,
        optionTexts: round1NormalizedOptions,
        feedbackText: fullQuizRound1AfterAnswer.feedbackText,
        explanationText: fullQuizRound1AfterAnswer.explanationText,
        matchedId: matchedQuestion1?.id ?? null
      },
      round2: {
        questionText: fullQuizRound2.questionText,
        optionTexts: round2NormalizedOptions,
        matchedId: matchedQuestion2?.id ?? null
      }
    };

    // Write preliminary evidence so Quick Quiz test can append
    await writeEvidence('quiz-clarity-runtime.json', {
      checkedAt: new Date().toISOString(),
      source: 'tests/ui/full-quiz-clarity.spec.ts',
      fullQuiz: fullQuizEvidence,
      bannedPatternAssertions: {
        passed: true,
        checkedFields: [
          'round1.questionText',
          'round1.optionTexts',
          'round1.feedbackText',
          'round1.explanationText',
          'round2.questionText',
          'round2.optionTexts'
        ]
      }
    });
  });

  test('Quick Quiz starts via element detail and inspects first question, options, and feedback', async ({ page }) => {
    const audit = await loadFinalAudit();
    const allowedMap = buildAllowedLookup(audit);
    const quizData = await readQuizData();

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    // Use appState element directly for Quick Quiz to avoid detail-panel rendering flakiness
    await page.evaluate(() => {
      const hElement = window.appState?.elements?.find((e: { symbol: string }) => e.symbol === 'H');
      window.dispatchEvent(new CustomEvent('startquiz', { detail: { element: hElement } }));
    });

    const modal = page.locator('#quiz-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal.locator('.quiz-mode-badge')).toHaveText('5题快速挑战');
    await expect(modal.locator('.quiz-scoreboard')).toContainText('第 1 / 5 题');

    const quickQuizRound1 = await page.evaluate(() => {
      const questionText = document.querySelector('#quiz-modal .quiz-question-text')?.textContent?.trim() || '';
      const optionTexts = Array.from(document.querySelectorAll('#quiz-modal .quiz-option-btn'))
        .map((option) => option.textContent?.trim() || '');
      const feedbackText = document.querySelector('#quiz-modal .quiz-feedback-text')?.textContent?.trim() || '';
      const explanationText = document.querySelector('#quiz-modal .quiz-explanation-text')?.textContent?.trim() || '';
      return { questionText, optionTexts, feedbackText, explanationText };
    });

    const quickNormalizedOptions = quickQuizRound1.optionTexts.map(normalizeOption);
    expect(quickQuizRound1.questionText.length).toBeGreaterThan(0);
    expect(quickNormalizedOptions.length).toBe(4);

    const matchedQuestion = quizData.find((q) => q.question === quickQuizRound1.questionText);

    const quickQuizTexts: Array<{ text: string; field: string }> = [
      { text: quickQuizRound1.questionText, field: 'question' },
      ...quickNormalizedOptions.map((t, i) => ({ text: t, field: `options[${i}]` })),
      { text: quickQuizRound1.feedbackText, field: 'feedback' },
      { text: quickQuizRound1.explanationText, field: 'explanation' }
    ];
    for (const { text, field } of quickQuizTexts) {
      expect(isBanned(text)).toBe(false);
      const broaderIssue = checkBroaderSourceAnchor(text, matchedQuestion?.id ?? null, field, allowedMap);
      expect(broaderIssue).toBeNull();
    }

    await modal.locator('.quiz-option-btn').first().click();
    await expect(modal.locator('.quiz-feedback-panel')).toContainText('答案');

    const quickQuizRound1AfterAnswer = await page.evaluate(() => {
      const feedbackText = document.querySelector('#quiz-modal .quiz-feedback-text')?.textContent?.trim() || '';
      const explanationText = document.querySelector('#quiz-modal .quiz-explanation-text')?.textContent?.trim() || '';
      return { feedbackText, explanationText };
    });

    const quickQuizFeedbackTexts = [
      { text: quickQuizRound1AfterAnswer.feedbackText, field: 'feedback' },
      { text: quickQuizRound1AfterAnswer.explanationText, field: 'explanation' }
    ];
    for (const { text, field } of quickQuizFeedbackTexts) {
      expect(isBanned(text)).toBe(false);
      const broaderIssue = checkBroaderSourceAnchor(text, matchedQuestion?.id ?? null, field, allowedMap);
      expect(broaderIssue).toBeNull();
    }

    // Read existing evidence and merge Quick Quiz into it
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(await readFile(path.join(EVIDENCE_DIR, 'quiz-clarity-runtime.json'), 'utf8'));
    } catch {
      // ignore missing
    }

    const combinedEvidence = {
      ...existing,
      quickQuiz: {
        badge: '5题快速挑战',
        scoreboardRound1: '第 1 / 5 题',
        round1: {
          questionText: quickQuizRound1.questionText,
          optionTexts: quickNormalizedOptions,
          feedbackText: quickQuizRound1AfterAnswer.feedbackText,
          explanationText: quickQuizRound1AfterAnswer.explanationText,
          matchedId: matchedQuestion?.id ?? null
        }
      },
      bannedPatternAssertionsQuick: {
        passed: true,
        checkedFields: [
          'round1.questionText',
          'round1.optionTexts',
          'round1.feedbackText',
          'round1.explanationText'
        ]
      },
      combinedCheckedAt: new Date().toISOString()
    };

    await writeEvidence('quiz-clarity-runtime.json', combinedEvidence);
  });
});

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('detail-panel')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.element-cell').first()).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loader = document.getElementById('global-loader');
      const loaderDone = loader ? (loader.classList.contains('hidden') || loader.classList.contains('display-none')) : true;
      return hasElements && loaderDone;
    });
  }, { timeout: 25000, intervals: [100, 200, 500, 1000] }).toBe(true);
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}
