/** ===== 实验室模块 ===== */
import { LAB_SAFETY_THEME, SAFETY_LABELS } from '../data/contentMeta.js';
import { curriculumTags, learningPath, labExperiments as importedLabExperiments, textbookAssetManifest } from '../data/index.js';
import { getCurrentSection, navigateTo } from './router.js';
import {
  getCompletedExperiments,
  getExperimentCompletionDate,
  getExperimentTitleOverride,
  getLearnedElements,
  getSelectedElement,
  markExperimentCompleted,
  setExperimentTitleOverride
} from './storage.js';
import { formulaHTML, equationHTML, mixedProseFormulaHTML, plainChemText } from './chemNotation.js';
import { createIcons, icons } from 'lucide';

const EQUATION_MAP = {
  'reaction-hydrogen-combustion': '2H2 + O2 → 2H2O',
  'reaction-iron-rusting': '4Fe + 3O2 → 2Fe2O3',
  'reaction-sodium-water': '2Na + 2H2O → 2NaOH + H2↑',
  'reaction-salt-formation': '2Na + Cl2 → 2NaCl',
  'reaction-oxygen-supports-combustion': 'C + O2 → CO2'
};



const SAFETY_THEME = LAB_SAFETY_THEME;

const DANGEROUS_LEVELS = new Set(['dangerous', 'radioactive', 'extremely dangerous']);

const MAX_TITLE_LENGTH_UNITS = 80;

function getExperimentSerial(experimentId, indexMap, maxDigits) {
  const serialNumber = indexMap.get(experimentId);
  if (serialNumber == null) return '';
  return `NO. ${String(serialNumber).padStart(maxDigits, '0')}`;
}

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
let filterTextbook = 'all';

function refreshLabIcons() {
  window.requestAnimationFrame(() => createIcons({ icons }));
}

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

    closeDetailModal();
  });

  window.addEventListener('statereset', () => {
    currentView = 'detail';
    safetyConfirmed = false;
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

    if (filterSafety !== 'all' && experiment.safetyLevel !== filterSafety) return false;
    if (filterCompletion === 'completed' && !isCompleted) return false;
    if (filterCompletion === 'uncompleted' && isCompleted) return false;
    if (filterLock === 'related' && !isRelated) return false;
    if (filterLock === 'general' && isRelated) return false;

    const textbookIds = new Set();
    if (experiment.sourceVolumeId && experiment.sourceVolumeId !== 'curated-legacy') {
      textbookIds.add(experiment.sourceVolumeId);
    }
    if (Array.isArray(experiment.sourceReferences)) {
      experiment.sourceReferences.forEach((ref) => {
        if (ref.sourceVolumeId && ref.sourceVolumeId !== 'curated-legacy') {
          textbookIds.add(ref.sourceVolumeId);
        }
      });
    }
    if (filterTextbook !== 'all' && !textbookIds.has(filterTextbook)) return false;

    if (filterText.trim()) {
      const query = filterText.trim().toLowerCase();
      const haystack = [
        experiment.name,
        experiment.description,
        (experiment.reactants || []).join(' '),
        (experiment.products || []).join(' ')
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const total = labExperiments.length;
  const visible = filteredReactions.length;
  const maxIndexDigits = Math.max(3, String(total).length);
  const experimentIndexMap = new Map(labExperiments.map((exp, i) => [exp.id, i + 1]));

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
      const safetyTheme = getSafetyTheme(experiment.safetyLevel);

      const titleSource = getEffectiveExperimentTitleSource(experiment);
      const titlePlain = plainChemText(titleSource.text);
      const titleHtml = mixedProseFormulaHTML(titleSource.text);

      const paddedSerial = getExperimentSerial(experiment.id, experimentIndexMap, maxIndexDigits);

      return `
        <article class="lab-item-card ${experiment.id === activeReaction?.id ? 'is-active' : ''} ${isRelated ? 'is-related' : ''}" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
          <div class="lab-item-card-header">
            <div class="lab-item-card-title-wrap">
              <span class="lab-card-serial" data-testid="lab-card-index" aria-label="实验序号 ${paddedSerial.replace(/^NO. /, '')}">${paddedSerial}</span>
              <h3 title="${escapeAttr(titlePlain)}" data-testid="lab-card-title">${titleHtml}</h3>
              ${hasFormulaList(experiment.reactants) ? `<p class="lab-elements" data-chem-notation="reactants">${(experiment.reactants || []).map((r) => formulaHTML(r)).join(' + ')}</p>` : ''}
            </div>
            <span class="lab-complete-badge ${isCompleted ? 'is-complete' : ''}" title="${isCompleted ? '已完成' : '未完成'}"><i data-lucide="${isCompleted ? 'check' : 'circle'}"></i></span>
          </div>
          <div class="lab-card-meta-row">
            <span class="lab-safety-pill level-${experiment.safetyLevel.replace(/\s+/g, '-')}"><i data-lucide="${safetyTheme.icon}"></i> ${SAFETY_LABELS[experiment.safetyLevel] || experiment.safetyLevel}</span>
            <span class="lab-card-status">${isRelated ? '与当前元素相关' : '通用演示实验'}</span>
          </div>
          <p class="lab-card-description">${renderCardDescription(experiment.description)}</p>
          <button class="hud-action-btn lab-card-action" data-reaction-open="${experiment.id}">查看实验</button>
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-reaction-open]').forEach((button) => {
      button.addEventListener('click', () => {
        activeReactionId = button.dataset.reactionOpen;
        currentView = 'detail';
        safetyConfirmed = false;
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

  refreshLabIcons();
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

  const confirmBtn = modalContent.querySelector('[data-lab-confirm-complete]');

  confirmBtn?.addEventListener('click', () => {
    if (!activeReaction?.experimentId) return;
    markExperimentCompleted(activeReaction.experimentId);
    const freshCompleted = getCompletedExperiments();
    const freshIsCompleted = freshCompleted.has(activeReaction.experimentId);
    updateDetailModalContent(activeReaction, freshIsCompleted);
    renderLabShell();
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
    const volumeDisplayNames = new Map();
    (textbookAssetManifest?.volumes || []).forEach((vol) => {
      if (vol.volumeId && vol.displayName) volumeDisplayNames.set(vol.volumeId, vol.displayName);
    });

    const textbookIds = new Set();
    labExperiments.forEach((exp) => {
      if (exp.sourceVolumeId && exp.sourceVolumeId !== 'curated-legacy') textbookIds.add(exp.sourceVolumeId);
      if (Array.isArray(exp.sourceReferences)) {
        exp.sourceReferences.forEach((ref) => {
          if (ref.sourceVolumeId && ref.sourceVolumeId !== 'curated-legacy') textbookIds.add(ref.sourceVolumeId);
        });
      }
    });
    const textbooks = [...textbookIds].sort();

    const TEXTBOOK_LABEL_ALIASES = new Map([
      ['rj-chemistry-g12-selective-3-organic-2019', '2019版人教版高中化学-选择性必修3 有机化学基础'],
      ['rj-chemistry-grade8-54-2024-full', '2024版人教版（五·四学制）八年级化学全一册'],
      ['rj-chemistry-grade9-2024-vol1', '2024版人教版九年级化学上册'],
      ['rj-chemistry-grade9-2024-vol2', '2024版人教版九年级化学下册']
    ]);

    function resolveTextbookLabel(volumeId) {
      const alias = TEXTBOOK_LABEL_ALIASES.get(volumeId);
      if (alias) return alias;

      const expWithName = labExperiments.find((e) =>
        (e.sourceVolumeId === volumeId && e.sourceVolumeDisplayName) ||
        (Array.isArray(e.sourceReferences) && e.sourceReferences.some((r) => r.sourceVolumeId === volumeId && r.sourceVolumeDisplayName))
      );
      if (expWithName) {
        if (expWithName.sourceVolumeId === volumeId && expWithName.sourceVolumeDisplayName) return expWithName.sourceVolumeDisplayName;
        const ref = expWithName.sourceReferences.find((r) => r.sourceVolumeId === volumeId && r.sourceVolumeDisplayName);
        if (ref) return ref.sourceVolumeDisplayName;
      }
      return volumeDisplayNames.get(volumeId) || volumeId;
    }

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
          <select class="lab-filter-select" data-lab-filter="lock" title="关联状态">
            <option value="all">全部</option>
            <option value="related">当前元素相关</option>
            <option value="general">通用演示</option>
          </select>
          ${textbooks.length ? `
          <select class="lab-filter-select" data-lab-filter="textbook" title="教材名称">
            <option value="all">全部教材</option>
            ${textbooks.map((id) => `<option value="${escapeAttr(id)}">${escapeAttr(resolveTextbookLabel(id))}</option>`).join('')}
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
        if (key === 'textbook') filterTextbook = control.value;

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
  const textbookSelect = toolbar.querySelector('[data-lab-filter="textbook"]');
  if (textbookSelect) textbookSelect.value = filterTextbook;
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
  const chemRows = renderChemistrySummaryRows(experiment);
  const isEditingTitle = editingTitleReactionId === experiment.id;
  const titleSource = getEffectiveExperimentTitleSource(experiment);
  const canonicalTitle = stripLeadingBracketHeading(experiment.name);
  const placeholderTitle = canonicalTitle.trim() || '教材实验';

  const titleHtml = isEditingTitle
    ? renderTitleEditMode(experiment, placeholderTitle)
    : renderTitleReadonly(titleSource.text, titleSource.source);

  const total = labExperiments.length;
  const maxIndexDigits = Math.max(3, String(total).length);
  const experimentIndexMap = new Map(labExperiments.map((exp, i) => [exp.id, i + 1]));
  const serialLabel = getExperimentSerial(experiment.id, experimentIndexMap, maxIndexDigits);

  return `
    <div class="lab-stage-shell hud-shell" style="--lab-accent:${safetyTheme.color}; --lab-accent-glow:${safetyTheme.glow}">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker lab-detail-serial" data-testid="lab-detail-index">${serialLabel}</p>
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
      <div class="lab-completion-footer">
        ${isCompleted
          ? `<p class="lab-complete-confirmed" data-testid="lab-completion-confirmed">确认完成：${escapeAttr(getExperimentCompletionDate(experiment.experimentId) ?? '已完成')}</p>`
          : `<button class="hud-action-btn hud-action-btn-primary lab-complete-confirm-btn" data-lab-confirm-complete>确认完成实验</button>`}
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
          <p>开始前请先阅读本次实验的操作提示与实验守则。</p>
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
              <strong>${isCompleted ? '你已经完成过此实验，可再次复习。' : '请阅读实验说明与安全守则。'}</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `;
}

function getReactionUnlockState(experiment, state = {}) {
  // Unlock gating removed: all experiments are treated as unlocked.
  // This function is kept for backward compatibility with any external callers.
  return { unlocked: true, summary: '当前实验已开放。', requirements: [] };
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
  refreshLabIcons();
}

function closeDetailModal() {
  if (activeDetailModal) {
    activeDetailModal.remove();
    activeDetailModal = null;
  }
  detailModalRequested = false;
  currentView = 'detail';
  safetyConfirmed = false;
}

function getSafetyTheme(level) {
  return SAFETY_THEME[level] || SAFETY_THEME.caution;
}
