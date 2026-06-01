import assert from 'node:assert/strict';
import test from 'node:test';

const storageMemory = new Map();

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

globalThis.document = {
  addEventListener() {},
  hidden: false
};

globalThis.window = {
  addEventListener() {},
  dispatchEvent() {},
  clearTimeout() {},
  setTimeout(callback) {
    callback();
    return 0;
  },
  localStorage: {
    getItem(key) {
      return storageMemory.has(key) ? storageMemory.get(key) : null;
    },
    setItem(key, value) {
      storageMemory.set(key, String(value));
    },
    removeItem(key) {
      storageMemory.delete(key);
    },
    clear() {
      storageMemory.clear();
    }
  }
};

const { achievementsData, quizData } = await import('../../src/data/index.js');
const { __achievementsTestHooks } = await import('../../src/modules/achievements.js');
const { addQuizScore, loadProgress } = await import('../../src/modules/storage.js');

function getQuizAchievements() {
  return achievementsData.filter((achievement) => achievement.category === 'quiz');
}

function resetState() {
  storageMemory.clear();
  loadProgress([]);
}

test('quiz achievement data exposes exactly five cumulative-correct tiers', () => {
  const quizAchievements = getQuizAchievements();

  assert.deepEqual(
    quizAchievements.map((achievement) => achievement.id),
    [
      'achievement-first-quiz',
      'achievement-quiz-star',
      'achievement-quiz-explorer',
      'achievement-quiz-doctor',
      'achievement-perfect-quiz'
    ]
  );
  assert.deepEqual(
    quizAchievements.map((achievement) => achievement.title),
    ['求知者', '答题小星星', '知识探险家', '智慧小博士', '满分学霸']
  );
  assert.ok(achievementsData.some((achievement) => achievement.id === 'achievement-carbon-allotrope-comparison'));
  assert.ok(quizAchievements.every((achievement) => achievement.condition?.type === 'quizCorrectAnswers'));
});

test('quiz achievement thresholds are derived from the supplied quiz total', () => {
  assert.deepEqual(__achievementsTestHooks.getQuizAchievementThresholds(20), [1, 5, 10, 15, 20]);
  assert.deepEqual(__achievementsTestHooks.getQuizAchievementThresholds(11), [1, 3, 6, 9, 11]);

  const currentThresholds = __achievementsTestHooks.getQuizAchievementThresholds();
  assert.equal(currentThresholds.at(-1), quizData.length);
  assert.ok(currentThresholds.every((threshold, index) => index === 0 || threshold > currentThresholds[index - 1]));
});

test('quiz achievement visible text uses dynamic thresholds', () => {
  const quizAchievements = getQuizAchievements();
  const thresholds = __achievementsTestHooks.getQuizAchievementThresholds();
  const middleAchievement = quizAchievements[2];
  const finalAchievement = quizAchievements.at(-1);

  assert.match(
    __achievementsTestHooks.getEffectiveAchievementDescription(middleAchievement),
    new RegExp(`累计答对 ${thresholds[2]} 道测验题`)
  );
  assert.equal(
    __achievementsTestHooks.getAchievementUnlockText(middleAchievement),
    `累计答对 ${thresholds[2]} 道测验题`
  );
  assert.match(
    __achievementsTestHooks.getEffectiveAchievementDescription(finalAchievement),
    new RegExp(`累计答对全部 ${quizData.length} 道测验题`)
  );
  assert.equal(
    __achievementsTestHooks.getAchievementUnlockText(finalAchievement),
    `累计答对全部 ${quizData.length} 道测验题`
  );
});

test('quiz achievements unlock from cumulative correct answers, not attempts or one short perfect run', () => {
  const quizAchievements = getQuizAchievements();
  const finalAchievement = quizAchievements.at(-1);
  const finalThreshold = __achievementsTestHooks.getEffectiveAchievementConditionCount(finalAchievement);

  assert.ok(finalThreshold > 20, 'fixture expects the full quiz bank to exceed one 20-question run');

  resetState();
  addQuizScore({ score: 20, total: 20, correctCount: 20, percentage: 100 });
  assert.equal(__achievementsTestHooks.matchesCondition(finalAchievement), false);

  addQuizScore({ score: finalThreshold - 20, total: finalThreshold, correctCount: finalThreshold - 20 });
  assert.equal(__achievementsTestHooks.matchesCondition(finalAchievement), true);
});

test('quiz correct-answer totals prefer correctCount and fall back to score', () => {
  resetState();
  addQuizScore({ score: 2, total: 5, correctCount: 4 });
  addQuizScore({ score: 3, total: 5 });

  assert.equal(__achievementsTestHooks.getTotalCorrectQuizAnswers(), 7);
});
