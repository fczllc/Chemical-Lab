/** ===== 周期表渲染 ===== */
import {
  getLearnedElements,
  markElementLearned,
  setSelectedElement
} from './storage.js';

const categoryColors = {
  'alkali metal': '#ff6b6b',
  'alkaline earth metal': '#ffa94d',
  'transition metal': '#ffd43b',
  'post-transition metal': '#69db7c',
  'metalloid': '#38d9a9',
  'reactive nonmetal': '#4dabf7',
  'noble gas': '#9775fa',
  'halogen': '#f06595',
  'lanthanide': '#ff6b9d',
  'actinide': '#ff8fab',
  unknown: '#868e96'
};

const categoryNames = {
  'alkali metal': '碱金属',
  'alkaline earth metal': '碱土金属',
  'transition metal': '过渡金属',
  'post-transition metal': '后过渡金属',
  metalloid: '类金属',
  'reactive nonmetal': '非金属',
  'noble gas': '稀有气体',
  halogen: '卤素',
  lanthanide: '镧系',
  actinide: '锕系',
  unknown: '未知'
};

let elements = [];
let stateListenersBound = false;

export function initPeriodicTable(data) {
  elements = data;
  renderTable();
  renderLegend();
  setupCellInteractions();
  bindStateListeners();
}

function bindStateListeners() {
  if (stateListenersBound) {
    return;
  }

  window.addEventListener('elementlearned', (event) => {
    const learnedCell = document.querySelector(`.element-cell[data-atomic-number="${event.detail.atomicNumber}"]`);
    learnedCell?.classList.add('learned');
  });

  window.addEventListener('statereset', () => {
    document.querySelectorAll('.element-cell').forEach((cell) => {
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
  cell.dataset.category = element.category;
  cell.dataset.period = element.period;
  cell.dataset.group = element.group;

  if (getLearnedElements().has(element.atomicNumber)) {
    cell.classList.add('learned');
  }
  if (element.rarity >= 4) {
    cell.classList.add('rare');
  }

  cell.innerHTML = `
    <span class="atomic-num">${element.atomicNumber}</span>
    <span class="symbol" style="color: ${categoryColors[element.category] || '#fff'}">${element.symbol}</span>
    <span class="chinese-name">${element.chineseName}</span>
    <span class="atomic-mass">${element.atomicMass}</span>
  `;

  cell.addEventListener('click', () => selectElement(element));

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

  document.querySelectorAll('.element-cell').forEach((cell) => {
    cell.classList.toggle(
      'selected',
      Number.parseInt(cell.dataset.atomicNumber, 10) === element.atomicNumber
    );
  });

  openDetailPanel(element);

  window.dispatchEvent(new CustomEvent('elementselected', { detail: { element } }));
}

function openDetailPanel(element) {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;

  markElementLearned(element.atomicNumber);
  populateDetailPanel(element);
  panel.classList.add('open');
}

function populateDetailPanel(element) {
  const hero = document.querySelector('.element-hero');
  if (hero) {
    hero.querySelector('.atomic-number').textContent = element.atomicNumber;
    hero.querySelector('.symbol').textContent = element.symbol;
    hero.querySelector('.symbol').style.color = categoryColors[element.category] || '#fff';
    hero.querySelector('.chinese-name').textContent = element.chineseName;
    hero.querySelector('.english-name').textContent = element.name;
    hero.querySelector('.atomic-mass').textContent = element.atomicMass;
  }

  const props = document.querySelector('.element-properties');
  if (props) {
    props.innerHTML = `
      <div class="property-row">
        <span class="property-label"><span class="icon">&#9783;</span>电子排布</span>
        <span class="property-value">${element.electronConfiguration}</span>
      </div>
      <div class="property-row">
        <span class="property-label"><span class="icon">&#9790;</span>物理状态</span>
        <span class="property-value">${element.state}</span>
      </div>
      <div class="property-row">
        <span class="property-label"><span class="icon">&#9889;</span>电负性</span>
        <span class="property-value">${element.electronegativity}</span>
      </div>
      <div class="property-row">
        <span class="property-label"><span class="icon">&#9733;</span>发现者</span>
        <span class="property-value">${element.discoveredBy}</span>
      </div>
      <div class="property-row">
        <span class="property-label"><span class="icon">&#9201;</span>发现年份</span>
        <span class="property-value">${element.discoveryYear}</span>
      </div>
      <div class="property-row">
        <span class="property-label"><span class="icon">&#9733;</span>常见用途</span>
        <span class="property-value">${element.uses.join('、')}</span>
      </div>
      <div class="property-row">
        <span class="property-label"><span class="icon">&#9888;</span>危险性</span>
        <span class="property-value" style="color: ${element.danger > 3 ? '#ff6b6b' : '#ffa94d'}">${element.danger}</span>
      </div>
    `;
  }

  const story = document.querySelector('.element-story');
  if (story) {
    story.innerHTML = `
      <h4>元素小故事</h4>
      <p>${element.kidStory}</p>
    `;
  }

  const funfact = document.querySelector('.element-funfact');
  if (funfact) {
    funfact.innerHTML = `
      <h4>趣味事实</h4>
      <p>${element.funFact}</p>
    `;
  }
}

function renderLegend() {
  const container = document.querySelector('.legend-items');
  if (!container) return;

  container.innerHTML = Object.entries(categoryNames).map(([key, name]) => `
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

export function filterCells(category, period) {
  document.querySelectorAll('.element-cell').forEach((cell) => {
    const catMatch = category === 'all' || cell.dataset.category === category;
    const periodMatch = period === 'all' || cell.dataset.period === period;
    cell.classList.toggle('filtered-out', !(catMatch && periodMatch));
  });
}

export function searchElements(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    document.querySelectorAll('.element-cell').forEach((cell) => {
      cell.classList.remove('filtered-out');
    });
    return;
  }

  document.querySelectorAll('.element-cell').forEach((cell) => {
    const num = cell.dataset.atomicNumber;
    const element = elements.find((item) => item.atomicNumber === Number.parseInt(num, 10));
    if (!element) return;

    const match =
      element.symbol.toLowerCase().includes(q) ||
      element.name.toLowerCase().includes(q) ||
      element.chineseName.includes(q) ||
      element.atomicNumber.toString() === q;

    cell.classList.toggle('filtered-out', !match);
  });
}
