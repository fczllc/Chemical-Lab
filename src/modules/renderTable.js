/** ===== 周期表渲染 ===== */
import {
  getLearnedElements,
  markElementLearned,
  setSelectedElement,
  getSelectedElement
} from './storage.js';
import {
  ELEMENT_CATEGORY_LABELS,
  ELEMENT_CATEGORY_META,
  ELEMENT_CATEGORY_TABLE_COLORS,
  ELEMENT_RARITY_LABELS,
  RENDER_TABLE_SAFETY_META
} from '../data/contentMeta.js';

const categoryColors = ELEMENT_CATEGORY_TABLE_COLORS;

const rarityNames = ELEMENT_RARITY_LABELS;

const safetyMeta = RENDER_TABLE_SAFETY_META;

const PANEL_SWITCH_DURATION_MS = 320;

let elements = [];
let stateListenersBound = false;
let tooltipEl = null;

let filterState = { category: 'all', period: 'all', query: '' };

export function initPeriodicTable(data) {
  elements = data;
  renderTable();
  renderListView();
  renderLegend();
  setupCellInteractions();
  bindStateListeners();
  initViewModes();
  initTooltip();
  initKeyboardNavigation();

  const selected = getSelectedElement();
  if (selected) {
    restoreSelectedElementView({
      element: selected,
      scroll: false,
      emitEvent: false,
      animated: false
    });
  }
}

function bindStateListeners() {
  if (stateListenersBound) {
    return;
  }

  window.addEventListener('elementlearned', (event) => {
    const atomicNumber = event.detail.atomicNumber;
    document.querySelectorAll(
      `.element-cell[data-atomic-number="${atomicNumber}"], .element-list-row[data-atomic-number="${atomicNumber}"]`
    ).forEach((el) => {
      el.classList.add('learned');
    });
  });

  window.addEventListener('statereset', () => {
    document.querySelectorAll('.element-cell, .element-list-row').forEach((cell) => {
      cell.classList.remove('learned', 'selected');
    });
  });

  stateListenersBound = true;
}

function renderTable() {
  const grid = document.getElementById('periodic-grid');
  const laGrid = document.getElementById('la-grid');
  const acGrid = document.getElementById('ac-grid');

  if (!grid) return;

  grid.innerHTML = '';
  if (laGrid) laGrid.innerHTML = '';
  if (acGrid) acGrid.innerHTML = '';

  elements.forEach((element) => {
    const cell = createElementCell(element);

    if (element.category === 'lanthanide') {
      if (laGrid) laGrid.appendChild(cell);
    } else if (element.category === 'actinide') {
      if (acGrid) acGrid.appendChild(cell);
    } else {
      grid.appendChild(cell);
    }
  });

  positionCells();
}

function createElementCell(element) {
  const cell = document.createElement('div');
  cell.className = 'element-cell';
  cell.dataset.atomicNumber = element.atomicNumber;
  cell.dataset.testid = `element-cell-${element.atomicNumber}`;
  cell.dataset.category = element.category;
  cell.dataset.period = element.period;
  cell.dataset.group = element.group;
  cell.tabIndex = 0;

  if (getLearnedElements().has(element.atomicNumber)) {
    cell.classList.add('learned');
  }

  const rarityValues = { common: 0, uncommon: 1, rare: 2, 'very rare': 3, synthetic: 4 };
  if ((rarityValues[element.rarity] || 0) >= 4) {
    cell.classList.add('rare');
  }

  cell.innerHTML = `
    <span class="atomic-num">${element.atomicNumber}</span>
    <span class="symbol" style="color: ${categoryColors[element.category] || '#fff'}">${element.symbol}</span>
    <span class="chinese-name">${element.chineseName}</span>
    <span class="atomic-mass">${element.atomicMass}</span>
  `;

  cell.addEventListener('click', () => selectElement(element));
  setupCellHover(cell, element);
  setupCellKeyboard(cell, element);

  return cell;
}

function positionCells() {
  const grid = document.getElementById('periodic-grid');
  if (!grid) return;

  elements.forEach((element) => {
    if (element.category === 'lanthanide' || element.category === 'actinide') return;

    const cell = grid.querySelector(`[data-atomic-number="${element.atomicNumber}"]`);
    if (cell && element.x && element.y) {
      cell.style.gridColumn = element.x;
      cell.style.gridRow = element.y;
    }
  });
}

function selectElement(element) {
  setSelectedElement(element.atomicNumber);
  restoreSelectedElementView({ element });
}

function highlightSelectedElement(atomicNumber) {
  document.querySelectorAll('.element-cell, .element-list-row').forEach((cell) => {
    cell.classList.toggle('selected', Number.parseInt(cell.dataset.atomicNumber, 10) === atomicNumber);
  });
}

function openDetailPanel(element, options = {}) {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;

  const panelContent = panel.querySelector('.panel-content');
  const wasOpen = panel.classList.contains('open');

  if (options.markLearned !== false) {
    markElementLearned(element.atomicNumber);
  }
  populateDetailPanel(element);

  panel.classList.remove('closing');
  panel.classList.add('open');

  if (wasOpen) {
    panelContent?.classList.remove('content-switching');
    void panelContent?.offsetWidth;
    panelContent?.classList.add('content-switching');
    window.setTimeout(() => {
      panelContent?.classList.remove('content-switching');
    }, PANEL_SWITCH_DURATION_MS);
    return;
  }

  panel.classList.add('panel-opening');
  window.setTimeout(() => {
    panel.classList.remove('panel-opening');
  }, PANEL_SWITCH_DURATION_MS);
}

export function scrollElementIntoView(atomicNumber, options = {}) {
  if (!Number.isInteger(Number(atomicNumber))) {
    return false;
  }

  const target = document.querySelector(
    `.element-cell[data-atomic-number="${atomicNumber}"], .element-list-row[data-atomic-number="${atomicNumber}"]`
  );

  if (!target) {
    return false;
  }

  target.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'center',
    inline: options.inline || 'center'
  });

  return true;
}

export function restoreSelectedElementView(options = {}) {
  const element = options.element || getSelectedElement();
  if (!element) {
    return false;
  }

  highlightSelectedElement(element.atomicNumber);

  if (options.scroll !== false) {
    scrollElementIntoView(element.atomicNumber, options.scrollOptions);
  }

  openDetailPanel(element, {
    markLearned: options.markLearned,
    animated: options.animated
  });

  if (options.emitEvent !== false) {
    window.dispatchEvent(new CustomEvent('elementselected', { detail: { element } }));
  }

  return true;
}

function populateDetailPanel(element) {
  const hero = document.querySelector('.element-hero');
  if (hero) {
    const accentColor = element.color || categoryColors[element.category] || '#4dabf7';
    const categoryLabel = ELEMENT_CATEGORY_LABELS[element.category] || '未知';
    const rarityLabel = rarityNames[element.rarity] || element.rarity || '未知';
    const safety = safetyMeta[element.safety] || { label: element.safety || '未知', color: '#94a3b8' };

    hero.style.setProperty('--element-accent', accentColor);
    hero.innerHTML = `
      <span class="atomic-number">${element.atomicNumber}</span>
      <span class="symbol" style="color: ${categoryColors[element.category] || accentColor}">${element.symbol}</span>
      <span class="chinese-name">${element.chineseName}</span>
      <span class="english-name">${element.englishName}</span>
      <span class="atomic-mass">原子质量 ${element.atomicMass}</span>
      <div class="element-badges">
        <span class="element-badge" style="--badge-color: ${categoryColors[element.category] || '#64748b'}">${categoryLabel}</span>
        <span class="element-badge" style="--badge-color: ${accentColor}">${rarityLabel}</span>
        <span class="element-badge element-badge-safety" style="--badge-color: ${safety.color}">${safety.label}</span>
      </div>
    `;
  }

  const props = document.querySelector('.element-properties');
  if (props) {
    const categoryLabel = ELEMENT_CATEGORY_LABELS[element.category] || '未知';
    const rarityLabel = rarityNames[element.rarity] || element.rarity || '未知';
    const safety = safetyMeta[element.safety] || { label: element.safety || '未知', color: '#94a3b8' };
    const applications = Array.isArray(element.applications) && element.applications.length > 0
      ? `<ul class="property-list">${element.applications.map((item) => `<li>${item}</li>`).join('')}</ul>`
      : '<span class="property-muted">暂无记录</span>';

    props.innerHTML = `
      ${renderPropertyRow('ⓘ', '原子序数', `${element.atomicNumber}`)}
      ${renderPropertyRow('⚛', '符号', element.symbol)}
      ${renderPropertyRow('汉', '中文名', element.chineseName)}
      ${renderPropertyRow('EN', '英文名', element.englishName)}
      ${renderPropertyRow('⚖', '原子质量', element.atomicMass)}
      ${renderPropertyRow('☄', '类别', `<span class="inline-badge" style="--badge-color: ${categoryColors[element.category] || '#64748b'}">${categoryLabel}</span>`)}
      ${renderPropertyRow('✦', '稀有度', `<span class="inline-badge" style="--badge-color: ${element.color || '#38bdf8'}">${rarityLabel}</span>`)}
      ${renderPropertyRow('❄', '电子排布', element.electronConfiguration || '未知')}
      ${renderPropertyRow('★', '发现者', element.discoveredBy || '未知')}
      ${renderPropertyRow('⌛', '发现年份', `${element.discoveryYear ?? '未知'}`)}
      ${renderPropertyRow('⚠', '安全性', `<span class="inline-badge inline-badge-safety" style="--badge-color: ${safety.color}">${safety.label}</span>`)}
      ${renderPropertyRow('✎', '常见用途', applications, true)}
    `;
  }

  const story = document.querySelector('.element-story');
  if (story) {
    story.innerHTML = `
      <h4>元素小故事</h4>
      <p>${element.story || '这个元素的故事正在整理中。'}</p>
    `;
  }

  const funfact = document.querySelector('.element-funfact');
  if (funfact) {
    funfact.innerHTML = `
      <h4>趣味事实</h4>
      <p>${element.funFact || '更多有趣知识即将补充。'}</p>
    `;
  }
}

function renderPropertyRow(icon, label, valueHtml, stacked = false) {
  return `
    <div class="property-row${stacked ? ' property-row-stacked' : ''}">
      <span class="property-label"><span class="icon">${icon}</span>${label}</span>
      <span class="property-value${stacked ? ' property-value-rich' : ''}">${valueHtml}</span>
    </div>
  `;
}

function renderLegend() {
  const container = document.querySelector('.legend-items');
  if (!container) return;

  container.innerHTML = Object.entries(ELEMENT_CATEGORY_LABELS)
    .filter(([key]) => key !== 'unknown')
    .map(([key, name]) => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${categoryColors[key]}"></span>
        <span>${name}</span>
      </div>
    `).join('');
}

function setupCellInteractions() {
  // 已在 createElementCell 中设置点击事件
}

export function getElementByNumber(num) {
  return elements.find((element) => element.atomicNumber === num);
}

export function getElementBySymbol(sym) {
  return elements.find((element) => element.symbol === sym);
}

export function applyFilters(updates = {}) {
  filterState = { ...filterState, ...updates };
  const { category, period, query } = filterState;
  const q = query.toLowerCase().trim();

  document.querySelectorAll('.element-cell, .element-list-row').forEach((cell) => {
    const atomicNumber = Number.parseInt(cell.dataset.atomicNumber, 10);
    const element = elements.find((item) => item.atomicNumber === atomicNumber);
    if (!element) return;

    const catMatch = category === 'all' || cell.dataset.category === category;
    const periodMatch = period === 'all' || cell.dataset.period === period;

    let queryMatch = true;
    if (q) {
      queryMatch =
        element.symbol.toLowerCase().includes(q) ||
        element.englishName.toLowerCase().includes(q) ||
        element.chineseName.includes(q) ||
        element.atomicNumber.toString() === q;
    }

    const isMatch = catMatch && periodMatch && queryMatch;
    cell.classList.toggle('filtered-out', !isMatch);
  });
}

export function filterCells(category, period) {
  applyFilters({ category, period });
}

export function searchElements(query) {
  applyFilters({ query });
}

/* ===== 列表视图 ===== */

function renderListView() {
  const section = document.getElementById('periodic-table');
  if (!section) return;

  let listContainer = document.getElementById('periodic-list');
  if (!listContainer) {
    listContainer = document.createElement('div');
    listContainer.id = 'periodic-list';
    listContainer.className = 'periodic-list hidden';
    const wrapper = section.querySelector('.periodic-table-wrapper');
    wrapper?.after(listContainer);
  }
  listContainer.innerHTML = '';

  elements.forEach((element) => {
    const row = createElementListRow(element);
    listContainer.appendChild(row);
  });
}

function createElementListRow(element) {
  const row = document.createElement('div');
  row.className = 'element-list-row';
  row.dataset.atomicNumber = element.atomicNumber;
  row.dataset.category = element.category;
  row.dataset.period = element.period;
  row.dataset.group = element.group;
  row.tabIndex = 0;

  if (getLearnedElements().has(element.atomicNumber)) {
    row.classList.add('learned');
  }
  const rarityValues = { common: 0, uncommon: 1, rare: 2, 'very rare': 3, synthetic: 4 };
  if ((rarityValues[element.rarity] || 0) >= 4) {
    row.classList.add('rare');
  }

  row.innerHTML = `
    <span class="list-atomic-num">${element.atomicNumber}</span>
    <span class="list-symbol" style="color: ${categoryColors[element.category] || '#fff'}">${element.symbol}</span>
    <span class="list-chinese-name">${element.chineseName}</span>
    <span class="list-english-name">${element.englishName}</span>
    <span class="list-category">${ELEMENT_CATEGORY_LABELS[element.category] || element.category}</span>
    <span class="list-mass">${element.atomicMass}</span>
  `;

  row.addEventListener('click', () => selectElement(element));
  setupCellHover(row, element);
  setupCellKeyboard(row, element);

  return row;
}

function initViewModes() {
  const buttons = document.querySelectorAll('.view-modes .control-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (!view) return;
      showView(view);
      buttons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
}

function showView(view) {
  const wrapper = document.querySelector('.periodic-table-wrapper');
  const list = document.getElementById('periodic-list');
  const legend = document.querySelector('.category-legend');

  if (view === 'list') {
    wrapper?.classList.add('hidden');
    list?.classList.remove('hidden');
    legend?.classList.add('hidden');
  } else {
    wrapper?.classList.remove('hidden');
    list?.classList.add('hidden');
    legend?.classList.remove('hidden');
  }

  applyFilters();
}

/* ===== 工具提示 ===== */

function initTooltip() {
  if (tooltipEl) return;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'element-tooltip';
  tooltipEl.id = 'element-tooltip';
  document.body.appendChild(tooltipEl);
}

function showTooltip(element) {
  if (!tooltipEl) return;
  tooltipEl.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-symbol" style="color: ${categoryColors[element.category] || '#fff'}">${element.symbol}</span>
      <div class="tooltip-names">
        <span class="tooltip-chinese">${element.chineseName}</span>
        <span class="tooltip-english">${element.englishName}</span>
      </div>
    </div>
    <div class="tooltip-meta">
      <span class="tooltip-atomic">#${element.atomicNumber}</span>
      <span class="tooltip-category">${ELEMENT_CATEGORY_LABELS[element.category] || element.category}</span>
    </div>
  `;
  tooltipEl.classList.add('show');
}

function moveTooltip(event) {
  if (!tooltipEl) return;
  const x = event.clientX + 16;
  const y = event.clientY + 16;
  const rect = tooltipEl.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  tooltipEl.style.left = `${Math.min(x, maxX)}px`;
  tooltipEl.style.top = `${Math.min(y, maxY)}px`;
}

function hideTooltip() {
  tooltipEl?.classList.remove('show');
}

function setupCellHover(el, element) {
  el.addEventListener('mouseenter', () => showTooltip(element));
  el.addEventListener('mousemove', moveTooltip);
  el.addEventListener('mouseleave', hideTooltip);
}

/* ===== 键盘导航 ===== */

function setupCellKeyboard(el, element) {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      selectElement(element);
    }
  });
}

function initKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        openModal.classList.remove('show');
        return;
      }
      const panel = document.getElementById('detail-panel');
      if (panel?.classList.contains('open')) {
        panel.classList.remove('open');
      }
    }
  });
}
