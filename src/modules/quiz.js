/** ===== 测验模块 ===== */
import { quizData } from '../data/quizData.js';
import { restoreSelectedElementView } from './renderTable.js';
import { getCurrentSection, navigateTo } from './router.js';
import { addQuizScore, getQuizScores, getSelectedElement } from './storage.js';

let quizSession = createEmptySession();

export function initQuiz() {
  const modal = document.getElementById('quiz-modal');
  const quizContent = document.getElementById('quiz-content');
  if (!modal || !quizContent) {
    return;
  }

  modal.querySelector('.modal-close')?.addEventListener('click', closeQuiz);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeQuiz();
    }
  });

  window.addEventListener('startquiz', (event) => {
    openQuiz(event.detail?.element || getSelectedElement());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('show')) {
      closeQuiz();
    }
  });
}

export function initGames() {
  initQuiz();
}

function openQuiz(element) {
  const modal = document.getElementById('quiz-modal');
  if (!modal) {
    return;
  }

  quizSession = createSessionForElement(element);
  renderQuiz();
  modal.classList.add('show');
}

function closeQuiz() {
  const modal = document.getElementById('quiz-modal');
  if (!modal) {
    return;
  }

  modal.classList.remove('show');

  if (getCurrentSection() !== 'periodic-table') {
    navigateTo('periodic-table');
    return;
  }

  if (quizSession.returnAtomicNumber !== null) {
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

  const question = quizSession.questions[quizSession.index] || null;
  const relatedLabel = quizSession.element
    ? `${quizSession.element.chineseName} · ${quizSession.element.symbol}`
    : '随机模式';
  const historyScore = getQuizScores().reduce((sum, item) => sum + (item.score || 0), 0);

  if (!question) {
    quizContent.innerHTML = `
      <div class="quiz-shell hud-shell">
        <div class="hud-shell-header">
          <div>
            <p class="hud-kicker">QUIZ SESSION COMPLETE</p>
            <h3>本轮测验结束</h3>
          </div>
          <button class="hud-action-btn" data-quiz-close>关闭</button>
        </div>
        <div class="quiz-scoreboard">
          <div class="quiz-stat-card"><span>本轮得分</span><strong>${quizSession.score}/${quizSession.total}</strong></div>
          <div class="quiz-stat-card"><span>累计得分记录</span><strong>${historyScore}</strong></div>
        </div>
      </div>
    `;
    quizContent.querySelector('[data-quiz-close]')?.addEventListener('click', closeQuiz);
    return;
  }

  quizContent.innerHTML = `
    <div class="quiz-shell hud-shell" style="--quiz-accent: ${quizSession.element?.color || 'var(--neon-cyan)'};">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">QUIZ MODE ACTIVE</p>
          <h3>${relatedLabel}</h3>
        </div>
        <button class="hud-action-btn" data-quiz-close>关闭</button>
      </div>
      <div class="quiz-scoreboard">
        <div class="quiz-stat-card"><span>当前得分</span><strong>${quizSession.score}/${quizSession.total}</strong></div>
        <div class="quiz-stat-card"><span>题目进度</span><strong>${quizSession.index + 1}/${quizSession.total}</strong></div>
      </div>
      <div class="quiz-card-shell">
        <p class="quiz-question-category">${question.category || '元素知识'}</p>
        <h4 class="quiz-question-text">${question.question}</h4>
        <div class="quiz-options-grid">
          ${question.options.map((option, optionIndex) => `
            <button class="quiz-option-btn" data-option-index="${optionIndex}">${option}</button>
          `).join('')}
        </div>
        <p class="quiz-feedback-text" aria-live="polite">${quizSession.feedback || '请选择一个答案。'}</p>
      </div>
      <div class="quiz-nav-row">
        <button class="hud-action-btn hud-action-btn-primary" data-quiz-next ${quizSession.answered ? '' : 'disabled'}>
          ${quizSession.index >= quizSession.total - 1 ? '完成' : '下一题'}
        </button>
      </div>
    </div>
  `;

  quizContent.querySelector('[data-quiz-close]')?.addEventListener('click', closeQuiz);
  quizContent.querySelector('[data-quiz-next]')?.addEventListener('click', () => {
    if (!quizSession.answered) {
      return;
    }

    quizSession.index += 1;
    quizSession.answered = false;
    quizSession.feedback = '';
    renderQuiz();
  });

  quizContent.querySelectorAll('.quiz-option-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (quizSession.answered) {
        return;
      }

      const selectedIndex = Number(button.dataset.optionIndex);
      handleAnswer(selectedIndex);
    });
  });
}

function handleAnswer(selectedIndex) {
  const question = quizSession.questions[quizSession.index];
  if (!question) {
    return;
  }

  const isCorrect = selectedIndex === question.correctIndex;
  quizSession.answered = true;
  quizSession.feedback = isCorrect
    ? `答对了！正确答案是：${question.options[question.correctIndex]}。`
    : `再想想看，正确答案是：${question.options[question.correctIndex]}。`;

  if (isCorrect) {
    quizSession.score += 1;
  }

  addQuizScore({
    score: isCorrect ? 1 : 0,
    total: 1,
    quizId: question.id,
    relatedElement: quizSession.returnAtomicNumber,
    correct: isCorrect
  });

  const buttons = [...document.querySelectorAll('.quiz-option-btn')];
  buttons.forEach((button, index) => {
    button.disabled = true;
    button.classList.toggle('is-correct', index === question.correctIndex);
    button.classList.toggle('is-wrong', index === selectedIndex && !isCorrect);
  });

  const feedback = document.querySelector('.quiz-feedback-text');
  if (feedback) {
    feedback.textContent = quizSession.feedback;
  }

  const nextButton = document.querySelector('[data-quiz-next]');
  if (nextButton) {
    nextButton.disabled = false;
  }

  const scoreEl = document.querySelector('.quiz-scoreboard .quiz-stat-card strong');
  if (scoreEl) {
    scoreEl.textContent = `${quizSession.score}/${quizSession.total}`;
  }
}

function createSessionForElement(element) {
  const relatedQuestions = element
    ? quizData.filter((item) => item.relatedElement === element.atomicNumber)
    : [];
  const selectedQuestions = relatedQuestions.length > 0
    ? relatedQuestions
    : shuffleArray([...quizData]).slice(0, 5);

  return {
    element,
    questions: selectedQuestions,
    index: 0,
    score: 0,
    total: selectedQuestions.length,
    answered: false,
    feedback: '',
    returnAtomicNumber: getSelectedElement()?.atomicNumber ?? element?.atomicNumber ?? null
  };
}

function createEmptySession() {
  return {
    element: null,
    questions: [],
    index: 0,
    score: 0,
    total: 0,
    answered: false,
    feedback: '',
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
