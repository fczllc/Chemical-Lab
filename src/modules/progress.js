/** ===== 学习进度模块 ===== */
import { learningPath } from '../data/learningPath.js';
import {
  getCollectedElements,
  getCompletedExperiments,
  getLearnedElements,
  getQuizScores,
  getUnlockedAchievements
} from './storage.js';

const TOTAL_EXPERIMENTS = 5;
const TOTAL_ELEMENTS = 118;

let isBound = false;

export function initProgress() {
  renderProgress();

  if (isBound) {
    return;
  }

  window.addEventListener('statechange', renderProgress);
  window.addEventListener('statereset', renderProgress);
  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'progress') {
      renderProgress();
    }
  });

  isBound = true;
}

function renderProgress() {
  const container = document.querySelector('#progress .progress-path');
  if (!container) {
    return;
  }

  const learned = getLearnedElements();
  const collected = getCollectedElements();
  const completedExperiments = getCompletedExperiments();
  const unlockedAchievements = getUnlockedAchievements();
  const quizScores = getQuizScores();
  const averageQuiz = quizScores.length
    ? Math.round(quizScores.reduce((sum, item) => sum + Number(item.score || 0), 0) / quizScores.length)
    : 0;
  const pathStages = learningPath?.stages || [];
  const overallPercent = Math.round((learned.size / TOTAL_ELEMENTS) * 100) || 0;

  container.innerHTML = `
    <div class="progress-dashboard hud-shell">
      <div class="progress-dashboard-header">
        <div>
          <p class="hud-kicker">LEARNING DOSSIER</p>
          <h3>实验室笔记与成长记录</h3>
        </div>
        <div class="progress-ring" style="--progress:${overallPercent}%">
          <div>
            <strong>${overallPercent}%</strong>
            <span>总进度</span>
          </div>
        </div>
      </div>
      <div class="progress-stat-grid">
        <article class="progress-stat-card"><span>已学习元素</span><strong>${learned.size}</strong><small>/ ${TOTAL_ELEMENTS}</small></article>
        <article class="progress-stat-card"><span>已收藏元素</span><strong>${collected.size}</strong><small>收藏柜持续扩展</small></article>
        <article class="progress-stat-card"><span>已完成实验</span><strong>${completedExperiments.size}</strong><small>/ ${TOTAL_EXPERIMENTS}</small></article>
        <article class="progress-stat-card"><span>已解锁成就</span><strong>${unlockedAchievements.size}</strong><small>持续解锁中</small></article>
        <article class="progress-stat-card"><span>平均测验分</span><strong>${averageQuiz}</strong><small>最近学习表现</small></article>
      </div>
      <div class="progress-lab-strip">
        ${Array.from({ length: TOTAL_EXPERIMENTS }, (_, index) => `
          <span class="progress-lab-node ${index < completedExperiments.size ? 'is-complete' : ''}">${index + 1}</span>
        `).join('')}
      </div>
    </div>
    <div class="progress-stage-list">
      ${pathStages.map((stage) => renderStage(stage, learned)).join('')}
    </div>
  `;
}

function renderStage(stage, learned) {
  const total = Array.isArray(stage.requiredElements) ? stage.requiredElements.length : 0;
  const completed = (stage.requiredElements || []).filter((atomicNumber) => learned.has(atomicNumber)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return `
    <article class="progress-stage-card hud-shell ${percent === 100 ? 'is-complete' : ''}">
      <div class="progress-stage-top">
        <div>
          <p class="hud-kicker">PATHWAY NODE</p>
          <h3>${stage.name}</h3>
        </div>
        <strong>${completed}/${total}</strong>
      </div>
      <p>${stage.description || '继续学习相关元素以推进这一阶段。'}</p>
      <div class="progress-bar-track">
        <span class="progress-bar-fill" style="width:${percent}%"></span>
      </div>
    </article>
  `;
}
