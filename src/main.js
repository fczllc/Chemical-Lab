/** ===== 主入口 ===== */
import { elements } from './data/elements.js';
import {
  disposeRenderer,
  initScene,
  pauseRenderer,
  render,
  resumeRenderer,
  setActiveSection,
  setPerformanceMode as setRendererPerformanceMode
} from './three/scene.js';
import { disposeParticles, initParticles, setParticleDensity } from './three/particles.js';
import { initRouter } from './modules/router.js';
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
import {
  createStateInspectionProxy,
  getCollectedElements,
  getLearnedElements,
  getQuizScores,
  getSettings,
  getUnlockedAchievements,
  initializeState,
  saveProgress,
  updateSettings
} from './modules/storage.js';

let animationFrameId = null;
let hasDisposed = false;

function attachReadOnlyAppState() {
  const inspectionProxy = createStateInspectionProxy();

  Object.defineProperty(window, 'appState', {
    configurable: true,
    enumerable: true,
    get() {
      return inspectionProxy;
    },
    set() {
      console.warn('[main] window.appState 是只读检查视图，请改用 storage API。');
    }
  });
}

async function init() {
  initializeState(elements);
  attachReadOnlyAppState();

  const canvas = document.getElementById('bg-canvas');
  const settings = getSettings();

  await initScene(canvas, {
    performanceMode: settings.performanceMode,
    section: 'periodic-table'
  });
  initParticles(settings.performanceMode);

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

  initSettings();
  bindLifecycleEvents();
  updateStats();
  animate();
}

function bindLifecycleEvents() {
  window.addEventListener('elementlearned', updateStats);
  window.addEventListener('elementcollected', updateStats);
  window.addEventListener('quizcompleted', updateStats);
  window.addEventListener('achievementunlocked', updateStats);
  window.addEventListener('statereset', updateStats);
  window.addEventListener('settingsupdated', handleSettingsUpdated);
  window.addEventListener('pagechange', handlePageChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', disposeApp);
}

function initSettings() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsClose = document.getElementById('settings-close');
  const performanceToggle = document.getElementById('performance-mode-toggle');

  if (!settingsBtn || !settingsModal) {
    return;
  }

  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('show');
  });

  settingsClose?.addEventListener('click', () => {
    settingsModal.classList.remove('show');
  });

  settingsModal.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      settingsModal.classList.remove('show');
    }
  });

  if (!performanceToggle) {
    return;
  }

  performanceToggle.checked = (getSettings().performanceMode || 'normal') === 'high-performance';
  performanceToggle.addEventListener('change', (event) => {
    updateSettings({
      performanceMode: event.target.checked ? 'high-performance' : 'normal'
    });
  });
}

function handleSettingsUpdated() {
  const performanceMode = getSettings().performanceMode || 'normal';
  const performanceToggle = document.getElementById('performance-mode-toggle');
  const isHighPerformance = performanceMode === 'high-performance';
  if (performanceToggle && performanceToggle.checked !== isHighPerformance) {
    performanceToggle.checked = isHighPerformance;
  }

  setRendererPerformanceMode(performanceMode);
  setParticleDensity(performanceMode);
  window.dispatchEvent(new CustomEvent('performancemodechange', {
    detail: { mode: performanceMode }
  }));
}

function handlePageChange(event) {
  const section = event?.detail?.section || 'periodic-table';
  setActiveSection(section);

  if (!document.hidden && section === 'periodic-table') {
    resumeRenderer();
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    pauseRenderer();
    saveProgress();
    return;
  }

  resumeRenderer();
}

function handleBeforeUnload() {
  saveProgress();
  disposeApp();
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  render();
}

function updateStats() {
  const exploredCount = document.getElementById('explored-count');
  if (exploredCount) {
    exploredCount.textContent = getLearnedElements().size;
  }

  const miniLearned = document.getElementById('mini-learned');
  const miniCollected = document.getElementById('mini-collected');
  const miniQuiz = document.getElementById('mini-quiz');
  const miniAchievements = document.getElementById('mini-achievements');

  if (miniLearned) {
    miniLearned.textContent = getLearnedElements().size;
  }
  if (miniCollected) {
    miniCollected.textContent = getCollectedElements().size;
  }
  if (miniQuiz) {
    const scores = getQuizScores();
    const total = scores.reduce((sum, score) => sum + (score.score || 0), 0);
    miniQuiz.textContent = scores.length > 0 ? Math.round(total / scores.length) : 0;
  }
  if (miniAchievements) {
    miniAchievements.textContent = getUnlockedAchievements().size;
  }
}

function disposeApp() {
  if (hasDisposed) {
    return;
  }

  hasDisposed = true;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  disposeParticles();
  disposeRenderer();
}

init().catch(console.error);
