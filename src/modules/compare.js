/** ===== 对比模块 ===== */
import {
  clearComparedElements,
  getCompareList,
  removeComparedElement
} from './storage.js';
import {
  COMPARE_RARITY_LABELS,
  COMPARE_SAFETY_COLORS,
  ELEMENT_CATEGORY_LABELS,
  SAFETY_LABELS
} from '../data/contentMeta.js';
import { navigateTo } from './router.js';
import { electronConfigHTML } from './chemNotation.js';

const SAFETY_COLORS = COMPARE_SAFETY_COLORS;
const ROUTE_COMPARE_CONTAINER_ID = 'compare-container';
const MODAL_COMPARE_ID = 'compare-modal';
const MODAL_COMPARE_CONTENT_ID = 'compare-modal-content';

let elementsCatalog = [];
let listenersBound = false;
let modalListenersBound = false;
let toastTimer = null;
let compareModalOpener = null;

export function initCompare(elements) {
  elementsCatalog = Array.isArray(elements) ? [...elements] : [];
  renderCompareViews();
  bindCompareEvents();
  bindCompareModalEvents();
}

export function openCompareModal() {
  const modal = document.getElementById(MODAL_COMPARE_ID);
  if (!modal) {
    return;
  }

  compareModalOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  renderCompareModal();
  modal.removeAttribute('inert');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('compare-modal-close')?.focus();
}

export function closeCompareModal() {
  const modal = document.getElementById(MODAL_COMPARE_ID);
  if (!modal) {
    return;
  }

  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');

  if (compareModalOpener?.isConnected) {
    compareModalOpener.focus();
  }
  modal.setAttribute('inert', '');
  compareModalOpener = null;
}

export function showToast(message, type = 'info') {
  let toastEl = document.getElementById('compare-toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'compare-toast';
    toastEl.className = 'compare-toast';
    document.body.appendChild(toastEl);
  }

  const color = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#00f0ff';
  toastEl.style.setProperty('--toast-accent', color);
  toastEl.textContent = message;
  toastEl.classList.add('show');

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

function bindCompareEvents() {
  if (listenersBound) {
    return;
  }

  window.addEventListener('statechange', handleStateChange);
  window.addEventListener('compareupdated', renderCompareViews);
  window.addEventListener('statereset', renderCompareViews);
  listenersBound = true;
}

function bindCompareModalEvents() {
  if (modalListenersBound) {
    return;
  }

  const modal = document.getElementById(MODAL_COMPARE_ID);
  const closeBtn = document.getElementById('compare-modal-close');
  if (!modal) {
    return;
  }

  if (!modal.classList.contains('show')) {
    modal.setAttribute('inert', '');
  }

  closeBtn?.addEventListener('click', closeCompareModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeCompareModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('show')) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeCompareModal();
      return;
    }

    if (event.key === 'Tab') {
      trapCompareModalFocus(event, modal);
    }
  }, true);

  modalListenersBound = true;
}

function trapCompareModalFocus(event, modal) {
  const focusableElements = getFocusableElements(modal);
  if (focusableElements.length === 0) {
    event.preventDefault();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function getFocusableElements(container) {
  return [...container.querySelectorAll([
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(','))].filter((element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function handleStateChange(event) {
  if (event?.detail?.field === 'compareList') {
    renderCompareViews();
  }
}

function renderCompareViews() {
  renderComparePage();
  renderCompareModal();
}

function renderComparePage() {
  const container = document.getElementById(ROUTE_COMPARE_CONTAINER_ID);
  if (!container) {
    return;
  }

  renderCompareView(container, { mode: 'route' });
}

function renderCompareModal() {
  const container = document.getElementById(MODAL_COMPARE_CONTENT_ID);
  if (!container) {
    return;
  }

  renderCompareView(container, { mode: 'modal' });
}

function renderCompareView(container, { mode }) {
  const compareList = getCompareList();

  if (compareList.length === 0) {
    container.innerHTML = renderEmptyState(mode);
    bindCompareViewEvents(container, { mode });
    return;
  }

  container.innerHTML = `
    ${mode === 'modal' ? '' : renderCompareActionsBar(compareList.length)}
    <div class="compare-slots compare-slots--${compareList.length}">
      ${compareList.map((element) => renderElementCard(element)).join('')}
    </div>
  `;

  bindCompareViewEvents(container, { mode });
}

function renderCompareActionsBar(compareCount) {
  return `
    <div class="compare-actions-bar">
      <div class="compare-count">已选择 ${compareCount}/3 个元素</div>
      <div class="compare-actions">
        <button class="compare-btn compare-btn-clear" type="button">清空对比</button>
        <button class="compare-btn compare-btn-home" type="button">返回主页</button>
      </div>
    </div>
  `;
}

function renderEmptyState(mode = 'route') {
  if (mode === 'modal') {
    return `
      <div class="compare-page-empty compare-page-empty-modal">
      <div class="compare-empty-icon"><i data-lucide="arrow-left-right"></i></div>
        <strong>对比列表还是空的</strong>
        <p>把元素拖入底部对比预览，或选中元素后点击空槽，这里会同步刷新。</p>
      </div>
    `;
  }

  return `
    <div class="compare-page-empty">
      <div class="compare-empty-icon"><i data-lucide="arrow-left-right"></i></div>
      <strong>对比列表还是空的</strong>
      <p>把元素拖入底部对比预览，或选中元素后点击空槽，最多可放入 3 个元素，这里和首页预览会同步刷新。</p>
      <button class="compare-btn compare-btn-home" type="button">去添加元素</button>
    </div>
  `;
}

function renderElementCard(element) {
  const categoryLabel = ELEMENT_CATEGORY_LABELS[element.category] || element.category;
  const safetyLabel = SAFETY_LABELS[element.safety] || element.safety;
  const safetyColor = SAFETY_COLORS[element.safety] || '#94a3b8';
  const rarityLabel = COMPARE_RARITY_LABELS[element.rarity] || element.rarity;
  const topApplications = (element.applications || []).slice(0, 3);

  return `
    <article class="compare-card" style="--card-accent: ${element.color || '#38bdf8'}" data-atomic-number="${element.atomicNumber}">
      <div class="compare-card-glow"></div>
      <div class="compare-card-header">
        <div class="compare-card-symbol-box">
          <span class="compare-card-symbol">${element.symbol}</span>
          <span class="compare-card-number">#${element.atomicNumber}</span>
        </div>
        <div class="compare-card-names">
          <span class="compare-card-cn">${element.chineseName}</span>
          <span class="compare-card-en">${element.englishName}</span>
        </div>
      </div>
      <div class="compare-card-body">
        ${renderAttrRow('原子质量', element.atomicMass, 'atomicMass')}
        ${renderAttrRow('类别', `<span class="compare-tag" style="--tag-color: ${element.color || '#38bdf8'}">${categoryLabel}</span>`, 'category')}
        ${renderAttrRow('周期', `第 ${element.period} 周期`, 'period')}
        ${renderAttrRow('族', `第 ${element.group} 族`, 'group')}
        ${renderAttrRow('电子排布', element.electronConfiguration ? electronConfigHTML(element.electronConfiguration) : '—', 'electronConfiguration')}
        ${renderAttrRow('发现年份', element.discoveryYear, 'discoveryYear')}
        ${renderAttrRow('发现者', element.discoveredBy, 'discoveredBy')}
        ${renderAttrRow('用途', topApplications.length > 0 ? `<ul class="compare-app-list">${topApplications.map((app) => `<li>${app}</li>`).join('')}</ul>` : '—', 'applications')}
        ${renderAttrRow('安全性', `<span class="compare-safety-badge" style="--safety-color: ${safetyColor}">${safetyLabel}</span>`, 'safety')}
        ${renderAttrRow('稀有度', rarityLabel, 'rarity')}
      </div>
      <div class="compare-card-footer">
        <button class="compare-card-remove" type="button" data-atomic-number="${element.atomicNumber}" title="从对比中移除">
          <span><i data-lucide="x"></i></span> 移除
        </button>
      </div>
    </article>
  `;
}

function renderAttrRow(label, value, fieldKey = '') {
  const fieldClass = fieldKey ? ` compare-attr-row--${toKebabCase(fieldKey)}` : '';
  const fieldAttr = fieldKey ? ` data-compare-field="${fieldKey}"` : '';

  return `
    <div class="compare-attr-row${fieldClass}"${fieldAttr}>
      <span class="compare-attr-label">${label}</span>
      <span class="compare-attr-value">${value || '—'}</span>
    </div>
  `;
}

function toKebabCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function bindCompareViewEvents(container, { mode }) {
  if (!container) {
    return;
  }

  container.querySelectorAll('.compare-card-remove').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const atomicNumber = Number(event.currentTarget.dataset.atomicNumber);
      if (Number.isFinite(atomicNumber)) {
        removeComparedElement(atomicNumber);
        showToast('已从对比列表移除', 'info');
      }
    });
  });

  const clearBtn = container.querySelector('.compare-btn-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearComparedElements();
      showToast('对比列表已清空', 'info');
    });
  }

  const homeBtn = container.querySelector('.compare-btn-home');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      if (mode === 'modal') {
        closeCompareModal();
        return;
      }

      navigateTo('periodic-table');
    });
  }
}
