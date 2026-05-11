/** ===== 统一学习状态与持久化 ===== */
const STORAGE_KEY = 'element-explorer-kids-state';
const SCHEMA_VERSION = 'v2';
const SAVE_DEBOUNCE_MS = 500;

const DEFAULT_SETTINGS = {
  performanceMode: 'normal',
  particleDensity: 'medium',
  soundEnabled: false,
  difficulty: 'normal'
};

const MAX_ACTIVITY_ENTRIES = 24;

let appState = createDefaultState();
let storageAdapter = createMemoryStorageAdapter();
let saveTimer = null;
let persistenceEventsBound = false;

function createDefaultState(elements = []) {
  return {
    elements: Array.isArray(elements) ? [...elements] : [],
    currentElement: null,
    compareList: [],
    learnedElements: new Set(),
    collectedElements: new Set(),
    quizScores: [],
    completedExperiments: new Set(),
    experimentTitleOverrides: {},
    unlockedAchievements: new Set(),
    achievementDates: {},
    gameScores: {},
    gamePlays: {},
    activityLog: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}

function createMemoryStorageAdapter() {
  let memoryValue = null;

  return {
    kind: 'memory',
    getItem() {
      return memoryValue;
    },
    setItem(_key, value) {
      memoryValue = value;
    },
    removeItem() {
      memoryValue = null;
    }
  };
}

function createStorageAdapter() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    console.warn('[storage] localStorage 不可用，使用内存存储。');
    return createMemoryStorageAdapter();
  }

  try {
    const probeKey = '__element-explorer-storage-probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);

    return {
      kind: 'localStorage',
      getItem(key) {
        return window.localStorage.getItem(key);
      },
      setItem(key, value) {
        window.localStorage.setItem(key, value);
      },
      removeItem(key) {
        window.localStorage.removeItem(key);
      }
    };
  } catch (error) {
    console.warn('[storage] localStorage 不可访问，回退到内存存储。', error);
    return createMemoryStorageAdapter();
  }
}

function sanitizeAtomicNumber(value) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function getElementFromCatalog(atomicNumber) {
  return appState.elements.find((element) => element.atomicNumber === atomicNumber) || null;
}

function toUniqueAtomicNumbers(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const uniqueValues = new Set();
  values.forEach((value) => {
    const atomicNumber = sanitizeAtomicNumber(value);
    if (atomicNumber !== null) {
      uniqueValues.add(atomicNumber);
    }
  });

  return [...uniqueValues];
}

function normalizeQuizScore(scoreObj) {
  if (typeof scoreObj === 'number') {
    return {
      score: scoreObj,
      completedAt: new Date().toISOString()
    };
  }

  if (!scoreObj || typeof scoreObj !== 'object' || Array.isArray(scoreObj)) {
    return null;
  }

  const normalizedScore = Number.isFinite(Number(scoreObj.score)) ? Number(scoreObj.score) : 0;

  return {
    ...scoreObj,
    score: normalizedScore,
    completedAt: typeof scoreObj.completedAt === 'string'
      ? scoreObj.completedAt
      : new Date().toISOString()
  };
}

function normalizeGameScores(scores) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    return {};
  }

  return Object.entries(scores).reduce((accumulator, [key, value]) => {
    if (typeof key === 'string' && Number.isFinite(Number(value))) {
      accumulator[key] = Number(value);
    }
    return accumulator;
  }, {});
}

function normalizeCountMap(scores) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    return {};
  }

  return Object.entries(scores).reduce((accumulator, [key, value]) => {
    if (typeof key === 'string' && Number.isFinite(Number(value))) {
      accumulator[key] = Math.max(0, Number(value));
    }
    return accumulator;
  }, {});
}

function normalizeAchievementDates(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, date]) => {
    if (typeof key === 'string' && typeof date === 'string' && date.trim()) {
      accumulator[key] = date;
    }
    return accumulator;
  }, {});
}

function normalizeActivityLog(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      id: typeof entry.id === 'string' && entry.id.trim()
        ? entry.id
        : `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: typeof entry.type === 'string' ? entry.type : 'activity',
      title: typeof entry.title === 'string' ? entry.title : '学习活动',
      description: typeof entry.description === 'string' ? entry.description : '',
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString(),
      meta: entry.meta && typeof entry.meta === 'object' && !Array.isArray(entry.meta)
        ? { ...entry.meta }
        : {}
    }))
    .slice(0, MAX_ACTIVITY_ENTRIES);
}

function normalizeSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...settings
  };
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeExperimentTitleOverrides(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, title]) => {
    if (typeof key !== 'string' || typeof title !== 'string') {
      return accumulator;
    }

    const normalizedKey = key.trim();
    const normalizedTitle = title.trim();

    if (normalizedKey && normalizedTitle) {
      accumulator[normalizedKey] = normalizedTitle;
    }

    return accumulator;
  }, {});
}

function normalizeExperimentTitleKey(reactionKey) {
  if (typeof reactionKey !== 'string') {
    return null;
  }

  const normalizedKey = reactionKey.trim();
  return normalizedKey ? normalizedKey : null;
}

function sanitizeSettingsPatch(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }

  return { ...settings };
}

function cloneValue(value) {
  if (value instanceof Set) {
    return new Set(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneValue(nestedValue)])
    );
  }

  return value;
}

function emitEvent(name, detail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function scheduleSave() {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    saveProgress();
  }, SAVE_DEBOUNCE_MS);
}

function appendActivity(type, title, description, meta = {}) {
  appState.activityLog = [
    {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      description,
      timestamp: new Date().toISOString(),
      meta: { ...meta }
    },
    ...appState.activityLog
  ].slice(0, MAX_ACTIVITY_ENTRIES);
}

function emitStateChange(field, oldValue, newValue, eventName, extraDetail = {}) {
  const detail = {
    field,
    oldValue: cloneValue(oldValue),
    newValue: cloneValue(newValue),
    ...extraDetail
  };

  emitEvent('statechange', detail);

  if (eventName) {
    emitEvent(eventName, detail);
  }

  scheduleSave();
}

function ensureCollectedMatchesLearned() {
  let didMutate = false;

  appState.learnedElements.forEach((atomicNumber) => {
    if (!appState.collectedElements.has(atomicNumber)) {
      appState.collectedElements.add(atomicNumber);
      didMutate = true;
    }
  });

  return didMutate;
}

function serializeState() {
  return {
    currentElement: appState.currentElement?.atomicNumber ?? null,
    compareList: appState.compareList.map((element) => element.atomicNumber),
    learnedElements: [...appState.learnedElements],
    collectedElements: [...appState.collectedElements],
    quizScores: appState.quizScores.map((score) => ({ ...score })),
    completedExperiments: [...appState.completedExperiments],
    experimentTitleOverrides: { ...appState.experimentTitleOverrides },
    unlockedAchievements: [...appState.unlockedAchievements],
    achievementDates: { ...appState.achievementDates },
    gameScores: { ...appState.gameScores },
    gamePlays: { ...appState.gamePlays },
    activityLog: appState.activityLog.map((entry) => ({
      ...entry,
      meta: { ...(entry.meta || {}) }
    })),
    settings: { ...appState.settings }
  };
}

function migrateV0ToV1(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  return {
    currentElement: data.currentElement?.atomicNumber ?? data.currentElement ?? null,
    compareList: (data.compareList || []).map((item) => item?.atomicNumber ?? item),
    learnedElements: data.learnedElements || [],
    collectedElements: data.collectedElements || [],
    quizScores: Array.isArray(data.quizScores)
      ? data.quizScores.map((score) => normalizeQuizScore(score)).filter(Boolean)
      : [],
    completedExperiments: data.completedExperiments || [],
    experimentTitleOverrides: data.experimentTitleOverrides || {},
    unlockedAchievements: data.unlockedAchievements || [],
    achievementDates: data.achievementDates || {},
    gameScores: data.gameScores || {},
    gamePlays: data.gamePlays || {},
    activityLog: data.activityLog || [],
    settings: data.settings || {}
  };
}

function getVersionedPayload(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return null;
  }

  if (envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)) {
    return envelope.data;
  }

  return envelope;
}

function migratePersistedEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return null;
  }

  if (!envelope.version) {
    return migrateV0ToV1(envelope);
  }

  const payload = getVersionedPayload(envelope);

  if (envelope.version === 'v0') {
    return migrateV0ToV1(payload);
  }

  if (envelope.version === 'v1' || envelope.version === SCHEMA_VERSION) {
    return migrateV0ToV1(payload);
  }

  console.warn(`[storage] 未知状态版本 ${envelope.version}，正在尝试保留可识别的进度字段。`);
  return migrateV0ToV1(payload);
}

function normalizePersistedData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const compareList = toUniqueAtomicNumbers(data.compareList)
    .map((atomicNumber) => getElementFromCatalog(atomicNumber))
    .filter(Boolean);
  const learnedElements = new Set(toUniqueAtomicNumbers(data.learnedElements));
  const collectedElements = new Set(toUniqueAtomicNumbers(data.collectedElements));
  const currentElementAtomicNumber = sanitizeAtomicNumber(data.currentElement);

  const normalizedState = {
    ...createDefaultState(appState.elements),
    elements: [...appState.elements],
    currentElement: currentElementAtomicNumber === null
      ? null
      : getElementFromCatalog(currentElementAtomicNumber),
    compareList,
    learnedElements,
    collectedElements,
    quizScores: Array.isArray(data.quizScores)
      ? data.quizScores.map((score) => normalizeQuizScore(score)).filter(Boolean)
      : [],
    completedExperiments: new Set(
      Array.isArray(data.completedExperiments)
        ? data.completedExperiments.filter((item) => typeof item === 'string' && item.trim())
        : []
    ),
    experimentTitleOverrides: normalizeExperimentTitleOverrides(data.experimentTitleOverrides),
    unlockedAchievements: new Set(
      Array.isArray(data.unlockedAchievements)
        ? data.unlockedAchievements.filter((item) => typeof item === 'string' && item.trim())
        : []
    ),
    achievementDates: normalizeAchievementDates(data.achievementDates),
    gameScores: normalizeGameScores(data.gameScores),
    gamePlays: normalizeCountMap(data.gamePlays),
    activityLog: normalizeActivityLog(data.activityLog),
    settings: normalizeSettings(data.settings)
  };

  appState = normalizedState;
  ensureCollectedMatchesLearned();

  return normalizedState;
}

function parseStoredEnvelope(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.error('[storage] 本地状态 JSON 已损坏，正在重置。', error);
    appState = createDefaultState(appState.elements);
    saveProgress();
    return null;
  }
}

function hydrateState() {
  const rawValue = storageAdapter.getItem(STORAGE_KEY);
  const envelope = parseStoredEnvelope(rawValue);

  if (!envelope) {
    saveProgress();
    return getStateSnapshot();
  }

  const migratedData = migratePersistedEnvelope(envelope);
  const normalized = normalizePersistedData(migratedData);

  if (!normalized) {
    console.warn('[storage] 状态结构无效，已合并默认值。');
    appState = createDefaultState(appState.elements);
  }

  saveProgress();
  return getStateSnapshot();
}

function bindPersistenceEvents() {
  if (persistenceEventsBound || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('beforeunload', saveProgress);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveProgress();
    }
  });

  persistenceEventsBound = true;
}

export function initializeState(elements = []) {
  appState = createDefaultState(elements);
  storageAdapter = createStorageAdapter();
  bindPersistenceEvents();
  hydrateState();
  return getStateSnapshot();
}

export function loadProgress(elements = appState.elements) {
  return initializeState(elements);
}

export function saveProgress() {
  const envelope = {
    version: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    data: serializeState()
  };

  try {
    storageAdapter.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.warn('[storage] 保存失败，继续使用内存状态。', error);
  }
}

export function getStateSnapshot() {
  return {
    elements: appState.elements.map((element) => ({ ...element })),
    currentElement: appState.currentElement ? { ...appState.currentElement } : null,
    compareList: appState.compareList.map((element) => ({ ...element })),
    learnedElements: new Set(appState.learnedElements),
    collectedElements: new Set(appState.collectedElements),
    quizScores: appState.quizScores.map((score) => ({ ...score })),
    completedExperiments: new Set(appState.completedExperiments),
    experimentTitleOverrides: { ...appState.experimentTitleOverrides },
    unlockedAchievements: new Set(appState.unlockedAchievements),
    achievementDates: { ...appState.achievementDates },
    gameScores: { ...appState.gameScores },
    gamePlays: { ...appState.gamePlays },
    activityLog: appState.activityLog.map((entry) => ({
      ...entry,
      meta: { ...(entry.meta || {}) }
    })),
    settings: { ...appState.settings }
  };
}

export function createStateInspectionProxy() {
  return new Proxy({}, {
    get(_target, property) {
      const snapshot = getStateSnapshot();
      return snapshot[property];
    },
    set() {
      console.warn('[storage] window.appState 是只读检查视图，请使用 storage API 更新状态。');
      return false;
    },
    ownKeys() {
      return Reflect.ownKeys(appState);
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true
      };
    }
  });
}

export function getSelectedElement() {
  return appState.currentElement ? { ...appState.currentElement } : null;
}

export function setSelectedElement(atomicNumber) {
  const normalizedAtomicNumber = atomicNumber === null ? null : sanitizeAtomicNumber(atomicNumber);
  const nextElement = normalizedAtomicNumber === null ? null : getElementFromCatalog(normalizedAtomicNumber);
  const oldValue = appState.currentElement;
  const oldAtomicNumber = oldValue?.atomicNumber ?? null;
  const newAtomicNumber = nextElement?.atomicNumber ?? null;

  if (oldAtomicNumber === newAtomicNumber) {
    return nextElement;
  }

  appState.currentElement = nextElement;
  emitStateChange('currentElement', oldValue, nextElement, 'selectedelementchanged', {
    atomicNumber: newAtomicNumber
  });
  return nextElement;
}

export function getCompareList() {
  return appState.compareList.map((element) => ({ ...element }));
}

export function addComparedElement(atomicNumber) {
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  if (normalizedAtomicNumber === null) {
    return [...appState.compareList];
  }

  const existingElement = appState.compareList.find((element) => element.atomicNumber === normalizedAtomicNumber);
  if (existingElement) {
    return [...appState.compareList];
  }

  if (appState.compareList.length >= 3) {
    emitEvent('comparelistfull', { atomicNumber: normalizedAtomicNumber });
    return [...appState.compareList];
  }

  const nextElement = getElementFromCatalog(normalizedAtomicNumber);
  if (!nextElement) {
    return [...appState.compareList];
  }

  const oldValue = [...appState.compareList];
  appState.compareList = [...appState.compareList, nextElement];
  emitStateChange('compareList', oldValue, appState.compareList, 'compareupdated', {
    atomicNumber: normalizedAtomicNumber
  });
  return [...appState.compareList];
}

export function replaceComparedElementAt(slotIndex, atomicNumber) {
  const normalizedSlotIndex = Number(slotIndex);
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex < 0 || normalizedAtomicNumber === null) {
    return [...appState.compareList];
  }

  if (normalizedSlotIndex >= appState.compareList.length) {
    return [...appState.compareList];
  }

  const nextElement = getElementFromCatalog(normalizedAtomicNumber);
  if (!nextElement) {
    return [...appState.compareList];
  }

  const targetElement = appState.compareList[normalizedSlotIndex];
  if (targetElement?.atomicNumber === normalizedAtomicNumber) {
    return [...appState.compareList];
  }

  const oldValue = [...appState.compareList];
  const nextList = appState.compareList
    .map((element, index) => (index === normalizedSlotIndex ? nextElement : element))
    .filter((element, index) => index === normalizedSlotIndex || element.atomicNumber !== normalizedAtomicNumber);

  appState.compareList = nextList;
  emitStateChange('compareList', oldValue, appState.compareList, 'compareupdated', {
    atomicNumber: normalizedAtomicNumber,
    replacedAtomicNumber: targetElement?.atomicNumber ?? null,
    slotIndex: normalizedSlotIndex
  });
  return [...appState.compareList];
}

export function removeComparedElement(atomicNumber) {
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  if (normalizedAtomicNumber === null) {
    return [...appState.compareList];
  }

  const oldValue = [...appState.compareList];
  const nextList = appState.compareList.filter((element) => element.atomicNumber !== normalizedAtomicNumber);

  if (nextList.length === oldValue.length) {
    return [...appState.compareList];
  }

  appState.compareList = nextList;
  emitStateChange('compareList', oldValue, appState.compareList, 'compareupdated', {
    atomicNumber: normalizedAtomicNumber
  });
  return [...appState.compareList];
}

export function clearCompareList() {
  return clearComparedElements();
}

export function clearComparedElements() {
  if (appState.compareList.length === 0) {
    return [];
  }

  const oldValue = [...appState.compareList];
  appState.compareList = [];
  emitStateChange('compareList', oldValue, appState.compareList, 'compareupdated');
  return [];
}

export function getLearnedElements() {
  return new Set(appState.learnedElements);
}

export function collectElement(atomicNumber) {
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  if (normalizedAtomicNumber === null || appState.collectedElements.has(normalizedAtomicNumber)) {
    return false;
  }

  const oldValue = new Set(appState.collectedElements);
  appState.collectedElements.add(normalizedAtomicNumber);
  emitStateChange('collectedElements', oldValue, appState.collectedElements, 'elementcollected', {
    atomicNumber: normalizedAtomicNumber
  });
  return true;
}

export function markElementLearned(atomicNumber) {
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  if (normalizedAtomicNumber === null || appState.learnedElements.has(normalizedAtomicNumber)) {
    return false;
  }

  const oldLearned = new Set(appState.learnedElements);
  const oldCollected = new Set(appState.collectedElements);

  appState.learnedElements.add(normalizedAtomicNumber);
  appState.collectedElements.add(normalizedAtomicNumber);
  appendActivity(
    'elementlearned',
    '学习了新元素',
    `已把第 ${normalizedAtomicNumber} 号元素加入学习记录。`,
    { atomicNumber: normalizedAtomicNumber }
  );

  emitStateChange('learnedElements', oldLearned, appState.learnedElements, 'elementlearned', {
    atomicNumber: normalizedAtomicNumber
  });
  emitStateChange('collectedElements', oldCollected, appState.collectedElements, 'elementcollected', {
    atomicNumber: normalizedAtomicNumber,
    source: 'markElementLearned'
  });
  return true;
}

export function getCollectedElements() {
  return new Set(appState.collectedElements);
}

export function getQuizScores() {
  return appState.quizScores.map((score) => ({ ...score }));
}

export function addQuizScore(scoreObj) {
  const normalizedScore = normalizeQuizScore(scoreObj);
  if (!normalizedScore) {
    return getQuizScores();
  }

  const oldValue = getQuizScores();
  appState.quizScores = [...appState.quizScores, normalizedScore];
  appendActivity(
    'quizcompleted',
    '完成了一次测验',
    `测验得分 ${normalizedScore.score}/${normalizedScore.total || normalizedScore.score}，正确率 ${normalizedScore.accuracy || 0}%。`,
    { ...normalizedScore }
  );
  emitStateChange('quizScores', oldValue, appState.quizScores, 'quizcompleted', {
    score: { ...normalizedScore }
  });
  return getQuizScores();
}

export function getCompletedExperiments() {
  return new Set(appState.completedExperiments);
}

export function getExperimentTitleOverride(reactionKey) {
  const normalizedKey = normalizeExperimentTitleKey(reactionKey);
  if (!normalizedKey) {
    return null;
  }

  return appState.experimentTitleOverrides[normalizedKey] ?? null;
}

export function setExperimentTitleOverride(reactionKey, title, options = {}) {
  const normalizedKey = normalizeExperimentTitleKey(reactionKey);
  if (!normalizedKey) {
    return null;
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const canonicalTitle = typeof options.canonicalTitle === 'string' ? options.canonicalTitle.trim() : '';
  const nextTitle = trimmedTitle && trimmedTitle !== canonicalTitle ? trimmedTitle : null;
  const currentTitle = appState.experimentTitleOverrides[normalizedKey] ?? null;

  if (currentTitle === nextTitle) {
    return currentTitle;
  }

  const oldValue = { ...appState.experimentTitleOverrides };
  const nextValue = { ...appState.experimentTitleOverrides };

  if (nextTitle === null) {
    delete nextValue[normalizedKey];
  } else {
    nextValue[normalizedKey] = nextTitle;
  }

  appState.experimentTitleOverrides = nextValue;
  emitStateChange('experimentTitleOverrides', oldValue, appState.experimentTitleOverrides, 'experimenttitlechange', {
    reactionKey: normalizedKey,
    previousTitle: currentTitle,
    title: nextTitle,
    canonicalTitle: canonicalTitle || null
  });

  return nextTitle;
}

export function clearExperimentTitleOverride(reactionKey) {
  const normalizedKey = normalizeExperimentTitleKey(reactionKey);
  if (!normalizedKey || !Object.prototype.hasOwnProperty.call(appState.experimentTitleOverrides, normalizedKey)) {
    return null;
  }

  const oldValue = { ...appState.experimentTitleOverrides };
  const nextValue = { ...appState.experimentTitleOverrides };
  delete nextValue[normalizedKey];

  appState.experimentTitleOverrides = nextValue;
  emitStateChange('experimentTitleOverrides', oldValue, appState.experimentTitleOverrides, 'experimenttitlechange', {
    reactionKey: normalizedKey,
    previousTitle: oldValue[normalizedKey] ?? null,
    title: null,
    canonicalTitle: null
  });

  return null;
}

export function markExperimentCompleted(experimentId) {
  if (typeof experimentId !== 'string' || !experimentId.trim() || appState.completedExperiments.has(experimentId)) {
    return false;
  }

  const oldValue = new Set(appState.completedExperiments);
  appState.completedExperiments.add(experimentId);
  appendActivity(
    'experimentcompleted',
    '完成了一项实验',
    `实验 ${experimentId} 已写入完成记录。`,
    { experimentId }
  );
  emitStateChange('completedExperiments', oldValue, appState.completedExperiments, 'experimentcompleted', {
    experimentId
  });
  return true;
}

export function getUnlockedAchievements() {
  return new Set(appState.unlockedAchievements);
}

export function getAchievementDates() {
  return { ...appState.achievementDates };
}

export function unlockAchievement(achievementId) {
  if (typeof achievementId !== 'string' || !achievementId.trim() || appState.unlockedAchievements.has(achievementId)) {
    return false;
  }

  const oldValue = new Set(appState.unlockedAchievements);
  appState.unlockedAchievements.add(achievementId);
  if (!appState.achievementDates[achievementId]) {
    appState.achievementDates[achievementId] = new Date().toISOString();
  }
  appendActivity(
    'achievementunlocked',
    '解锁了新成就',
    `成就 ${achievementId} 已收入成就中心。`,
    { achievementId, unlockedAt: appState.achievementDates[achievementId] }
  );
  emitStateChange('unlockedAchievements', oldValue, appState.unlockedAchievements, 'achievementunlocked', {
    achievementId,
    unlockedAt: appState.achievementDates[achievementId]
  });
  return true;
}

export function getGameScores(gameKey) {
  if (typeof gameKey === 'string' && gameKey) {
    return appState.gameScores[gameKey] ?? null;
  }

  return { ...appState.gameScores };
}

export function getGamePlayCounts(gameKey) {
  if (typeof gameKey === 'string' && gameKey) {
    return appState.gamePlays[gameKey] ?? 0;
  }

  return { ...appState.gamePlays };
}

export function getActivityLog() {
  return appState.activityLog.map((entry) => ({
    ...entry,
    meta: { ...(entry.meta || {}) }
  }));
}

export function updateGameScore(gameKey, score) {
  if (typeof gameKey !== 'string' || !gameKey || !Number.isFinite(Number(score))) {
    return getGameScores();
  }

  const oldValue = { ...appState.gameScores };
  const numericScore = Number(score);
  const previousBest = Number(appState.gameScores[gameKey] ?? 0);
  appState.gameScores = {
    ...appState.gameScores,
    [gameKey]: Math.max(previousBest, numericScore)
  };
  appState.gamePlays = {
    ...appState.gamePlays,
    [gameKey]: Number(appState.gamePlays[gameKey] ?? 0) + 1
  };
  appendActivity(
    'gamecompleted',
    '完成了一次学习游戏',
    `${gameKey} 本次得分 ${numericScore}，当前最高分 ${appState.gameScores[gameKey]}。`,
    {
      gameKey,
      score: numericScore,
      bestScore: appState.gameScores[gameKey],
      playCount: appState.gamePlays[gameKey]
    }
  );
  emitStateChange('gameScores', oldValue, appState.gameScores, 'gamescoreupdated', {
    gameKey,
    score: numericScore,
    bestScore: appState.gameScores[gameKey],
    playCount: appState.gamePlays[gameKey]
  });
  return getGameScores();
}

export function getSettings() {
  return { ...appState.settings };
}

export function updateSettings(newSettings) {
  const oldValue = { ...appState.settings };
  appState.settings = {
    ...appState.settings,
    ...sanitizeSettingsPatch(newSettings)
  };
  emitStateChange('settings', oldValue, appState.settings, 'settingsupdated');
  return getSettings();
}

export function resetProgress() {
  const previousState = getStateSnapshot();
  const preservedSettings = { ...appState.settings };

  appState = {
    ...createDefaultState(appState.elements),
    elements: [...appState.elements],
    settings: preservedSettings
  };

  emitEvent('statereset', {
    scope: 'progress',
    oldValue: previousState,
    newValue: getStateSnapshot()
  });
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveProgress();
  return getStateSnapshot();
}

export function resetAll() {
  const previousState = getStateSnapshot();

  appState = createDefaultState(appState.elements);

  emitEvent('statereset', {
    scope: 'all',
    oldValue: previousState,
    newValue: getStateSnapshot()
  });
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveProgress();
  return getStateSnapshot();
}

export { STORAGE_KEY, SCHEMA_VERSION, migratePersistedEnvelope, migrateV0ToV1 };
