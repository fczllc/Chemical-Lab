import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.CustomEvent ??= class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};

globalThis.document ??= {
  addEventListener() {},
  getElementById() { return null; }
};
globalThis.window ??= {
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  dispatchEvent() {},
  addEventListener() {},
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  innerWidth: 1024,
  removeEventListener() {}
};

const { initAchievements } = await import('../../src/modules/achievements.js');
const { __achievementsTestHooks, isAchievementUnlocked } = await import('../../src/modules/achievements.js');
const { initializeState, unlockAchievement, getUnlockedAchievements, markElementLearned, getAchievementDates } = await import('../../src/modules/storage.js');
const { achievementsData } = await import('../../src/data/index.js');

test('achievement-first-element should not be unlocked if conditions are not met, even if persisted', () => {
  const { matchesCondition } = __achievementsTestHooks;
  const achievement = achievementsData.find((a) => a.id === 'achievement-first-element');
  
  initializeState();
  
  // 1. Manually unlock it to simulate stale persist
  unlockAchievement('achievement-first-element');
  
  // Need to manually trigger evaluation since state changed
  initAchievements();
  
  // 2. Set learned elements to 1
  markElementLearned(1);
  initAchievements();
  
  // 3. Current state: achievement should be automatically revoked
  const unlockedIds = getUnlockedAchievements();
  const achievementDates = getAchievementDates();
  
  assert.equal(unlockedIds.has('achievement-first-element'), false, 'Stale unlock should be removed');
  assert.equal(achievementDates['achievement-first-element'], undefined, 'Stale unlock date should be removed');
  
  // 4. Test re-unlock after reaching threshold
  for (let i = 2; i <= 24; i++) {
    markElementLearned(i);
  }
  initAchievements();
  
  const unlockedIdsAfter = getUnlockedAchievements();
  const achievementDatesAfter = getAchievementDates();
  
  assert.equal(unlockedIdsAfter.has('achievement-first-element'), true, 'Should be unlocked after reaching threshold');
  assert.notEqual(achievementDatesAfter['achievement-first-element'], undefined, 'Should have a new unlock date');
  assert.notEqual(achievementDatesAfter['achievement-first-element'], '2026-05-29T01:41:00.000Z', 'Should have a fresh date');
});


