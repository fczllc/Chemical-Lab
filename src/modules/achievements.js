/** ===== 成就模块 ===== */
import { achievementsData } from '../data/achievementsData.js';
import {
  getCollectedElements,
  getCompletedExperiments,
  getGameScores,
  getLearnedElements,
  getQuizScores,
  getUnlockedAchievements,
  unlockAchievement
} from './storage.js';

let isBound = false;

export function initAchievements() {
  renderAchievements();
  evaluateAchievements();

  if (isBound) {
    return;
  }

  window.addEventListener('statechange', handleStateChange);
  window.addEventListener('statereset', () => {
    renderAchievements();
    evaluateAchievements();
  });
  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'achievements') {
      renderAchievements();
    }
  });

  isBound = true;
}

function handleStateChange() {
  evaluateAchievements();
  renderAchievements();
}

function evaluateAchievements() {
  achievementsData.forEach((achievement) => {
    if (matchesCondition(achievement.condition)) {
      const unlocked = unlockAchievement(achievement.id);
      if (unlocked) {
        showAchievementPopup(achievement);
      }
    }
  });
}

function matchesCondition(condition) {
  if (typeof condition !== 'string') {
    return false;
  }

  if (condition.startsWith('learnedElements >=')) {
    return getLearnedElements().size >= getThreshold(condition);
  }

  if (condition.startsWith('collectedElements >=')) {
    return getCollectedElements().size >= getThreshold(condition);
  }

  if (condition.startsWith('completedExperiments >=')) {
    return getCompletedExperiments().size >= getThreshold(condition);
  }

  if (condition.startsWith('quizScorePercentage >=')) {
    const threshold = getThreshold(condition);
    return getQuizScores().some((score) => Number(score.score) >= threshold);
  }

  if (condition.startsWith('gameCompleted:')) {
    const gameKey = condition.split(':')[1] || '';
    return Number(getGameScores(gameKey)) > 0;
  }

  if (condition.startsWith('gamePerfect:')) {
    const gameKey = condition.split(':')[1] || '';
    return Number(getGameScores(gameKey)) >= 100;
  }

  return false;
}

function getThreshold(condition) {
  const value = Number(condition.split('>=')[1]?.trim());
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function renderAchievements() {
  const container = document.getElementById('achievements-grid');
  if (!container) {
    return;
  }

  const unlockedIds = getUnlockedAchievements();
  container.innerHTML = achievementsData.map((achievement) => {
    const unlocked = unlockedIds.has(achievement.id);
    return `
      <article class="achievement-card ${unlocked ? 'is-unlocked' : 'is-locked'}" data-rarity="${achievement.rarity}">
        <div class="achievement-card-top">
          <span class="achievement-icon">${getAchievementIcon(achievement.icon)}</span>
          <span class="achievement-rarity">${formatRarity(achievement.rarity)}</span>
        </div>
        <h3>${achievement.title}</h3>
        <p>${achievement.description}</p>
        <div class="achievement-card-footer">
          <span>${unlocked ? '已解锁' : '未解锁'}</span>
          <span>${achievement.condition}</span>
        </div>
      </article>
    `;
  }).join('');
}

function getAchievementIcon(icon) {
  const iconMap = {
    spark: '✦',
    beaker: '⚗',
    orbit: '◎',
    cabinet: '▣',
    crown: '♛',
    flask: '🧪',
    shield: '🛡',
    medal: '🏅',
    cards: '🂠',
    bolt: '⚡'
  };

  return iconMap[icon] || '★';
}

function formatRarity(rarity) {
  const rarityLabels = {
    common: '普通',
    uncommon: '进阶',
    rare: '稀有',
    'very rare': '传奇'
  };

  return rarityLabels[rarity] || rarity;
}

function showAchievementPopup(achievement) {
  const popup = document.getElementById('achievement-popup');
  if (!popup) {
    return;
  }

  popup.querySelector('.popup-title').textContent = achievement.title;
  popup.querySelector('.popup-desc').textContent = achievement.description;
  popup.classList.add('show');

  window.clearTimeout(showAchievementPopup.hideTimer);
  showAchievementPopup.hideTimer = window.setTimeout(() => {
    popup.classList.remove('show');
  }, 2800);
}
