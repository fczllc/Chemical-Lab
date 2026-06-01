/** ===== 成就模块 ===== */
import achievementCatImage from '../images/cat-7.png';
import { achievementsData, labExperiments, quizData, textbookAssetManifest } from '../data/index.js';
import {
  getAchievementDates,
  getCompletedExperiments,
  getCompletedLearningSegments,
  getGamePlayCounts,
  getGameScores,
  getLearnedElements,
  getQuizScores,
  getUnlockedAchievements,
  unlockAchievement,
  revokeAchievement
} from './storage.js';

const ACHIEVEMENT_CATEGORY_META = {
  element: { label: '元素', icon: 'sparkles' },
  learning: { label: '学习', icon: 'book-open' },
  experiment: { label: '实验', icon: 'flask-conical' },
  quiz: { label: '测验', icon: 'clipboard-check' },
  'game-drag': { label: '元素归位', icon: 'gamepad-2' },
  'game-memory': { label: '记忆翻牌', icon: 'brain' },
  'game-reaction': { label: '反应配对', icon: 'zap' },
  progress: { label: '进度', icon: 'chart-column' },
  other: { label: '其他', icon: 'award' }
};

/** Map manifest volumeId to clean Chinese tab label (matches progress.js). */
const TEXTBOOK_TAB_LABELS = {
  'pep-chemistry-g8-2024-54-full': '八年级·全册',
  'pep-chemistry-g9-2024': '九年级·上册',
  'pep-chemistry-g9-2024-volume-2': '九年级·下册',
  'pep-chemistry-g10-required-1': '高一/10年级·必修第一册',
  'pep-chemistry-g10-required-2': '高一/10年级·必修第二册',
  'pep-chemistry-g11-selective-1': '高二/11年级·选择性必修一·反应原理',
  'pep-chemistry-g11-selective-2': '高二/11年级·选择性必修二·物质结构与性质',
  'pep-chemistry-g12-selective-3': '高三/12年级·有机基础'
};

/** Known textbook volumeIds in deterministic display order (matches manifest). */
const KNOWN_TEXTBOOK_ORDER = [
  'pep-chemistry-g8-2024-54-full',
  'pep-chemistry-g9-2024',
  'pep-chemistry-g9-2024-volume-2',
  'pep-chemistry-g10-required-1',
  'pep-chemistry-g10-required-2',
  'pep-chemistry-g11-selective-1',
  'pep-chemistry-g11-selective-2',
  'pep-chemistry-g12-selective-3'
];

/** Legacy achievement sourceVolumeIds map to manifest volumeIds. */
const LEGACY_TO_MANIFEST_VOLUME = {
  'rj-chemistry-grade8-54-2024-full': 'pep-chemistry-g8-2024-54-full',
  'rj-chemistry-grade9-2024-vol1': 'pep-chemistry-g9-2024',
  'rj-chemistry-grade9-2024-vol2': 'pep-chemistry-g9-2024-volume-2',
  'rj-chemistry-g12-selective-3-organic-2019': 'pep-chemistry-g12-selective-3'
};

const ACHIEVEMENT_RARITY_LABELS = {
  common: '常见',
  uncommon: '较少见',
  rare: '稀有',
  legendary: '传说'
};

const LUCIDE_ICONS = new Set([
  'book-open', 'flask-conical', 'clipboard-check', 'gamepad-2', 'chart-column', 'award',
  'sparkles', 'compass', 'folder-open', 'crown', 'shield', 'microscope', 'trophy', 'brain', 'zap', 'gem',
  'star', 'graduation-cap'
]);

const EXPERIMENT_ACHIEVEMENT_IDS = [
  'achievement-first-experiment',
  'achievement-lab-safety',
  'achievement-experiment-assistant',
  'achievement-experiment-researcher',
  'achievement-experiment-master'
];

const EXPERIMENT_ACHIEVEMENT_DESCRIPTION_SUFFIXES = {
  'achievement-first-experiment': '开始理解元素反应。',
  'achievement-lab-safety': '已经能安全、细致地记录实验现象。',
  'achievement-experiment-assistant': '能主动比较不同实验中的现象与规律。',
  'achievement-experiment-researcher': '已经能持续追踪实验问题并整理结论。',
  'achievement-experiment-master': '建立完整的实验探索记录。'
};

const QUIZ_ACHIEVEMENT_IDS = [
  'achievement-first-quiz',
  'achievement-quiz-star',
  'achievement-quiz-explorer',
  'achievement-quiz-doctor',
  'achievement-perfect-quiz'
];

const QUIZ_ACHIEVEMENT_DESCRIPTION_SUFFIXES = {
  'achievement-first-quiz': '开始用答题巩固自己的知识。',
  'achievement-quiz-star': '每答对一题都像点亮一颗知识星星。',
  'achievement-quiz-explorer': '已经能勇敢探索更多化学问题。',
  'achievement-quiz-doctor': '能把学到的知识灵活用在测验里。',
  'achievement-perfect-quiz': '完成完整的测验挑战。'
};

function normalizeExperimentTotal(total) {
  const numericTotal = Number(total);
  if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
    return 0;
  }

  return Math.floor(numericTotal);
}

function getExperimentAchievementThresholds(total = labExperiments.length) {
  const normalizedTotal = normalizeExperimentTotal(total);

  if (normalizedTotal === 0) {
    return [0, 0, 0, 0, 0];
  }

  if (normalizedTotal < EXPERIMENT_ACHIEVEMENT_IDS.length) {
    return EXPERIMENT_ACHIEVEMENT_IDS.map((_, index) => Math.min(index + 1, normalizedTotal));
  }

  const rawThresholds = [
    1,
    Math.ceil(normalizedTotal * 0.25),
    Math.ceil(normalizedTotal * 0.5),
    Math.ceil(normalizedTotal * 0.75),
    normalizedTotal
  ];

  const thresholds = [];
  rawThresholds.forEach((rawThreshold, index) => {
    const remainingSlots = rawThresholds.length - index - 1;
    const minAllowed = index === 0 ? 1 : thresholds[index - 1] + 1;
    const maxAllowed = normalizedTotal - remainingSlots;
    thresholds.push(Math.min(Math.max(rawThreshold, minAllowed), maxAllowed));
  });

  return thresholds;
}

function getQuizQuestionTotal() {
  return Array.isArray(quizData) ? quizData.length : 0;
}

function getQuizAchievementThresholds(total = getQuizQuestionTotal()) {
  const normalizedTotal = normalizeExperimentTotal(total);

  if (normalizedTotal === 0) {
    return [0, 0, 0, 0, 0];
  }

  if (normalizedTotal < QUIZ_ACHIEVEMENT_IDS.length) {
    return QUIZ_ACHIEVEMENT_IDS.map((_, index) => Math.min(index + 1, normalizedTotal));
  }

  const rawThresholds = [
    1,
    Math.ceil(normalizedTotal * 0.25),
    Math.ceil(normalizedTotal * 0.5),
    Math.ceil(normalizedTotal * 0.75),
    normalizedTotal
  ];

  const thresholds = [];
  rawThresholds.forEach((rawThreshold, index) => {
    const remainingSlots = rawThresholds.length - index - 1;
    const minAllowed = index === 0 ? 1 : thresholds[index - 1] + 1;
    const maxAllowed = normalizedTotal - remainingSlots;
    thresholds.push(Math.min(Math.max(rawThreshold, minAllowed), maxAllowed));
  });

  return thresholds;
}

function getExperimentAchievementIndex(achievement) {
  return EXPERIMENT_ACHIEVEMENT_IDS.indexOf(achievement?.id);
}

function isExperimentMilestoneAchievement(achievement) {
  return achievement?.condition?.type === 'completedExperiments'
    && getExperimentAchievementIndex(achievement) !== -1;
}

function getQuizAchievementIndex(achievement) {
  return QUIZ_ACHIEVEMENT_IDS.indexOf(achievement?.id);
}

function isQuizMilestoneAchievement(achievement) {
  return achievement?.condition?.type === 'quizCorrectAnswers'
    && getQuizAchievementIndex(achievement) !== -1;
}

function getTotalCorrectQuizAnswers() {
  return getQuizScores().reduce((sum, score) => {
    const value = Number.isFinite(Number(score.correctCount))
      ? Number(score.correctCount)
      : Number(score.score || 0);
    return sum + Math.max(0, Math.floor(value));
  }, 0);
}

function getEffectiveAchievementConditionCount(achievement) {
  if (isExperimentMilestoneAchievement(achievement)) {
    return getExperimentAchievementThresholds()[getExperimentAchievementIndex(achievement)];
  }

  if (isQuizMilestoneAchievement(achievement)) {
    return getQuizAchievementThresholds()[getQuizAchievementIndex(achievement)];
  }

  return Number(achievement?.condition?.count || 0);
}

function getEffectiveAchievementDescription(achievement) {
  if (isQuizMilestoneAchievement(achievement)) {
    const count = getEffectiveAchievementConditionCount(achievement);
    const suffix = QUIZ_ACHIEVEMENT_DESCRIPTION_SUFFIXES[achievement.id] || '';

    if (getQuizAchievementIndex(achievement) === QUIZ_ACHIEVEMENT_IDS.length - 1) {
      return `累计答对全部 ${getQuizQuestionTotal()} 道测验题，${suffix}`;
    }

    return `累计答对 ${count} 道测验题，${suffix}`;
  }

  if (!isExperimentMilestoneAchievement(achievement)) {
    return achievement?.description || '';
  }

  const count = getEffectiveAchievementConditionCount(achievement);
  const suffix = EXPERIMENT_ACHIEVEMENT_DESCRIPTION_SUFFIXES[achievement.id] || '';

  if (getExperimentAchievementIndex(achievement) === EXPERIMENT_ACHIEVEMENT_IDS.length - 1) {
    return `完成全部 ${labExperiments.length} 个实验，${suffix}`;
  }

  return `完成 ${count} 个虚拟实验，${suffix}`;
}

function isLucideIcon(icon) {
  return LUCIDE_ICONS.has(icon);
}

function renderIcon(icon) {
  const safeIcon = escapeHtmlAttr(icon || 'award');
  if (isLucideIcon(icon)) {
    return `<i data-lucide="${safeIcon}"></i>`;
  }
  return `<span class="achievement-emoji-icon">${safeIcon}</span>`;
}

let isBound = false;

export function initAchievements() {
  renderAchievements();
  evaluateAchievements({ includeManualReview: false });

  if (isBound) {
    return;
  }

  // Achievement module is read-only; action buttons removed per requirement.

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

function handleStateChange(event) {
  evaluateAchievements({
    includeManualReview: event.detail?.field === 'completedLearningSegments'
  });
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

function evaluateAchievements({ includeManualReview = true } = {}) {
  achievementsData.forEach((achievement) => {
    if (achievement.condition?.type === 'manualReviewAfterPromotion' && !includeManualReview) {
      return;
    }

    if (matchesCondition(achievement)) {
      unlockAchievement(achievement.id);
    } else if (getUnlockedAchievements().has(achievement.id)) {
      revokeAchievement(achievement.id);
    }
  });
}

function getLearningSegmentIdForAchievement(achievement) {
  const curriculumTags = Array.isArray(achievement?.curriculumTags) ? achievement.curriculumTags : [];

  if (curriculumTags.length !== 1) {
    return null;
  }

  const segmentId = typeof curriculumTags[0] === 'string' ? curriculumTags[0].trim() : '';
  if (!segmentId) {
    return null;
  }

  return segmentId;
}

function matchesCondition(achievement) {
  const condition = achievement?.condition;

  if (!condition || typeof condition !== 'object') {
    return false;
  }

  if (condition.type === 'manualReviewAfterPromotion') {
    const segmentId = getLearningSegmentIdForAchievement(achievement);
    return achievement.sourceReviewStatus === 'reviewed'
      && Boolean(segmentId)
      && getCompletedLearningSegments().has(segmentId);
  }

  if (condition.type === 'learnedElements') {
    return getLearnedElements().size >= Number(condition.count || 0);
  }

  if (condition.type === 'completedExperiments') {
    return getCompletedExperiments().size >= getEffectiveAchievementConditionCount(achievement);
  }

  if (condition.type === 'quizCorrectAnswers') {
    return getTotalCorrectQuizAnswers() >= getEffectiveAchievementConditionCount(achievement);
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
    if (typeof condition.gameKey === 'string' && condition.gameKey.trim()) {
      const gameKey = condition.gameKey.trim();
      const count = Number(getGamePlayCounts(gameKey) || 0);
      return count >= Number(condition.count || 0);
    }
    const playCounts = getGamePlayCounts();
    const playCountsValues = Object.values(playCounts);
    const totalPlays = playCountsValues.reduce((sum, value) => sum + Number(value || 0), 0);
    return totalPlays >= Number(condition.count || 0);
  }

  if (condition.type === 'gameScore') {
    return Number(getGameScores(condition.gameKey) || 0) >= Number(condition.count || 0);
  }

  return false;
}

export const __achievementsTestHooks = {
  getLearningSegmentIdForAchievement,
  matchesCondition,
  getExperimentAchievementThresholds,
  getQuizAchievementThresholds,
  getQuizQuestionTotal,
  getTotalCorrectQuizAnswers,
  getEffectiveAchievementConditionCount,
  getEffectiveAchievementDescription,
  getAchievementUnlockText
};

function renderAchievements() {
  const container = document.getElementById('achievements-grid');
  if (!container) {
    return;
  }

  const unlockedIds = getUnlockedAchievements();
  const unlockDates = getAchievementDates();
  const grouped = groupAchievementsByCategory();

  container.innerHTML = `
    ${Object.entries(grouped).map(([category, achievements]) => renderCategorySection(category, achievements, unlockedIds, unlockDates)).join('')}
  `;
}

function renderCategorySection(category, achievements, unlockedIds, unlockDates) {
  const meta = ACHIEVEMENT_CATEGORY_META[category] || { label: category, icon: 'award' };

  if (category === 'learning') {
    return renderLearningTextbookSection(meta);
  }

  const unlockedCount = achievements.filter((achievement) => isAchievementUnlocked(achievement, unlockedIds)).length;

  const catHtml = category === 'element'
    ? `<img src="${achievementCatImage}" alt="" class="module-cat achievements-cat" aria-hidden="true" data-testid="floating-achievements-cat">`
    : '';

  return `
    <section class="achievement-category-block hud-shell">
      ${catHtml}
      <div class="achievement-category-header">
        <div>
          <p class="hud-kicker">${renderIcon(meta.icon)} ${meta.label}</p>
        </div>
        <strong>${unlockedCount}/${achievements.length}</strong>
      </div>
      <div class="achievement-category-grid">
        ${achievements.map((achievement) => renderAchievementCard(achievement, unlockedIds, unlockDates)).join('')}
      </div>
    </section>
  `;
}

function getAchievementUnlockText(achievement) {
  if (achievement?.condition?.type === 'manualReviewAfterPromotion') {
    return '完成对应教材片段学习';
  }

  if (isExperimentMilestoneAchievement(achievement)) {
    const count = getEffectiveAchievementConditionCount(achievement);

    if (getExperimentAchievementIndex(achievement) === EXPERIMENT_ACHIEVEMENT_IDS.length - 1) {
      return `完成全部 ${labExperiments.length} 个实验`;
    }

    return `完成 ${count} 个实验`;
  }

  if (isQuizMilestoneAchievement(achievement)) {
    const count = getEffectiveAchievementConditionCount(achievement);

    if (getQuizAchievementIndex(achievement) === QUIZ_ACHIEVEMENT_IDS.length - 1) {
      return `累计答对全部 ${getQuizQuestionTotal()} 道测验题`;
    }

    return `累计答对 ${count} 道测验题`;
  }

  return achievement?.unlockText || '待达成';
}

export function isAchievementUnlocked(achievement, unlockedIds) {
  return unlockedIds.has(achievement.id) && matchesCondition(achievement);
}

function renderAchievementCard(achievement, unlockedIds, unlockDates) {
  const unlocked = isAchievementUnlocked(achievement, unlockedIds);
  const unlockDate = unlockDates[achievement.id];
  const isManual = achievement.condition?.type === 'manualReviewAfterPromotion';
  const segmentId = isManual && achievement.curriculumTags?.[0]
    ? String(achievement.curriculumTags[0]).trim()
    : '';

  const articleAttrs = [
    `class="achievement-card ${unlocked ? 'is-unlocked' : 'is-locked'}"`,
    `data-rarity="${escapeHtmlAttr(achievement.rarity)}"`,
    `data-achievement-id="${escapeHtmlAttr(achievement.id)}"`,
    segmentId ? `data-learning-segment-id="${escapeHtmlAttr(segmentId)}"` : ''
  ].filter(Boolean).join(' ');

  return `
    <article ${articleAttrs}>
      <div class=\"achievement-card-top\">
        <span class=\"achievement-icon\">${renderIcon(achievement.icon || 'award')}</span>

      </div>
      <div class=\"achievement-card-body\">
        <h4>${escapeHtmlAttr(achievement.title)}</h4>
        <p>${escapeHtmlAttr(getEffectiveAchievementDescription(achievement))}</p>
      </div>
      <dl class=\"achievement-meta-list\">
        <div><dt>解锁条件</dt><dd>${escapeHtmlAttr(getAchievementUnlockText(achievement))}</dd></div>
        <div><dt>状态</dt><dd>${unlocked ? '已解锁' : '未解锁'}</dd></div>
        <div><dt>解锁日期</dt><dd>${unlocked ? formatDate(unlockDate) : '等待达成'}</dd></div>
      </dl>
    </article>
  `;
}

function renderTextbookTabLabel(label) {
  const parts = String(label ?? '').split('·');
  if (parts.length < 2) {
    return `<span class="textbook-tab-line">${escapeHtmlAttr(label)}</span>`;
  }
  return parts.map((part, index) => {
    const cls = index === 1 ? 'textbook-tab-line is-emphasis' : 'textbook-tab-line';
    return `<span class="${cls}">${escapeHtmlAttr(part)}</span>`;
  }).join('');
}

function getTextbookLabel(volumeId) {
  return TEXTBOOK_TAB_LABELS[volumeId] || volumeId || '未标注教材';
}

function resolveManifestVolumeId(rawVolumeId) {
  return LEGACY_TO_MANIFEST_VOLUME[rawVolumeId] || rawVolumeId;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isExperimentLearningHeading(value) {
  const heading = normalizeText(value);
  return /^【实验/.test(heading) || [
    '实验目的',
    '实验用品',
    '实验步骤'
  ].includes(heading);
}

function isExperimentLearningAchievement(achievement) {
  const ref = achievement?.sourceReferences?.[0] || {};
  return [
    achievement?.title,
    ref.sourceHeading,
    achievement?.description
  ].some(isExperimentLearningHeading);
}

function getTextbookLearningAchievements(volumeId) {
  // Return eligible manual learning achievements for a volume.
  // Matches the filtering logic in progress.js getManualLearningSegments
  // and getTextbookGroups.
  return achievementsData.filter((a) => {
    if (a.category !== 'learning' || a.condition?.type !== 'manualReviewAfterPromotion') {
      return false;
    }
    if (a.sourceReviewStatus !== 'reviewed') {
      return false;
    }
    const segmentId = getLearningSegmentIdForAchievement(a);
    if (!segmentId) {
      return false;
    }
    if (isExperimentLearningAchievement(a)) {
      return false;
    }
    const ref = a.sourceReferences?.[0] || {};
    const rawVol = a.sourceVolumeId || ref.sourceVolumeId || ref.volumeId || '';
    return resolveManifestVolumeId(rawVol) === volumeId;
  });
}

function getTextbookCount(volumeId) {
  return getTextbookLearningAchievements(volumeId).length;
}

function getTextbookLearningStats(volumeId) {
  const eligible = getTextbookLearningAchievements(volumeId);
  const completedSegments = getCompletedLearningSegments();
  const completed = eligible.filter((a) => {
    const segmentId = getLearningSegmentIdForAchievement(a);
    return segmentId && completedSegments.has(segmentId);
  }).length;
  return { completed, total: eligible.length };
}

function renderLearningTextbookSection(meta) {
  const volumes = textbookAssetManifest.volumes || [];
  const orderedVolumes = [...volumes].sort((a, b) => {
    const idxA = KNOWN_TEXTBOOK_ORDER.indexOf(a.volumeId);
    const idxB = KNOWN_TEXTBOOK_ORDER.indexOf(b.volumeId);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const cardsHtml = orderedVolumes.map((volume) => {
    const label = getTextbookLabel(volume.volumeId);
    const { completed, total } = getTextbookLearningStats(volume.volumeId);
    return `
      <article class="achievement-textbook-card"
        data-textbook-volume-id="${escapeHtmlAttr(volume.volumeId)}">
        <div class="achievement-textbook-card-top">
          <span class="achievement-textbook-icon"><i data-lucide="book-open"></i></span>
        </div>
        <div class="achievement-textbook-card-body">
          <h4>${renderTextbookTabLabel(label)}</h4>
          <p>${escapeHtmlAttr(volume.displayName || volume.sourceVolume || '')}</p>
        </div>
        <div class="achievement-textbook-card-footer">
          <span class="achievement-textbook-count">
            <span class="achievement-textbook-count-completed">${completed}</span><span class="achievement-textbook-count-total">/${total}</span>
          </span>
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="achievement-category-block hud-shell">
      <div class="achievement-category-header">
        <div>
          <p class="hud-kicker">${renderIcon(meta.icon)} ${meta.label}</p>
        </div>
        <strong>${orderedVolumes.length}/${orderedVolumes.length}</strong>
      </div>
      <div class="achievement-category-grid achievement-textbook-grid" data-category="learning">
        ${cardsHtml}
      </div>
    </section>
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
  return ACHIEVEMENT_RARITY_LABELS[rarity] || rarity || '普通';
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

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('`', '&#96;');
}

function showAchievementPopup(achievement) {
  const popup = document.getElementById('achievement-popup');
  if (!popup) {
    return;
  }

  const popupIcon = popup.querySelector('.popup-icon');
  if (popupIcon) {
    popupIcon.innerHTML = renderIcon(achievement.icon || 'award');
  }
  popup.querySelector('.popup-title').textContent = achievement.title;
  popup.querySelector('.popup-desc').textContent = `${getEffectiveAchievementDescription(achievement)} · ${getAchievementUnlockText(achievement)}`;
  popup.classList.remove('show');
  void popup.offsetWidth;
  popup.classList.add('show');

  window.clearTimeout(showAchievementPopup.hideTimer);
  showAchievementPopup.hideTimer = window.setTimeout(() => {
    popup.classList.remove('show');
  }, 3200);
}
