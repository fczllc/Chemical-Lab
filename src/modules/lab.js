/** ===== 实验室模块 ===== */
import { reactions } from '../data/reactions.js';
import { getCurrentSection, navigateTo } from './router.js';
import {
  getCompletedExperiments,
  getSelectedElement,
  getSettings,
  markExperimentCompleted
} from './storage.js';

const SAFETY_LABELS = {
  safe: '安全',
  caution: '注意',
  dangerous: '危险',
  radioactive: '放射性',
  'extremely dangerous': '极度危险'
};

const EQUATION_MAP = {
  'reaction-hydrogen-combustion': '2H2 + O2 → 2H2O',
  'reaction-iron-rusting': '4Fe + 3O2 → 2Fe2O3',
  'reaction-sodium-water': '2Na + 2H2O → 2NaOH + H2↑',
  'reaction-salt-formation': '2Na + Cl2 → 2NaCl',
  'reaction-oxygen-supports-combustion': 'C + O2 → CO2'
};

const SAFETY_THEME = {
  safe: { label: '安全', color: '#4ade80', glow: 'rgba(74, 222, 128, 0.35)', icon: '🟢' },
  caution: { label: '注意', color: '#facc15', glow: 'rgba(250, 204, 21, 0.35)', icon: '🟡' },
  dangerous: { label: '危险', color: '#fb923c', glow: 'rgba(251, 146, 60, 0.4)', icon: '🟠' },
  radioactive: { label: '放射性', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.4)', icon: '🟣' },
  'extremely dangerous': { label: '极度危险', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)', icon: '🔴' }
};

const DANGEROUS_LEVELS = new Set(['dangerous', 'radioactive', 'extremely dangerous']);

let focusedAtomicNumber = null;
let activeReactionId = reactions[0]?.id ?? null;
let currentView = 'detail';
let safetyConfirmed = false;
let simulationRunId = 0;
let completionTimer = null;

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
      return;
    }

    clearSimulationTimer();
  });

  window.addEventListener('performancemodechange', () => {
    if (getCurrentSection() === 'lab' && currentView === 'simulation') {
      renderLabShell();
      const activeReaction = reactions.find((item) => item.id === activeReactionId);
      if (activeReaction) {
        startSimulation(activeReaction);
      }
    }
  });

  window.addEventListener('statereset', () => {
    currentView = 'detail';
    safetyConfirmed = false;
    clearSimulationTimer();
    renderLabShell();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getCurrentSection() === 'lab') {
      if (currentView === 'detail') {
        navigateTo('periodic-table');
        return;
      }

      currentView = 'detail';
      safetyConfirmed = false;
      clearSimulationTimer();
      renderLabShell();
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

  ensureLabToolbar(section, selectedElement);

  list.innerHTML = reactions.map((reaction) => {
    const isRelated = focusSymbol ? reaction.reactants.some((item) => item.includes(focusSymbol)) : false;
    const isCompleted = completed.has(reaction.experimentId);
    const safetyTheme = getSafetyTheme(reaction.safetyLevel);

    return `
      <article class="lab-item-card ${reaction.id === activeReaction?.id ? 'is-active' : ''} ${isRelated ? 'is-related' : ''}" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
        <div class="lab-item-card-header">
          <div>
            <h3>${reaction.name}</h3>
            <p class="lab-elements">${reaction.reactants.join(' + ')}</p>
          </div>
          <span class="lab-complete-badge ${isCompleted ? 'is-complete' : ''}">${isCompleted ? '✓ 已完成' : '未完成'}</span>
        </div>
        <div class="lab-card-meta-row">
          <span class="lab-safety-pill level-${reaction.safetyLevel.replace(/\s+/g, '-')}">${safetyTheme.icon} ${SAFETY_LABELS[reaction.safetyLevel] || reaction.safetyLevel}</span>
          <span class="lab-card-status">${isRelated ? '与当前元素相关' : '通用演示实验'}</span>
        </div>
        <p class="lab-card-description">${reaction.description}</p>
        <button class="hud-action-btn" data-reaction-open="${reaction.id}">查看实验</button>
      </article>
    `;
  }).join('');

  stage.innerHTML = activeReaction ? renderStageContent(activeReaction, completed.has(activeReaction.experimentId)) : '';

  list.querySelectorAll('[data-reaction-open]').forEach((button) => {
    button.addEventListener('click', () => {
      activeReactionId = button.dataset.reactionOpen;
      currentView = 'detail';
      safetyConfirmed = false;
      clearSimulationTimer();
      renderLabShell();
    });
  });

  if (activeReaction) {
    bindStageEvents(stage, activeReaction, completed.has(activeReaction.experimentId));
  }
}

function bindStageEvents(stage, activeReaction, isCompleted) {
  stage.querySelector('[data-lab-back]')?.addEventListener('click', () => {
    currentView = 'detail';
    safetyConfirmed = false;
    clearSimulationTimer();
    renderLabShell();
  });

  stage.querySelector('[data-lab-return-list]')?.addEventListener('click', () => {
    currentView = 'detail';
    safetyConfirmed = false;
    clearSimulationTimer();
    renderLabShell();
  });

  stage.querySelector('[data-lab-open-safety]')?.addEventListener('click', () => {
    currentView = 'safety';
    renderLabShell();
  });

  stage.querySelector('[data-lab-start]')?.addEventListener('click', () => {
    currentView = 'safety';
    safetyConfirmed = false;
    renderLabShell();
  });

  const confirmationToggle = stage.querySelector('[data-safety-confirm]');
  const launchButton = stage.querySelector('[data-launch-simulation]');

  confirmationToggle?.addEventListener('change', () => {
    safetyConfirmed = confirmationToggle.checked;
    if (launchButton) {
      launchButton.disabled = DANGEROUS_LEVELS.has(activeReaction.safetyLevel) && !safetyConfirmed;
    }
  });

  launchButton?.addEventListener('click', () => {
    if (DANGEROUS_LEVELS.has(activeReaction.safetyLevel) && !safetyConfirmed) {
      return;
    }

    currentView = 'simulation';
    renderLabShell();
    startSimulation(activeReaction, isCompleted);
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
      <p class="lab-toolbar-meta">已完成实验 ${getCompletedExperiments().size}/${reactions.length} · 点击实验卡进入模拟流程</p>
    </div>
    <button class="hud-action-btn" data-lab-return>返回周期表</button>
  `;

  toolbar.querySelector('[data-lab-return]')?.addEventListener('click', () => {
    navigateTo('periodic-table');
  });
}

function renderStageContent(reaction, isCompleted) {
  if (currentView === 'safety') {
    return renderSafetyView(reaction, isCompleted);
  }

  if (currentView === 'simulation') {
    return renderSimulationView(reaction);
  }

  if (currentView === 'result') {
    return renderResultView(reaction, isCompleted);
  }

  return renderReactionDetail(reaction, isCompleted);
}

function renderReactionDetail(reaction, isCompleted) {
  const safetyTheme = getSafetyTheme(reaction.safetyLevel);
  return `
    <div class="lab-stage-shell hud-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">SIMULATION STANDBY</p>
          <h3>${reaction.name}</h3>
        </div>
        <div class="lab-detail-actions">
          <button class="hud-action-btn" data-lab-open-safety>安全守则</button>
          <button class="hud-action-btn" data-lab-back>返回列表</button>
        </div>
      </div>
      <div class="lab-equation-card">
        <span>反应方程式</span>
        <strong>${formatFormula(EQUATION_MAP[reaction.id] || `${reaction.reactants.join(' + ')} → ${reaction.products.join(' + ')}`)}</strong>
      </div>
      <div class="lab-stage-grid">
        <div class="lab-stage-card">
          <span>反应物</span>
          <strong>${reaction.reactants.map(formatFormula).join(' + ')}</strong>
        </div>
        <div class="lab-stage-card">
          <span>生成物</span>
          <strong>${reaction.products.map(formatFormula).join(' + ')}</strong>
        </div>
        <div class="lab-stage-card">
          <span>安全级别</span>
          <strong class="lab-safety-pill level-${reaction.safetyLevel.replace(/\s+/g, '-')}">${safetyTheme.icon} ${SAFETY_LABELS[reaction.safetyLevel] || reaction.safetyLevel}</strong>
        </div>
        <div class="lab-stage-card">
          <span>完成状态</span>
          <strong>${isCompleted ? '已完成记录' : '等待完成'}</strong>
        </div>
      </div>
      <div class="lab-stage-layout">
        <div class="lab-stage-main">
          <p class="lab-stage-description">${reaction.description}</p>
          <div class="lab-notebook-card">
            <span class="lab-notebook-title">实验步骤</span>
            <ol class="lab-steps-list">
              ${(reaction.steps || []).map((step) => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        </div>
        <aside class="lab-stage-sidebar">
          <div class="lab-stage-card lab-safety-notes-card">
            <span>安全注意事项</span>
            <ul class="lab-safety-list">
              ${(reaction.safetyNotes || []).map((note) => `<li>${note}</li>`).join('')}
            </ul>
          </div>
          <div class="lab-stage-card lab-visual-card">
            <span>视觉描述</span>
            <strong>${reaction.visualDescription}</strong>
          </div>
        </aside>
      </div>
      <div class="lab-nav-row">
        <button class="hud-action-btn hud-action-btn-primary" data-lab-start>${isCompleted ? '再次开始实验' : '开始实验'}</button>
      </div>
    </div>
  `;
}

function renderSafetyView(reaction, isCompleted) {
  const safetyTheme = getSafetyTheme(reaction.safetyLevel);
  const requiresConfirmation = DANGEROUS_LEVELS.has(reaction.safetyLevel);
  return `
    <div class="lab-stage-shell hud-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">SAFETY PROTOCOL</p>
          <h3>${reaction.name} · 安全提示</h3>
        </div>
        <button class="hud-action-btn" data-lab-back>返回详情</button>
      </div>
      <div class="lab-safety-modal">
        <div class="lab-safety-alert level-${reaction.safetyLevel.replace(/\s+/g, '-')}">
          <strong>${safetyTheme.icon} ${SAFETY_LABELS[reaction.safetyLevel] || reaction.safetyLevel}</strong>
          <p>${requiresConfirmation ? '该实验在真实世界中风险较高，必须确认安全事项后才能继续虚拟模拟。' : '开始前请先阅读本次实验的操作提示与实验守则。'}</p>
        </div>
        <div class="lab-stage-layout">
          <div class="lab-notebook-card">
            <span class="lab-notebook-title">实验前检查表</span>
            <ol class="lab-steps-list">
              ${(reaction.steps || []).map((step) => `<li>${step}</li>`).join('')}
            </ol>
          </div>
          <aside class="lab-stage-sidebar">
            <div class="lab-stage-card">
              <span>安全守则</span>
              <ul class="lab-safety-list">
                ${(reaction.safetyNotes || []).map((note) => `<li>${note}</li>`).join('')}
              </ul>
            </div>
            <div class="lab-stage-card">
              <span>当前状态</span>
              <strong>${isCompleted ? '你已经完成过此实验，可再次复习。' : '首次模拟将写入实验完成记录。'}</strong>
            </div>
          </aside>
        </div>
        <label class="lab-confirm-row ${requiresConfirmation ? '' : 'is-optional'}">
          <input type="checkbox" data-safety-confirm ${!requiresConfirmation ? 'checked' : ''}>
          <span>${requiresConfirmation ? '我已了解安全事项，并知道这是虚拟演示。' : '我已阅读安全说明。'}</span>
        </label>
        <div class="lab-nav-row">
          <button class="hud-action-btn hud-action-btn-primary" data-launch-simulation ${requiresConfirmation ? 'disabled' : ''}>进入模拟视图</button>
        </div>
      </div>
    </div>
  `;
}

function renderSimulationView(reaction) {
  const safetyTheme = getSafetyTheme(reaction.safetyLevel);
  const performanceMode = getSettings().performanceMode || 'normal';
  const isSimplified = performanceMode === 'normal';
  const duration = getSimulationDuration(reaction.id, performanceMode);

  return `
    <div class="lab-stage-shell hud-shell lab-simulation-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">REACTION IN PROGRESS</p>
          <h3>${reaction.name}</h3>
        </div>
        <button class="hud-action-btn" data-lab-back>中止并返回</button>
      </div>
      <div class="lab-simulation-meta">
        <span>${formatFormula(EQUATION_MAP[reaction.id] || '')}</span>
        <span>${isSimplified ? '当前为 normal 模式：已启用简化动画。' : '高性能模式：显示增强粒子与发光细节。'}</span>
      </div>
      <div class="lab-canvas-frame">
        <canvas id="lab-simulation-canvas" class="lab-simulation-canvas" width="980" height="520"></canvas>
        <div class="lab-canvas-overlay">
          <span>反应视觉描述：${reaction.visualDescription}</span>
          <span>预计模拟时长：${(duration / 1000).toFixed(1)} 秒</span>
        </div>
      </div>
    </div>
  `;
}

function renderResultView(reaction, isCompleted) {
  const safetyTheme = getSafetyTheme(reaction.safetyLevel);
  return `
    <div class="lab-stage-shell hud-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">EXPERIMENT LOGGED</p>
          <h3>${reaction.name} · 实验总结</h3>
        </div>
        <button class="hud-action-btn" data-lab-back>返回详情</button>
      </div>
      <div class="lab-result-grid">
        <div class="lab-stage-card">
          <span>结果总结</span>
          <strong>${reaction.description}</strong>
        </div>
        <div class="lab-stage-card">
          <span>观察到的现象</span>
          <strong>${reaction.visualDescription}</strong>
        </div>
        <div class="lab-stage-card">
          <span>实验记录</span>
          <strong>${isCompleted ? '已写入完成状态，并会同步到进度与成就系统。' : '本次实验已完成。'}</strong>
        </div>
        <div class="lab-stage-card">
          <span>下一步</span>
          <strong>返回列表继续探索其他实验，或再次运行当前模拟。</strong>
        </div>
      </div>
      <div class="lab-nav-row lab-nav-row-split">
        <button class="hud-action-btn" data-lab-return-list>返回列表</button>
        <button class="hud-action-btn hud-action-btn-primary" data-lab-start>再次开始实验</button>
      </div>
    </div>
  `;
}

function startSimulation(reaction) {
  clearSimulationTimer();
  simulationRunId += 1;
  const runId = simulationRunId;

  window.requestAnimationFrame(() => {
    const canvas = document.getElementById('lab-simulation-canvas');
    if (!canvas || currentView !== 'simulation' || runId !== simulationRunId) {
      return;
    }

    runSimulation(canvas, reaction, runId);
  });

  completionTimer = window.setTimeout(() => {
    if (runId !== simulationRunId) {
      return;
    }

    markExperimentCompleted(reaction.experimentId);
    currentView = 'result';
    renderLabShell();
  }, getSimulationDuration(reaction.id, getSettings().performanceMode || 'normal'));
}

function clearSimulationTimer() {
  simulationRunId += 1;
  if (completionTimer !== null) {
    window.clearTimeout(completionTimer);
    completionTimer = null;
  }
}

function runSimulation(canvas, reaction, runId) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const performanceMode = getSettings().performanceMode || 'normal';
  const duration = getSimulationDuration(reaction.id, performanceMode);
  const startedAt = performance.now();
  const particleCount = performanceMode === 'high-performance' ? 28 : 12;

  function frame(now) {
    if (runId !== simulationRunId || currentView !== 'simulation') {
      return;
    }

    const progress = Math.min(1, (now - startedAt) / duration);
    drawSimulationFrame(context, canvas, reaction.id, progress, particleCount, performanceMode);

    if (progress < 1) {
      window.requestAnimationFrame(frame);
    }
  }

  window.requestAnimationFrame(frame);
}

function drawSimulationFrame(context, canvas, reactionId, progress, particleCount, performanceMode) {
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  const bg = context.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#07111f');
  bg.addColorStop(1, '#020617');
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  drawHudGrid(context, width, height, progress);

  switch (reactionId) {
    case 'reaction-hydrogen-combustion':
      drawHydrogenCombustion(context, width, height, progress, particleCount, performanceMode);
      break;
    case 'reaction-iron-rusting':
      drawIronRusting(context, width, height, progress, particleCount);
      break;
    case 'reaction-sodium-water':
      drawSodiumWater(context, width, height, progress, particleCount, performanceMode);
      break;
    case 'reaction-salt-formation':
      drawSaltFormation(context, width, height, progress, particleCount);
      break;
    case 'reaction-oxygen-supports-combustion':
      drawOxygenCombustion(context, width, height, progress, particleCount, performanceMode);
      break;
    default:
      break;
  }
}

function drawHudGrid(context, width, height, progress) {
  context.save();
  context.strokeStyle = 'rgba(34, 211, 238, 0.08)';
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += 56) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.fillStyle = 'rgba(34, 211, 238, 0.24)';
  context.fillRect(40, height - 28, (width - 80) * progress, 6);
  context.restore();
}

function drawHydrogenCombustion(context, width, height, progress, particleCount, performanceMode) {
  const flameHeight = 220 * Math.sin(progress * Math.PI);
  const centerX = width / 2;
  const baseY = height - 90;

  context.save();
  const flame = context.createRadialGradient(centerX, baseY - flameHeight * 0.4, 10, centerX, baseY, 180);
  flame.addColorStop(0, 'rgba(191, 219, 254, 0.95)');
  flame.addColorStop(0.4, 'rgba(59, 130, 246, 0.88)');
  flame.addColorStop(1, 'rgba(14, 165, 233, 0)');
  context.fillStyle = flame;
  context.beginPath();
  context.moveTo(centerX, baseY - flameHeight);
  context.quadraticCurveTo(centerX + 110, baseY - 40, centerX, baseY + 10);
  context.quadraticCurveTo(centerX - 110, baseY - 40, centerX, baseY - flameHeight);
  context.fill();

  const mistCount = performanceMode === 'high-performance' ? particleCount : Math.floor(particleCount * 0.7);
  for (let index = 0; index < mistCount; index += 1) {
    const t = (progress * 1.6 + index / mistCount) % 1;
    const x = centerX - 120 + index * (240 / mistCount) + Math.sin(t * 18) * 10;
    const y = baseY - 160 * t;
    context.fillStyle = `rgba(191, 219, 254, ${0.2 + 0.4 * (1 - t)})`;
    context.beginPath();
    context.arc(x, y, 3 + (1 - t) * 5, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawIronRusting(context, width, height, progress, particleCount) {
  const plateX = width * 0.24;
  const plateY = height * 0.2;
  const plateWidth = width * 0.52;
  const plateHeight = height * 0.48;

  context.save();
  context.fillStyle = '#cbd5e1';
  context.fillRect(plateX, plateY, plateWidth, plateHeight);

  for (let index = 0; index < particleCount * 3; index += 1) {
    const x = plateX + (index * 37) % plateWidth;
    const y = plateY + (index * 61) % plateHeight;
    const radius = 6 + (index % 5) * 2;
    const alpha = Math.max(0, progress - index / (particleCount * 3.5));
    context.fillStyle = `rgba(180, 83, 9, ${alpha * 0.85})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = `rgba(120, 53, 15, ${progress * 0.35})`;
  context.fillRect(plateX, plateY, plateWidth, plateHeight);
  context.restore();
}

function drawSodiumWater(context, width, height, progress, particleCount, performanceMode) {
  const waterY = height * 0.58;
  context.save();
  context.fillStyle = 'rgba(14, 116, 144, 0.6)';
  context.fillRect(80, waterY, width - 160, height - waterY - 40);

  const sodiumX = 180 + (width - 360) * Math.min(progress * 1.05, 1);
  const sodiumY = waterY - 18 + Math.sin(progress * 20) * 8;
  context.fillStyle = '#e2e8f0';
  context.beginPath();
  context.arc(sodiumX, sodiumY, 18, 0, Math.PI * 2);
  context.fill();

  for (let index = 0; index < particleCount; index += 1) {
    const bubbleOffset = (progress * 1.8 + index / particleCount) % 1;
    const bubbleX = sodiumX - 40 + (index % 6) * 16;
    const bubbleY = waterY - bubbleOffset * 120;
    context.fillStyle = `rgba(125, 211, 252, ${0.18 + (1 - bubbleOffset) * 0.5})`;
    context.beginPath();
    context.arc(bubbleX, bubbleY, 4 + (index % 3), 0, Math.PI * 2);
    context.fill();
  }

  const sparkMultiplier = performanceMode === 'high-performance' ? 1 : 0.55;
  for (let index = 0; index < particleCount; index += 1) {
    const burst = Math.max(0, progress - 0.55) / 0.45;
    const angle = (Math.PI * 2 * index) / particleCount;
    const distance = burst * (60 + index * 4) * sparkMultiplier;
    context.strokeStyle = `rgba(251, 191, 36, ${burst})`;
    context.beginPath();
    context.moveTo(sodiumX, sodiumY);
    context.lineTo(sodiumX + Math.cos(angle) * distance, sodiumY - Math.sin(angle) * distance);
    context.stroke();
  }
  context.restore();
}

function drawSaltFormation(context, width, height, progress, particleCount) {
  context.save();
  const leftX = width * 0.28;
  const rightX = width * 0.72;
  const centerY = height * 0.45;
  context.fillStyle = '#93c5fd';
  context.beginPath();
  context.arc(leftX + progress * 120, centerY, 48, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#bef264';
  context.beginPath();
  context.arc(rightX - progress * 120, centerY, 54, 0, Math.PI * 2);
  context.fill();

  const crystalProgress = Math.max(0, progress - 0.35) / 0.65;
  for (let index = 0; index < particleCount; index += 1) {
    const column = index % 7;
    const row = Math.floor(index / 7);
    const size = 12 + (index % 3) * 4;
    const alpha = Math.max(0, crystalProgress - index / (particleCount * 1.25));
    context.fillStyle = `rgba(248, 250, 252, ${alpha})`;
    context.fillRect(width * 0.42 + column * 24, height * 0.36 + row * 24, size, size);
  }
  context.restore();
}

function drawOxygenCombustion(context, width, height, progress, particleCount, performanceMode) {
  const baseX = width / 2;
  const baseY = height - 92;
  const flameScale = 0.6 + progress * 0.9;

  context.save();
  for (let layer = 0; layer < 3; layer += 1) {
    context.fillStyle = ['rgba(251, 191, 36, 0.95)', 'rgba(249, 115, 22, 0.8)', 'rgba(239, 68, 68, 0.55)'][layer];
    context.beginPath();
    context.moveTo(baseX, baseY - 120 * flameScale - layer * 16);
    context.quadraticCurveTo(baseX + 80 + layer * 24, baseY - 30, baseX, baseY + 8);
    context.quadraticCurveTo(baseX - 80 - layer * 24, baseY - 30, baseX, baseY - 120 * flameScale - layer * 16);
    context.fill();
  }

  const streaks = performanceMode === 'high-performance' ? particleCount : Math.floor(particleCount * 0.65);
  for (let index = 0; index < streaks; index += 1) {
    const startX = 120 + index * ((width - 240) / streaks);
    const endY = height * 0.25 + (index % 4) * 12;
    context.strokeStyle = `rgba(125, 211, 252, ${0.16 + progress * 0.42})`;
    context.beginPath();
    context.moveTo(startX, height * 0.2);
    context.lineTo(baseX + Math.sin(progress * 8 + index) * 40, endY + progress * 200);
    context.stroke();
  }
  context.restore();
}

function getSimulationDuration(reactionId, performanceMode) {
  const baseDuration = performanceMode === 'high-performance' ? 6200 : 4200;
  if (reactionId === 'reaction-iron-rusting') {
    return baseDuration + 1000;
  }
  if (reactionId === 'reaction-sodium-water') {
    return baseDuration - 400;
  }
  return baseDuration;
}

function getSafetyTheme(level) {
  return SAFETY_THEME[level] || SAFETY_THEME.caution;
}

function formatFormula(value) {
  return String(value || '').replace(/(\d+)/g, '<sub>$1</sub>');
}
