/** ===== 故事模式模块 ===== */
import { elements } from '../data/elements.js';
import { getSelectedElement } from './storage.js';
import { getCurrentSection, navigateTo } from './router.js';

let currentStoryAtomicNumber = null;
let typewriterTimer = null;

export function initStoryMode() {
  renderStoryShell();

  window.addEventListener('storyrequested', (event) => {
    currentStoryAtomicNumber = event.detail?.element?.atomicNumber ?? getSelectedElement()?.atomicNumber ?? null;
    if (getCurrentSection() === 'story') {
      renderStoryShell();
    }
  });

  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'story') {
      if (currentStoryAtomicNumber === null) {
        currentStoryAtomicNumber = getSelectedElement()?.atomicNumber ?? null;
      }
      renderStoryShell();
    } else {
      clearTypewriter();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getCurrentSection() === 'story') {
      navigateTo('periodic-table');
    }
  });
}

function renderStoryShell() {
  const container = document.querySelector('#story .story-container');
  if (!container) {
    return;
  }

  const element = getCurrentStoryElement();
  if (!element) {
    clearTypewriter();
    container.innerHTML = `
      <div class="story-shell hud-shell">
        <div class="hud-shell-header">
          <div>
            <p class="hud-kicker">STORY LINK OFFLINE</p>
            <h3>先在主页选择一个元素</h3>
          </div>
          <button class="hud-action-btn" data-story-back>返回周期表</button>
        </div>
        <div class="story-empty-state">
          <p>故事模式会根据你刚才在周期表里选中的元素加载专属小故事，并保持返回后的详情状态。</p>
        </div>
      </div>
    `;
    bindStoryActions(container, null);
    return;
  }

  const storyIndex = elements.findIndex((item) => item.atomicNumber === element.atomicNumber);
  const previousElement = elements[storyIndex - 1] || null;
  const nextElement = elements[storyIndex + 1] || null;
  const storyText = element.story || `${element.chineseName} 的故事正在整理中。`;

  container.innerHTML = `
    <div class="story-shell hud-shell" style="--story-accent: ${element.color || 'var(--neon-cyan)'};">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">ELEMENT STORY ARCHIVE</p>
          <h3>${element.chineseName} · ${element.symbol}</h3>
        </div>
        <button class="hud-action-btn" data-story-back>返回周期表</button>
      </div>
      <div class="story-hero">
        <div class="story-orbital-badge">
          <span class="story-atomic-number">${element.atomicNumber}</span>
          <span class="story-symbol">${element.symbol}</span>
        </div>
        <div class="story-meta-grid">
          <div class="story-meta-card"><span>中文名</span><strong>${element.chineseName}</strong></div>
          <div class="story-meta-card"><span>英文名</span><strong>${element.englishName}</strong></div>
          <div class="story-meta-card"><span>发现者</span><strong>${element.discoveredBy || '未知'}</strong></div>
          <div class="story-meta-card"><span>发现年份</span><strong>${element.discoveryYear ?? '未知'}</strong></div>
        </div>
      </div>
      <div class="story-transcript-panel">
        <div class="story-transcript-header">
          <span class="hud-kicker">NARRATIVE FEED</span>
          <span>${element.electronConfiguration || '电子排布待补充'}</span>
        </div>
        <div class="story-body" aria-live="polite"></div>
      </div>
      <div class="story-nav-row">
        <button class="hud-action-btn" data-story-prev ${previousElement ? '' : 'disabled'}>上一个</button>
        <button class="hud-action-btn hud-action-btn-primary" data-story-next ${nextElement ? '' : 'disabled'}>下一个</button>
      </div>
    </div>
  `;

  bindStoryActions(container, { previousElement, nextElement });
  startTypewriter(container.querySelector('.story-body'), storyText);
}

function bindStoryActions(container, neighbors) {
  container.querySelector('[data-story-back]')?.addEventListener('click', () => {
    navigateTo('periodic-table');
  });

  container.querySelector('[data-story-prev]')?.addEventListener('click', () => {
    if (!neighbors?.previousElement) {
      return;
    }

    currentStoryAtomicNumber = neighbors.previousElement.atomicNumber;
    renderStoryShell();
  });

  container.querySelector('[data-story-next]')?.addEventListener('click', () => {
    if (!neighbors?.nextElement) {
      return;
    }

    currentStoryAtomicNumber = neighbors.nextElement.atomicNumber;
    renderStoryShell();
  });
}

function getCurrentStoryElement() {
  if (currentStoryAtomicNumber === null) {
    return getSelectedElement();
  }

  return elements.find((element) => element.atomicNumber === currentStoryAtomicNumber) || null;
}

function startTypewriter(target, text) {
  if (!target) {
    return;
  }

  clearTypewriter();
  target.textContent = '';

  let index = 0;
  typewriterTimer = window.setInterval(() => {
    index += 2;
    target.textContent = text.slice(0, index);

    if (index >= text.length) {
      clearTypewriter();
    }
  }, 24);
}

function clearTypewriter() {
  if (typewriterTimer !== null) {
    window.clearInterval(typewriterTimer);
    typewriterTimer = null;
  }
}
