/** ===== localStorage 存储 ===== */
const STORAGE_KEY = 'element-explorer-progress';

export function loadProgress() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      window.appState.learnedElements = new Set(parsed.learnedElements || []);
      window.appState.collectedElements = new Set(parsed.collectedElements || []);
      window.appState.quizScores = parsed.quizScores || [];
      window.appState.completedExperiments = new Set(parsed.completedExperiments || []);
      window.appState.unlockedAchievements = new Set(parsed.unlockedAchievements || []);
      window.appState.gameScores = parsed.gameScores || {};
      window.appState.settings = parsed.settings || window.appState.settings;
    }
  } catch (e) {
    console.warn('加载进度失败:', e);
  }
}

export function saveProgress() {
  try {
    const data = {
      learnedElements: Array.from(window.appState.learnedElements),
      collectedElements: Array.from(window.appState.collectedElements),
      quizScores: window.appState.quizScores,
      completedExperiments: Array.from(window.appState.completedExperiments),
      unlockedAchievements: Array.from(window.appState.unlockedAchievements),
      gameScores: window.appState.gameScores,
      settings: window.appState.settings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('保存进度失败:', e);
  }
}

export function markElementLearned(atomicNumber) {
  window.appState.learnedElements.add(atomicNumber);
  saveProgress();
  updateExploredCount();
}

export function collectElement(atomicNumber) {
  window.appState.collectedElements.add(atomicNumber);
  saveProgress();
}

export function addQuizScore(score) {
  window.appState.quizScores.push({
    score,
    date: new Date().toISOString()
  });
  saveProgress();
}

export function completeExperiment(experimentId) {
  window.appState.completedExperiments.add(experimentId);
  saveProgress();
}

export function unlockAchievement(achievementId) {
  if (!window.appState.unlockedAchievements.has(achievementId)) {
    window.appState.unlockedAchievements.add(achievementId);
    saveProgress();
    showAchievementPopup(achievementId);
  }
}

function updateExploredCount() {
  const el = document.getElementById('explored-count');
  if (el) {
    el.textContent = window.appState.learnedElements.size;
  }
}

function showAchievementPopup(achievementId) {
  // 成就弹窗逻辑在 achievements.js 中实现
  window.dispatchEvent(new CustomEvent('achievementunlocked', { 
    detail: { achievementId } 
  }));
}
