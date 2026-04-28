/** ===== 对比模块 ===== */
import {
  clearComparedElements,
  getCompareList,
  removeComparedElement
} from './storage.js';
import { navigateTo } from './router.js';

const CATEGORY_LABELS = {
  'alkali metal': '碱金属',
  'alkaline earth metal': '碱土金属',
  'transition metal': '过渡金属',
  'post-transition metal': '后过渡金属',
  metalloid: '类金属',
  'reactive nonmetal': '非金属',
  'noble gas': '稀有气体',
  halogen: '卤素',
  lanthanide: '镧系',
  actinide: '锕系'
};

const SAFETY_LABELS = {
  safe: '安全',
  caution: '注意',
  dangerous: '危险',
  radioactive: '放射性',
  'extremely dangerous': '极度危险'
};

const RARITY_LABELS = {
  common: '常见',
  uncommon: '较常见',
  rare: '稀有',
  'very rare': '极稀有',
  synthetic: '人工合成'
};

const SAFETY_COLORS = {
  safe: '#22c55e',
  caution: '#eab308',
  dangerous: '#f97316',
  radioactive: '#a855f7',
  'extremely dangerous': '#ef4444'
};

let elementsCatalog = [];
let listenersBound = false;
let toastTimer = null;

export function initCompare(elements) {
  elementsCatalog = Array.isArray(elements) ? [...elements] : [];
  renderComparePage();
  bindCompareEvents();
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
  window.addEventListener('compareupdated', renderComparePage);
  window.addEventListener('statereset', renderComparePage);
  listenersBound = true;
}

function handleStateChange(event) {
  if (event?.detail?.field === 'compareList') {
    renderComparePage();
  }
}

function renderComparePage() {
  const container = document.getElementById('compare-container');
  if (!container) {
    return;
  }

  const compareList = getCompareList();

  if (compareList.length === 0) {
    container.innerHTML = renderEmptyState();
    bindEmptyStateEvents();
    return;
  }

  container.innerHTML = `
    <div class="compare-actions-bar">
      <div class="compare-count">已选择 ${compareList.length}/3 个元素</div>
      <div class="compare-actions">
        <button class="compare-btn compare-btn-clear" type="button">清空对比</button>
        <button class="compare-btn compare-btn-home" type="button">返回主页</button>
      </div>
    </div>
    <div class="compare-slots compare-slots--${compareList.length}">
      ${compareList.map((element) => renderElementCard(element)).join('')}
    </div>
  `;

  bindCardEvents();
}

function renderEmptyState() {
  return `
    <div class="compare-page-empty">
      <div class="compare-empty-icon">&#8644;</div>
      <strong>对比列表还是空的</strong>
      <p>在右侧详情面板点击“加入对比”，最多可放入 3 个元素，这里和首页预览会同步刷新。</p>
      <button class="compare-btn compare-btn-home" type="button">去添加元素</button>
    </div>
  `;
}

function renderElementCard(element) {
  const categoryLabel = CATEGORY_LABELS[element.category] || element.category;
  const safetyLabel = SAFETY_LABELS[element.safety] || element.safety;
  const safetyColor = SAFETY_COLORS[element.safety] || '#94a3b8';
  const rarityLabel = RARITY_LABELS[element.rarity] || element.rarity;
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
        ${renderAttrRow('原子质量', element.atomicMass)}
        ${renderAttrRow('类别', `<span class="compare-tag" style="--tag-color: ${element.color || '#38bdf8'}">${categoryLabel}</span>`)}
        ${renderAttrRow('周期', `第 ${element.period} 周期`)}
        ${renderAttrRow('族', `第 ${element.group} 族`)}
        ${renderAttrRow('电子排布', element.electronConfiguration)}
        ${renderAttrRow('发现年份', element.discoveryYear)}
        ${renderAttrRow('发现者', element.discoveredBy)}
        ${renderAttrRow('用途', topApplications.length > 0 ? `<ul class="compare-app-list">${topApplications.map((app) => `<li>${app}</li>`).join('')}</ul>` : '—')}
        ${renderAttrRow('安全性', `<span class="compare-safety-badge" style="--safety-color: ${safetyColor}">${safetyLabel}</span>`)}
        ${renderAttrRow('稀有度', rarityLabel)}
      </div>
      <div class="compare-card-footer">
        <button class="compare-card-remove" type="button" data-atomic-number="${element.atomicNumber}" title="从对比中移除">
          <span>&#10005;</span> 移除
        </button>
      </div>
    </article>
  `;
}

function renderAttrRow(label, value) {
  return `
    <div class="compare-attr-row">
      <span class="compare-attr-label">${label}</span>
      <span class="compare-attr-value">${value || '—'}</span>
    </div>
  `;
}

function bindCardEvents() {
  const container = document.getElementById('compare-container');
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
    homeBtn.addEventListener('click', () => navigateTo('periodic-table'));
  }
}

function bindEmptyStateEvents() {
  const container = document.getElementById('compare-container');
  if (!container) {
    return;
  }

  const homeBtn = container.querySelector('.compare-btn-home');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => navigateTo('periodic-table'));
  }
}
