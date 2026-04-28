/** ===== 移动端交互优化 ===== */

let mobileInit = false;
let lastTouchEnd = 0;

export function initMobile() {
  if (mobileInit) return;
  mobileInit = true;

  initMobileMenu();
  initTouchEvents();
  initDetailPanelSwipe();
  initKeyboardAwareLayout();
}

/** 初始化移动端汉堡菜单 */
function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const nav = document.querySelector('.main-nav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.contains('open');
    nav.classList.toggle('open', !isOpen);
    toggle.classList.toggle('active', !isOpen);
  });

  // 点击导航项后关闭菜单
  nav.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 767) {
        nav.classList.remove('open');
        toggle.classList.remove('active');
      }
    });
  });

  // 点击外部关闭菜单
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
      nav.classList.remove('open');
      toggle.classList.remove('active');
    }
  });
}

/** 触摸事件优化 */
function initTouchEvents() {
  // 防止双击缩放
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 优化触摸反馈 - 为没有 hover 的设备添加 active 状态
  if (window.matchMedia('(hover: none)').matches) {
    document.querySelectorAll('button, .element-cell, .element-list-row, .nav-btn, .control-btn').forEach((el) => {
      el.addEventListener('touchstart', () => {
        el.classList.add('touch-active');
      }, { passive: true });

      el.addEventListener('touchend', () => {
        el.classList.remove('touch-active');
      }, { passive: true });

      el.addEventListener('touchcancel', () => {
        el.classList.remove('touch-active');
      }, { passive: true });
    });
  }
}

/** 详情面板滑动手势 */
function initDetailPanelSwipe() {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;

  let startY = 0;
  let startX = 0;
  let isDragging = false;

  panel.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 767) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  panel.addEventListener('touchmove', (e) => {
    if (!isDragging || window.innerWidth > 767) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startY;
    const deltaX = Math.abs(currentX - startX);

    // 如果水平滑动大于垂直滑动，不处理
    if (deltaX > Math.abs(deltaY)) return;

    // 向下滑动超过 80px 关闭面板
    if (deltaY > 80) {
      isDragging = false;
      panel.classList.remove('open');
      panel.classList.add('closing');
      setTimeout(() => {
        panel.classList.remove('closing');
      }, 320);
    }
  }, { passive: true });

  panel.addEventListener('touchend', () => {
    isDragging = false;
  }, { passive: true });
}

/** 键盘弹出时的布局调整 */
function initKeyboardAwareLayout() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) return;

  const originalHeight = window.innerHeight;

  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    const heightDiff = originalHeight - currentHeight;

    // 如果高度减少超过 150px，认为是键盘弹出
    if (heightDiff > 150) {
      document.body.classList.add('keyboard-open');
      // 确保输入框在视口中
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
        setTimeout(() => {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } else {
      document.body.classList.remove('keyboard-open');
    }
  });
}

/** 检测是否为触摸设备 */
export function isTouchDevice() {
  return window.matchMedia('(hover: none)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0;
}

/** 检测是否为移动端 */
export function isMobileViewport() {
  return window.innerWidth <= 767;
}
