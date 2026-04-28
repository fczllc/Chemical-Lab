/** ===== 实验室模块 ===== */
import { reactions } from '../data/reactions.js';
import { getCurrentSection, navigateTo } from './router.js';
import {
  getCompletedExperiments,
  getSelectedElement,
  markExperimentCompleted
} from './storage.js';

const SAFETY_LABELS = {
  safe: '安全',
  caution: '注意',
  dangerous: '危险',
  radioactive: '放射性',
  'extremely dangerous': '极度危险'
};

let focusedAtomicNumber = null;
let activeReactionId = reactions[0]?.id ?? null;

export function initLab() {
  renderLabShell();

  window.addEventListener('labfocusrequest', (event) => {
    focusedAtomicNumber = event.detail?.element?.atomicNumber ?? getSelectedElement()?.atomicNumber ?? null;
    if (getCurrentSection() === 'lab') {
      renderLabShell();
    }
  });

  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'lab') {
      if (focusedAtomicNumber === null) {
        focusedAtomicNumber = getSelectedElement()?.atomicNumber ?? null;
      }
      renderLabShell();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getCurrentSection() === 'lab') {
      navigateTo('periodic-table');
    }
  });
}

function renderLabShell() {
  const section = document.getElementById('lab');
  const list = section?.querySelector('.lab-list');
  const stage = document.getElementById('lab-stage');
  if (!section || !list || !stage) {
    return;
  }

  const selectedElement = getSelectedElement();
  const focusSymbol = selectedElement && selectedElement.atomicNumber === focusedAtomicNumber
    ? selectedElement.symbol
    : selectedElement?.symbol || null;
  const completed = getCompletedExperiments();
  const activeReaction = reactions.find((item) => item.id === activeReactionId) || reactions[0] || null;

  section.querySelector('h2')?.insertAdjacentHTML('afterend', '');
  ensureLabToolbar(section, selectedElement);

  list.innerHTML = reactions.map((reaction) => {
    const isRelated = focusSymbol ? reaction.reactants.some((item) => item.includes(focusSymbol)) : false;
    const isCompleted = completed.has(reaction.experimentId);
    return `
      <article class="lab-item-card ${reaction.id === activeReaction?.id ? 'is-active' : ''} ${isRelated ? 'is-related' : ''}">
        <div class="lab-item-card-header">
          <div>
            <h3>${reaction.name}</h3>
            <p class="lab-elements">${reaction.reactants.join(' + ')}</p>
          </div>
          <span class="lab-complete-badge ${isCompleted ? 'is-complete' : ''}">${isCompleted ? '已完成' : '未完成'}</span>
        </div>
        <p class="lab-safety-level">安全级别：${SAFETY_LABELS[reaction.safetyLevel] || reaction.safetyLevel}</p>
        <button class="hud-action-btn" data-reaction-open="${reaction.id}">查看实验</button>
      </article>
    `;
  }).join('');

  stage.innerHTML = activeReaction ? renderReactionDetail(activeReaction, completed.has(activeReaction.experimentId)) : '';

  list.querySelectorAll('[data-reaction-open]').forEach((button) => {
    button.addEventListener('click', () => {
      activeReactionId = button.dataset.reactionOpen;
      renderLabShell();
    });
  });

  stage.querySelector('[data-lab-back]')?.addEventListener('click', () => {
    navigateTo('periodic-table');
  });

  stage.querySelector('[data-mark-complete]')?.addEventListener('click', () => {
    if (!activeReaction) {
      return;
    }

    markExperimentCompleted(activeReaction.experimentId);
    renderLabShell();
  });
}

function ensureLabToolbar(section, selectedElement) {
  let toolbar = section.querySelector('.lab-toolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'lab-toolbar hud-shell';
    section.querySelector('h2')?.after(toolbar);
  }

  toolbar.innerHTML = `
    <div>
      <p class="hud-kicker">LAB ACCESS PANEL</p>
      <strong>${selectedElement ? `当前聚焦：${selectedElement.chineseName}（${selectedElement.symbol}）` : '当前未锁定元素'}</strong>
    </div>
    <button class="hud-action-btn" data-lab-return>返回周期表</button>
  `;

  toolbar.querySelector('[data-lab-return]')?.addEventListener('click', () => {
    navigateTo('periodic-table');
  });
}

function renderReactionDetail(reaction, isCompleted) {
  return `
    <div class="lab-stage-shell hud-shell">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">SIMULATION STANDBY</p>
          <h3>${reaction.name}</h3>
        </div>
        <button class="hud-action-btn" data-lab-back>返回周期表</button>
      </div>
      <div class="lab-stage-grid">
        <div class="lab-stage-card">
          <span>反应物</span>
          <strong>${reaction.reactants.join(' + ')}</strong>
        </div>
        <div class="lab-stage-card">
          <span>生成物</span>
          <strong>${reaction.products.join(' + ')}</strong>
        </div>
        <div class="lab-stage-card">
          <span>安全级别</span>
          <strong>${SAFETY_LABELS[reaction.safetyLevel] || reaction.safetyLevel}</strong>
        </div>
        <div class="lab-stage-card">
          <span>完成状态</span>
          <strong>${isCompleted ? '已完成记录' : '等待完成'}</strong>
        </div>
      </div>
      <p class="lab-stage-description">${reaction.description}</p>
      <p class="lab-stage-visual">模拟提示：${reaction.visualDescription}</p>
      <div class="lab-nav-row">
        <button class="hud-action-btn hud-action-btn-primary" data-mark-complete>${isCompleted ? '再次查看' : '标记完成'}</button>
      </div>
    </div>
  `;
}
