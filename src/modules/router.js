/** ===== 路由系统 ===== */
import { restoreSelectedElementView } from './renderTable.js';
import { getSelectedElement, setSelectedElement } from './storage.js';

const sections = [
  'periodic-table', 'compare', 'timeline', 'games',
  'lab', 'achievements', 'progress', 'story'
];

const routeMap = {
  '/': 'periodic-table',
  '/compare': 'compare',
  '/timeline': 'timeline',
  '/games': 'games',
  '/lab': 'lab',
  '/achievements': 'achievements',
  '/progress': 'progress',
  '/story': 'story'
};

const reverseRouteMap = Object.fromEntries(
  Object.entries(routeMap).map(([route, section]) => [section, route])
);

let currentSection = 'periodic-table';
let savedHomeSelectionAtomicNumber = null;

export function initRouter() {
  const navBtns = document.querySelectorAll('.nav-btn');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section) {
        navigateTo(section);
      }
    });
  });

  // 监听 hash 变化
  window.addEventListener('hashchange', handleHashChange);

  // 初始化时处理当前 hash
  handleHashChange();
}

function handleHashChange() {
  const hash = window.location.hash || '#/';
  const path = hash.replace('#', '');

  const section = routeMap[path];

  if (section && sections.includes(section)) {
    if (section !== currentSection) {
      activateSection(section);
    }
  } else {
    // 未知路由，回退到首页
    window.location.hash = '#/';
  }
}

export function navigateTo(section) {
  if (!sections.includes(section)) return;

  const route = reverseRouteMap[section] || '/';
  window.location.hash = `#${route}`;
  // hashchange 事件会触发 activateSection
}

function activateSection(section) {
  const from = currentSection;
  const to = section;

  if (from === 'periodic-table' && to !== 'periodic-table') {
    savedHomeSelectionAtomicNumber = getSelectedElement()?.atomicNumber ?? null;
  }

  window.dispatchEvent(new CustomEvent('beforeroutechange', {
    detail: {
      from,
      to,
      savedAtomicNumber: savedHomeSelectionAtomicNumber
    }
  }));

  // 更新导航按钮状态
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  // 切换页面
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === section);
  });

  // 显示/隐藏底部模块（仅在周期表页面显示）
  const bottomModules = document.getElementById('bottom-modules');
  if (bottomModules) {
    bottomModules.style.display = section === 'periodic-table' ? 'grid' : 'none';
  }

  // 关闭详情面板（当离开周期表时）
  if (section !== 'periodic-table') {
    closeDetailPanel();
  }

  currentSection = section;

  if (section === 'periodic-table') {
    restoreHomeSelection();
  }

  // 触发页面切换事件
  window.dispatchEvent(new CustomEvent('pagechange', { detail: { section, from, to } }));
  window.dispatchEvent(new CustomEvent('afterroutechange', {
    detail: {
      from,
      to,
      section,
      savedAtomicNumber: savedHomeSelectionAtomicNumber
    }
  }));
}

export function getCurrentSection() {
  return currentSection;
}

function closeDetailPanel() {
  const panel = document.getElementById('detail-panel');
  if (panel) {
    panel.classList.add('closing');
    panel.classList.remove('panel-opening');
    panel.classList.remove('open');
    window.setTimeout(() => {
      panel.classList.remove('closing');
      panel.querySelector('.panel-content')?.classList.remove('content-switching');
    }, 320);
  }
}

function restoreHomeSelection() {
  const fallbackAtomicNumber = getSelectedElement()?.atomicNumber ?? null;
  const atomicNumberToRestore = savedHomeSelectionAtomicNumber ?? fallbackAtomicNumber;

  if (atomicNumberToRestore === null) {
    return;
  }

  const restored = setSelectedElement(atomicNumberToRestore);
  if (!restored) {
    return;
  }

  window.requestAnimationFrame(() => {
    restoreSelectedElementView({
      element: restored,
      markLearned: false,
      emitEvent: true,
      scroll: true
    });
  });
}
