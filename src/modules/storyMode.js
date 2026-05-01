/** ===== 故事模式模块 ===== */
import { elements, storyMediaByAtomicNumber } from '../data/index.js';
import { getSelectedElement } from './storage.js';
import { getCurrentSection, navigateTo } from './router.js';

const SAFE_COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z-]+|var\(--[a-zA-Z0-9-]+\))$/;
const LOCAL_STORY_MEDIA_PATTERN = /^\/assets\/elements\/(discovery|specimens)\/[\w.-]+\.webp$/;

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
  const storyMediaRecord = storyMediaByAtomicNumber.get(element.atomicNumber) || null;
  const storyAccent = getSafeStoryAccent(element.color);

  container.innerHTML = `
    <div class="story-shell hud-shell" style="--story-accent: ${escapeAttribute(storyAccent)};">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">ELEMENT STORY ARCHIVE</p>
          <h3>${escapeHTML(element.chineseName)} · ${escapeHTML(element.symbol)}</h3>
        </div>
      </div>
      <div class="story-hero">
        <div class="story-orbital-badge">
          <span class="story-atomic-number">${escapeHTML(element.atomicNumber)}</span>
          <span class="story-symbol">${escapeHTML(element.symbol)}</span>
        </div>
        ${renderStoryMediaGrid(storyMediaRecord)}
        <div class="story-meta-grid">
          <div class="story-meta-card"><span>中文名</span><strong>${escapeHTML(element.chineseName)}</strong></div>
          <div class="story-meta-card"><span>英文名</span><strong>${escapeHTML(element.englishName)}</strong></div>
          <div class="story-meta-card"><span>发现者</span><strong>${escapeHTML(element.discoveredBy || '未知')}</strong></div>
          <div class="story-meta-card"><span>发现年份</span><strong>${escapeHTML(element.discoveryYear ?? '未知')}</strong></div>
        </div>
      </div>
      <div class="story-transcript-panel">
        <div class="story-transcript-header">
          <span class="hud-kicker">NARRATIVE FEED</span>
          <span>${escapeHTML(element.electronConfiguration || '电子排布待补充')}</span>
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

function renderStoryMediaGrid(storyMedia) {
  if (!storyMedia) {
    return '';
  }

  const cards = [
    renderStoryMediaCard(storyMedia.discoveryMedia, '发现故事', 'discovery'),
    renderStoryMediaCard(storyMedia.specimenMedia, '元素样品', 'specimen')
  ].filter(Boolean);

  if (cards.length === 0) {
    return '';
  }

  return `
    <div class="story-media-grid" aria-label="故事媒体证据卡">
      ${cards.join('')}
    </div>
  `;
}

function renderStoryMediaCard(media, label, side) {
  if (!media || !isLocalStoryMediaSrc(media.src)) {
    return '';
  }

  const alt = sanitizePlainText(media.altZh, `${media.symbol || ''}${label}图片`);
  const source = sanitizePlainText(media.source, '图片来源：');

  return `
    <article class="story-media-card story-media-card-${escapeAttribute(side)}">
      <div class="story-media-frame">
        <img
          src="${escapeAttribute(media.src)}"
          alt="${escapeAttribute(alt)}"
          loading="lazy"
          decoding="async"
          width="800"
          height="520"
        />
      </div>
      <div class="story-media-source">图片来源：${escapeHTML(source)}</div>
    </article>
  `;
}

function getMediaDisclosure(media) {
  if (media.sourceOrigin === 'ai_generated') {
    return {
      badge: 'AI教学场景',
      note: sanitizePlainText(media.aiDisclosureZh, media.fallbackReason || '')
    };
  }

  if (media.sourceOrigin === 'project_generated') {
    return {
      badge: media.fallbackReason ? '教学场景' : '项目生成',
      note: sanitizePlainText(media.fallbackReason, '')
    };
  }

  if (media.fallbackReason) {
    return {
      badge: '替代图像',
      note: sanitizePlainText(media.fallbackReason, '')
    };
  }

  if (media.aiDisclosureZh) {
    return {
      badge: 'AI说明',
      note: sanitizePlainText(media.aiDisclosureZh, '')
    };
  }

  return { badge: '', note: '' };
}

function isLocalStoryMediaSrc(src) {
  return typeof src === 'string' && LOCAL_STORY_MEDIA_PATTERN.test(src);
}

function bindStoryActions(container, neighbors) {
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

function getSafeStoryAccent(color) {
  const requestedColor = typeof color === 'string' ? color.trim() : '';
  if (requestedColor && SAFE_COLOR_PATTERN.test(requestedColor)) {
    return requestedColor;
  }

  return 'var(--neon-cyan)';
}

function sanitizePlainText(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  return text || fallback;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll('`', '&#96;');
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
