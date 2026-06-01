import { getLearnedElements, getSelectedElement, setSelectedElement } from './storage.js';
import { restoreSelectedElementView } from './renderTable.js';
import {
  ELEMENT_CATEGORY_LABELS,
  ELEMENT_CATEGORY_TABLE_COLORS
} from '../data/contentMeta.js';
import timelineCatImage from '../images/cat-2.png';

const categoryColors = ELEMENT_CATEGORY_TABLE_COLORS;

const timelineState = {
  elements: [],
  filters: {
    century: 'all',
    category: 'all',
    learned: 'all',
    search: ''
  },
  observer: null,
  focusedIndex: -1
};

const SAFE_COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z]+)$/;

export function initTimeline(elements = []) {
  timelineState.elements = normalizeElements(elements);
  renderTimelinePage();
  bindTimelineEvents();
  bindStateListeners();
}

function normalizeElements(elements) {
  return (Array.isArray(elements) ? elements : [])
    .map((element) => ({
      ...element,
      atomicNumber: normalizeAtomicNumber(element.atomicNumber),
      timelineYearLabel: formatDiscoveryYear(element.discoveryYear),
      timelineSortYear: getDiscoverySortYear(element.discoveryYear),
      timelineCentury: getCenturyBucket(element.discoveryYear),
      timelineDescription: getStoryPreview(element.story),
      timelineSearchText: [
        element.symbol,
        element.chineseName,
        element.englishName,
        element.discoveredBy,
        formatDiscoveryYear(element.discoveryYear)
      ].filter(Boolean).join(' ').toLowerCase()
    }))
    .sort((left, right) => {
      if (left.timelineSortYear !== right.timelineSortYear) {
        return left.timelineSortYear - right.timelineSortYear;
      }

      return left.atomicNumber - right.atomicNumber;
    });
}

function renderTimelinePage() {
  const container = document.getElementById('timeline-container');
  if (!container) {
    return;
  }

  const filteredElements = getFilteredElements();
  const learnedElements = getLearnedElements();
  const selectedAtomicNumber = getSelectedAtomicNumber();
  const categories = getCategoryOptions();
  const jumpYears = getJumpYears(filteredElements);
  const learnedCount = timelineState.elements.filter((element) => learnedElements.has(element.atomicNumber)).length;

  container.innerHTML = `
    <div class="timeline-page-shell">
      <section class="timeline-hero glass-panel neon-border">
        <img
          class="module-cat timeline-cat"
          src="${timelineCatImage}"
          alt=""
          aria-hidden="true"
          data-testid="floating-timeline-cat"
        />
        <div class="timeline-hero-copy">
          <p class="timeline-kicker">元素发现博物馆</p>
          <h3>沿着霓虹时间轴，看看 118 种元素如何一步步走进人类的视野。</h3>
          <p class="timeline-hero-text">从古代熟知的碳、硫，到现代实验室中新合成的超重元素，这条时间线把发现顺序、发现者和学习进度放在同一条科学旅程里。</p>
        </div>
        <div class="timeline-hero-stats" aria-label="时间线统计">
          <div class="timeline-stat-card">
            <span class="timeline-stat-value">${timelineState.elements.length}</span>
            <span class="timeline-stat-label">全部元素</span>
          </div>
          <div class="timeline-stat-card">
            <span class="timeline-stat-value">${filteredElements.length}</span>
            <span class="timeline-stat-label">当前显示</span>
          </div>
          <div class="timeline-stat-card">
            <span class="timeline-stat-value">${learnedCount}</span>
            <span class="timeline-stat-label">已学习</span>
          </div>
        </div>
      </section>

      <section class="timeline-controls glass-panel" aria-label="时间线筛选与搜索">
        <label class="timeline-control-field">
          <span>世纪</span>
          <select id="timeline-century-filter">
            <option value="all">全部时代</option>
            <option value="ancient"${timelineState.filters.century === 'ancient' ? ' selected' : ''}>更早时期</option>
            <option value="18"${timelineState.filters.century === '18' ? ' selected' : ''}>18世纪</option>
            <option value="19"${timelineState.filters.century === '19' ? ' selected' : ''}>19世纪</option>
            <option value="20"${timelineState.filters.century === '20' ? ' selected' : ''}>20世纪</option>
            <option value="21"${timelineState.filters.century === '21' ? ' selected' : ''}>21世纪</option>
          </select>
        </label>

        <label class="timeline-control-field">
          <span>类别</span>
          <select id="timeline-category-filter">
            <option value="all">全部类别</option>
            ${categories.map((category) => `
              <option value="${escapeAttribute(category)}"${timelineState.filters.category === category ? ' selected' : ''}>${escapeHTML(ELEMENT_CATEGORY_LABELS[category] || category)}</option>
            `).join('')}
          </select>
        </label>

        <label class="timeline-control-field">
          <span>学习状态</span>
          <select id="timeline-learned-filter">
            <option value="all"${timelineState.filters.learned === 'all' ? ' selected' : ''}>全部</option>
            <option value="learned"${timelineState.filters.learned === 'learned' ? ' selected' : ''}>已学习</option>
            <option value="unlearned"${timelineState.filters.learned === 'unlearned' ? ' selected' : ''}>未学习</option>
          </select>
        </label>

        <label class="timeline-control-field timeline-control-field-search">
          <span>搜索</span>
          <div class="timeline-search-box">
            <input id="timeline-search" type="search" placeholder="名称 / 符号 / 发现者" value="${escapeAttribute(timelineState.filters.search)}" />
            <button type="button" id="timeline-search-clear" aria-label="清除时间线搜索">&#10005;</button>
          </div>
        </label>

        <label class="timeline-control-field timeline-control-field-jump">
          <span>跳转年份</span>
          <div class="timeline-jump-box">
            <select id="timeline-year-jump">
              <option value="">选择年份</option>
              ${jumpYears.map((year) => `<option value="${year}">${year}年</option>`).join('')}
            </select>
            <button type="button" id="timeline-jump-trigger" class="timeline-mini-btn">定位</button>
          </div>
        </label>

        <button type="button" id="timeline-reset-filters" class="timeline-reset-btn">重置筛选</button>
      </section>

      <section class="timeline-milestones" aria-label="快速时代跳转">
        ${renderMilestoneButtons(filteredElements)}
      </section>

      <section class="timeline-summary" aria-live="polite">
        <p>${getSummaryText(filteredElements)}</p>
      </section>

      <div id="timeline-list" class="timeline-list" tabindex="0" aria-label="元素发现历史时间线">
        ${filteredElements.length > 0 ? filteredElements.map((element, index) => renderTimelineNode(element, index, learnedElements, selectedAtomicNumber)).join('') : `
          <div class="timeline-empty glass-panel">
            <strong>没有找到匹配的元素</strong>
            <p>试试放宽筛选条件，或者换个名字、符号、发现者重新搜索。</p>
          </div>
        `}
      </div>
    </div>
  `;

  bindRenderedInteractions(container);
  observeTimelineCards();
}

function renderTimelineNode(element, index, learnedElements, selectedAtomicNumber) {
  const accent = getSafeAccentColor(element);
  const side = index % 2 === 0 ? 'left' : 'right';
  const isLearned = learnedElements.has(element.atomicNumber);
  const isSelected = selectedAtomicNumber === element.atomicNumber;

  return `
    <article
      id="timeline-anchor-${element.atomicNumber}"
      class="timeline-entry timeline-entry-${side}${isLearned ? ' is-learned' : ''}${isSelected ? ' is-selected' : ''}"
      style="--timeline-accent: ${escapeAttribute(accent)}"
      data-atomic-number="${element.atomicNumber}"
      data-year="${escapeAttribute(formatJumpYear(element.discoveryYear))}"
      data-search-key="${escapeAttribute(element.timelineSearchText)}"
      tabindex="0"
      role="button"
      aria-pressed="${isSelected ? 'true' : 'false'}"
      aria-label="查看 ${escapeAttribute(element.chineseName)} ${escapeAttribute(element.englishName)} 的详情"
    >
      <div class="timeline-entry-dot" aria-hidden="true"></div>
      <div class="timeline-entry-card glass-panel">
        <div class="timeline-entry-topline">
          <span class="timeline-entry-year">${escapeHTML(element.timelineYearLabel)}</span>
          <span class="timeline-entry-category">${escapeHTML(ELEMENT_CATEGORY_LABELS[element.category] || '未知类别')}</span>
        </div>
        <div class="timeline-entry-core">
          <span class="timeline-entry-symbol">${escapeHTML(element.symbol)}</span>
          <div class="timeline-entry-names">
            <h4>${escapeHTML(element.chineseName)}</h4>
            <p>${escapeHTML(element.englishName)}</p>
          </div>
          ${isLearned ? '<span class="timeline-entry-badge">✓ 已学习</span>' : ''}
        </div>
        <div class="timeline-entry-meta">
          <span class="timeline-entry-discoverer">发现者：${escapeHTML(element.discoveredBy || '资料整理中')}</span>
          <span class="timeline-entry-number">#${element.atomicNumber}</span>
        </div>
        <p class="timeline-entry-story">${escapeHTML(element.timelineDescription)}</p>
      </div>
    </article>
  `;
}

function bindTimelineEvents() {
  window.addEventListener('pagechange', (event) => {
    if (event?.detail?.section === 'timeline') {
      window.requestAnimationFrame(() => {
        observeTimelineCards();
      });
    }
  });
}

function bindStateListeners() {
  window.addEventListener('elementlearned', rerenderTimelineFromState);
  window.addEventListener('statereset', rerenderTimelineFromState);
  window.addEventListener('selectedelementchanged', handleSelectedElementChanged);
}

function handleSelectedElementChanged(event) {
  updateSelectedTimelineEntry(event?.detail?.atomicNumber ?? event?.detail?.newValue?.atomicNumber ?? null);
}

function rerenderTimelineFromState() {
  window.requestAnimationFrame(() => {
    renderTimelinePage();
  });
}

function bindRenderedInteractions(container) {
  container.querySelector('#timeline-century-filter')?.addEventListener('change', (event) => {
    timelineState.filters.century = event.target.value;
    renderTimelinePage();
  });

  container.querySelector('#timeline-category-filter')?.addEventListener('change', (event) => {
    timelineState.filters.category = event.target.value;
    renderTimelinePage();
  });

  container.querySelector('#timeline-learned-filter')?.addEventListener('change', (event) => {
    timelineState.filters.learned = event.target.value;
    renderTimelinePage();
  });

  container.querySelector('#timeline-search')?.addEventListener('input', (event) => {
    timelineState.filters.search = event.target.value;
    renderTimelinePage();
  });

  container.querySelector('#timeline-search-clear')?.addEventListener('click', () => {
    timelineState.filters.search = '';
    renderTimelinePage();
  });

  container.querySelector('#timeline-reset-filters')?.addEventListener('click', () => {
    timelineState.filters = {
      century: 'all',
      category: 'all',
      learned: 'all',
      search: ''
    };
    renderTimelinePage();
  });

  container.querySelector('#timeline-jump-trigger')?.addEventListener('click', () => {
    const year = container.querySelector('#timeline-year-jump')?.value;
    if (year) {
      scrollToYear(year);
    }
  });

  container.querySelector('#timeline-year-jump')?.addEventListener('change', (event) => {
    if (event.target.value) {
      scrollToYear(event.target.value);
    }
  });

  container.querySelectorAll('[data-jump-year]').forEach((button) => {
    button.addEventListener('click', () => {
      scrollToYear(button.dataset.jumpYear || '');
    });
  });

  const timelineList = container.querySelector('#timeline-list');
  timelineList?.addEventListener('keydown', handleTimelineListKeydown);

  container.querySelectorAll('.timeline-entry').forEach((entry, index) => {
    const atomicNumber = Number.parseInt(entry.dataset.atomicNumber || '', 10);
    const element = timelineState.elements.find((item) => item.atomicNumber === atomicNumber);
    if (!element) {
      return;
    }

    entry.addEventListener('click', () => navigateToElement(element));
    entry.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        navigateToElement(element);
      }
    });
    entry.addEventListener('focus', () => {
      timelineState.focusedIndex = index;
    });
  });
}

function handleTimelineListKeydown(event) {
  const list = event.currentTarget;
  if (!(list instanceof HTMLElement)) {
    return;
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const cards = [...list.querySelectorAll('.timeline-entry')];

    if (cards.length === 0) {
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = cards.findIndex((card) => card === activeElement);
    const nextIndex = currentIndex >= 0
      ? Math.max(0, Math.min(cards.length - 1, currentIndex + direction))
      : Math.max(0, Math.min(cards.length - 1, timelineState.focusedIndex + direction));

    timelineState.focusedIndex = nextIndex;
    const nextCard = cards[nextIndex];
    nextCard?.focus();
    nextCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function navigateToElement(element) {
  const selected = setSelectedElement(element.atomicNumber);
  if (!selected) {
    return;
  }

  updateSelectedTimelineEntry(selected.atomicNumber);

  window.requestAnimationFrame(() => {
    restoreSelectedElementView({
      element: selected,
      markLearned: false,
      emitEvent: true,
      scroll: false
    });
  });
}

function updateSelectedTimelineEntry(atomicNumber) {
  const selectedAtomicNumber = normalizeAtomicNumber(atomicNumber);
  document.querySelectorAll('.timeline-entry').forEach((entry) => {
    const entryAtomicNumber = Number.parseInt(entry.dataset.atomicNumber || '', 10);
    const isSelected = selectedAtomicNumber > 0 && entryAtomicNumber === selectedAtomicNumber;

    entry.classList.toggle('is-selected', isSelected);
    entry.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

function getSelectedAtomicNumber() {
  return normalizeAtomicNumber(getSelectedElement()?.atomicNumber);
}

function getFilteredElements() {
  const learnedElements = getLearnedElements();
  const query = timelineState.filters.search.trim().toLowerCase();

  return timelineState.elements.filter((element) => {
    const matchesCentury = timelineState.filters.century === 'all'
      || element.timelineCentury === timelineState.filters.century;
    const matchesCategory = timelineState.filters.category === 'all'
      || element.category === timelineState.filters.category;

    let matchesLearned = true;
    if (timelineState.filters.learned === 'learned') {
      matchesLearned = learnedElements.has(element.atomicNumber);
    } else if (timelineState.filters.learned === 'unlearned') {
      matchesLearned = !learnedElements.has(element.atomicNumber);
    }

    const matchesQuery = !query || element.timelineSearchText.includes(query);

    return matchesCentury && matchesCategory && matchesLearned && matchesQuery;
  });
}

function getCategoryOptions() {
  return [...new Set(timelineState.elements.map((element) => element.category).filter(Boolean))];
}

function getJumpYears(elements) {
  return [...new Set(
    elements
      .filter((element) => Number.isFinite(Number(element.discoveryYear)))
      .map((element) => Number(element.discoveryYear))
  )].sort((left, right) => left - right);
}

function getSummaryText(elements) {
  if (elements.length === 0) {
    return '当前筛选条件下没有匹配的发现记录。';
  }

  const first = elements[0];
  const last = elements[elements.length - 1];
  return `当前展示 ${elements.length} 个元素，从 ${first.timelineYearLabel} 的 ${sanitizePlainText(first.chineseName, '未知元素')} 一直到 ${last.timelineYearLabel} 的 ${sanitizePlainText(last.chineseName, '未知元素')}。点击任意节点可在右侧打开对应详情。`;
}

function renderMilestoneButtons(elements) {
  const milestoneYears = getJumpYears(elements).filter((year, index, years) => {
    if (years.length <= 6) {
      return true;
    }

    if (index === 0 || index === years.length - 1) {
      return true;
    }

    const step = Math.max(1, Math.floor(years.length / 4));
    return index % step === 0;
  });

  if (milestoneYears.length === 0) {
    return '<span class="timeline-milestone-label">可用年份锚点会在筛选出近代元素后出现。</span>';
  }

  return milestoneYears.map((year) => `
    <button type="button" class="timeline-milestone-btn" data-jump-year="${year}">${year}</button>
  `).join('');
}

function scrollToYear(year) {
  if (!year) {
    return;
  }

  const target = document.querySelector(`.timeline-entry[data-year="${CSS.escape(String(year))}"]`);
  if (!target) {
    return;
  }

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus();
  });
}

function observeTimelineCards() {
  timelineState.observer?.disconnect();

  const cards = document.querySelectorAll('.timeline-entry');
  if (cards.length === 0) {
    return;
  }

  timelineState.observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        window.requestAnimationFrame(() => {
          entry.target.classList.add('is-visible');
        });
        timelineState.observer?.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px'
  });

  cards.forEach((card) => {
    card.classList.remove('is-visible');
    timelineState.observer?.observe(card);
  });
}

function getDiscoverySortYear(discoveryYear) {
  const numericYear = Number(discoveryYear);
  if (Number.isFinite(numericYear)) {
    return numericYear;
  }

  if (typeof discoveryYear === 'string' && discoveryYear.includes('古代')) {
    return -9999;
  }

  return Number.MAX_SAFE_INTEGER;
}

function getCenturyBucket(discoveryYear) {
  const numericYear = Number(discoveryYear);
  if (Number.isFinite(numericYear) && numericYear > 0) {
    return String(Math.floor((numericYear - 1) / 100) + 1);
  }

  return 'ancient';
}

function formatDiscoveryYear(discoveryYear) {
  if (Number.isFinite(Number(discoveryYear))) {
    return `${Number(discoveryYear)}`;
  }

  return String(discoveryYear || '未知');
}

function formatJumpYear(discoveryYear) {
  return Number.isFinite(Number(discoveryYear)) ? String(Number(discoveryYear)) : '';
}

function getStoryPreview(story) {
  if (!story || typeof story !== 'string') {
    return '这段发现故事正在整理中。';
  }

  const sentences = story
    .split(/(?<=[。！？!?])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, 2).join(' ') || story;
}

function getSafeAccentColor(element) {
  const requestedColor = typeof element?.color === 'string' ? element.color.trim() : '';
  if (requestedColor && SAFE_COLOR_PATTERN.test(requestedColor)) {
    return requestedColor;
  }

  return categoryColors[element?.category] || categoryColors.unknown;
}

function normalizeAtomicNumber(value) {
  const numericValue = Number(value);
  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  return 0;
}

function sanitizePlainText(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  return text || fallback;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll('`', '&#96;');
}
