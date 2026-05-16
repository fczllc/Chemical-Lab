/** ===== 实验室模块 ===== */
import { LAB_SAFETY_THEME, SAFETY_LABELS } from '../data/contentMeta.js';
import { curriculumTags, learningPath, labExperiments as importedLabExperiments } from '../data/index.js';
import { getCurrentSection, navigateTo } from './router.js';
import {
  getCompletedExperiments,
  getExperimentTitleOverride,
  getLearnedElements,
  getSelectedElement,
  getSettings,
  markExperimentCompleted,
  setExperimentTitleOverride
} from './storage.js';
import { formulaHTML, equationHTML, mixedProseFormulaHTML, plainChemText } from './chemNotation.js';

const EQUATION_MAP = {
  'reaction-hydrogen-combustion': '2H2 + O2 → 2H2O',
  'reaction-iron-rusting': '4Fe + 3O2 → 2Fe2O3',
  'reaction-sodium-water': '2Na + 2H2O → 2NaOH + H2↑',
  'reaction-salt-formation': '2Na + Cl2 → 2NaCl',
  'reaction-oxygen-supports-combustion': 'C + O2 → CO2'
};

const ANIMATION_ID_MAP = {
  'exp-hydrogen-combustion': 'reaction-hydrogen-combustion',
  'exp-iron-rusting': 'reaction-iron-rusting',
  'exp-sodium-water': 'reaction-sodium-water',
  'exp-salt-formation': 'reaction-salt-formation',
  'exp-oxygen-supports-combustion': 'reaction-oxygen-supports-combustion'
};

const SAFETY_THEME = LAB_SAFETY_THEME;

const DANGEROUS_LEVELS = new Set(['dangerous', 'radioactive', 'extremely dangerous']);

const MAX_TITLE_LENGTH_UNITS = 80;

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripBrackets(value) {
  return String(value ?? '').replace(/^【(.+?)】/, '$1');
}

function stripLeadingBracketHeading(value) {
  return String(value ?? '').replace(/^【[^】]+】\s*/, '');
}

function getTitleLengthUnits(value) {
  let units = 0;
  for (const ch of String(value)) {
    units += ch.charCodeAt(0) > 255 ? 2 : 1;
  }
  return units;
}

function truncateTitleToLengthUnits(value, maxUnits) {
  let units = 0;
  let result = '';
  for (const ch of String(value)) {
    const cost = ch.charCodeAt(0) > 255 ? 2 : 1;
    if (units + cost > maxUnits) break;
    units += cost;
    result += ch;
  }
  return result;
}

function renderProseContent(value) {
  return mixedProseFormulaHTML(stripLeadingBracketHeading(value));
}

function renderCardDescription(value) {
  return mixedProseFormulaHTML(value);
}

const CURRICULUM_TAG_MAP = new Map(Object.entries(curriculumTags || {}));
const LAB_STAGE_UNLOCKS = learningPath?.stages || [];

// Module-level mutable experiments array; tests and dynamic enrichment can push into it.
let labExperiments = Array.isArray(importedLabExperiments) ? importedLabExperiments : [];

let focusedAtomicNumber = null;
let activeReactionId = labExperiments[0]?.id ?? null;
let currentView = 'detail';
let safetyConfirmed = false;
let simulationRunId = 0;
let completionTimer = null;
let activeModal = null;
let activeDetailModal = null;
let detailModalRequested = false;
let editingTitleReactionId = null;
let editingTitleDraft = '';
let editingTitleError = '';

// Lab card filter state (module-level, not persisted)
let filterText = '';
let filterSafety = 'all';
let filterCompletion = 'all';
let filterLock = 'all';
let filterGrade = 'all';

export function initLab() {
  renderLabShell();

  window.addEventListener('labfocusrequest', (event) => {
    focusedAtomicNumber = event.detail?.element?.atomicNumber ?? getSelectedElement()?.atomicNumber ?? null;
    if (getCurrentSection() === 'lab') {
      renderLabShell();
    }
  });

  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'lab') {
      if (focusedAtomicNumber === null) {
        focusedAtomicNumber = getSelectedElement()?.atomicNumber ?? null;
      }
      renderLabShell();
      return;
    }

    closeSimulationModal();
    clearSimulationTimer();
    closeDetailModal();
  });

  window.addEventListener('performancemodechange', () => {
    if (getCurrentSection() === 'lab' && currentView === 'simulation') {
      const activeReaction = labExperiments.find((item) => item.id === activeReactionId);
      if (activeReaction) {
        closeSimulationModal();
        clearSimulationTimer();
        openSimulationModal(activeReaction);
      }
    }
  });

  window.addEventListener('statereset', () => {
    currentView = 'detail';
    safetyConfirmed = false;
    closeSimulationModal();
    clearSimulationTimer();
    closeDetailModal();
    renderLabShell();
  });

  window.addEventListener('experimenttitlechange', () => {
    if (getCurrentSection() === 'lab') {
      renderLabShell();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getCurrentSection() === 'lab') {
      if (activeModal) {
        closeSimulationModal();
        clearSimulationTimer();
        currentView = 'detail';
        safetyConfirmed = false;
        renderLabShell();
        return;
      }

      if (activeDetailModal) {
        closeDetailModal();
        return;
      }

      if (currentView === 'detail') {
        navigateTo('periodic-table');
        return;
      }

      currentView = 'detail';
      safetyConfirmed = false;
      clearSimulationTimer();
      renderLabShell();
    }
  });
}

function renderLabShell() {
  const section = document.getElementById('lab');
  const list = section?.querySelector('.lab-list');
  const stage = document.getElementById('lab-stage');
  if (!section || !list || !stage) {
    return;
  }

  const selectedElement = getSelectedElement();
  const focusSymbol = selectedElement && selectedElement.atomicNumber === focusedAtomicNumber
    ? selectedElement.symbol
    : selectedElement?.symbol || null;
  const completed = getCompletedExperiments();
  const learned = getLearnedElements();
  const activeReaction = labExperiments.find((item) => item.id === activeReactionId) || labExperiments[0] || null;

  ensureLabToolbar(section, selectedElement);

  const filteredReactions = labExperiments.filter((experiment) => {
    const isRelated = focusSymbol ? (experiment.reactants || []).some((item) => item.includes(focusSymbol)) : false;
    const isCompleted = completed.has(experiment.experimentId);
    const unlockState = getReactionUnlockState(experiment, { completed, learned });

    if (filterSafety !== 'all' && experiment.safetyLevel !== filterSafety) return false;
    if (filterCompletion === 'completed' && !isCompleted) return false;
    if (filterCompletion === 'uncompleted' && isCompleted) return false;
    if (filterLock === 'unlocked' && !unlockState.unlocked) return false;
    if (filterLock === 'locked' && unlockState.unlocked) return false;
    if (filterLock === 'related' && (!unlockState.unlocked || !isRelated)) return false;
    if (filterLock === 'general' && (!unlockState.unlocked || isRelated)) return false;

    const grade = experiment.unlockRequirements?.grade || '';
    if (filterGrade !== 'all' && grade !== filterGrade) return false;

    if (filterText.trim()) {
      const query = filterText.trim().toLowerCase();
      const haystack = [
        experiment.name,
        experiment.description,
        renderUnlockSummary(unlockState),
        (experiment.reactants || []).join(' '),
        (experiment.products || []).join(' ')
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const total = labExperiments.length;
  const visible = filteredReactions.length;

  if (visible === 0) {
    list.innerHTML = `
      <div class="lab-empty-state">
        <p>没有符合条件的实验。</p>
        <p>尝试调整上方筛选条件，或清除搜索关键词。</p>
      </div>
    `;
  } else {
    list.innerHTML = filteredReactions.map((experiment) => {
      const isRelated = focusSymbol ? (experiment.reactants || []).some((item) => item.includes(focusSymbol)) : false;
      const isCompleted = completed.has(experiment.experimentId);
      const unlockState = getReactionUnlockState(experiment, { completed, learned });
      const safetyTheme = getSafetyTheme(experiment.safetyLevel);

      const titleSource = getEffectiveExperimentTitleSource(experiment);
      const titlePlain = plainChemText(titleSource.text);
      const titleHtml = mixedProseFormulaHTML(titleSource.text);

      return `
        <article class="lab-item-card ${experiment.id === activeReaction?.id ? 'is-active' : ''} ${isRelated ? 'is-related' : ''} ${unlockState.unlocked ? '' : 'is-locked'}" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
          <div class="lab-item-card-header">
            <div class="lab-item-card-title-wrap">
              <h3 title="${escapeAttr(titlePlain)}" data-testid="lab-card-title">${titleHtml}</h3>
              ${hasFormulaList(experiment.reactants) ? `<p class="lab-elements" data-chem-notation="reactants">${(experiment.reactants || []).map((r) => formulaHTML(r)).join(' + ')}</p>` : ''}
            </div>
            <span class="lab-complete-badge ${isCompleted ? 'is-complete' : ''}" title="${isCompleted ? '已完成' : '未完成'}"><i data-lucide="${isCompleted ? 'check' : 'circle'}"></i></span>
          </div>
          <div class="lab-card-meta-row">
            <span class="lab-safety-pill level-${experiment.safetyLevel.replace(/\s+/g, '-')}"><i data-lucide="${safetyTheme.icon}"></i> ${SAFETY_LABELS[experiment.safetyLevel] || experiment.safetyLevel}</span>
            <span class="lab-card-status">${unlockState.unlocked ? (isRelated ? '与当前元素相关' : '通用演示实验') : '课程进度锁定'}</span>
          </div>
          <p class="lab-card-description">${renderCardDescription(experiment.description)}</p>
          <p class="lab-card-clue">${renderUnlockSummary(unlockState)}</p>
          <button class="hud-action-btn lab-card-action" data-reaction-open="${experiment.id}">查看实验</button>
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-reaction-open]').forEach((button) => {
      button.addEventListener('click', () => {
        activeReactionId = button.dataset.reactionOpen;
        currentView = 'detail';
        safetyConfirmed = false;
        clearSimulationTimer();
        detailModalRequested = true;
        renderLabShell();
      });
    });
  }

  // Update result count in toolbar
  const resultCountEl = section.querySelector('.lab-result-count');
  if (resultCountEl) {
    resultCountEl.textContent = `显示 ${visible}/${total} 个实验`;
  }

  stage.innerHTML = '';

  if (activeReaction && detailModalRequested && !activeDetailModal) {
    openDetailModal(activeReaction, completed.has(activeReaction.experimentId));
  }
}

function bindStageEvents(modalContent, activeReaction, isCompleted) {
  const unlockState = getReactionUnlockState(activeReaction);
  modalContent.querySelector('[data-lab-back]')?.addEventListener('click', () => {
    if (currentView === 'detail') {
      closeDetailModal();
    } else {
      currentView = 'detail';
      updateDetailModalContent(activeReaction, isCompleted);
    }
  });

  modalContent.querySelector('[data-lab-return-list]')?.addEventListener('click', () => {
    closeDetailModal();
  });

  modalContent.querySelector('[data-lab-open-safety]')?.addEventListener('click', () => {
    currentView = 'safety';
    updateDetailModalContent(activeReaction, isCompleted);
  });

  const confirmationToggle = modalContent.querySelector('[data-safety-confirm]');
  const startButton = modalContent.querySelector('[data-lab-start]');

  confirmationToggle?.addEventListener('change', () => {
    safetyConfirmed = confirmationToggle.checked;
    if (startButton) {
      startButton.disabled = !unlockState.unlocked || (DANGEROUS_LEVELS.has(activeReaction.safetyLevel) && !safetyConfirmed);
    }
  });

  modalContent.querySelector('[data-lab-start]')?.addEventListener('click', () => {
    if (!unlockState.unlocked || (DANGEROUS_LEVELS.has(activeReaction.safetyLevel) && !safetyConfirmed)) {
      return;
    }

    currentView = 'safety';
    updateDetailModalContent(activeReaction, isCompleted);
  });

  modalContent.querySelector('[data-launch-simulation]')?.addEventListener('click', () => {
    if (!unlockState.unlocked || (DANGEROUS_LEVELS.has(activeReaction.safetyLevel) && !safetyConfirmed)) {
      return;
    }

    closeDetailModal();
    currentView = 'simulation';
    openSimulationModal(activeReaction);
  });

  // Title editing events
  const titleEl = modalContent.querySelector('[data-testid="experiment-title"]');
  titleEl?.addEventListener('dblclick', () => {
    enterTitleEditMode(activeReaction);
    updateDetailModalContent(activeReaction, isCompleted);
    // Focus and select the input after rerender
    window.requestAnimationFrame(() => {
      const modal = activeDetailModal?.querySelector('.lab-detail-modal');
      const input = modal?.querySelector('[data-testid="experiment-title-input"]');
      if (input) {
        input.focus();
        input.select();
      }
    });
  });

  const saveBtn = modalContent.querySelector('[data-testid="experiment-title-save"]');
  saveBtn?.addEventListener('click', () => {
    const input = modalContent.querySelector('[data-testid="experiment-title-input"]');
    if (!input) return;

    const raw = truncateTitleToLengthUnits(input.value, MAX_TITLE_LENGTH_UNITS);
    const value = raw.trim();
    if (!value) {
      editingTitleError = '标题不能为空';
      editingTitleDraft = raw;
      updateDetailModalContent(activeReaction, isCompleted);
      window.requestAnimationFrame(() => {
        const modal = activeDetailModal?.querySelector('.lab-detail-modal');
        const newInput = modal?.querySelector('[data-testid="experiment-title-input"]');
        if (newInput) {
          newInput.focus();
          newInput.value = editingTitleDraft;
        }
      });
      return;
    }

    const canonicalTitle = stripLeadingBracketHeading(activeReaction.name);
    setExperimentTitleOverride(activeReaction.id, value, { canonicalTitle });
    exitTitleEditMode();
    updateDetailModalContent(activeReaction, isCompleted);
  });

  const cancelBtn = modalContent.querySelector('[data-testid="experiment-title-cancel"]');
  cancelBtn?.addEventListener('click', () => {
    exitTitleEditMode();
    updateDetailModalContent(activeReaction, isCompleted);
  });

  const titleInput = modalContent.querySelector('[data-testid="experiment-title-input"]');
  titleInput?.addEventListener('input', () => {
    const oldValue = titleInput.value;
    const trimmed = truncateTitleToLengthUnits(oldValue, MAX_TITLE_LENGTH_UNITS);
    if (trimmed === oldValue) return;

    const start = titleInput.selectionStart ?? oldValue.length;
    const end = titleInput.selectionEnd ?? oldValue.length;
    const direction = titleInput.selectionDirection || 'none';

    // Determine how many units the prefix before the old cursor consumed.
    let prefixUnits = 0;
    for (let i = 0; i < start && i < oldValue.length; i++) {
      prefixUnits += oldValue.charCodeAt(i) > 255 ? 2 : 1;
    }

    titleInput.value = trimmed;

    // Restore selection as close as possible to the logical edit position.
    let newStart = trimmed.length;
    let newEnd = trimmed.length;
    if (typeof titleInput.setSelectionRange === 'function') {
      let units = 0;
      for (let i = 0; i < trimmed.length; i++) {
        const cost = trimmed.charCodeAt(i) > 255 ? 2 : 1;
        if (units + cost > prefixUnits) {
          newStart = i;
          break;
        }
        units += cost;
        newStart = i + 1;
      }

      // Preserve selection length when possible, clamped to new value length.
      const selectionLength = end - start;
      newEnd = Math.min(newStart + selectionLength, trimmed.length);
      titleInput.setSelectionRange(newStart, newEnd, direction);
    }
  });

  titleInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const raw = truncateTitleToLengthUnits(titleInput.value, MAX_TITLE_LENGTH_UNITS);
      const value = raw.trim();
      if (!value) {
        editingTitleError = '标题不能为空';
        editingTitleDraft = raw;
        updateDetailModalContent(activeReaction, isCompleted);
        window.requestAnimationFrame(() => {
          const modal = activeDetailModal?.querySelector('.lab-detail-modal');
          const newInput = modal?.querySelector('[data-testid="experiment-title-input"]');
          if (newInput) {
            newInput.focus();
            newInput.value = editingTitleDraft;
          }
        });
        return;
      }

      const canonicalTitle = stripLeadingBracketHeading(activeReaction.name);
      setExperimentTitleOverride(activeReaction.id, value, { canonicalTitle });
      exitTitleEditMode();
      updateDetailModalContent(activeReaction, isCompleted);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      exitTitleEditMode();
      updateDetailModalContent(activeReaction, isCompleted);
    }
  });
}

function ensureLabToolbar(section, selectedElement) {
  let toolbar = section.querySelector('.lab-toolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'lab-toolbar hud-shell';
    section.querySelector('h2')?.after(toolbar);
  }

  // Only rebuild toolbar HTML on first creation to avoid wiping focus/selection.
  if (!toolbar.dataset.labToolbarReady) {
    const grades = [...new Set(labExperiments.map((r) => r.unlockRequirements?.grade).filter(Boolean))];

    toolbar.innerHTML = `
      <div class="lab-toolbar-top">
        <p class="hud-kicker">LAB ACCESS PANEL</p>
        <p class="lab-toolbar-meta lab-result-count">显示 ${labExperiments.length}/${labExperiments.length} 个实验</p>
      </div>
      <div class="lab-toolbar-main">
        <div class="lab-toolbar-info">
          <strong>${selectedElement ? `当前聚焦：${selectedElement.chineseName}（${selectedElement.symbol}）` : '当前未锁定元素'}</strong>
        </div>
        <div class="lab-toolbar-filters">
          <input type="text" class="lab-filter-input" data-lab-filter="text" placeholder="搜索实验名称、描述、方程式…" value="${escapeAttr(filterText)}">
          <select class="lab-filter-select" data-lab-filter="safety" title="安全级别">
            <option value="all">全部安全级别</option>
            <option value="safe">安全</option>
            <option value="caution">注意</option>
            <option value="dangerous">危险</option>
            <option value="radioactive">放射性</option>
            <option value="extremely dangerous">极度危险</option>
          </select>
          <select class="lab-filter-select" data-lab-filter="completion" title="完成状态">
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="uncompleted">未完成</option>
          </select>
          <select class="lab-filter-select" data-lab-filter="lock" title="锁定状态">
            <option value="all">全部</option>
            <option value="unlocked">已开放</option>
            <option value="locked">已锁定</option>
            <option value="related">当前元素相关</option>
            <option value="general">通用演示</option>
          </select>
          ${grades.length ? `
          <select class="lab-filter-select" data-lab-filter="grade" title="年级">
            <option value="all">全部年级</option>
            ${grades.map((g) => `<option value="${escapeAttr(g)}">${escapeAttr(g)}</option>`).join('')}
          </select>
          ` : ''}
        </div>
      </div>
    `;

    toolbar.querySelectorAll('[data-lab-filter]').forEach((control) => {
      const key = control.dataset.labFilter;
      const handler = () => {
        if (key === 'text') filterText = control.value;
        if (key === 'safety') filterSafety = control.value;
        if (key === 'completion') filterCompletion = control.value;
        if (key === 'lock') filterLock = control.value;
        if (key === 'grade') filterGrade = control.value;

        renderLabShell();
      };
      if (control.tagName === 'INPUT' && control.type === 'text') {
        control.addEventListener('input', handler);
      } else {
        control.addEventListener('change', handler);
      }
    });

    toolbar.dataset.labToolbarReady = 'true';
  }

  // Sync control values without rebuilding DOM so focus/selection stay intact.
  const textInput = toolbar.querySelector('[data-lab-filter="text"]');
  if (textInput && textInput.value !== filterText) {
    textInput.value = filterText;
  }
  const safetySelect = toolbar.querySelector('[data-lab-filter="safety"]');
  if (safetySelect) safetySelect.value = filterSafety;
  const completionSelect = toolbar.querySelector('[data-lab-filter="completion"]');
  if (completionSelect) completionSelect.value = filterCompletion;
  const lockSelect = toolbar.querySelector('[data-lab-filter="lock"]');
  if (lockSelect) lockSelect.value = filterLock;
  const gradeSelect = toolbar.querySelector('[data-lab-filter="grade"]');
  if (gradeSelect) gradeSelect.value = filterGrade;
  // Sync info text that may change when selectedElement changes.
  const infoStrong = toolbar.querySelector('.lab-toolbar-info strong');
  if (infoStrong) {
    infoStrong.textContent = selectedElement ? `当前聚焦：${selectedElement.chineseName}（${selectedElement.symbol}）` : '当前未锁定元素';
  }
}

function renderStageContent(reaction, isCompleted) {
  if (currentView === 'safety') {
    return renderSafetyView(reaction, isCompleted);
  }

  if (currentView === 'result') {
    return renderResultView(reaction, isCompleted);
  }

  return renderReactionDetail(reaction, isCompleted);
}

function getReactionStableKey(reaction) {
  return reaction?.id ?? '';
}

function getEffectiveExperimentTitle(reaction) {
  const key = getReactionStableKey(reaction);
  const override = key ? getExperimentTitleOverride(key) : null;
  if (override) {
    return override;
  }
  const canonical = stripLeadingBracketHeading(reaction?.name ?? '');
  return canonical.trim() || '无';
}

function getEffectiveExperimentTitleSource(reaction) {
  const key = getReactionStableKey(reaction);
  const override = key ? getExperimentTitleOverride(key) : null;
  if (override) {
    return { text: override, source: 'override' };
  }
  const canonical = stripLeadingBracketHeading(reaction?.name ?? '');
  return { text: canonical.trim() || '无', source: 'canonical' };
}

function renderTitleReadonly(title, source) {
  const html = mixedProseFormulaHTML(title);
  return `<h3 class="lab-detail-title lab-detail-title-text" data-testid="experiment-title" title="双击编辑标题">${html}</h3>`;
}

function renderTitleEditMode(reaction, canonicalTitle) {
  const draft = editingTitleDraft;
  const error = editingTitleError;

  return `
    <div class="lab-detail-title lab-detail-title-edit">
      <input
        type="text"
        class="lab-detail-title-input"
        data-testid="experiment-title-input"
        value="${escapeAttr(draft)}"
        placeholder="${escapeAttr(canonicalTitle)}"
        aria-label="实验标题"
      />
      ${error ? `<span data-testid="experiment-title-error" class="lab-detail-title-error">${escapeAttr(error)}</span>` : ''}
      <div class="lab-detail-title-actions">
        <button data-testid="experiment-title-save" class="hud-action-btn hud-action-btn-primary lab-detail-title-action lab-detail-title-save" aria-label="保存标题"><i data-lucide="check"></i></button>
        <button data-testid="experiment-title-cancel" class="hud-action-btn lab-detail-title-action lab-detail-title-cancel" aria-label="放弃修改"><i data-lucide="x"></i></button>
      </div>
    </div>
  `;
}

function enterTitleEditMode(reaction) {
  editingTitleReactionId = reaction.id;
  const effective = getEffectiveExperimentTitle(reaction);
  editingTitleDraft = effective === '无' ? '' : effective;
  editingTitleError = '';
}

function exitTitleEditMode() {
  editingTitleReactionId = null;
  editingTitleDraft = '';
  editingTitleError = '';
}

function renderReactionDetail(experiment, isCompleted) {
  const safetyTheme = getSafetyTheme(experiment.safetyLevel);
  const unlockState = getReactionUnlockState(experiment);
  const chemRows = renderChemistrySummaryRows(experiment);
  const isEditingTitle = editingTitleReactionId === experiment.id;
  const titleSource = getEffectiveExperimentTitleSource(experiment);
  const canonicalTitle = stripLeadingBracketHeading(experiment.name);
  const placeholderTitle = canonicalTitle.trim() || '教材实验';

  const titleHtml = isEditingTitle
    ? renderTitleEditMode(experiment, placeholderTitle)
    : renderTitleReadonly(titleSource.text, titleSource.source);

  return `
    <div class="lab-stage-shell hud-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">SIMULATION STANDBY</p>
          ${titleHtml}
        </div>
        <div class="lab-detail-actions">
          <button class="hud-action-btn" data-lab-open-safety>安全守则</button>
          <button class="hud-action-btn" data-lab-back>关闭</button>
        </div>
      </div>
      <div class="lab-summary-grid">
        ${chemRows.equation}
        ${chemRows.reactants}
        ${chemRows.products}
        <div class="lab-summary-row">
          <span>安全级别</span>
          <strong class="lab-safety-pill level-${experiment.safetyLevel.replace(/\s+/g, '-')}"><i data-lucide="${safetyTheme.icon}"></i> ${SAFETY_LABELS[experiment.safetyLevel] || experiment.safetyLevel}</strong>
        </div>
        <div class="lab-summary-row">
          <span>完成状态</span>
          <strong>${isCompleted ? '已完成记录' : '等待完成'}</strong>
        </div>
        <div class="lab-summary-row">
          <span>课程解锁</span>
          <strong>${unlockState.unlocked ? '已开放' : '需继续学习'}</strong>
        </div>
        <div class="lab-summary-row">
          <span>解锁要求</span>
          <strong>${renderUnlockSummary(unlockState)}</strong>
        </div>
      </div>
      <div class="lab-stage-layout">
        <div class="lab-stage-main">
          <p class="lab-stage-description">${renderProseContent(experiment.textbookContent || experiment.description)}</p>
          <div class="lab-notebook-card">
            <span class="lab-notebook-title">实验步骤</span>
            <ol class="lab-steps-list">
              ${(experiment.steps || []).map((step) => `<li>${renderProseContent(step)}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>
      <div class="lab-stage-extras">
        <div class="lab-stage-card lab-safety-notes-card">
          <span>安全注意事项</span>
          <ul class="lab-safety-list">
            ${(experiment.safetyNotes || []).map((note) => `<li>${renderProseContent(note)}</li>`).join('')}
          </ul>
        </div>
        <div class="lab-stage-card lab-visual-card">
          <span>视觉描述</span>
          <strong>${renderProseContent(experiment.visualDescription)}</strong>
        </div>
      </div>
      ${DANGEROUS_LEVELS.has(experiment.safetyLevel) ? `
      <label class="lab-confirm-row">
        <input type="checkbox" data-safety-confirm ${safetyConfirmed ? 'checked' : ''}>
        <span>我已了解安全事项，并知道这是虚拟演示。</span>
      </label>
      ` : ''}
      <div class="lab-nav-row">
        <button class="hud-action-btn hud-action-btn-primary" data-lab-start ${unlockState.unlocked && (!DANGEROUS_LEVELS.has(experiment.safetyLevel) || safetyConfirmed) ? '' : 'disabled'}>${unlockState.unlocked ? (isCompleted ? '再次开始实验' : '开始实验') : '继续学习后解锁'}</button>
      </div>
    </div>
  `;
}

function getReactionEquationText(experiment) {
  if (experiment.equationText) {
    return experiment.equationText;
  }

  if (EQUATION_MAP[experiment.id]) {
    return EQUATION_MAP[experiment.id];
  }

  return hasFormulaList(experiment.reactants) && hasFormulaList(experiment.products)
    ? `${(experiment.reactants || []).join(' + ')} → ${(experiment.products || []).join(' + ')}`
    : '';
}

function renderChemistrySummaryRows(experiment) {
  const equationText = getReactionEquationText(experiment);
  const reactants = hasFormulaList(experiment.reactants) ? (experiment.reactants || []).join(' + ') : '';
  const products = hasFormulaList(experiment.products) ? (experiment.products || []).join(' + ') : '';

  return {
    equation: equationText ? `
        <div class="lab-summary-row is-equation" data-chem-notation="equation">
          <span>反应方程式</span>
          <strong>${equationHTML(equationText)}</strong>
        </div>` : '',
    reactants: reactants ? `
        <div class="lab-summary-row" data-chem-notation="reactants">
          <span>反应物</span>
          <strong>${equationHTML(reactants)}</strong>
        </div>` : '',
    products: products ? `
        <div class="lab-summary-row" data-chem-notation="products">
          <span>生成物</span>
          <strong>${equationHTML(products)}</strong>
        </div>` : ''
  };
}

function hasFormulaList(value) {
  return Array.isArray(value) && value.some((item) => typeof item === 'string' && item.trim().length > 0);
}

function renderSafetyView(experiment, isCompleted) {
  const safetyTheme = getSafetyTheme(experiment.safetyLevel);
  const unlockState = getReactionUnlockState(experiment);

  return `
    <div class="lab-stage-shell hud-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">SAFETY PROTOCOL</p>
          <h3>${mixedProseFormulaHTML(stripLeadingBracketHeading(experiment.name))} · 安全提示</h3>
        </div>
        <button class="hud-action-btn" data-lab-back>返回</button>
      </div>
      <div class="lab-safety-modal">
        <div class="lab-safety-alert level-${experiment.safetyLevel.replace(/\s+/g, '-')}">
          <strong><i data-lucide="${safetyTheme.icon}"></i> ${SAFETY_LABELS[experiment.safetyLevel] || experiment.safetyLevel}</strong>
          <p>${unlockState.unlocked ? '开始前请先阅读本次实验的操作提示与实验守则。' : '该实验需要先完成对应课程进度，暂时只能查看说明。'}</p>
        </div>
        <div class="lab-stage-layout">
          <div class="lab-notebook-card">
            <span class="lab-notebook-title">实验前检查表</span>
            <ol class="lab-steps-list">
              ${(experiment.steps || []).map((step) => `<li>${renderProseContent(step)}</li>`).join('')}
            </ol>
          </div>
          <aside class="lab-stage-sidebar">
            <div class="lab-stage-card">
              <span>安全守则</span>
              <ul class="lab-safety-list">
                ${(experiment.safetyNotes || []).map((note) => `<li>${renderProseContent(note)}</li>`).join('')}
              </ul>
            </div>
            <div class="lab-stage-card">
              <span>当前状态</span>
              <strong>${isCompleted ? '你已经完成过此实验，可再次复习。' : '首次模拟将写入实验完成记录。'}</strong>
            </div>
          </aside>
        </div>
        <div class="lab-nav-row">
          <button class="hud-action-btn hud-action-btn-primary" data-launch-simulation ${unlockState.unlocked && (!DANGEROUS_LEVELS.has(experiment.safetyLevel) || safetyConfirmed) ? '' : 'disabled'}>${unlockState.unlocked ? '进入模拟视图' : '继续学习后解锁'}</button>
        </div>
      </div>
    </div>
  `;
}

function getReactionUnlockState(experiment, state = {}) {
  const requirements = experiment.unlockRequirements;
  const completed = state.completed || getCompletedExperiments();
  if (completed.has(experiment.experimentId)) {
    return { unlocked: true, summary: '当前实验已开放。', requirements: [] };
  }
  if (!requirements) {
    return { unlocked: false, summary: '需完成对应课程主题或学习阶段后开放模拟。', requirements: [] };
  }

  const learned = state.learned || getLearnedElements();
  const learnedCount = learned.size;
  const requiredTags = Array.isArray(requirements.curriculumTags) ? requirements.curriculumTags : [];
  const requiredSafetyLevels = Array.isArray(requirements.safetyLevels) ? requirements.safetyLevels : [];
  const requiredStages = Array.isArray(requirements.stageIds) ? requirements.stageIds : [];
  const minimumLearnedElements = Number.isInteger(requirements.minimumLearnedElements)
    ? requirements.minimumLearnedElements
    : 0;
  const safetyMatched = requiredSafetyLevels.length === 0 || requiredSafetyLevels.includes(experiment.safetyLevel);
  const tagsMatched = true;
  const progressMatched = learnedCount >= minimumLearnedElements || requiredStages.some((stageId) => isLearningStageUnlocked(stageId, learnedCount));
  const unlocked = safetyMatched && tagsMatched && progressMatched;

  return {
    unlocked,
    requirements: [
      ...requiredTags.map((tagId) => CURRICULUM_TAG_MAP.get(tagId)?.displayPath || tagId),
      minimumLearnedElements > 0 ? `学习元素达到 ${minimumLearnedElements} 个` : '',
      requirements.grade && requirements.chapter ? `${requirements.grade}/${requirements.chapter}` : ''
    ].filter(Boolean),
    summary: unlocked ? '课程、安全与进度要求已满足。' : '需完成对应课程主题或学习阶段后开放模拟。'
  };
}

function isLearningStageUnlocked(stageId, learnedCount) {
  const stageIndex = LAB_STAGE_UNLOCKS.findIndex((stage) => stage.id === stageId);
  if (stageIndex <= 0) {
    return stageIndex === 0;
  }

  const previousStage = LAB_STAGE_UNLOCKS[stageIndex - 1];
  return learnedCount >= Number(previousStage?.requiredCount || 0);
}

function normalizeGrade(text) {
  if (!text) return text;
  // Safe heuristic: standalone 二 before an experiment bracket with 2-x suggests 八年级
  if (/^二\s*[\/／]\s*/.test(text) && /【实验2-/.test(text)) {
    return text.replace(/^二\s*[\/／]\s*/, '八年级 / ');
  }
  return text;
}

function cleanUnlockClue(raw) {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Strip a leading source-id token (alphanumeric + dash + underscore) with optional trailing colon.
  let text = raw.replace(/^[a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*\s*[:：]?\s*/, '').trim();

  // 2. If the first slash-separated piece is still an id-like token, drop that segment.
  const parts = text.split(/\s*[\/／]\s*/);
  if (parts.length > 1 && /^[a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*$/.test(parts[0])) {
    text = parts.slice(1).join(' / ');
  }

  // 3. Normalize safe grade shorthand.
  text = normalizeGrade(text);

  // 4. If a bracketed Chinese segment exists, return the whole cleaned text (preserves grade prefix).
  if (/【[^】]+】/.test(text)) {
    return text;
  }

  // 5. Otherwise fall back to the last meaningful segment.
  const segments = text.split(/\s*[\/／:：]\s*/).filter(Boolean);
  const last = segments[segments.length - 1] || '';
  const cleaned = last.replace(/^[\w-]+\s+/g, '').replace(/\b[0-9a-f]{6,}\b/gi, '').trim();

  return cleaned || text || '';
}

function renderUnlockSummary(unlockState) {
  if (unlockState.unlocked) {
    return mixedProseFormulaHTML(unlockState.summary);
  }

  if (!unlockState.requirements.length) {
    return mixedProseFormulaHTML(unlockState.summary);
  }

  const cleaned = unlockState.requirements.map(cleanUnlockClue).join(' · ');
  return mixedProseFormulaHTML(cleaned || unlockState.summary);
}

function openSimulationModal(experiment) {
  closeSimulationModal();

  const safetyTheme = getSafetyTheme(experiment.safetyLevel);
  const performanceMode = getSettings().performanceMode || 'normal';
  const isSimplified = performanceMode === 'normal';
  const duration = getSimulationDuration(experiment.id, performanceMode);

  const backdrop = document.createElement('div');
  backdrop.className = 'lab-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'lab-modal';
  modal.setAttribute('style', `--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}`);
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="lab-modal-header">
      <div>
        <p class="hud-kicker">REACTION IN PROGRESS</p>
        <h3>${mixedProseFormulaHTML(stripLeadingBracketHeading(experiment.name))}</h3>
      </div>
      <button class="hud-action-btn" data-lab-modal-close aria-label="关闭模拟">关闭</button>
    </div>
    <div class="lab-simulation-meta" data-chem-notation="equation">
      <span>${equationHTML(getReactionEquationText(experiment))}</span>
      <span>${isSimplified ? '当前为 normal 模式：已启用简化动画。' : '高性能模式：显示增强粒子与发光细节。'}</span>
    </div>
    <div class="lab-canvas-frame">
      <canvas id="lab-simulation-canvas" class="lab-simulation-canvas" width="980" height="520"></canvas>
      <div class="lab-canvas-overlay">
        <span>反应视觉描述：${renderProseContent(experiment.visualDescription)}</span>
        <span>预计模拟时长：${(duration / 1000).toFixed(1)} 秒</span>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  activeModal = backdrop;

  modal.querySelector('[data-lab-modal-close]')?.addEventListener('click', () => {
    closeSimulationModal();
    clearSimulationTimer();
    currentView = 'detail';
    safetyConfirmed = false;
    renderLabShell();
  });

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      closeSimulationModal();
      clearSimulationTimer();
      currentView = 'detail';
      safetyConfirmed = false;
      renderLabShell();
    }
  });

  window.requestAnimationFrame(() => {
    startSimulation(experiment);
  });
}

function closeSimulationModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

function openDetailModal(experiment, isCompleted) {
  const viewToPreserve = currentView;
  closeDetailModal();
  currentView = viewToPreserve;

  const safetyTheme = getSafetyTheme(experiment.safetyLevel);

  const backdrop = document.createElement('div');
  backdrop.className = 'lab-detail-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'lab-detail-modal';
  modal.setAttribute('style', `--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}`);
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `${plainChemText(stripLeadingBracketHeading(experiment.name))} 实验详情`);

  modal.innerHTML = renderStageContent(experiment, isCompleted);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  activeDetailModal = backdrop;

  bindStageEvents(modal, experiment, isCompleted);

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      closeDetailModal();
    }
  });
}

function updateDetailModalContent(experiment, isCompleted) {
  if (!activeDetailModal) return;
  const modal = activeDetailModal.querySelector('.lab-detail-modal');
  if (!modal) return;
  modal.innerHTML = renderStageContent(experiment, isCompleted);
  bindStageEvents(modal, experiment, isCompleted);
}

function closeDetailModal() {
  if (activeDetailModal) {
    activeDetailModal.remove();
    activeDetailModal = null;
  }
  detailModalRequested = false;
  currentView = 'detail';
  safetyConfirmed = false;
  clearSimulationTimer();
}

function renderResultView(experiment, isCompleted) {
  const safetyTheme = getSafetyTheme(experiment.safetyLevel);

  return `
    <div class="lab-stage-shell hud-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">EXPERIMENT LOGGED</p>
          <h3>${mixedProseFormulaHTML(stripLeadingBracketHeading(experiment.name))} · 实验总结</h3>
        </div>
        <button class="hud-action-btn" data-lab-back>返回详情</button>
      </div>
      <div class="lab-result-grid">
        <div class="lab-stage-card">
          <span>结果总结</span>
          <strong>${renderProseContent(experiment.description)}</strong>
        </div>
        <div class="lab-stage-card">
          <span>观察到的现象</span>
          <strong>${renderProseContent(experiment.visualDescription)}</strong>
        </div>
        <div class="lab-stage-card">
          <span>实验记录</span>
          <strong>${isCompleted ? '已写入完成状态，并会同步到进度与成就系统。' : '本次实验已完成。'}</strong>
        </div>
        <div class="lab-stage-card">
          <span>下一步</span>
          <strong>返回列表继续探索其他实验，或再次运行当前模拟。</strong>
        </div>
      </div>
      <div class="lab-nav-row lab-nav-row-split">
        <button class="hud-action-btn" data-lab-return-list>返回列表</button>
        <button class="hud-action-btn hud-action-btn-primary" data-lab-start>再次开始实验</button>
      </div>
    </div>
  `;
}

function startSimulation(experiment) {
  clearSimulationTimer();
  simulationRunId += 1;
  const runId = simulationRunId;

  window.requestAnimationFrame(() => {
    const canvas = document.getElementById('lab-simulation-canvas');
    if (!canvas || currentView !== 'simulation' || runId !== simulationRunId) {
      return;
    }

    runSimulation(canvas, experiment, runId);
  });

  completionTimer = window.setTimeout(() => {
    if (runId !== simulationRunId) {
      return;
    }

    closeSimulationModal();
    markExperimentCompleted(experiment.experimentId);
    currentView = 'result';
    detailModalRequested = true;
    renderLabShell();
  }, getSimulationDuration(experiment.id, getSettings().performanceMode || 'normal'));
}

function clearSimulationTimer() {
  simulationRunId += 1;
  if (completionTimer !== null) {
    window.clearTimeout(completionTimer);
    completionTimer = null;
  }
}

function runSimulation(canvas, experiment, runId) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const performanceMode = getSettings().performanceMode || 'normal';
  const duration = getSimulationDuration(experiment.id, performanceMode);
  const startedAt = performance.now();
  const particleCount = performanceMode === 'high-performance' ? 28 : 12;

  function frame(now) {
    if (runId !== simulationRunId || currentView !== 'simulation') {
      return;
    }

    const progress = Math.min(1, (now - startedAt) / duration);
    drawSimulationFrame(context, canvas, experiment.id, progress, particleCount, performanceMode);

    if (progress < 1) {
      window.requestAnimationFrame(frame);
    }
  }

  window.requestAnimationFrame(frame);
}

function drawSimulationFrame(context, canvas, reactionId, progress, particleCount, performanceMode) {
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  const bg = context.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#07111f');
  bg.addColorStop(1, '#020617');
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  drawHudGrid(context, width, height, progress);

  const mappedId = ANIMATION_ID_MAP[reactionId] || reactionId;
  switch (mappedId) {
    case 'reaction-hydrogen-combustion':
      drawHydrogenCombustion(context, width, height, progress, particleCount, performanceMode);
      break;
    case 'reaction-iron-rusting':
      drawIronRusting(context, width, height, progress, particleCount);
      break;
    case 'reaction-sodium-water':
      drawSodiumWater(context, width, height, progress, particleCount, performanceMode);
      break;
    case 'reaction-salt-formation':
      drawSaltFormation(context, width, height, progress, particleCount);
      break;
    case 'reaction-oxygen-supports-combustion':
      drawOxygenCombustion(context, width, height, progress, particleCount, performanceMode);
      break;
    default:
      break;
  }
}

function drawHudGrid(context, width, height, progress) {
  context.save();
  context.strokeStyle = 'rgba(34, 211, 238, 0.08)';
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += 56) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.fillStyle = 'rgba(34, 211, 238, 0.24)';
  context.fillRect(40, height - 28, (width - 80) * progress, 6);
  context.restore();
}

function drawHydrogenCombustion(context, width, height, progress, particleCount, performanceMode) {
  const flameHeight = 220 * Math.sin(progress * Math.PI);
  const centerX = width / 2;
  const baseY = height - 90;

  context.save();
  const flame = context.createRadialGradient(centerX, baseY - flameHeight * 0.4, 10, centerX, baseY, 180);
  flame.addColorStop(0, 'rgba(191, 219, 254, 0.95)');
  flame.addColorStop(0.4, 'rgba(59, 130, 246, 0.88)');
  flame.addColorStop(1, 'rgba(14, 165, 233, 0)');
  context.fillStyle = flame;
  context.beginPath();
  context.moveTo(centerX, baseY - flameHeight);
  context.quadraticCurveTo(centerX + 110, baseY - 40, centerX, baseY + 10);
  context.quadraticCurveTo(centerX - 110, baseY - 40, centerX, baseY - flameHeight);
  context.fill();

  const mistCount = performanceMode === 'high-performance' ? particleCount : Math.floor(particleCount * 0.7);
  for (let index = 0; index < mistCount; index += 1) {
    const t = (progress * 1.6 + index / mistCount) % 1;
    const x = centerX - 120 + index * (240 / mistCount) + Math.sin(t * 18) * 10;
    const y = baseY - 160 * t;
    context.fillStyle = `rgba(191, 219, 254, ${0.2 + 0.4 * (1 - t)})`;
    context.beginPath();
    context.arc(x, y, 3 + (1 - t) * 5, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawIronRusting(context, width, height, progress, particleCount) {
  const plateX = width * 0.24;
  const plateY = height * 0.2;
  const plateWidth = width * 0.52;
  const plateHeight = height * 0.48;

  context.save();
  context.fillStyle = '#cbd5e1';
  context.fillRect(plateX, plateY, plateWidth, plateHeight);

  for (let index = 0; index < particleCount * 3; index += 1) {
    const x = plateX + (index * 37) % plateWidth;
    const y = plateY + (index * 61) % plateHeight;
    const radius = 6 + (index % 5) * 2;
    const alpha = Math.max(0, progress - index / (particleCount * 3.5));
    context.fillStyle = `rgba(180, 83, 9, ${alpha * 0.85})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = `rgba(120, 53, 15, ${progress * 0.35})`;
  context.fillRect(plateX, plateY, plateWidth, plateHeight);
  context.restore();
}

function drawSodiumWater(context, width, height, progress, particleCount, performanceMode) {
  const waterY = height * 0.58;
  context.save();
  context.fillStyle = 'rgba(14, 116, 144, 0.6)';
  context.fillRect(80, waterY, width - 160, height - waterY - 40);

  const sodiumX = 180 + (width - 360) * Math.min(progress * 1.05, 1);
  const sodiumY = waterY - 18 + Math.sin(progress * 20) * 8;
  context.fillStyle = '#e2e8f0';
  context.beginPath();
  context.arc(sodiumX, sodiumY, 18, 0, Math.PI * 2);
  context.fill();

  for (let index = 0; index < particleCount; index += 1) {
    const bubbleOffset = (progress * 1.8 + index / particleCount) % 1;
    const bubbleX = sodiumX - 40 + (index % 6) * 16;
    const bubbleY = waterY - bubbleOffset * 120;
    context.fillStyle = `rgba(125, 211, 252, ${0.18 + (1 - bubbleOffset) * 0.5})`;
    context.beginPath();
    context.arc(bubbleX, bubbleY, 4 + (index % 3), 0, Math.PI * 2);
    context.fill();
  }

  const sparkMultiplier = performanceMode === 'high-performance' ? 1 : 0.55;
  for (let index = 0; index < particleCount; index += 1) {
    const burst = Math.max(0, progress - 0.55) / 0.45;
    const angle = (Math.PI * 2 * index) / particleCount;
    const distance = burst * (60 + index * 4) * sparkMultiplier;
    context.strokeStyle = `rgba(251, 191, 36, ${burst})`;
    context.beginPath();
    context.moveTo(sodiumX, sodiumY);
    context.lineTo(sodiumX + Math.cos(angle) * distance, sodiumY - Math.sin(angle) * distance);
    context.stroke();
  }
  context.restore();
}

function drawSaltFormation(context, width, height, progress, particleCount) {
  context.save();
  const leftX = width * 0.28;
  const rightX = width * 0.72;
  const centerY = height * 0.45;
  context.fillStyle = '#93c5fd';
  context.beginPath();
  context.arc(leftX + progress * 120, centerY, 48, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#bef264';
  context.beginPath();
  context.arc(rightX - progress * 120, centerY, 54, 0, Math.PI * 2);
  context.fill();

  const crystalProgress = Math.max(0, progress - 0.35) / 0.65;
  for (let index = 0; index < particleCount; index += 1) {
    const column = index % 7;
    const row = Math.floor(index / 7);
    const size = 12 + (index % 3) * 4;
    const alpha = Math.max(0, crystalProgress - index / (particleCount * 1.25));
    context.fillStyle = `rgba(248, 250, 252, ${alpha})`;
    context.fillRect(width * 0.42 + column * 24, height * 0.36 + row * 24, size, size);
  }
  context.restore();
}

function drawOxygenCombustion(context, width, height, progress, particleCount, performanceMode) {
  const baseX = width / 2;
  const baseY = height - 92;
  const flameScale = 0.6 + progress * 0.9;

  context.save();
  for (let layer = 0; layer < 3; layer += 1) {
    context.fillStyle = ['rgba(251, 191, 36, 0.95)', 'rgba(249, 115, 22, 0.8)', 'rgba(239, 68, 68, 0.55)'][layer];
    context.beginPath();
    context.moveTo(baseX, baseY - 120 * flameScale - layer * 16);
    context.quadraticCurveTo(baseX + 80 + layer * 24, baseY - 30, baseX, baseY + 8);
    context.quadraticCurveTo(baseX - 80 - layer * 24, baseY - 30, baseX, baseY - 120 * flameScale - layer * 16);
    context.fill();
  }

  const streaks = performanceMode === 'high-performance' ? particleCount : Math.floor(particleCount * 0.65);
  for (let index = 0; index < streaks; index += 1) {
    const startX = 120 + index * ((width - 240) / streaks);
    const endY = height * 0.25 + (index % 4) * 12;
    context.strokeStyle = `rgba(125, 211, 252, ${0.16 + progress * 0.42})`;
    context.beginPath();
    context.moveTo(startX, height * 0.2);
    context.lineTo(baseX + Math.sin(progress * 8 + index) * 40, endY + progress * 200);
    context.stroke();
  }
  context.restore();
}

function getSimulationDuration(reactionId, performanceMode) {
  const baseDuration = performanceMode === 'high-performance' ? 6200 : 4200;
  const mappedId = ANIMATION_ID_MAP[reactionId] || reactionId;
  if (mappedId === 'reaction-iron-rusting') {
    return baseDuration + 1000;
  }
  if (mappedId === 'reaction-sodium-water') {
    return baseDuration - 400;
  }
  return baseDuration;
}

function getSafetyTheme(level) {
  return SAFETY_THEME[level] || SAFETY_THEME.caution;
}
