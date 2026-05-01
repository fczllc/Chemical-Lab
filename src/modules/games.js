/** ===== 游戏中心模块 ===== */
import { GAME_KEYS, GAME_META } from '../data/contentMeta.js';
import { reactions } from '../data/index.js';
import { navigateTo } from './router.js';
import {
  getCollectedElements,
  getGameScores,
  getLearnedElements,
  updateGameScore
} from './storage.js';

const REWARD_TIERS = [10, 30, 60, 90, 118];
const DRAG_BATCH_SIZE = 8;
const MEMORY_PAIR_COUNT = 8;

let allElements = [];
let listenersBound = false;
let activeSession = null;
let sessionSequence = 0;

const viewState = {
  attempts: {
    [GAME_KEYS.drag]: 0,
    [GAME_KEYS.memory]: 0,
    [GAME_KEYS.reaction]: 0,
    [GAME_KEYS.collector]: 0
  },
  recentScores: {},
  feedback: ''
};

export function initGames(elements = []) {
  allElements = Array.isArray(elements) ? elements : [];

  const gamesSection = document.getElementById('games');
  const primaryGrid = gamesSection?.querySelector('[data-testid="games-primary-grid"]');
  const cards = primaryGrid?.querySelectorAll('.game-card');
  const gameArea = document.getElementById('game-area');
  if (!gamesSection || !cards?.length || !gameArea) {
    return;
  }

  cards.forEach((card) => {
    const gameName = card.dataset.game;
    const button = card.querySelector('.play-btn');
    if (!gameName || !button) {
      return;
    }

    card.addEventListener('click', (event) => {
      if (event.target.closest('.play-btn')) {
        return;
      }
      launchGame(gameName);
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      launchGame(gameName);
    });
  });

  if (!listenersBound) {
    window.addEventListener('gamescoreupdated', handleGameScoreUpdated);
    window.addEventListener('statechange', handleStateChange);
    window.addEventListener('pagechange', handlePageChange);
    document.addEventListener('keydown', handleKeydown);
    listenersBound = true;
  }

  renderGamesHub();
}

function handleGameScoreUpdated(event) {
  const gameKey = event.detail?.gameKey;
  const score = Number(event.detail?.score ?? 0);
  if (gameKey) {
    viewState.recentScores[gameKey] = score;
  }
  renderGamesHub();
}

function handleStateChange(event) {
  const field = event.detail?.field;
  if (field === 'learnedElements' || field === 'collectedElements') {
    renderGamesHub();
    if (activeSession?.type === 'collector') {
      renderCollectorGame();
    }
  }
}

function handlePageChange(event) {
  if (event.detail?.section !== 'games' && activeSession) {
    closeActiveGame();
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && activeSession) {
    closeActiveGame();
  }
}

function renderGamesHub() {
  renderGameCards();

  const gameArea = document.getElementById('game-area');
  if (!gameArea || activeSession) {
    return;
  }

  const totals = Object.keys(GAME_KEYS).map((key) => getCardStats(GAME_KEYS[key]));
  const topScore = Math.max(...totals.map((item) => item.bestScore), 0);
  const totalAttempts = totals.reduce((sum, item) => sum + item.attempts, 0);
  const learnedCount = getLearnedElements().size;
  const progressPercent = getCollectorPercent();

  gameArea.className = 'game-area game-area-idle hud-shell';
  gameArea.innerHTML = `
    <div class="hud-shell-header games-overview-header">
      <div>
        <p class="hud-kicker">SCIENCE ARCADE</p>
        <h3>选择一个小游戏开始训练</h3>
      </div>
    </div>
    <div class="games-overview-stats">
      <div class="quiz-stat-card"><span>当前最高分</span><strong>${topScore}</strong></div>
      <div class="quiz-stat-card"><span>本次会话次数</span><strong>${totalAttempts}</strong></div>
      <div class="quiz-stat-card"><span>已学习元素</span><strong>${learnedCount}/118</strong></div>
      <div class="quiz-stat-card"><span>收藏完成率</span><strong>${progressPercent}%</strong></div>
    </div>
    <p class="games-overview-copy">从周期表定位、记忆配对到反应识别，这里会根据你的学习进度实时刷新分数与收藏状态。</p>
  `;


}

function renderGameCards() {
  document.querySelectorAll('#games [data-testid="games-primary-grid"] .game-card').forEach((card) => {
    const gameName = card.dataset.game;
    const meta = GAME_META[gameName];
    if (!meta) {
      return;
    }

    const gameKey = GAME_KEYS[gameName];
    const stats = getCardStats(gameKey);
    const buttonLabel = gameName === 'collector' ? '查看收藏' : '开始游戏';

    card.innerHTML = `
      <p class="game-card-kicker">${meta.kicker}</p>
      <h3>${meta.title}</h3>
      <p>${meta.description}</p>
      <div class="game-card-stats">
        <span>最高分 <strong>${stats.bestScore}</strong></span>
        <span>最近分 <strong>${stats.recentScore}</strong></span>
        <span>游戏次数 <strong>${stats.attempts}</strong></span>
      </div>
      <button class="play-btn">${buttonLabel}</button>
    `;
  });

  document.querySelectorAll('#games [data-testid="games-primary-grid"] .game-card .play-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const gameName = event.currentTarget.closest('.game-card')?.dataset.game;
      if (gameName) {
        launchGame(gameName);
      }
    });
  });
}

function getCardStats(gameKey) {
  const persistedScore = Number(getGameScores(gameKey) ?? 0);
  const recentScore = Number(viewState.recentScores[gameKey] ?? persistedScore);
  return {
    bestScore: persistedScore,
    recentScore,
    attempts: viewState.attempts[gameKey] ?? 0
  };
}

function launchGame(gameName) {
  if (!(gameName in GAME_KEYS)) {
    return;
  }

  closeActiveGame({ preserveView: true });
  const gameKey = GAME_KEYS[gameName];
  viewState.attempts[gameKey] = (viewState.attempts[gameKey] ?? 0) + 1;
  viewState.feedback = '';

  if (gameName === 'drag') {
    startDragGame();
    return;
  }
  if (gameName === 'memory') {
    startMemoryGame();
    return;
  }
  if (gameName === 'reaction') {
    startReactionGame();
    return;
  }

  startCollectorGame();
}

function startDragGame() {
  const sessionId = createSessionId();
  activeSession = {
    id: sessionId,
    type: 'drag',
    score: 0,
    remainingSeconds: 60,
    correctCount: 0,
    wrongCount: 0,
    usedAtomicNumbers: new Set(),
    placedMap: new Map(),
    batchElements: [],
    timerId: null,
    feedback: '拖动下方元素卡片到正确位置。'
  };

  refillDragBatch();
  activeSession.timerId = window.setInterval(() => {
    if (!activeSession || activeSession.type !== 'drag' || activeSession.id !== sessionId) {
      return;
    }
    activeSession.remainingSeconds -= 1;
    if (activeSession.remainingSeconds <= 0) {
      finishDragGame();
      return;
    }
    updateDragHeaderStats();
  }, 1000);

  renderDragGame();
}

function refillDragBatch() {
  if (!activeSession || activeSession.type !== 'drag') {
    return;
  }

  const pool = allElements
    .filter((element) => element.x && element.y && !['lanthanide', 'actinide'].includes(element.category))
    .filter((element) => !activeSession.usedAtomicNumbers.has(element.atomicNumber));

  if (pool.length === 0) {
    activeSession.usedAtomicNumbers.clear();
    refillDragBatch();
    return;
  }

  const nextBatch = shuffleArray([...pool]).slice(0, Math.min(DRAG_BATCH_SIZE, pool.length));
  activeSession.batchElements = nextBatch;
  activeSession.placedMap = new Map();
  nextBatch.forEach((element) => activeSession.usedAtomicNumbers.add(element.atomicNumber));
}

function renderDragGame() {
  if (!activeSession || activeSession.type !== 'drag') {
    return;
  }

  const gameArea = ensureGameOverlay();
  const slotMarkup = activeSession.batchElements.map((element) => {
    const placed = activeSession.placedMap.get(element.atomicNumber);
    return `
      <div class="drag-slot ${placed ? 'is-filled is-correct-flash' : ''}" data-slot-atomic="${element.atomicNumber}" style="grid-column:${element.x};grid-row:${element.y};">
        <span class="drag-slot-label">${element.period}周期 · ${element.group}族</span>
        ${placed ? `<div class="drag-placed-card"><strong>${element.symbol}</strong><span>${element.chineseName}</span></div>` : '<span class="drag-slot-placeholder">拖到这里</span>'}
      </div>
    `;
  }).join('');

  const cardMarkup = activeSession.batchElements.map((element) => {
    const isPlaced = activeSession.placedMap.has(element.atomicNumber);
    return `
      <div class="drag-card ${isPlaced ? 'is-locked' : ''}" draggable="${isPlaced ? 'false' : 'true'}" data-drag-atomic="${element.atomicNumber}">
        <span class="drag-card-number">${element.atomicNumber}</span>
        <strong>${element.symbol}</strong>
        <span>${element.chineseName}</span>
      </div>
    `;
  }).join('');

  gameArea.innerHTML = buildGameFrame({
    title: GAME_META.drag.title,
    kicker: GAME_META.drag.kicker,
    summary: `正确 +10 / 错误 -2 · 已完成 ${activeSession.correctCount} 张`,
    stats: [
      { label: '倒计时', value: `${activeSession.remainingSeconds}s` },
      { label: '当前得分', value: activeSession.score },
      { label: '正确次数', value: activeSession.correctCount },
      { label: '错误次数', value: activeSession.wrongCount }
    ],
    body: `
      <div class="game-feedback ${resolveFeedbackTone(activeSession.feedback)}">${activeSession.feedback}</div>
      <div class="drag-game-layout">
        <div class="drag-grid-shell">
          <div class="drag-grid">${slotMarkup}</div>
        </div>
        <div class="drag-tray">
          <h4>待归位元素</h4>
          <div class="drag-card-tray">${cardMarkup}</div>
        </div>
      </div>
    `
  });

  bindOverlayActions();
  bindDragInteractions();
}

function bindDragInteractions() {
  let draggingAtomicNumber = null;

  document.querySelectorAll('.drag-card[draggable="true"]').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      draggingAtomicNumber = Number(event.currentTarget.dataset.dragAtomic);
      event.dataTransfer?.setData('text/plain', String(draggingAtomicNumber));
      event.dataTransfer.effectAllowed = 'move';
      event.currentTarget.classList.add('is-dragging');
    });

    card.addEventListener('dragend', (event) => {
      draggingAtomicNumber = null;
      event.currentTarget.classList.remove('is-dragging');
    });
  });

  document.querySelectorAll('.drag-slot').forEach((slot) => {
    slot.addEventListener('dragover', (event) => {
      event.preventDefault();
      slot.classList.add('is-hovered');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('is-hovered');
    });

    slot.addEventListener('drop', (event) => {
      event.preventDefault();
      slot.classList.remove('is-hovered');
      const droppedAtomic = Number(event.dataTransfer?.getData('text/plain') || draggingAtomicNumber);
      handleDragDrop(droppedAtomic, Number(slot.dataset.slotAtomic));
    });
  });
}

function handleDragDrop(droppedAtomicNumber, slotAtomicNumber) {
  if (!activeSession || activeSession.type !== 'drag') {
    return;
  }

  const draggedCard = document.querySelector(`.drag-card[data-drag-atomic="${droppedAtomicNumber}"]`);
  const targetSlot = document.querySelector(`.drag-slot[data-slot-atomic="${slotAtomicNumber}"]`);

  if (droppedAtomicNumber === slotAtomicNumber) {
    activeSession.placedMap.set(slotAtomicNumber, true);
    activeSession.score += 10;
    activeSession.correctCount += 1;
    activeSession.feedback = '定位正确！元素已锁定到对应位置。';
    renderDragGame();

    if (activeSession.placedMap.size === activeSession.batchElements.length) {
      const currentSessionId = activeSession.id;
      window.setTimeout(() => {
        if (
          !activeSession
          || activeSession.type !== 'drag'
          || activeSession.id !== currentSessionId
          || activeSession.remainingSeconds <= 0
        ) {
          return;
        }
        refillDragBatch();
        activeSession.feedback = '新一批元素已到达，继续归位吧！';
        renderDragGame();
      }, 500);
    }
    return;
  }

  activeSession.score -= 2;
  activeSession.wrongCount += 1;
  activeSession.feedback = '位置不对，卡片已弹回，看看周期和族编号再试一次。';
  draggedCard?.classList.add('was-wrong');
  targetSlot?.classList.add('is-wrong-flash');
  updateDragHeaderStats();
  updateFeedbackText(activeSession.feedback);
  window.setTimeout(() => {
    draggedCard?.classList.remove('was-wrong');
    targetSlot?.classList.remove('is-wrong-flash');
  }, 600);
}

function updateDragHeaderStats() {
  if (!activeSession || activeSession.type !== 'drag') {
    return;
  }

  updateOverlayStat(0, `${activeSession.remainingSeconds}s`);
  updateOverlayStat(1, activeSession.score);
  updateOverlayStat(2, activeSession.correctCount);
  updateOverlayStat(3, activeSession.wrongCount);
}

function finishDragGame() {
  if (!activeSession || activeSession.type !== 'drag') {
    return;
  }

  const score = activeSession.score;
  const rating = getScoreRating(score, [140, 90, 40]);
  recordGameResult(GAME_KEYS.drag, score);

  renderResultScreen({
    title: '元素拖拽归位完成',
    kicker: 'DOCKING REPORT',
    score,
    rating,
    stats: [
      { label: '正确放置', value: activeSession.correctCount },
      { label: '错误次数', value: activeSession.wrongCount },
      { label: '剩余批次', value: Math.max(activeSession.batchElements.length - activeSession.placedMap.size, 0) }
    ],
    summary: '你的周期表空间定位能力已经完成本轮扫描。'
  });
}

function startMemoryGame() {
  const sessionId = createSessionId();
  const chosen = shuffleArray([...allElements]).slice(0, MEMORY_PAIR_COUNT);
  const cards = shuffleArray(chosen.flatMap((element) => ([
    {
      id: `${element.atomicNumber}-symbol`,
      pairId: element.atomicNumber,
      type: 'symbol',
      label: element.symbol,
      hint: '元素符号'
    },
    {
      id: `${element.atomicNumber}-name`,
      pairId: element.atomicNumber,
      type: 'name',
      label: element.chineseName,
      hint: '中文名称'
    }
  ])));

  activeSession = {
    id: sessionId,
    type: 'memory',
    cards,
    matchedIds: new Set(),
    selectedIds: [],
    moves: 0,
    elapsedSeconds: 0,
    timerId: window.setInterval(() => {
      if (!activeSession || activeSession.type !== 'memory' || activeSession.id !== sessionId) {
        return;
      }
      activeSession.elapsedSeconds += 1;
      updateOverlayStat(0, `${activeSession.elapsedSeconds}s`);
    }, 1000),
    lockBoard: false,
    feedback: '翻开两张卡片，找到“元素符号 ↔ 中文名”的组合。'
  };

  renderMemoryGame();
}

function renderMemoryGame() {
  if (!activeSession || activeSession.type !== 'memory') {
    return;
  }

  const gameArea = ensureGameOverlay();
  const cardMarkup = activeSession.cards.map((card) => {
    const isMatched = activeSession.matchedIds.has(card.id);
    const isSelected = activeSession.selectedIds.includes(card.id);
    const isRevealed = isMatched || isSelected;
    return `
      <button class="memory-card ${isRevealed ? 'is-revealed' : ''} ${isMatched ? 'is-matched' : ''}" data-memory-id="${card.id}" ${isMatched ? 'disabled' : ''}>
        <span class="memory-card-face memory-card-front">?</span>
        <span class="memory-card-face memory-card-back">
          <small>${card.hint}</small>
          <strong>${card.label}</strong>
        </span>
      </button>
    `;
  }).join('');

  gameArea.innerHTML = buildGameFrame({
    title: GAME_META.memory.title,
    kicker: GAME_META.memory.kicker,
    summary: '每次翻牌都会计入步数，越快完成评级越高。',
    stats: [
      { label: '用时', value: `${activeSession.elapsedSeconds}s` },
      { label: '步数', value: activeSession.moves },
      { label: '已配对', value: activeSession.matchedIds.size / 2 },
      { label: '目标配对', value: MEMORY_PAIR_COUNT }
    ],
    body: `
      <div class="game-feedback ${resolveFeedbackTone(activeSession.feedback)}">${activeSession.feedback}</div>
      <div class="memory-grid">${cardMarkup}</div>
    `
  });

  bindOverlayActions();
  document.querySelectorAll('.memory-card').forEach((button) => {
    button.addEventListener('click', () => handleMemoryCardClick(button.dataset.memoryId));
  });
}

function handleMemoryCardClick(cardId) {
  if (!activeSession || activeSession.type !== 'memory' || activeSession.lockBoard) {
    return;
  }
  if (activeSession.selectedIds.includes(cardId) || activeSession.matchedIds.has(cardId)) {
    return;
  }

  activeSession.selectedIds.push(cardId);
  if (activeSession.selectedIds.length < 2) {
    activeSession.feedback = '再翻开一张看看能不能配对成功。';
    renderMemoryGame();
    return;
  }

  activeSession.moves += 1;
  activeSession.lockBoard = true;
  const [firstId, secondId] = activeSession.selectedIds;
  const firstCard = activeSession.cards.find((card) => card.id === firstId);
  const secondCard = activeSession.cards.find((card) => card.id === secondId);
  const isMatch = firstCard && secondCard && firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type;

  if (isMatch) {
    activeSession.matchedIds.add(firstId);
    activeSession.matchedIds.add(secondId);
    activeSession.feedback = '配对成功！记忆回路已点亮。';
    activeSession.selectedIds = [];
    activeSession.lockBoard = false;
    renderMemoryGame();

    if (activeSession.matchedIds.size === activeSession.cards.length) {
      finishMemoryGame();
    }
    return;
  }

  activeSession.feedback = '这两张不匹配，稍后会自动翻回。';
  renderMemoryGame();
  const currentSessionId = activeSession.id;
  window.setTimeout(() => {
    if (!activeSession || activeSession.type !== 'memory' || activeSession.id !== currentSessionId) {
      return;
    }
    activeSession.selectedIds = [];
    activeSession.lockBoard = false;
    activeSession.feedback = '继续寻找新的组合吧。';
    renderMemoryGame();
  }, 900);
}

function finishMemoryGame() {
  if (!activeSession || activeSession.type !== 'memory') {
    return;
  }

  const score = Math.max(20, 180 - (activeSession.moves * 8) - (activeSession.elapsedSeconds * 2));
  const rating = getScoreRating(score, [130, 90, 50]);
  recordGameResult(GAME_KEYS.memory, score);

  renderResultScreen({
    title: '元素记忆翻牌完成',
    kicker: 'MEMORY REPORT',
    score,
    rating,
    stats: [
      { label: '完成步数', value: activeSession.moves },
      { label: '完成用时', value: `${activeSession.elapsedSeconds}s` },
      { label: '成功配对', value: MEMORY_PAIR_COUNT }
    ],
    summary: '你已经把元素符号和中文名成功链接起来了。'
  });
}

function startReactionGame() {
  const sessionId = createSessionId();
  const chosenReactions = shuffleArray([...reactions]).slice(0, Math.min(5, reactions.length));
  const products = shuffleArray(chosenReactions.map((reaction) => ({
    id: reaction.id,
    label: reaction.products.join(' + ')
  })));

  activeSession = {
    id: sessionId,
    type: 'reaction',
    reactions: chosenReactions,
    products,
    selectedReactionId: null,
    matchedIds: new Set(),
    score: 0,
    remainingSeconds: 75,
    timerId: window.setInterval(() => {
      if (!activeSession || activeSession.type !== 'reaction' || activeSession.id !== sessionId) {
        return;
      }
      activeSession.remainingSeconds -= 1;
      if (activeSession.remainingSeconds <= 0) {
        finishReactionGame();
        return;
      }
      updateOverlayStat(0, `${activeSession.remainingSeconds}s`);
    }, 1000),
    feedback: '先选左侧反应物，再点击右侧正确的生成物。'
  };

  renderReactionGame();
}

function renderReactionGame() {
  if (!activeSession || activeSession.type !== 'reaction') {
    return;
  }

  const gameArea = ensureGameOverlay();
  const reactantsMarkup = activeSession.reactions.map((reaction) => {
    const matched = activeSession.matchedIds.has(reaction.id);
    const selected = activeSession.selectedReactionId === reaction.id;
    return `
      <button class="reaction-chip ${selected ? 'is-selected' : ''} ${matched ? 'is-matched' : ''}" data-reaction-left="${reaction.id}" ${matched ? 'disabled' : ''}>
        <small>${reaction.name}</small>
        <strong>${reaction.reactants.join(' + ')}</strong>
      </button>
    `;
  }).join('');

  const productsMarkup = activeSession.products.map((product) => {
    const matched = activeSession.matchedIds.has(product.id);
    return `
      <button class="reaction-chip reaction-chip-product ${matched ? 'is-matched' : ''}" data-reaction-right="${product.id}" ${matched ? 'disabled' : ''}>
        <small>生成物</small>
        <strong>${product.label}</strong>
      </button>
    `;
  }).join('');

  gameArea.innerHTML = buildGameFrame({
    title: GAME_META.reaction.title,
    kicker: GAME_META.reaction.kicker,
    summary: '每次正确配对 +10 分。全部完成或倒计时结束后结算。',
    stats: [
      { label: '倒计时', value: `${activeSession.remainingSeconds}s` },
      { label: '当前得分', value: activeSession.score },
      { label: '已配对', value: activeSession.matchedIds.size },
      { label: '总反应数', value: activeSession.reactions.length }
    ],
    body: `
      <div class="game-feedback ${resolveFeedbackTone(activeSession.feedback)}">${activeSession.feedback}</div>
      <div class="reaction-board">
        <div class="reaction-column">
          <h4>反应物</h4>
          <div class="reaction-column-list">${reactantsMarkup}</div>
        </div>
        <div class="reaction-column">
          <h4>生成物</h4>
          <div class="reaction-column-list">${productsMarkup}</div>
        </div>
      </div>
    `
  });

  bindOverlayActions();
  document.querySelectorAll('[data-reaction-left]').forEach((button) => {
    button.addEventListener('click', () => {
      activeSession.selectedReactionId = button.dataset.reactionLeft;
      activeSession.feedback = '已锁定一个反应物，请在右侧选择对应生成物。';
      renderReactionGame();
    });
  });

  document.querySelectorAll('[data-reaction-right]').forEach((button) => {
    button.addEventListener('click', () => handleReactionSelection(button.dataset.reactionRight));
  });
}

function handleReactionSelection(productId) {
  if (!activeSession || activeSession.type !== 'reaction' || !activeSession.selectedReactionId) {
    return;
  }

  if (productId === activeSession.selectedReactionId) {
    activeSession.matchedIds.add(productId);
    activeSession.score += 10;
    activeSession.feedback = '配对正确！该反应链路已完成。';
    activeSession.selectedReactionId = null;
    renderReactionGame();
    if (activeSession.matchedIds.size === activeSession.reactions.length) {
      finishReactionGame();
    }
    return;
  }

  activeSession.feedback = '这个生成物不匹配，请重新观察反应物组合。';
  activeSession.selectedReactionId = null;
  renderReactionGame();
}

function finishReactionGame() {
  if (!activeSession || activeSession.type !== 'reaction') {
    return;
  }

  const score = activeSession.score;
  const rating = getScoreRating(score, [45, 30, 10]);
  recordGameResult(GAME_KEYS.reaction, score);

  renderResultScreen({
    title: '反应配对完成',
    kicker: 'REACTION REPORT',
    score,
    rating,
    stats: [
      { label: '正确配对', value: activeSession.matchedIds.size },
      { label: '总反应数', value: activeSession.reactions.length },
      { label: '剩余时间', value: `${Math.max(activeSession.remainingSeconds, 0)}s` }
    ],
    summary: '你的反应识别速度已经完成这一轮化学连线挑战。'
  });
}

function startCollectorGame() {
  const score = getCollectorPercent();
  activeSession = {
    id: createSessionId(),
    type: 'collector',
    score,
    feedback: '亮起的元素代表你已经学习过，灰色元素表示还有新知识等你解锁。'
  };
  recordGameResult(GAME_KEYS.collector, score, { keepSession: true });
  renderCollectorGame();
}

function renderCollectorGame() {
  if (!activeSession || activeSession.type !== 'collector') {
    return;
  }

  const learned = getLearnedElements();
  const collected = getCollectedElements();
  const score = getCollectorPercent();
  const nextReward = REWARD_TIERS.find((value) => learned.size < value) ?? 118;
  const rewardMarkup = REWARD_TIERS.map((tier) => {
    const unlocked = learned.size >= tier;
    return `
      <div class="collector-reward ${unlocked ? 'is-unlocked' : ''}">
        <strong>${tier}</strong>
        <span>${unlocked ? '已解锁奖励' : `再学 ${tier - learned.size} 个`}</span>
      </div>
    `;
  }).join('');

  const wallMarkup = allElements.map((element) => {
    const unlocked = learned.has(element.atomicNumber);
    return `
      <button class="collector-cell ${unlocked ? 'is-unlocked' : 'is-locked'}" data-collector-atomic="${element.atomicNumber}">
        <small>${element.atomicNumber}</small>
        <strong>${element.symbol}</strong>
        <span>${element.chineseName}</span>
      </button>
    `;
  }).join('');

  const gameArea = ensureGameOverlay();
  gameArea.innerHTML = buildGameFrame({
    title: GAME_META.collector.title,
    kicker: GAME_META.collector.kicker,
    summary: `距离下一档奖励还差 ${Math.max(nextReward - learned.size, 0)} 个已学习元素。`,
    stats: [
      { label: '学习进度', value: `${learned.size}/118` },
      { label: '收集率', value: `${score}%` },
      { label: '已收集', value: collected.size },
      { label: '奖励阶段', value: `${REWARD_TIERS.filter((tier) => learned.size >= tier).length}/${REWARD_TIERS.length}` }
    ],
    body: `
      <div class="game-feedback info">${activeSession.feedback}</div>
      <div class="collector-dashboard">
        <div class="collector-progress-ring" style="--collector-progress:${score}%;">
          <div class="collector-progress-fill"></div>
          <div class="collector-progress-center"><strong>${score}%</strong><span>完成率</span></div>
        </div>
        <div class="collector-side-panel">
          <h4>收集奖励</h4>
          <div class="collector-rewards">${rewardMarkup}</div>
          <div class="collector-prompt" id="collector-prompt">点击灰色元素会提示你“去学习此元素”。</div>
        </div>
      </div>
      <div class="collector-wall">${wallMarkup}</div>
    `
  });

  bindOverlayActions();
  document.querySelectorAll('[data-collector-atomic]').forEach((button) => {
    button.addEventListener('click', () => {
      const atomicNumber = Number(button.dataset.collectorAtomic);
      const element = allElements.find((item) => item.atomicNumber === atomicNumber);
      const prompt = document.getElementById('collector-prompt');
      if (!element || !prompt) {
        return;
      }

      if (learned.has(atomicNumber)) {
        prompt.textContent = `${element.chineseName} 已经点亮，继续去主页查看更多知识吧。`;
        return;
      }

      prompt.textContent = `去学习此元素：${element.chineseName}（${element.symbol}）。从主页周期表进入详情即可解锁。`;
    });
  });
}

function recordGameResult(gameKey, score, options = {}) {
  const bestScore = Math.max(Number(getGameScores(gameKey) ?? 0), Number(score));
  updateGameScore(gameKey, bestScore);
  viewState.recentScores[gameKey] = score;

  if (!options.keepSession) {
    stopSessionTimer();
  }

  renderGamesHub();
}

function renderResultScreen({ title, kicker, score, rating, stats, summary }) {
  const gameArea = ensureGameOverlay();
  gameArea.innerHTML = buildGameFrame({
    title,
    kicker,
    summary,
    stats: [
      { label: '最终得分', value: score },
      { label: '评级', value: rating },
      ...stats
    ],
    body: `
      <div class="game-result-panel">
        <div class="game-result-badge">${rating}</div>
        <p class="game-result-copy">${summary}</p>
        <div class="game-result-actions">
          <button class="hud-action-btn hud-action-btn-primary" data-action="play-again">再来一局</button>
          <button class="hud-action-btn" data-action="close-game">返回游戏中心</button>
        </div>
      </div>
    `
  });

  bindOverlayActions({ canReplay: true });
}

function bindOverlayActions(options = {}) {
  document.querySelector('[data-action="close-game"]')?.addEventListener('click', closeActiveGame);
  document.querySelector('[data-action="play-again"]')?.addEventListener('click', () => {
    if (!activeSession) {
      return;
    }
    const currentType = activeSession.type;
    if (options.canReplay) {
      launchGame(currentType);
    }
  });
}

function closeActiveGame(options = {}) {
  stopSessionTimer();

  if (!options.preserveView) {
    activeSession = null;
  }

  const gameArea = document.getElementById('game-area');
  if (gameArea && !options.preserveView) {
    gameArea.className = 'game-area';
  }

  if (!options.preserveView) {
    renderGamesHub();
  }
}

function stopSessionTimer() {
  if (activeSession?.timerId) {
    window.clearInterval(activeSession.timerId);
  }
}

function ensureGameOverlay() {
  const gameArea = document.getElementById('game-area');
  gameArea.className = 'game-area active';
  return gameArea;
}

function buildGameFrame({ title, kicker, summary, stats, body }) {
  return `
    <div class="game-overlay hud-shell">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">${kicker}</p>
          <h3>${title}</h3>
          <p class="game-summary">${summary}</p>
        </div>
        <div class="game-frame-actions">
          <button class="hud-action-btn" data-action="close-game">关闭</button>
        </div>
      </div>
      <div class="quiz-scoreboard game-scoreboard">
        ${stats.map((item) => `<div class="quiz-stat-card"><span>${item.label}</span><strong>${item.value}</strong></div>`).join('')}
      </div>
      <div class="game-body-shell">${body}</div>
    </div>
  `;
}

function updateOverlayStat(index, value) {
  const cards = document.querySelectorAll('.game-scoreboard .quiz-stat-card strong');
  const current = cards[index];
  if (current) {
    current.textContent = String(value);
  }
}

function updateFeedbackText(text) {
  const feedback = document.querySelector('.game-feedback');
  if (feedback) {
    feedback.textContent = text;
    feedback.className = `game-feedback ${resolveFeedbackTone(text)}`;
  }
}

function resolveFeedbackTone(message = '') {
  if (message.includes('正确') || message.includes('成功') || message.includes('点亮')) {
    return 'success';
  }
  if (message.includes('不') || message.includes('错') || message.includes('弹回')) {
    return 'error';
  }
  return 'info';
}

function getCollectorPercent() {
  return Math.round((getLearnedElements().size / 118) * 100);
}

function getScoreRating(score, [sThreshold, aThreshold, bThreshold]) {
  if (score >= sThreshold) {
    return 'S';
  }
  if (score >= aThreshold) {
    return 'A';
  }
  if (score >= bThreshold) {
    return 'B';
  }
  return 'C';
}

function shuffleArray(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function createSessionId() {
  sessionSequence += 1;
  return sessionSequence;
}
