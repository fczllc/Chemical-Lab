/** ===== 主入口 ===== */
import { elements } from './data/elements.js';
import { initScene, render, dispose } from './three/scene.js';
import { initParticles, disposeParticles } from './three/particles.js';
import { initRouter, navigateTo } from './modules/router.js';
import { initPeriodicTable } from './modules/renderTable.js';
import { initDetailPanel } from './modules/detailPanel.js';
import { initFilters } from './modules/filters.js';
import { initSearch } from './modules/search.js';
import { initCompare } from './modules/compare.js';
import { initTimeline } from './modules/timeline.js';
import { initGames } from './modules/quiz.js';
import { initAchievements } from './modules/achievements.js';
import { initProgress } from './modules/progress.js';
import { initStoryMode } from './modules/storyMode.js';
import { loadProgress, saveProgress } from './modules/storage.js';

// 全局状态
window.appState = {
  elements,
  currentElement: null,
  compareList: [],
  learnedElements: new Set(),
  collectedElements: new Set(),
  quizScores: [],
  completedExperiments: new Set(),
  unlockedAchievements: new Set(),
  gameScores: {},
  settings: {
    particleDensity: 'medium',
    soundEnabled: false,
    difficulty: 'normal'
  }
};

async function init() {
  // 加载本地存储的进度
  loadProgress();
  
  // 初始化 Three.js 场景
  const canvas = document.getElementById('bg-canvas');
  await initScene(canvas);
  initParticles();
  
  // 初始化各模块
  initRouter();
  initPeriodicTable(elements);
  initDetailPanel();
  initFilters(elements);
  initSearch(elements);
  initCompare(elements);
  initTimeline(elements);
  initGames();
  initAchievements();
  initProgress();
  initStoryMode();
  
  // 更新统计
  updateStats();
  
  // 启动动画循环
  animate();
  
  // 页面可见性变化处理
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 窗口关闭前保存
  window.addEventListener('beforeunload', saveProgress);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function handleVisibilityChange() {
  if (document.hidden) {
    saveProgress();
  }
}

function updateStats() {
  const exploredCount = document.getElementById('explored-count');
  if (exploredCount) {
    exploredCount.textContent = window.appState.learnedElements.size;
  }
}

// 启动应用
init().catch(console.error);
