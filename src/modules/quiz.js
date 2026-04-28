/** ===== 测验模块 ===== */
import { quizData } from '../data/index.js';
import { restoreSelectedElementView } from './renderTable.js';
import { getCurrentSection, navigateTo } from './router.js';
import {
  addQuizScore,
  getGameScores,
  getQuizScores,
  getSelectedElement,
  updateGameScore
} from './storage.js';

const QUICK_QUIZ_COUNT = 5;
const FULL_QUIZ_COUNT = 20;
const FULL_QUIZ_GAME_KEY = 'quiz-full';

let quizSession = createEmptySession();
let isQuizBound = false;

export function initQuiz() {
  const modal = document.getElementById('quiz-modal');
  const quizContent = document.getElementById('quiz-content');
  if (!modal || !quizContent) {
    return;
  }

  renderGamesHub();

  if (isQuizBound) {
    return;
  }

  modal.querySelector('.modal-close')?.addEventListener('click', closeQuiz);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeQuiz();
    }
  });

  window.addEventListener('startquiz', (event) => {
    openQuiz({
      mode: 'quick',
      element: event.detail?.element || getSelectedElement()
    });
  });

  window.addEventListener('startfullquiz', () => {
    openQuiz({ mode: 'full', element: null });
  });

  window.addEventListener('statechange', handleStateChange);
  window.addEventListener('quizcompleted', renderGamesHub);
  window.addEventListener('gamescoreupdated', renderGamesHub);
  document.addEventListener('keydown', handleKeydown);
  isQuizBound = true;
}

export function initGames() {
  renderGamesHub();
}

function handleStateChange(event) {
  const field = event?.detail?.field;
  if (field === 'quizScores' || field === 'gameScores') {
    renderGamesHub();
  }
}

function handleKeydown(event) {
  const modal = document.getElementById('quiz-modal');
  if (event.key === 'Escape' && modal?.classList.contains('show')) {
    closeQuiz();
  }
}

function openQuiz({ mode, element }) {
  const modal = document.getElementById('quiz-modal');
  if (!modal) {
    return;
  }

  quizSession = createSession({ mode, element });
  renderQuiz();
  modal.classList.add('show');
}

function closeQuiz() {
  const modal = document.getElementById('quiz-modal');
  if (!modal) {
    return;
  }

  const returnSection = quizSession.returnSection;
  const returnAtomicNumber = quizSession.returnAtomicNumber;

  modal.classList.remove('show');
  quizSession = createEmptySession();

  if (returnSection && getCurrentSection() !== returnSection) {
    navigateTo(returnSection);
  }

  if (returnSection === 'periodic-table' && returnAtomicNumber !== null) {
    window.requestAnimationFrame(() => {
      restoreSelectedElementView({
        element: getSelectedElement(),
        markLearned: false,
        emitEvent: true,
        scroll: false
      });
    });
  }
}

function renderQuiz() {
  const quizContent = document.getElementById('quiz-content');
  if (!quizContent) {
    return;
  }

  if (quizSession.isFinished) {
    finalizeQuizSession();
    quizContent.innerHTML = renderResultMarkup();
    bindResultEvents(quizContent);
    return;
  }

  const question = quizSession.questions[quizSession.index];
  if (!question) {
    quizSession.isFinished = true;
    renderQuiz();
    return;
  }

  quizContent.innerHTML = renderQuestionMarkup(question);
  bindQuestionEvents(quizContent, question);
}

function bindQuestionEvents(container, question) {
  container.querySelector('[data-quiz-close]')?.addEventListener('click', closeQuiz);
  container.querySelector('[data-quiz-next]')?.addEventListener('click', moveToNextQuestion);

  container.querySelectorAll('.quiz-option-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (quizSession.answered) {
        return;
      }

      const selectedIndex = Number(button.dataset.optionIndex);
      handleAnswer(question, selectedIndex);
    });
  });
}

function bindResultEvents(container) {
  container.querySelector('[data-quiz-close]')?.addEventListener('click', closeQuiz);
  container.querySelector('[data-quiz-restart]')?.addEventListener('click', restartQuiz);
  container.querySelector('[data-quiz-return]')?.addEventListener('click', closeQuiz);
}

function handleAnswer(question, selectedIndex) {
  const isCorrect = selectedIndex === question.correctIndex;
  const explanation = question.explanation || `正确答案是：${question.options[question.correctIndex]}。`;
  const answerRecord = {
    questionId: question.id,
    selectedIndex,
    isCorrect
  };

  quizSession.answered = true;
  quizSession.selectedIndex = selectedIndex;
  quizSession.lastExplanation = explanation;
  quizSession.feedbackTone = isCorrect ? 'correct' : 'wrong';
  quizSession.feedbackMessage = isCorrect
    ? `回答正确！${question.options[question.correctIndex]} 是正确答案。`
    : `这题答错了，正确答案是 ${question.options[question.correctIndex]}。`;
  quizSession.answers[quizSession.index] = answerRecord;

  if (isCorrect) {
    quizSession.score += 1;
  }

  renderQuiz();
}

function moveToNextQuestion() {
  if (!quizSession.answered) {
    return;
  }

  if (quizSession.index >= quizSession.total - 1) {
    quizSession.isFinished = true;
  } else {
    quizSession.index += 1;
    quizSession.answered = false;
    quizSession.selectedIndex = null;
    quizSession.lastExplanation = '';
    quizSession.feedbackMessage = '';
    quizSession.feedbackTone = 'idle';
  }

  renderQuiz();
}

function restartQuiz() {
  const { mode, element } = quizSession;
  quizSession = createSession({ mode, element });
  renderQuiz();
}

function finalizeQuizSession() {
  if (quizSession.persisted) {
    return;
  }

  const accuracy = getAccuracy(quizSession.score, quizSession.total);
  const bestScore = getBestScoreValue();

  addQuizScore({
    mode: quizSession.mode,
    score: quizSession.score,
    total: quizSession.total,
    accuracy,
    relatedElement: quizSession.element?.atomicNumber ?? null,
    correctCount: quizSession.score,
    wrongCount: quizSession.total - quizSession.score,
    questionIds: quizSession.questions.map((item) => item.id),
    completedAt: new Date().toISOString()
  });

  if (quizSession.mode === 'full' && quizSession.score > bestScore) {
    updateGameScore(FULL_QUIZ_GAME_KEY, quizSession.score);
  }

  quizSession.persisted = true;
}

function renderQuestionMarkup(question) {
  const accentColor = quizSession.element?.color || 'var(--neon-cyan)';
  const progressPercent = quizSession.total > 0
    ? Math.round(((quizSession.index + 1) / quizSession.total) * 100)
    : 0;
  const relatedLabel = quizSession.mode === 'quick' && quizSession.element
    ? `${quizSession.element.chineseName} · ${quizSession.element.symbol}`
    : '元素知识挑战';

  return `
    <div class="quiz-shell hud-shell ${quizSession.answered ? `quiz-shell--${quizSession.feedbackTone}` : ''}" style="--quiz-accent: ${accentColor};">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">${quizSession.mode === 'full' ? 'FULL QUIZ PROTOCOL' : 'QUICK QUIZ PROTOCOL'}</p>
          <h3>${relatedLabel}</h3>
        </div>
        <button class="hud-action-btn" data-quiz-close>关闭</button>
      </div>

      <div class="quiz-scoreboard quiz-scoreboard--triple">
        <div class="quiz-stat-card"><span>当前得分</span><strong>${quizSession.score}/${quizSession.total}</strong></div>
        <div class="quiz-stat-card"><span>题目进度</span><strong>第 ${quizSession.index + 1} / ${quizSession.total} 题</strong></div>
        <div class="quiz-stat-card"><span>已用时间</span><strong>${formatElapsed(quizSession.startedAt)}</strong></div>
      </div>

      <div class="quiz-progress-track" aria-hidden="true">
        <div class="quiz-progress-bar" style="width: ${progressPercent}%"></div>
      </div>

      <div class="quiz-card-shell">
        <div class="quiz-card-topline">
          <p class="quiz-question-category">${question.category || '元素知识'}</p>
          <span class="quiz-mode-badge">${quizSession.mode === 'full' ? '20题完整挑战' : '5题快速挑战'}</span>
        </div>
        <h4 class="quiz-question-text">${question.question}</h4>
        <div class="quiz-options-grid">
          ${question.options.map((option, optionIndex) => renderOptionButton(question, option, optionIndex)).join('')}
        </div>
        <div class="quiz-feedback-panel ${quizSession.answered ? `is-${quizSession.feedbackTone}` : ''}" aria-live="polite">
          <p class="quiz-feedback-text">${quizSession.feedbackMessage || '请选择一个答案，系统会立刻显示反馈和解析。'}</p>
          <p class="quiz-explanation-text">${quizSession.lastExplanation || '每道题都带有知识解析，帮助你快速复盘。'}</p>
        </div>
      </div>

      <div class="quiz-nav-row">
        <button class="hud-action-btn hud-action-btn-primary" data-quiz-next ${quizSession.answered ? '' : 'disabled'}>
          ${quizSession.index >= quizSession.total - 1 ? '完成测验' : '下一题'}
        </button>
      </div>
    </div>
  `;
}

function renderOptionButton(question, option, optionIndex) {
  const optionState = getOptionState(question, optionIndex);
  const classNames = ['quiz-option-btn'];

  if (optionState.isSelected) {
    classNames.push('is-selected');
  }
  if (optionState.isCorrect) {
    classNames.push('is-correct');
  }
  if (optionState.isWrong) {
    classNames.push('is-wrong');
  }

  return `
    <button class="${classNames.join(' ')}" data-option-index="${optionIndex}" ${quizSession.answered ? 'disabled' : ''}>
      <span class="quiz-option-prefix">${String.fromCharCode(65 + optionIndex)}</span>
      <span>${option}</span>
    </button>
  `;
}

function getOptionState(question, optionIndex) {
  if (!quizSession.answered) {
    return {
      isSelected: false,
      isCorrect: false,
      isWrong: false
    };
  }

  return {
    isSelected: quizSession.selectedIndex === optionIndex,
    isCorrect: question.correctIndex === optionIndex,
    isWrong: quizSession.selectedIndex === optionIndex && question.correctIndex !== optionIndex
  };
}

function renderResultMarkup() {
  const accuracy = getAccuracy(quizSession.score, quizSession.total);
  const rating = getRating(accuracy);
  const previousBest = getBestScoreValue();
  const wrongAnswers = getWrongAnswerReview();
  const hasNewRecord = quizSession.mode === 'full' && quizSession.score >= previousBest;

  return `
    <div class="quiz-shell hud-shell quiz-shell--results" style="--quiz-accent: ${quizSession.element?.color || 'var(--neon-cyan)'};">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">QUIZ SESSION COMPLETE</p>
          <h3>${quizSession.mode === 'full' ? '完整测验结算' : '快速测验结算'}</h3>
        </div>
        <button class="hud-action-btn" data-quiz-close>关闭</button>
      </div>

      <div class="quiz-result-hero">
        <div class="quiz-result-core">
          <span class="quiz-result-ring"></span>
          <strong>${quizSession.score}/${quizSession.total}</strong>
          <span>正确率 ${accuracy}%</span>
        </div>
        <div class="quiz-result-summary">
          <div class="quiz-result-chip"><span>评级</span><strong>${rating.label}</strong></div>
          <div class="quiz-result-chip"><span>表现说明</span><strong>${rating.message}</strong></div>
          <div class="quiz-result-chip"><span>用时</span><strong>${formatElapsed(quizSession.startedAt)}</strong></div>
          ${quizSession.mode === 'full' ? `<div class="quiz-result-chip"><span>历史最高</span><strong>${Math.max(previousBest, quizSession.score)} / ${quizSession.total}</strong></div>` : ''}
        </div>
      </div>

      ${hasNewRecord ? '<div class="quiz-celebration-banner">新的完整测验纪录已同步到游戏中心！</div>' : ''}

      <div class="quiz-scoreboard quiz-scoreboard--triple">
        <div class="quiz-stat-card"><span>答对题数</span><strong>${quizSession.score}</strong></div>
        <div class="quiz-stat-card"><span>答错题数</span><strong>${quizSession.total - quizSession.score}</strong></div>
        <div class="quiz-stat-card"><span>已记录成绩</span><strong>${getQuizScores().length}</strong></div>
      </div>

      <div class="quiz-review-shell">
        <div class="quiz-review-header">
          <h4>错题回顾</h4>
          <span>${wrongAnswers.length === 0 ? '全部答对，太棒了！' : `共 ${wrongAnswers.length} 题需要回顾`}</span>
        </div>
        ${wrongAnswers.length === 0 ? `
          <div class="quiz-review-empty">你已经完成一次零失误通关，继续挑战保持满分吧！</div>
        ` : `
          <div class="quiz-review-list">
            ${wrongAnswers.map((item) => `
              <article class="quiz-review-item">
                <p class="quiz-review-question">${item.question}</p>
                <p class="quiz-review-answer"><span>你的答案：</span>${item.selectedText}</p>
                <p class="quiz-review-answer is-correct"><span>正确答案：</span>${item.correctText}</p>
                <p class="quiz-review-explanation">${item.explanation}</p>
              </article>
            `).join('')}
          </div>
        `}
      </div>

      <div class="quiz-nav-row quiz-nav-row--results">
        <button class="hud-action-btn hud-action-btn-primary" data-quiz-restart>重新测验</button>
        <button class="hud-action-btn" data-quiz-return>返回</button>
      </div>
    </div>
  `;
}

function renderGamesHub() {
  const gamesGrid = document.querySelector('#games .games-grid');
  if (!gamesGrid) {
    return;
  }

  let card = gamesGrid.querySelector('[data-game="full-quiz"]');
  if (!card) {
    card = document.createElement('div');
    card.className = 'game-card game-card--quiz';
    card.dataset.game = 'full-quiz';
    gamesGrid.prepend(card);
  }

  const bestScore = getBestScoreValue();
  const quizHistory = getQuizScores();

  card.innerHTML = `
    <div class="game-card-orbit"></div>
    <p class="hud-kicker">QUIZ ENGINE</p>
    <h3>完整测验挑战</h3>
    <p>一次回答 20 道题，立即获得反馈、解析、评级和错题回顾。</p>
    <div class="quiz-game-stats">
      <div class="quiz-game-stat"><span>历史最高分</span><strong>${bestScore} / ${FULL_QUIZ_COUNT}</strong></div>
      <div class="quiz-game-stat"><span>累计测验次数</span><strong>${quizHistory.length}</strong></div>
    </div>
    <button class="play-btn quiz-play-btn" type="button">开始完整测验</button>
  `;

  card.querySelector('.quiz-play-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('startfullquiz'));
  });
}

function createSession({ mode, element }) {
  const currentSection = getCurrentSection();
  const currentSelection = getSelectedElement();
  const questions = mode === 'full'
    ? shuffleArray([...quizData]).slice(0, FULL_QUIZ_COUNT)
    : getQuickQuizQuestions(element);

  return {
    mode,
    element: mode === 'quick' ? element : null,
    questions,
    index: 0,
    score: 0,
    total: questions.length,
    answers: [],
    answered: false,
    selectedIndex: null,
    lastExplanation: '',
    feedbackMessage: '',
    feedbackTone: 'idle',
    isFinished: false,
    persisted: false,
    startedAt: Date.now(),
    returnSection: currentSection,
    returnAtomicNumber: currentSelection?.atomicNumber ?? element?.atomicNumber ?? null
  };
}

function getQuickQuizQuestions(element) {
  const relatedElement = element?.atomicNumber ?? null;
  if (relatedElement === null) {
    return shuffleArray([...quizData]).slice(0, QUICK_QUIZ_COUNT);
  }

  const relatedQuestions = quizData.filter((item) => item.relatedElement === relatedElement);
  const fillerQuestions = shuffleArray(
    quizData.filter((item) => item.relatedElement !== relatedElement)
  );

  return [...relatedQuestions, ...fillerQuestions].slice(0, QUICK_QUIZ_COUNT);
}

function getWrongAnswerReview() {
  return quizSession.questions.reduce((reviewList, question, index) => {
    const answer = quizSession.answers[index];
    if (!answer || answer.isCorrect) {
      return reviewList;
    }

    reviewList.push({
      question: question.question,
      selectedText: question.options[answer.selectedIndex] || '未作答',
      correctText: question.options[question.correctIndex],
      explanation: question.explanation || `正确答案是：${question.options[question.correctIndex]}。`
    });
    return reviewList;
  }, []);
}

function getBestScoreValue() {
  return Number(getGameScores(FULL_QUIZ_GAME_KEY) || 0);
}

function getAccuracy(score, total) {
  if (!total) {
    return 0;
  }

  return Math.round((score / total) * 100);
}

function getRating(accuracy) {
  if (accuracy >= 90) {
    return {
      label: '优秀',
      message: '你已经像小小元素专家一样稳定发挥。'
    };
  }

  if (accuracy >= 70) {
    return {
      label: '良好',
      message: '基础掌握不错，再复习几题就能更上一层楼。'
    };
  }

  return {
    label: '需努力',
    message: '继续挑战吧，复盘错题后会进步得很快。'
  };
}

function formatElapsed(startedAt) {
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function createEmptySession() {
  return {
    mode: 'quick',
    element: null,
    questions: [],
    index: 0,
    score: 0,
    total: 0,
    answers: [],
    answered: false,
    selectedIndex: null,
    lastExplanation: '',
    feedbackMessage: '',
    feedbackTone: 'idle',
    isFinished: false,
    persisted: false,
    startedAt: Date.now(),
    returnSection: 'periodic-table',
    returnAtomicNumber: null
  };
}

function shuffleArray(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}
