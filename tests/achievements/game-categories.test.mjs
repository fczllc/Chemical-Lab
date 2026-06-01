import assert from 'node:assert/strict';
import test from 'node:test';

const storageMemory = new Map();

// Mock browser environment
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

const { achievementsData } = await import('../../src/data/index.js');
const { __achievementsTestHooks } = await import('../../src/modules/achievements.js');
const { updateGameScore, loadProgress } = await import('../../src/modules/storage.js');

function resetState() {
  storageMemory.clear();
  loadProgress([]);
}

const GAME_CONTRACT = [
  {
    category: 'game-drag',
    gameKey: 'game-drag',
    ids: [
      'achievement-drag-novice',
      'achievement-drag-practiced',
      'achievement-drag-expert',
      'achievement-drag-adept',
      'achievement-drag-master'
    ],
    titles: ['归位初试', '归位熟练手', '归位小高手', '归位达人', '归位大师'],
    counts: [1, 3, 7, 15, 30]
  },
  {
    category: 'game-memory',
    gameKey: 'game-memory',
    ids: [
      'achievement-memory-novice',
      'achievement-memory-practiced',
      'achievement-memory-expert',
      'achievement-memory-adept',
      'achievement-memory-master'
    ],
    titles: ['翻牌初试', '翻牌熟练手', '翻牌小高手', '翻牌达人', '翻牌大师'],
    counts: [1, 3, 7, 15, 30]
  },
  {
    category: 'game-reaction',
    gameKey: 'game-reaction',
    ids: [
      'achievement-reaction-novice',
      'achievement-reaction-practiced',
      'achievement-reaction-expert',
      'achievement-reaction-adept',
      'achievement-reaction-master'
    ],
    titles: ['配对初试', '配对熟练手', '配对小高手', '配对达人', '配对大师'],
    counts: [1, 3, 7, 15, 30]
  }
];

test('game-specific achievement data structure', () => {
  const genericGames = achievementsData.filter(a => a.category === 'game');
  assert.equal(genericGames.length, 0, 'No achievements should use generic category "game"');

  for (const contract of GAME_CONTRACT) {
    const categoryAchievements = achievementsData.filter(a => a.category === contract.category);
    assert.equal(categoryAchievements.length, 5, `Category ${contract.category} should have exactly 5 achievements`);

    for (let i = 0; i < 5; i++) {
      const achievement = categoryAchievements.find(a => a.id === contract.ids[i]);
      assert.ok(achievement, `Missing achievement ${contract.ids[i]}`);
      assert.equal(achievement.title, contract.titles[i]);
      assert.equal(achievement.condition?.type, 'gamePlays');
      assert.equal(achievement.condition?.count, contract.counts[i]);
      assert.equal(achievement.condition?.gameKey, contract.gameKey);
    }
  }
});

test('game-specific play counts isolation', () => {
  resetState();

  // Unlock drag 1 and 3
  updateGameScore('game-drag', 1);
  updateGameScore('game-drag', 1);
  updateGameScore('game-drag', 1);

  // Assert drag unlocks
  for (const id of ['achievement-drag-novice', 'achievement-drag-practiced']) {
    const ach = achievementsData.find(a => a.id === id);
    assert.equal(__achievementsTestHooks.matchesCondition(ach), true, `${id} should unlock`);
  }

  // Assert drag NOT unlocks (7, 15, 30)
  for (const id of ['achievement-drag-expert', 'achievement-drag-adept', 'achievement-drag-master']) {
    const ach = achievementsData.find(a => a.id === id);
    assert.equal(__achievementsTestHooks.matchesCondition(ach), false, `${id} should NOT unlock`);
  }

  // Assert all memory/reaction NOT unlocks
  for (const contract of GAME_CONTRACT.filter(c => c.category !== 'game-drag')) {
    for (const id of contract.ids) {
      const ach = achievementsData.find(a => a.id === id);
      assert.equal(__achievementsTestHooks.matchesCondition(ach), false, `${id} should NOT unlock`);
    }
  }
});
