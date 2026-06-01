import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.CustomEvent ??= class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};

globalThis.window ??= {
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  dispatchEvent() {}
};

const { achievementsData, labExperiments } = await import('../../src/data/index.js');
const { __achievementsTestHooks } = await import('../../src/modules/achievements.js');
const { markExperimentCompleted } = await import('../../src/modules/storage.js');

const EXPERIMENT_ACHIEVEMENT_IDS = [
  'achievement-first-experiment',
  'achievement-lab-safety',
  'achievement-experiment-assistant',
  'achievement-experiment-researcher',
  'achievement-experiment-master'
];

function getExperimentAchievements() {
  return EXPERIMENT_ACHIEVEMENT_IDS.map((id) => achievementsData.find((achievement) => achievement.id === id));
}

test('experiment achievement thresholds are derived from lab total progress tiers', () => {
  const { getExperimentAchievementThresholds } = __achievementsTestHooks;

  assert.deepEqual(getExperimentAchievementThresholds(12), [1, 3, 6, 9, 12]);
  assert.deepEqual(getExperimentAchievementThresholds(40), [1, 10, 20, 30, 40]);
  assert.notDeepEqual(getExperimentAchievementThresholds(40), getExperimentAchievementThresholds(12));
});

test('experiment achievement card copy uses effective dynamic thresholds', () => {
  const { getEffectiveAchievementConditionCount, getEffectiveAchievementDescription, getAchievementUnlockText } = __achievementsTestHooks;
  const experimentAchievements = getExperimentAchievements();
  const thresholds = __achievementsTestHooks.getExperimentAchievementThresholds(labExperiments.length);

  assert.equal(experimentAchievements.length, 5);
  assert.deepEqual(experimentAchievements.map((achievement) => achievement.id), EXPERIMENT_ACHIEVEMENT_IDS);
  assert.deepEqual(experimentAchievements.map(getEffectiveAchievementConditionCount), thresholds);

  const unlockTexts = experimentAchievements.map(getAchievementUnlockText);
  assert.deepEqual(unlockTexts, [
    `完成 ${thresholds[0]} 个实验`,
    `完成 ${thresholds[1]} 个实验`,
    `完成 ${thresholds[2]} 个实验`,
    `完成 ${thresholds[3]} 个实验`,
    `完成全部 ${labExperiments.length} 个实验`
  ]);
  assert.equal(getEffectiveAchievementDescription(experimentAchievements.at(-1)), `完成全部 ${labExperiments.length} 个实验，建立完整的实验探索记录。`);
});

test('completed experiment achievement conditions use dynamic thresholds', () => {
  const { getEffectiveAchievementConditionCount, matchesCondition } = __achievementsTestHooks;
  const researcherAchievement = achievementsData.find((achievement) => achievement.id === 'achievement-experiment-researcher');
  const researcherThreshold = getEffectiveAchievementConditionCount(researcherAchievement);

  assert.ok(researcherThreshold > researcherAchievement.condition.count);

  for (let index = 1; index < researcherThreshold; index += 1) {
    markExperimentCompleted(`dynamic-threshold-fixture-${index}`);
  }

  assert.equal(matchesCondition(researcherAchievement), false);

  markExperimentCompleted(`dynamic-threshold-fixture-${researcherThreshold}`);

  assert.equal(matchesCondition(researcherAchievement), true);
});
