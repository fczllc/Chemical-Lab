import { achievementsData } from '../data/index.js';
import { learningPath } from '../data/index.js';
import { ELEMENT_CATEGORY_META } from '../data/contentMeta.js';
import { selectLegendCategory } from './renderTable.js';
import { openCompareModal } from './compare.js';
import { navigateTo } from './router.js';
import {
  addComparedElement,
  getCompareList,
  getLearnedElements,
  getSelectedElement,
  getUnlockedAchievements,
  replaceComparedElementAt
} from './storage.js';

const CATEGORY_META = Object.fromEntries(
  Object.entries(ELEMENT_CATEGORY_META)
    .filter(([, meta]) => meta.overviewColor)
    .map(([key, meta]) => [key, { label: meta.label, color: meta.overviewColor }])
);

const TOTAL_ELEMENTS = 118;
const COMPARE_PREVIEW_LIMIT = 3;
const RECENT_ACHIEVEMENT_LIMIT = 2;
const ELEMENT_ATOMIC_NUMBER_MIME = 'application/x-element-atomic-number';

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
    elementStatsCard: document.querySelector('[data-testid="bottom-element-stats"]'),
    statsCard: document.querySelector('[data-testid="bottom-stats"]'),
    categoriesContent: document.getElementById('bottom-categories-content'),
    compareContent: document.getElementById('bottom-compare-content'),
    elementStatsContent: document.getElementById('bottom-element-stats-content'),
    statsContent: document.getElementById('bottom-stats-content')
  };
}

function hasRequiredContainers(refs) {
  return Boolean(
    refs?.categoriesCard
      && refs?.compareCard
      && refs?.elementStatsCard
      && refs?.statsCard
      && refs?.categoriesContent
      && refs?.compareContent
      && refs?.elementStatsContent
      && refs?.statsContent
  );
}

function enhanceCards() {
  [
    [cardRefs.compareCard, '查看元素对比'],
    [cardRefs.elementStatsCard, '元素统计'],
    [cardRefs.statsCard, '查看学习进度']
  ].forEach(([card, label]) => {
    if (!card) {
      return;
    }

    card.setAttribute('aria-label', label);

    if (card === cardRefs.elementStatsCard) {
      return;
    }

    card.classList.add('bottom-module-interactive');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
  });
}

function bindCardEvents() {
  bindCardAction(cardRefs.compareCard, openCompareModal);
  bindCardAction(cardRefs.statsCard, () => navigateTo('progress'));
  bindCompareDropTarget();
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
  renderElementQuickStatsPreview();
  renderStatsPreview();
}

function renderCategoriesPreview() {
  const categoryStats = buildCategoryStats();
  const learnedCount = getLearnedElements().size;

  cardRefs.categoriesContent.innerHTML = `
    <div class="preview-card-shell preview-categories-shell">
      <div class="preview-card-topline">
        <h4>类别概览</h4>
        <span class="preview-metric">${learnedCount}/${TOTAL_ELEMENTS}</span>
      </div>
      <div class="categories-overview">
        <div class="categories-legend-list">
          ${categoryStats.map((item) => renderCategoryRow(item)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderCategoryRow(item) {
  return `
    <div class="category-progress-row" data-category="${item.category}">
      <span class="category-chip" style="--category-accent: ${item.color}"></span>
      <span class="category-progress-name">${item.label}</span>
      <span class="category-progress-ratio">${item.learnedCount}/${item.totalCount}</span>
    </div>
  `;
}

function renderComparePreview() {
  const compareList = getCompareList().slice(0, COMPARE_PREVIEW_LIMIT);
  const emptySlots = Math.max(0, COMPARE_PREVIEW_LIMIT - compareList.length);

  cardRefs.compareContent.innerHTML = `
    <div class="preview-card-shell preview-compare-shell">
      <div class="preview-card-topline">
        <h4>元素对比</h4>
        <button class="preview-metric module-link" type="button" data-action="open-compare">对比</button>
      </div>
      <div class="compare-preview-grid">
        ${compareList.map((element, index) => renderComparePreviewElement(element, index)).join('')}
        ${Array.from({ length: emptySlots }, (_, index) => `
          <div class="compare-preview-empty" role="button" tabindex="0" aria-label="添加当前选中的元素到对比槽位 ${compareList.length + index + 1}">
            <span>+</span>
            <small>槽位 ${compareList.length + index + 1}</small>
          </div>
        `).join('')}
      </div>
      <p class="preview-caption">${compareList.length > 0 ? '已加入的元素会在这里实时刷新。' : '拖入元素，或选中元素后点空槽加入对比。'}</p>
    </div>
  `;

  cardRefs.compareContent.querySelector('[data-action="open-compare"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openCompareModal();
  });

  bindCompareEmptySlots();
}

function renderComparePreviewElement(element, index) {
  return `
    <article class="compare-preview-tile element-cell" data-category="${element.category}" data-atomic-number="${element.atomicNumber}" data-slot-index="${index}" aria-label="${element.chineseName} ${element.symbol}">
      <span class="atomic-num">${element.atomicNumber}</span>
      <span class="symbol">${element.symbol}</span>
      <span class="chinese-name">${element.chineseName}</span>
      <span class="atomic-mass">${element.atomicMass}</span>
    </article>
  `;
}

function bindCompareDropTarget() {
  const card = cardRefs.compareCard;
  if (!card || card.dataset.compareDropBound === 'true') {
    return;
  }

  card.addEventListener('dragover', (event) => {
    if (!hasElementDragPayload(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    card.classList.add('compare-drop-active');
  });

  card.addEventListener('dragleave', (event) => {
    if (!card.contains(event.relatedTarget)) {
      card.classList.remove('compare-drop-active');
    }
  });

  card.addEventListener('drop', (event) => {
    const atomicNumber = readDraggedAtomicNumber(event.dataTransfer);
    const replacementSlot = getCompareReplacementSlot(event.target);
    card.classList.remove('compare-drop-active');
    event.preventDefault();

    if (replacementSlot) {
      replaceElementInCompareSlot(replacementSlot.dataset.slotIndex, atomicNumber);
      return;
    }

    if (!addElementToCompare(atomicNumber)) {
      return;
    }
  });

  card.dataset.compareDropBound = 'true';
}

function bindCompareEmptySlots() {
  cardRefs.compareContent.querySelectorAll('.compare-preview-empty').forEach((slot) => {
    slot.addEventListener('click', handleCompareSlotActivation);
    slot.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCompareSlotActivation(event);
      }
    });
  });
}

function handleCompareSlotActivation(event) {
  event.stopPropagation();
  addElementToCompare(getCurrentSelectedAtomicNumber());
}

function readDraggedAtomicNumber(dataTransfer) {
  if (!dataTransfer) {
    return null;
  }

  return dataTransfer.getData(ELEMENT_ATOMIC_NUMBER_MIME) || dataTransfer.getData('text/plain');
}

function hasElementDragPayload(dataTransfer) {
  if (!dataTransfer) {
    return false;
  }

  return [...dataTransfer.types].some((type) => type === ELEMENT_ATOMIC_NUMBER_MIME || type === 'text/plain');
}

function getCompareReplacementSlot(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const slot = target.closest('.compare-preview-tile[data-slot-index]');
  return cardRefs.compareCard.contains(slot) ? slot : null;
}

function getCurrentSelectedAtomicNumber() {
  const selectedElement = getSelectedElement();
  if (selectedElement?.atomicNumber) {
    return selectedElement.atomicNumber;
  }

  const selectedNode = document.querySelector('.element-cell.selected, .element-list-row.selected');
  if (selectedNode?.dataset.atomicNumber) {
    return selectedNode.dataset.atomicNumber;
  }

  return document.querySelector('.element-hero .atomic-number')?.textContent || null;
}

function addElementToCompare(value) {
  const atomicNumber = Number(value);
  if (!Number.isInteger(atomicNumber)) {
    return false;
  }

  const elementExists = allElements.some((element) => element.atomicNumber === atomicNumber);
  if (!elementExists) {
    return false;
  }

  addComparedElement(atomicNumber);
  return true;
}

function replaceElementInCompareSlot(slotIndex, value) {
  const atomicNumber = Number(value);
  if (!Number.isInteger(atomicNumber)) {
    return false;
  }

  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex < 0) {
    return false;
  }

  const compareList = getCompareList();
  if (normalizedSlotIndex >= compareList.length) {
    return false;
  }

  const elementExists = allElements.some((element) => element.atomicNumber === atomicNumber);
  if (!elementExists) {
    return false;
  }

  replaceComparedElementAt(normalizedSlotIndex, atomicNumber);
  return true;
}

function renderElementQuickStatsPreview() {
  const stats = buildElementQuickStats();
  const totalElements = allElements.length || 1;

  cardRefs.elementStatsContent.innerHTML = `
    <div class="preview-card-shell element-quick-stats-shell">
      <div class="preview-card-topline">
        <h4>元素统计</h4>
        <span class="preview-metric">${allElements.length} 项</span>
      </div>
      <div class="element-stat-list">
        ${stats.map((item) => renderElementStatRow(item, totalElements)).join('')}
      </div>
    </div>
  `;
}

function renderElementStatRow(item, totalElements) {
  const percentage = (item.count / totalElements) * 100;

  return `
    <div class="element-stat-row">
      <span class="element-stat-label">${item.label}</span>
      <span class="element-stat-count">${item.count}</span>
      <span class="element-stat-track">
        <span class="element-stat-fill" style="--stat-width: ${percentage}%"></span>
      </span>
    </div>
  `;
}

function buildElementQuickStats() {
  const totalElements = allElements.length;
  const naturalCount = allElements.filter((element) => element.rarity && element.rarity !== 'synthetic').length;
  const syntheticCount = allElements.filter((element) => element.rarity === 'synthetic').length;
  const nonRadioactiveCount = allElements.filter((element) => element.safety && element.safety !== 'radioactive').length;
  const radioactiveCount = allElements.filter((element) => element.safety === 'radioactive').length;

  return [
    { label: '已发现元素', count: totalElements },
    { label: '天然元素', count: naturalCount },
    { label: '人工合成', count: syntheticCount },
    { label: '非放射性元素', count: nonRadioactiveCount },
    { label: '放射性元素', count: radioactiveCount }
  ];
}

function renderStatsPreview() {
  const learnedCount = getLearnedElements().size;
  const progressPercent = Math.round((learnedCount / TOTAL_ELEMENTS) * 100) || 0;
  const currentStage = getCurrentLearningStage();

  cardRefs.statsContent.innerHTML = `
    <div class="preview-card-shell preview-stats-shell">
      <div class="preview-card-topline">
        <h4>学习进度</h4>
        <div class="stats-progress-badge">${progressPercent}%</div>
      </div>
      <div class="stats-inline-progress">
        <div class="stats-main-metric">${learnedCount}<small>/ ${TOTAL_ELEMENTS}</small></div>
        <div class="stats-progress-track">
          <span class="stats-progress-fill" style="width: ${progressPercent}%"></span>
        </div>
      </div>
      <div class="stats-stage-card">
        <span class="stats-stage-label">当前阶段</span>
        <strong>${currentStage.stage.name}</strong>
        <span>${currentStage.completed}/${currentStage.total} 个关键元素已掌握</span>
      </div>
    </div>
  `;
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
    selectLegendCategory(category);
  });
}
