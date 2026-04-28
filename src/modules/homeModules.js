import { achievementsData } from '../data/index.js';
import { learningPath } from '../data/index.js';
import { ELEMENT_CATEGORY_META } from '../data/contentMeta.js';
import { navigateTo } from './router.js';
import { getCompareList, getLearnedElements, getUnlockedAchievements } from './storage.js';

const CATEGORY_META = Object.fromEntries(
  Object.entries(ELEMENT_CATEGORY_META)
    .filter(([, meta]) => meta.overviewColor)
    .map(([key, meta]) => [key, { label: meta.label, color: meta.overviewColor }])
);

const TOTAL_ELEMENTS = 118;
const COMPARE_PREVIEW_LIMIT = 3;
const TIMELINE_PREVIEW_COUNT = 4;
const RECENT_ACHIEVEMENT_LIMIT = 2;

let allElements = [];
let cardRefs = null;
let stateBound = false;
let recentAchievementIds = [];

export function initHomeModules(elements = []) {
  allElements = Array.isArray(elements) ? [...elements] : [];
  cardRefs = getCardRefs();

  if (!hasRequiredContainers(cardRefs)) {
    return;
  }

  seedRecentAchievements();
  enhanceCards();
  bindCardEvents();
  bindStateListeners();
  renderAllPreviews();
}

function getCardRefs() {
  return {
    categoriesCard: document.querySelector('[data-testid="bottom-categories"]'),
    compareCard: document.querySelector('[data-testid="bottom-compare"]'),
    timelineCard: document.querySelector('[data-testid="bottom-timeline"]'),
    statsCard: document.querySelector('[data-testid="bottom-stats"]'),
    categoriesContent: document.getElementById('bottom-categories-content'),
    compareContent: document.getElementById('bottom-compare-content'),
    timelineContent: document.getElementById('bottom-timeline-content'),
    statsContent: document.getElementById('bottom-stats-content')
  };
}

function hasRequiredContainers(refs) {
  return Boolean(
    refs?.categoriesCard
      && refs?.compareCard
      && refs?.timelineCard
      && refs?.statsCard
      && refs?.categoriesContent
      && refs?.compareContent
      && refs?.timelineContent
      && refs?.statsContent
  );
}

function enhanceCards() {
  [
    [cardRefs.categoriesCard, '查看类别筛选'],
    [cardRefs.compareCard, '查看元素对比'],
    [cardRefs.timelineCard, '查看发现历史'],
    [cardRefs.statsCard, '查看学习进度']
  ].forEach(([card, label]) => {
    if (!card) {
      return;
    }

    card.classList.add('bottom-module-interactive');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', label);
  });
}

function bindCardEvents() {
  bindCardAction(cardRefs.categoriesCard, () => {
    const defaultCategory = buildCategoryStats().find((item) => item.learnedCount > 0)?.category ?? 'all';
    focusCategory(defaultCategory);
  });
  bindCardAction(cardRefs.compareCard, () => navigateTo('compare'));
  bindCardAction(cardRefs.timelineCard, () => navigateTo('timeline'));
  bindCardAction(cardRefs.statsCard, () => navigateTo('progress'));
}

function bindCardAction(card, action) {
  if (!card) {
    return;
  }

  card.addEventListener('click', action);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  });
}

function bindStateListeners() {
  if (stateBound) {
    return;
  }

  window.addEventListener('statechange', handleStateChange);
  window.addEventListener('achievementunlocked', handleAchievementUnlocked);
  window.addEventListener('statereset', () => {
    seedRecentAchievements();
    renderAllPreviews();
  });

  stateBound = true;
}

function handleStateChange(event) {
  const field = event?.detail?.field;

  if (field === 'learnedElements' || field === 'collectedElements') {
    renderCategoriesPreview();
    renderStatsPreview();
    return;
  }

  if (field === 'compareList') {
    renderComparePreview();
    return;
  }

  if (field === 'unlockedAchievements' || field === 'quizScores' || field === 'gameScores') {
    renderStatsPreview();
  }
}

function handleAchievementUnlocked(event) {
  const achievementId = event?.detail?.achievementId;
  if (typeof achievementId === 'string' && achievementId.trim()) {
    recentAchievementIds = [achievementId, ...recentAchievementIds.filter((id) => id !== achievementId)]
      .slice(0, RECENT_ACHIEVEMENT_LIMIT);
  }

  renderStatsPreview();
}

function renderAllPreviews() {
  renderCategoriesPreview();
  renderComparePreview();
  renderTimelinePreview();
  renderStatsPreview();
}

function renderCategoriesPreview() {
  const categoryStats = buildCategoryStats();
  const learnedCount = getLearnedElements().size;
  const progress = Math.round((learnedCount / TOTAL_ELEMENTS) * 100) || 0;

  cardRefs.categoriesContent.innerHTML = `
    <div class="preview-card-shell preview-categories-shell">
      <div class="preview-card-topline">
        <span class="preview-eyebrow">LEARNING DISTRIBUTION</span>
        <span class="preview-metric">${learnedCount}/${TOTAL_ELEMENTS}</span>
      </div>
      <div class="categories-overview">
        <div class="categories-donut" style="${buildCategoryChartStyle(categoryStats, learnedCount)}">
          <div class="categories-donut-core">
            <strong>${progress}%</strong>
            <span>已学习</span>
          </div>
        </div>
        <div class="categories-legend-list">
          ${categoryStats.map((item) => renderCategoryRow(item)).join('')}
        </div>
      </div>
      <button class="module-link module-link-inline" type="button" data-action="open-category">跳到分类筛选 →</button>
    </div>
  `;

  cardRefs.categoriesContent.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      focusCategory(button.dataset.category || 'all');
    });
  });

  cardRefs.categoriesContent.querySelector('[data-action="open-category"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    const defaultCategory = categoryStats.find((item) => item.learnedCount > 0)?.category ?? 'all';
    focusCategory(defaultCategory);
  });
}

function renderCategoryRow(item) {
  const percentage = item.totalCount > 0 ? Math.round((item.learnedCount / item.totalCount) * 100) : 0;
  return `
    <button class="category-progress-row" type="button" data-category="${item.category}">
      <span class="category-chip" style="--category-accent: ${item.color}"></span>
      <span class="category-progress-copy">
        <span class="category-progress-name">${item.label}</span>
        <span class="category-progress-ratio">${item.learnedCount}/${item.totalCount}</span>
      </span>
      <span class="category-progress-bar">
        <span class="category-progress-fill" style="width: ${percentage}%; --category-accent: ${item.color}"></span>
      </span>
    </button>
  `;
}

function renderComparePreview() {
  const compareList = getCompareList().slice(0, COMPARE_PREVIEW_LIMIT);
  const emptySlots = Math.max(0, COMPARE_PREVIEW_LIMIT - compareList.length);

  cardRefs.compareContent.innerHTML = `
    <div class="preview-card-shell preview-compare-shell">
      <div class="preview-card-topline">
        <span class="preview-eyebrow">COMPARE QUEUE</span>
        <span class="preview-metric">${compareList.length}/${COMPARE_PREVIEW_LIMIT}</span>
      </div>
      <div class="compare-preview-grid">
        ${compareList.map((element) => `
          <article class="compare-preview-tile" style="--tile-accent: ${element.color || 'var(--neon-cyan)'}">
            <span class="compare-preview-symbol">${element.symbol}</span>
            <span class="compare-preview-name">${element.chineseName}</span>
            <span class="compare-preview-meta">#${element.atomicNumber}</span>
          </article>
        `).join('')}
        ${Array.from({ length: emptySlots }, (_, index) => `
          <div class="compare-preview-empty">
            <span>+</span>
            <small>槽位 ${compareList.length + index + 1}</small>
          </div>
        `).join('')}
      </div>
      <p class="preview-caption">${compareList.length > 0 ? '已加入的元素会在这里实时刷新。' : '从右侧详情面板把元素加入对比，就会立刻出现在这里。'}</p>
      <button class="module-link module-link-inline" type="button" data-action="open-compare">打开对比页 →</button>
    </div>
  `;

  cardRefs.compareContent.querySelector('[data-action="open-compare"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    navigateTo('compare');
  });
}

function renderTimelinePreview() {
  const recentElements = getTimelinePreviewElements();

  cardRefs.timelineContent.innerHTML = `
    <div class="preview-card-shell preview-timeline-shell">
      <div class="preview-card-topline">
        <span class="preview-eyebrow">LATEST DISCOVERIES</span>
        <span class="preview-metric">${recentElements.length} 项</span>
      </div>
      <div class="timeline-preview-list">
        ${recentElements.map((element, index) => `
          <article class="timeline-preview-item" style="--timeline-accent: ${element.color || 'var(--neon-purple)'}">
            <span class="timeline-preview-year">${element.discoveryYear}</span>
            <span class="timeline-preview-node"></span>
            <div class="timeline-preview-copy">
              <strong>${element.symbol} · ${element.chineseName}</strong>
              <span>${index === 0 ? '最晚进入现代化学视野' : '进入发现序列'}</span>
            </div>
          </article>
        `).join('')}
      </div>
      <button class="module-link module-link-inline" type="button" data-action="open-timeline">查看完整时间线 →</button>
    </div>
  `;

  cardRefs.timelineContent.querySelector('[data-action="open-timeline"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    navigateTo('timeline');
  });
}

function renderStatsPreview() {
  const learnedCount = getLearnedElements().size;
  const progressPercent = Math.round((learnedCount / TOTAL_ELEMENTS) * 100) || 0;
  const currentStage = getCurrentLearningStage();
  const recentAchievements = getRecentAchievements(getUnlockedAchievements());

  cardRefs.statsContent.innerHTML = `
    <div class="preview-card-shell preview-stats-shell">
      <div class="stats-hero-line">
        <div>
          <span class="preview-eyebrow">EXPLORATION STATUS</span>
          <div class="stats-main-metric">${learnedCount}<small>/ ${TOTAL_ELEMENTS}</small></div>
        </div>
        <div class="stats-progress-badge">${progressPercent}%</div>
      </div>
      <div class="stats-progress-track">
        <span class="stats-progress-fill" style="width: ${progressPercent}%"></span>
      </div>
      <div class="stats-stage-card">
        <span class="stats-stage-label">当前阶段</span>
        <strong>${currentStage.stage.name}</strong>
        <span>${currentStage.completed}/${currentStage.total} 个关键元素已掌握</span>
      </div>
      <div class="stats-achievement-list">
        <span class="stats-stage-label">最近解锁成就</span>
        ${recentAchievements.length > 0 ? recentAchievements.map((achievement) => `
          <div class="stats-achievement-item">
            <strong>${achievement.title}</strong>
            <span>${achievement.description}</span>
          </div>
        `).join('') : '<div class="stats-achievement-item is-empty"><strong>尚未解锁</strong><span>学习第一个元素后，新的成就会出现在这里。</span></div>'}
      </div>
      <button class="module-link module-link-inline" type="button" data-action="open-progress">打开学习进度 →</button>
    </div>
  `;

  cardRefs.statsContent.querySelector('[data-action="open-progress"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    navigateTo('progress');
  });
}

function buildCategoryStats() {
  const learnedElements = getLearnedElements();
  return Object.entries(CATEGORY_META).map(([category, meta]) => {
    const categoryElements = allElements.filter((element) => element.category === category);
    return {
      category,
      label: meta.label,
      color: meta.color,
      totalCount: categoryElements.length,
      learnedCount: categoryElements.reduce((count, element) => {
        return count + (learnedElements.has(element.atomicNumber) ? 1 : 0);
      }, 0)
    };
  });
}

function buildCategoryChartStyle(categoryStats, learnedCount) {
  if (learnedCount === 0) {
    return 'background: radial-gradient(circle at center, rgba(148, 163, 184, 0.24), rgba(15, 23, 42, 0.94));';
  }

  let currentStop = 0;
  const segments = categoryStats
    .filter((item) => item.learnedCount > 0)
    .map((item) => {
      const size = (item.learnedCount / learnedCount) * 360;
      const start = currentStop;
      currentStop += size;
      return `${item.color} ${start}deg ${currentStop}deg`;
    });

  return `background: conic-gradient(${segments.join(', ')});`;
}

function getTimelinePreviewElements() {
  return allElements
    .filter((element) => Number.isFinite(Number(element.discoveryYear)))
    .sort((left, right) => Number(right.discoveryYear) - Number(left.discoveryYear))
    .slice(0, TIMELINE_PREVIEW_COUNT);
}

function getCurrentLearningStage() {
  const learned = getLearnedElements();
  const stages = learningPath?.stages || [];

  for (const stage of stages) {
    const total = Number(stage.requiredCount || stage.focusElements?.length || 0);
    const completed = Math.min(learned.size, total);
    if (completed < total) {
      return { stage, completed, total };
    }
  }

  const lastStage = stages[stages.length - 1] || { name: '阶段信息整理中', requiredCount: 0 };
  const total = Number(lastStage.requiredCount || lastStage.focusElements?.length || 0);
  return {
    stage: lastStage,
    completed: total,
    total
  };
}

function getRecentAchievements(unlockedIds) {
  return recentAchievementIds
    .filter((id) => unlockedIds.has(id))
    .map((id) => achievementsData.find((achievement) => achievement.id === id))
    .filter(Boolean)
    .slice(0, RECENT_ACHIEVEMENT_LIMIT);
}

function seedRecentAchievements() {
  const unlockedIds = getUnlockedAchievements();
  recentAchievementIds = achievementsData
    .map((achievement) => achievement.id)
    .filter((id) => unlockedIds.has(id))
    .slice(-RECENT_ACHIEVEMENT_LIMIT)
    .reverse();
}

function focusCategory(category) {
  navigateTo('periodic-table');

  window.requestAnimationFrame(() => {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) {
      return;
    }

    categoryFilter.value = category;
    categoryFilter.dispatchEvent(new Event('change', { bubbles: true }));
    categoryFilter.focus();
  });
}
