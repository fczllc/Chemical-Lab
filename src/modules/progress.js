/** ===== 学习进度模块 ===== */
import { achievementsData } from '../data/achievementsData.js';
import { learningPath } from '../data/learningPath.js';
import {
  getAchievementDates,
  getActivityLog,
  getCollectedElements,
  getCompletedExperiments,
  getGamePlayCounts,
  getGameScores,
  getLearnedElements,
  getQuizScores,
  getStateSnapshot,
  getUnlockedAchievements
} from './storage.js';

const TOTAL_EXPERIMENTS = 5;
const TOTAL_ELEMENTS = 118;
const GAME_LABELS = {
  'game-drag': '元素拖拽归位',
  'game-memory': '元素记忆翻牌',
  'game-reaction': '反应配对',
  'game-collector': '元素收集',
  'quiz-full': '完整测验挑战'
};

const EXPERIMENT_LABELS = {
  'exp-hydrogen-combustion': '氢气燃烧',
  'exp-iron-rusting': '铁生锈',
  'exp-sodium-water': '钠遇水',
  'exp-salt-formation': '盐的形成',
  'exp-oxygen-supports-combustion': '氧气助燃'
};

const FEATURE_LABELS = {
  'detail-panel': '元素详情面板',
  'basic-quiz': '基础测验',
  'collection-board': '收藏墙',
  filters: '分类筛选',
  search: '元素搜索',
  'category-legend': '类别图例',
  'compare-view': '元素对比',
  'applications-preview': '用途预览',
  'mini-stats': '迷你统计概览',
  'lab-view': '实验室入口',
  'reaction-library': '反应库',
  'safety-guide': '安全指南',
  'timeline-view': '发现时间线',
  'story-mode': '故事模式',
  'advanced-quiz': '高级测验',
  'achievement-center': '成就中心',
  'progress-dashboard': '进度仪表板'
};

let isBound = false;
let selectedStageId = learningPath.stages[0]?.id || null;
let celebrationMessage = '';
let celebrationTimer = null;

export function initProgress() {
  renderProgress();

  if (isBound) {
    return;
  }

  window.addEventListener('statechange', handleStateChange);
  window.addEventListener('statereset', handleStateReset);
  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'progress') {
      renderProgress();
    }
  });

  isBound = true;
}

function handleStateChange(event) {
  if (event.detail?.field === 'learnedElements') {
    maybeCelebrateStageProgress(event.detail?.oldValue, event.detail?.newValue);
  }
  renderProgress();
}

function handleStateReset() {
  selectedStageId = learningPath.stages[0]?.id || null;
  celebrationMessage = '';
  renderProgress();
}

function maybeCelebrateStageProgress(oldValue, newValue) {
  const previousCount = oldValue instanceof Set ? oldValue.size : 0;
  const nextCount = newValue instanceof Set ? newValue.size : getLearnedElements().size;
  const stages = learningPath.stages || [];

  stages.forEach((stage, index) => {
    if (previousCount < stage.requiredCount && nextCount >= stage.requiredCount) {
      const nextStage = stages[index + 1];
      celebrationMessage = nextStage
        ? `已完成「${stage.name}」！下一阶段「${nextStage.name}」现已解锁。`
        : `恭喜完成最终阶段「${stage.name}」！你已经达成完整学习路径。`;
      selectedStageId = nextStage?.id || stage.id;
      window.clearTimeout(celebrationTimer);
      celebrationTimer = window.setTimeout(() => {
        celebrationMessage = '';
        renderProgress();
      }, 3600);
    }
  });
}

function renderProgress() {
  const container = document.querySelector('#progress .progress-path');
  if (!container) {
    return;
  }

  const snapshot = getStateSnapshot();
  const learned = getLearnedElements();
  const collected = getCollectedElements();
  const completedExperiments = getCompletedExperiments();
  const unlockedAchievements = getUnlockedAchievements();
  const unlockDates = getAchievementDates();
  const quizScores = getQuizScores();
  const activityLog = getActivityLog();
  const gameScores = getGameScores();
  const gamePlays = getGamePlayCounts();
  const pathStages = learningPath?.stages || [];
  const stageStates = getStageStates(pathStages, learned.size);
  const currentStage = stageStates.find((stage) => stage.status === 'current')
    || [...stageStates].reverse().find((stage) => stage.status === 'complete')
    || stageStates[0]
    || null;
  const selectedStage = stageStates.find((stage) => stage.id === selectedStageId) || currentStage;
  const overallPercent = Math.round((learned.size / TOTAL_ELEMENTS) * 100) || 0;
  const averageQuiz = quizScores.length
    ? Math.round(quizScores.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / quizScores.length)
    : 0;
  const bestQuiz = quizScores.reduce((max, item) => Math.max(max, Number(item.accuracy || 0)), 0);
  const experimentPercent = Math.round((completedExperiments.size / TOTAL_EXPERIMENTS) * 100) || 0;
  const achievementPercent = achievementsData.length
    ? Math.round((unlockedAchievements.size / achievementsData.length) * 100)
    : 0;

  container.innerHTML = `
    <section class="progress-dashboard hud-shell">
      <div class="progress-dashboard-header">
        <div>
          <p class="hud-kicker">LEARNING DOSSIER</p>
          <h3>学习路径与成长仪表板</h3>
          <p class="progress-dashboard-copy">从已学习元素、实验、测验到游戏表现，这里会同步展示你的完整学习轨迹。</p>
        </div>
        <div class="progress-ring" style="--progress:${overallPercent}%">
          <div>
            <strong>${overallPercent}%</strong>
            <span>${learned.size} / ${TOTAL_ELEMENTS}</span>
          </div>
        </div>
      </div>

      ${celebrationMessage ? `<div class="stage-celebration-banner">🎉 ${celebrationMessage}</div>` : ''}

      <div class="progress-stat-grid">
        <article class="progress-stat-card"><span>总体进度</span><strong>${learned.size}/${TOTAL_ELEMENTS}</strong><small>已学习元素总数</small></article>
        <article class="progress-stat-card"><span>当前阶段</span><strong>${currentStage?.name || '尚未开始'}</strong><small>${currentStage ? `目标 ${currentStage.requiredCount} 个元素` : '等待开始'}</small></article>
        <article class="progress-stat-card"><span>实验进度</span><strong>${completedExperiments.size}/${TOTAL_EXPERIMENTS}</strong><small>${experimentPercent}% 完成</small></article>
        <article class="progress-stat-card"><span>成就进度</span><strong>${unlockedAchievements.size}/${achievementsData.length}</strong><small>${achievementPercent}% 完成</small></article>
        <article class="progress-stat-card"><span>平均测验分</span><strong>${averageQuiz}%</strong><small>最高 ${bestQuiz}% · 共 ${quizScores.length} 次</small></article>
        <article class="progress-stat-card"><span>已收藏元素</span><strong>${collected.size}</strong><small>收藏墙同步扩展中</small></article>
      </div>

      <div class="progress-metrics-grid">
        <article class="progress-metric-panel">
          <div class="progress-panel-heading">
            <h4>近期学习活动</h4>
            <span>实时更新</span>
          </div>
          <div class="progress-activity-list">
            ${renderActivityList(activityLog, snapshot, unlockDates)}
          </div>
        </article>

        <article class="progress-metric-panel">
          <div class="progress-panel-heading">
            <h4>测验统计</h4>
            <span>${quizScores.length} 次记录</span>
          </div>
          ${renderMetricBars([
            { label: '平均分', value: averageQuiz },
            { label: '最高分', value: bestQuiz },
            { label: '完成率', value: Math.min(100, quizScores.length * 10) }
          ], '%')}
        </article>

        <article class="progress-metric-panel">
          <div class="progress-panel-heading">
            <h4>游戏统计</h4>
            <span>最高分与次数</span>
          </div>
          <div class="game-stat-list">
            ${renderGameStats(gameScores, gamePlays)}
          </div>
        </article>

        <article class="progress-metric-panel">
          <div class="progress-panel-heading">
            <h4>实验与成就</h4>
            <span>阶段同步联动</span>
          </div>
          ${renderMetricBars([
            { label: '实验完成', value: experimentPercent },
            { label: '成就解锁', value: achievementPercent },
            { label: '收藏完成', value: Math.round((collected.size / TOTAL_ELEMENTS) * 100) || 0 }
          ], '%')}
        </article>
      </div>
    </section>

    <section class="progress-learning-path hud-shell">
      <div class="progress-learning-header">
        <div>
          <p class="hud-kicker">GUIDED LEARNING PATH</p>
          <h3>五阶段学习路径</h3>
        </div>
        <span>${currentStage ? `当前：${currentStage.name}` : '等待开始'}</span>
      </div>
      <div class="progress-stage-list">
        ${stageStates.map((stage) => renderStageCard(stage, learned.size)).join('')}
      </div>
      ${selectedStage ? renderStageDetail(selectedStage, snapshot) : ''}
    </section>
  `;

  bindStageInteractions();
}

function bindStageInteractions() {
  document.querySelectorAll('[data-stage-select]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedStageId = button.dataset.stageSelect;
      renderProgress();
    });
  });
}

function getStageStates(stages, learnedCount) {
  let previousStageComplete = true;

  return stages.map((stage) => {
    const completedCount = Math.min(learnedCount, stage.requiredCount);
    const progressPercent = stage.requiredCount > 0
      ? Math.round((completedCount / stage.requiredCount) * 100)
      : 0;
    const isComplete = learnedCount >= stage.requiredCount;
    const isUnlocked = previousStageComplete;
    let status = 'locked';

    if (isComplete) {
      status = 'complete';
    } else if (isUnlocked) {
      status = 'current';
    }

    previousStageComplete = isComplete;

    return {
      ...stage,
      isUnlocked,
      isComplete,
      progressPercent,
      completedCount,
      remainingCount: Math.max(stage.requiredCount - learnedCount, 0),
      status
    };
  });
}

function renderStageCard(stage, learnedCount) {
  const icon = stage.status === 'complete' ? '✅' : stage.status === 'current' ? '🌟' : '🔒';
  return `
    <article class="progress-stage-card hud-shell is-${stage.status}">
      <button class="progress-stage-button" type="button" data-stage-select="${stage.id}">
        <div class="progress-stage-top">
          <div>
            <p class="hud-kicker">${icon} PATH STAGE</p>
            <h3>${stage.name}</h3>
          </div>
          <strong>${stage.completedCount}/${stage.requiredCount}</strong>
        </div>
        <p>${stage.description}</p>
        <div class="progress-stage-meta-row">
          <span>需要元素：${stage.requiredCount}</span>
          <span>${stage.status === 'locked' ? '尚未解锁' : stage.status === 'complete' ? '已完成' : `还差 ${stage.remainingCount} 个`}</span>
        </div>
        <div class="progress-bar-track">
          <span class="progress-bar-fill" style="width:${stage.progressPercent}%"></span>
        </div>
        <div class="progress-stage-rewards">
          <span>解锁 ${stage.unlockedGames.length} 个游戏</span>
          <span>${stage.unlockedExperiments.length} 个实验</span>
          <span>${stage.unlockedFeatures.length} 项功能</span>
        </div>
      </button>
    </article>
  `;
}

function renderStageDetail(stage, snapshot) {
  const elementsMap = new Map(snapshot.elements.map((element) => [element.atomicNumber, element]));
  const learned = getLearnedElements();

  return `
    <article class="progress-stage-detail hud-shell">
      <div class="progress-panel-heading">
        <div>
          <p class="hud-kicker">STAGE DETAIL</p>
          <h4>${stage.name}</h4>
        </div>
        <span>${stage.status === 'locked' ? '🔒 未解锁' : stage.status === 'complete' ? '✅ 已完成' : '🌟 当前阶段'}</span>
      </div>
      <p class="progress-stage-detail-copy">${stage.description} 当前进度 ${stage.completedCount}/${stage.requiredCount}，${stage.remainingCount > 0 ? `再学习 ${stage.remainingCount} 个元素即可完成。` : '该阶段已经达成。'}</p>
      <div class="progress-stage-detail-grid">
        <div class="progress-detail-card">
          <span>本阶段重点元素</span>
          <div class="stage-element-chip-list">
            ${stage.focusElements.map((atomicNumber) => renderElementChip(atomicNumber, elementsMap.get(atomicNumber), learned.has(atomicNumber))).join('')}
          </div>
        </div>
        <div class="progress-detail-card">
          <span>解锁内容预览</span>
          <ul class="progress-unlock-list">
            ${stage.unlockedGames.map((gameKey) => `<li>🎮 ${GAME_LABELS[gameKey] || gameKey}</li>`).join('')}
            ${stage.unlockedExperiments.map((experimentId) => `<li>🧪 ${EXPERIMENT_LABELS[experimentId] || experimentId}</li>`).join('')}
            ${stage.unlockedFeatures.map((featureKey) => `<li>✨ ${FEATURE_LABELS[featureKey] || featureKey}</li>`).join('')}
          </ul>
        </div>
      </div>
    </article>
  `;
}

function renderElementChip(atomicNumber, element, learned) {
  const label = element ? `${element.chineseName} (${element.symbol})` : `元素 ${atomicNumber}`;
  return `<span class="stage-element-chip ${learned ? 'is-learned' : ''}">${learned ? '✓' : '•'} ${label}</span>`;
}

function renderActivityList(activityLog, snapshot) {
  if (!activityLog.length) {
    return '<div class="activity-empty">还没有学习活动，去点亮第一个元素吧。</div>';
  }

  const elementsMap = new Map(snapshot.elements.map((element) => [element.atomicNumber, element]));

  return activityLog.slice(0, 6).map((entry) => {
    const description = resolveActivityDescription(entry, elementsMap);
    return `
      <article class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <strong>${entry.title}</strong>
          <p>${description}</p>
          <span>${formatDate(entry.timestamp)}</span>
        </div>
      </article>
    `;
  }).join('');
}

function resolveActivityDescription(entry, elementsMap) {
  if (entry.type === 'elementlearned') {
    const atomicNumber = Number(entry.meta?.atomicNumber);
    const element = elementsMap.get(atomicNumber);
    return element
      ? `已学习 ${element.chineseName}（${element.symbol}），学习路径同步更新。`
      : entry.description;
  }

  if (entry.type === 'achievementunlocked') {
    const achievement = achievementsData.find((item) => item.id === entry.meta?.achievementId);
    return achievement ? `解锁成就「${achievement.title}」。` : entry.description;
  }

  if (entry.type === 'gamecompleted') {
    return `${GAME_LABELS[entry.meta?.gameKey] || entry.meta?.gameKey || '学习游戏'} 得分 ${entry.meta?.score ?? 0}。`;
  }

  if (entry.type === 'experimentcompleted') {
    return `${EXPERIMENT_LABELS[entry.meta?.experimentId] || entry.meta?.experimentId || '实验'} 已完成。`;
  }

  return entry.description;
}

function renderMetricBars(items, suffix = '') {
  return items.map((item) => `
    <div class="metric-bar-row">
      <div class="metric-bar-topline">
        <span>${item.label}</span>
        <strong>${item.value}${suffix}</strong>
      </div>
      <div class="progress-bar-track">
        <span class="progress-bar-fill" style="width:${Math.max(0, Math.min(100, item.value))}%"></span>
      </div>
    </div>
  `).join('');
}

function renderGameStats(gameScores, gamePlays) {
  return Object.entries(GAME_LABELS).map(([gameKey, label]) => {
    const bestScore = Number(gameScores[gameKey] || 0);
    const playCount = Number(gamePlays[gameKey] || 0);
    return `
      <article class="game-stat-item">
        <div>
          <strong>${label}</strong>
          <span>最高分 ${bestScore}</span>
        </div>
        <b>${playCount} 次</b>
      </article>
    `;
  }).join('');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
