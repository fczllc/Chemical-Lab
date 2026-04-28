/** ===== 路由系统 ===== */
const sections = [
  'periodic-table', 'compare', 'timeline', 'games', 
  'lab', 'achievements', 'progress', 'story'
];

let currentSection = 'periodic-table';

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
  
  // 详情面板关闭时返回周期表
  const panelClose = document.querySelector('.panel-close');
  if (panelClose) {
    panelClose.addEventListener('click', () => {
      closeDetailPanel();
    });
  }
}

export function navigateTo(section) {
  if (!sections.includes(section)) return;
  
  // 更新导航按钮状态
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
  
  // 切换页面
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === section);
  });
  
  // 关闭详情面板
  if (section !== 'periodic-table') {
    closeDetailPanel();
  }
  
  currentSection = section;
  
  // 触发页面切换事件
  window.dispatchEvent(new CustomEvent('pagechange', { detail: { section } }));
}

export function getCurrentSection() {
  return currentSection;
}

function closeDetailPanel() {
  const panel = document.getElementById('detail-panel');
  if (panel) {
    panel.classList.remove('open');
  }
}
