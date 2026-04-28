/** ===== 成就模块 ===== */
import { achievementsData } from '../data/achievementsData.js';
import {
  getAchievementDates,
  getCompletedExperiments,
  getGamePlayCounts,
  getGameScores,
  getLearnedElements,
  getQuizScores,
  getUnlockedAchievements,
  unlockAchievement
} from './storage.js';

const CATEGORY_META = {
  learning: { label: '学习类', icon: '📚' },
  experiment: { label: '实验类', icon: '🧪' },
  game: { label: '游戏类', icon: '🎮' },
  quiz: { label: '测验类', icon: '📝' }
};

let isBound = false;

export function initAchievements() {
  renderAchievements();
  evaluateAchievements();

  if (isBound) {
    return;
  }

  window.addEventListener('statechange', handleStateChange);
  window.addEventListener('achievementunlocked', handleAchievementUnlocked);
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

function handleAchievementUnlocked(event) {
  const achievementId = event.detail?.achievementId;
  const achievement = achievementsData.find((item) => item.id === achievementId);
  if (!achievement) {
    return;
  }

  showAchievementPopup(achievement);
  renderAchievements();
}

function evaluateAchievements() {
  achievementsData.forEach((achievement) => {
    if (matchesCondition(achievement.condition)) {
      unlockAchievement(achievement.id);
    }
  });
}

function matchesCondition(condition) {
  if (!condition || typeof condition !== 'object') {
    return false;
  }

  if (condition.type === 'learnedElements') {
    return getLearnedElements().size >= Number(condition.count || 0);
  }

  if (condition.type === 'completedExperiments') {
    return getCompletedExperiments().size >= Number(condition.count || 0);
  }

  if (condition.type === 'quizAttempts') {
    return getQuizScores().length >= Number(condition.count || 0);
  }

  if (condition.type === 'quizPerfectScore') {
    return getQuizScores().some((score) => {
      const total = Number(score.total || 0);
      const value = Number(score.score || 0);
      return total > 0 && value >= total;
    });
  }

  if (condition.type === 'gamePlays') {
    const playCounts = Object.values(getGamePlayCounts());
    const totalPlays = playCounts.reduce((sum, value) => sum + Number(value || 0), 0);
    return totalPlays >= Number(condition.count || 0);
  }

  if (condition.type === 'gameScore') {
    return Number(getGameScores(condition.gameKey) || 0) >= Number(condition.count || 0);
  }

  return false;
}

function renderAchievements() {
  const container = document.getElementById('achievements-grid');
  if (!container) {
    return;
  }

  const unlockedIds = getUnlockedAchievements();
  const unlockDates = getAchievementDates();
  const completionPercent = achievementsData.length
    ? Math.round((unlockedIds.size / achievementsData.length) * 100)
    : 0;
  const grouped = groupAchievementsByCategory();

  container.innerHTML = `
    <section class="achievement-overview hud-shell">
      <div class="achievement-overview-copy">
        <p class="hud-kicker">ACHIEVEMENT ARCHIVE</p>
        <h3>成长成就中心</h3>
        <p>这里会自动追踪你的学习、实验、游戏和测验表现，并在达成目标时即时点亮徽章。</p>
      </div>
      <div class="achievement-overview-stats">
        <article class="achievement-stat-card"><span>总成就数</span><strong>${achievementsData.length}</strong></article>
        <article class="achievement-stat-card"><span>已解锁</span><strong>${unlockedIds.size}</strong></article>
        <article class="achievement-stat-card"><span>完成率</span><strong>${completionPercent}%</strong></article>
      </div>
      <div class="progress-bar-track achievement-overview-bar">
        <span class="progress-bar-fill" style="width:${completionPercent}%"></span>
      </div>
    </section>
    ${Object.entries(grouped).map(([category, achievements]) => renderCategorySection(category, achievements, unlockedIds, unlockDates)).join('')}
  `;
}

function renderCategorySection(category, achievements, unlockedIds, unlockDates) {
  const meta = CATEGORY_META[category] || { label: category, icon: '🏅' };
  const unlockedCount = achievements.filter((achievement) => unlockedIds.has(achievement.id)).length;

  return `
    <section class="achievement-category-block hud-shell">
      <div class="achievement-category-header">
        <div>
          <p class="hud-kicker">${meta.icon} ${meta.label}</p>
          <h3>${meta.label}</h3>
        </div>
        <strong>${unlockedCount}/${achievements.length}</strong>
      </div>
      <div class="achievement-category-grid">
        ${achievements.map((achievement) => renderAchievementCard(achievement, unlockedIds, unlockDates)).join('')}
      </div>
    </section>
  `;
}

function renderAchievementCard(achievement, unlockedIds, unlockDates) {
  const unlocked = unlockedIds.has(achievement.id);
  const unlockDate = unlockDates[achievement.id];

  return `
    <article class="achievement-card ${unlocked ? 'is-unlocked' : 'is-locked'}" data-rarity="${achievement.rarity}">
      <div class="achievement-card-top">
        <span class="achievement-icon">${achievement.icon || '🏅'}</span>
        <span class="achievement-rarity">${formatRarity(achievement.rarity)}</span>
      </div>
      <div class="achievement-card-body">
        <h4>${achievement.title}</h4>
        <p>${achievement.description}</p>
      </div>
      <dl class="achievement-meta-list">
        <div><dt>解锁条件</dt><dd>${achievement.unlockText}</dd></div>
        <div><dt>状态</dt><dd>${unlocked ? '已解锁' : '未解锁'}</dd></div>
        <div><dt>解锁日期</dt><dd>${unlocked ? formatDate(unlockDate) : '等待达成'}</dd></div>
      </dl>
    </article>
  `;
}

function groupAchievementsByCategory() {
  return achievementsData.reduce((groups, achievement) => {
    const category = achievement.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(achievement);
    return groups;
  }, {});
}

function formatRarity(rarity) {
  const rarityLabels = {
    common: '普通',
    rare: '稀有',
    legendary: '传说'
  };

  return rarityLabels[rarity] || rarity || '普通';
}

function formatDate(value) {
  if (!value) {
    return '等待达成';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚解锁';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function showAchievementPopup(achievement) {
  const popup = document.getElementById('achievement-popup');
  if (!popup) {
    return;
  }

  popup.querySelector('.popup-icon').textContent = achievement.icon || '🏅';
  popup.querySelector('.popup-title').textContent = achievement.title;
  popup.querySelector('.popup-desc').textContent = `${achievement.description} · ${achievement.unlockText}`;
  popup.classList.remove('show');
  void popup.offsetWidth;
  popup.classList.add('show');

  window.clearTimeout(showAchievementPopup.hideTimer);
  showAchievementPopup.hideTimer = window.setTimeout(() => {
    popup.classList.remove('show');
  }, 3200);
}
