import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus', 'evidence');
const TASK_6_QUIZ_IDS_PATH = path.join(EVIDENCE_DIR, 'task-6-added-quiz-ids.json');
const QUIZ_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'quizData.json');

test.describe('Full Quiz textbook-derived content', () => {
  test('deterministically renders a Task 6 textbook-derived question and progresses after one answer', async ({ page }) => {
    const task6QuizIds = await readTask6QuizIds();
    const quizData = await readQuizData();
    const targetQuestionIndex = findLastTask6QuestionIndex(quizData, task6QuizIds);
    await forceFirstQuizShufflePick(page, targetQuestionIndex);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
    await page.evaluate((quizCount) => {
      const controlledWindow = window as Window & {
        __forceNextFullQuizShuffle?: boolean;
        __forcedFullQuizShuffleLength?: number;
      };
      controlledWindow.__forcedFullQuizShuffleLength = quizCount;
      controlledWindow.__forceNextFullQuizShuffle = true;
    }, quizData.length);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('startfullquiz'));
    });

    const modal = page.locator('#quiz-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal.locator('.quiz-mode-badge')).toHaveText('20题完整挑战');
    await expect(modal.locator('.quiz-scoreboard')).toContainText('第 1 / 20 题');

    const renderedDom = await page.evaluate(() => {
      const questionText = document.querySelector('#quiz-modal .quiz-question-text')?.textContent?.trim() || '';
      const optionTexts = Array.from(document.querySelectorAll('#quiz-modal .quiz-option-btn'))
        .map((option) => option.textContent?.replace(/^[A-D]/, '').trim() || '');
      return { questionText, optionTexts };
    });
    const matchedQuestion = quizData.find((question) => task6QuizIds.includes(question.id) && question.question === renderedDom.questionText);
    const renderedQuestion = matchedQuestion ? {
      id: matchedQuestion.id,
      question: matchedQuestion.question,
      sourceVolumeId: matchedQuestion.sourceVolumeId,
      sourceReviewStatus: matchedQuestion.sourceReviewStatus,
      generationSource: matchedQuestion.generationSource,
      optionTexts: renderedDom.optionTexts,
      sourceReferenceCount: Array.isArray(matchedQuestion.sourceReferences) ? matchedQuestion.sourceReferences.length : 0
    } : null;

    expect(renderedQuestion).not.toBeNull();
    expect(task6QuizIds).toContain(renderedQuestion!.id);
    expect(renderedQuestion!.sourceReviewStatus).toBe('reviewed');
    expect(renderedQuestion!.sourceReferenceCount).toBeGreaterThan(0);
    expect(renderedQuestion!.optionTexts.length).toBe(4);

    await modal.locator('.quiz-option-btn').first().click();
    await expect(modal.locator('.quiz-feedback-panel')).toContainText('答案');
    const nextButton = modal.locator('[data-quiz-next]');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(modal.locator('.quiz-scoreboard')).toContainText('第 2 / 20 题');

    await writeEvidence('task-9-full-quiz-textbook-runtime.json', {
      checkedAt: new Date().toISOString(),
      source: 'tests/ui/full-quiz-textbook-content.spec.ts',
      deterministicShuffle: {
        firstSwapIndex: targetQuestionIndex,
        quizDataLength: quizData.length,
        purpose: 'Place a Task 6 quizData entry into the first full-quiz slot before app shuffle completes.'
      },
      task6QuizIdCount: task6QuizIds.length,
      renderedQuestion,
      progression: {
        answeredFirstQuestion: true,
        nextButtonEnabled: true,
        advancedToQuestionText: '第 2 / 20 题'
      }
    });
  });
});

async function forceFirstQuizShufflePick(page: Page, firstSwapIndex: number) {
  await page.addInitScript((targetIndex) => {
    const originalRandom = Math.random.bind(Math);
    let remainingForcedValues = 0;
    const controlledWindow = window as Window & {
      __forceNextFullQuizShuffle?: boolean;
      __forcedFullQuizShuffleLength?: number;
    };

    Object.defineProperty(Math, 'random', {
      configurable: true,
      writable: true,
      value: () => {
        if (controlledWindow.__forceNextFullQuizShuffle) {
          controlledWindow.__forceNextFullQuizShuffle = false;
          remainingForcedValues = Number(controlledWindow.__forcedFullQuizShuffleLength || 0);
        }

        if (remainingForcedValues > 0) {
          const currentIndex = remainingForcedValues - 1;
          remainingForcedValues -= 1;
          if (currentIndex === Number(targetIndex)) {
            return 0;
          }
          return (currentIndex + 0.01) / (currentIndex + 1);
        }

        return originalRandom();
      }
    });
  }, firstSwapIndex);
}

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('detail-panel')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.element-cell').first()).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 20000, intervals: [100, 200, 500, 1000] }).toBe(true);
}

async function readTask6QuizIds() {
  const payload = JSON.parse(await readFile(TASK_6_QUIZ_IDS_PATH, 'utf8'));
  const quizIds = Array.isArray(payload.quizIds) ? payload.quizIds : [];
  expect(quizIds.length).toBeGreaterThan(0);
  return quizIds;
}

async function readQuizData() {
  const payload = JSON.parse(await readFile(QUIZ_DATA_PATH, 'utf8'));
  const quizData = Array.isArray(payload.quizData) ? payload.quizData : [];
  expect(quizData.length).toBeGreaterThan(0);
  return quizData;
}

function findLastTask6QuestionIndex(quizData: Array<{ id: string }>, task6QuizIds: string[]) {
  for (let index = quizData.length - 1; index >= 0; index -= 1) {
    if (task6QuizIds.includes(quizData[index].id)) {
      return index;
    }
  }

  throw new Error('Could not find a Task 6 quiz ID in quizData.json.');
}

async function writeEvidence(fileName: string, payload: unknown) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}
