/** ===== 故事模式模块 ===== */
import { elements, storyMediaByAtomicNumber } from '../data/index.js';
import { getSelectedElement, setSelectedElement } from './storage.js';
import { restoreSelectedElementView } from './renderTable.js';
import { getCurrentSection, navigateTo, rememberHomeSelection } from './router.js';
import { electronConfigHTML } from './chemNotation.js';
import storyCatImage from '../images/cat-8.png';

const SAFE_COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z-]+|var\(--[a-zA-Z0-9-]+\))$/;
const LOCAL_STORY_MEDIA_PATTERN = /^\/assets\/elements\/(discovery|specimens)\/[\w.-]+\.webp(?:\?v=\d+)?$/;
const STORY_MEDIA_UPLOAD_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const STORY_MEDIA_MAX_BYTES = 1024 * 1024;
const STORY_MEDIA_MAX_DIMENSION = 800;

let currentStoryAtomicNumber = null;
let typewriterTimer = null;

/** Runtime session overrides for story media updated via admin upload. */
const storyMediaRuntimeUpdates = new Map();

export function initStoryMode() {
  renderStoryShell();

  window.addEventListener('storyrequested', (event) => {
    currentStoryAtomicNumber = event.detail?.element?.atomicNumber ?? getSelectedElement()?.atomicNumber ?? null;
    if (getCurrentSection() === 'story') {
      renderStoryShell();
    }
  });

  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'story') {
      if (currentStoryAtomicNumber === null) {
        currentStoryAtomicNumber = getSelectedElement()?.atomicNumber ?? null;
      }
      renderStoryShell();
    } else {
      clearTypewriter();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getCurrentSection() === 'story') {
      if (document.querySelector('.story-media-modal-backdrop')) {
        return;
      }
      navigateTo('periodic-table');
    }
  });
}

function renderStoryShell() {
  const container = document.querySelector('#story .story-container');
  if (!container) {
    return;
  }

  const element = getCurrentStoryElement();
  if (!element) {
    clearTypewriter();
    container.innerHTML = `
      <div class="story-shell hud-shell">
        <div class="hud-shell-header">
          <div>
            <p class="hud-kicker">STORY LINK OFFLINE</p>
            <h3>先在主页选择一个元素</h3>
          </div>
        </div>
        <div class="story-empty-state">
          <p>故事模式会根据你刚才在周期表里选中的元素加载专属小故事，并保持返回后的详情状态。</p>
        </div>
      </div>
    `;
    bindStoryActions(container, null);
    return;
  }

  const storyIndex = elements.findIndex((item) => item.atomicNumber === element.atomicNumber);
  const previousElement = elements[storyIndex - 1] || null;
  const nextElement = elements[storyIndex + 1] || null;
  const storyText = element.story || `${element.chineseName} 的故事正在整理中。`;
  const storyMediaRecord = storyMediaByAtomicNumber.get(element.atomicNumber) || null;
  const storyAccent = getSafeStoryAccent(element.color);

  container.innerHTML = `
    <div class="story-shell hud-shell" style="--story-accent: ${escapeAttribute(storyAccent)};">
      <div class="hud-shell-header">
        <div>
          <p class="hud-kicker">ELEMENT STORY ARCHIVE</p>
          <h3>${escapeHTML(element.chineseName)} · ${escapeHTML(element.symbol)}</h3>
        </div>
      </div>
      <div class="story-hero">
        <img
          class="module-cat story-cat"
          src="${escapeAttribute(storyCatImage)}"
          alt=""
          aria-hidden="true"
          data-testid="floating-story-cat"
        />
        <div class="story-orbital-badge">
          <span class="story-atomic-number">${escapeHTML(element.atomicNumber)}</span>
          <span class="story-symbol">${escapeHTML(element.symbol)}</span>
        </div>
        ${renderStoryMediaGrid(storyMediaRecord, element)}
        <div class="story-meta-grid">
          <div class="story-meta-card"><span>中文名</span><strong>${escapeHTML(element.chineseName)}</strong></div>
          <div class="story-meta-card"><span>英文名</span><strong>${escapeHTML(element.englishName)}</strong></div>
          <div class="story-meta-card"><span>发现者</span><strong>${escapeHTML(element.discoveredBy || '未知')}</strong></div>
          <div class="story-meta-card"><span>发现年份</span><strong>${escapeHTML(element.discoveryYear ?? '未知')}</strong></div>
        </div>
      </div>
      <div class="story-transcript-panel">
        <div class="story-transcript-header">
          <span class="hud-kicker">NARRATIVE FEED</span>
          <span>${electronConfigHTML(element.electronConfiguration || '电子排布待补充')}</span>
        </div>
        <div class="story-body" aria-live="polite"></div>
      </div>
      <div class="story-nav-row">
        <button class="hud-action-btn" data-story-prev ${previousElement ? '' : 'disabled'}>上一个</button>
        <button class="hud-action-btn hud-action-btn-primary" data-story-next ${nextElement ? '' : 'disabled'}>下一个</button>
      </div>
    </div>
  `;

  bindStoryActions(container, { previousElement, nextElement });
  startTypewriter(container.querySelector('.story-body'), storyText);
}

function renderStoryMediaGrid(storyMedia, element) {
  if (!storyMedia || !element) {
    return '';
  }

  const cards = [
    renderStoryMediaCard(getEffectiveStoryMedia(element, storyMedia.discoveryMedia, 'discovery'), '发现故事', 'discovery', element),
    renderStoryMediaCard(getEffectiveStoryMedia(element, storyMedia.specimenMedia, 'specimen'), '元素样品', 'specimen', element)
  ].filter(Boolean);

  if (cards.length === 0) {
    return '';
  }

  return `
    <div class="story-media-grid" aria-label="故事媒体证据卡">
      ${cards.join('')}
    </div>
  `;
}

function getEffectiveStoryMedia(element, canonicalMedia, side) {
  const runtimeKey = `${element.atomicNumber}-${side}`;
  const runtimeOverride = storyMediaRuntimeUpdates.get(runtimeKey) || null;
  if (!canonicalMedia && !runtimeOverride) {
    return null;
  }

  return {
    ...(canonicalMedia || {}),
    ...(runtimeOverride || {}),
    side,
    atomicNumber: element.atomicNumber,
    hasOverride: Boolean(runtimeOverride)
  };
}

function renderStoryMediaCard(media, label, side, element) {
  if (!media || !isSafeStoryMediaSrc(media.src)) {
    return '';
  }

  const alt = sanitizePlainText(media.altZh, `${element?.chineseName || media.symbol || ''}${label}图片`);
  const rawSource = sanitizePlainText(media.source, '');
  const sourceValue = rawSource.replace(/^图片来源[:：]\s*/, '');

  return `
    <article
      class="story-media-card story-media-card-${escapeAttribute(side)}"
      role="button"
      tabindex="0"
      aria-label="编辑${escapeAttribute(label)}图片"
      data-story-media-card
      data-story-media-side="${escapeAttribute(side)}"
      data-story-media-label="${escapeAttribute(label)}"
    >
      <div class="story-media-frame">
        <img
          src="${escapeAttribute(media.src)}"
          alt="${escapeAttribute(alt)}"
          loading="lazy"
          decoding="async"
          width="800"
          height="520"
        />
      </div>
      <div class="story-media-attribution">
        <span class="story-media-source-label">图片来源：</span>
        <span class="story-media-source-value">${escapeHTML(sourceValue || '未标注')}</span>
      </div>
    </article>
  `;
}

function isLocalStoryMediaSrc(src) {
  return typeof src === 'string' && LOCAL_STORY_MEDIA_PATTERN.test(src);
}

function isSafeStoryMediaSrc(src) {
  return isLocalStoryMediaSrc(src);
}

function bindStoryActions(container, neighbors) {
  container.querySelector('[data-story-prev]')?.addEventListener('click', () => {
    if (!neighbors?.previousElement) {
      return;
    }

    selectStoryElement(neighbors.previousElement);
  });

  container.querySelector('[data-story-next]')?.addEventListener('click', () => {
    if (!neighbors?.nextElement) {
      return;
    }

    selectStoryElement(neighbors.nextElement);
  });

  container.querySelectorAll('[data-story-media-card]').forEach((card) => {
    card.addEventListener('dblclick', () => openStoryMediaModal(card));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      openStoryMediaModal(card);
    });
  });
}

function selectStoryElement(targetElement) {
  const selected = setSelectedElement(targetElement?.atomicNumber ?? null);
  if (!selected) {
    return false;
  }

  currentStoryAtomicNumber = selected.atomicNumber;
  rememberHomeSelection(selected.atomicNumber);
  restoreSelectedElementView({
    element: selected,
    scroll: false,
    emitEvent: true
  });
  renderStoryShell();
  return true;
}

function getCurrentStoryElement() {
  if (currentStoryAtomicNumber === null) {
    return getSelectedElement();
  }

  return elements.find((element) => element.atomicNumber === currentStoryAtomicNumber) || null;
}

function getSafeStoryAccent(color) {
  const requestedColor = typeof color === 'string' ? color.trim() : '';
  if (requestedColor && SAFE_COLOR_PATTERN.test(requestedColor)) {
    return requestedColor;
  }

  return 'var(--neon-cyan)';
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

function startTypewriter(target, text) {
  if (!target) {
    return;
  }

  clearTypewriter();
  target.textContent = '';

  let index = 0;
  typewriterTimer = window.setInterval(() => {
    index += 2;
    target.textContent = text.slice(0, index);

    if (index >= text.length) {
      clearTypewriter();
    }
  }, 24);
}

function clearTypewriter() {
  if (typewriterTimer !== null) {
    window.clearInterval(typewriterTimer);
    typewriterTimer = null;
  }
}

function openStoryMediaModal(triggerCard) {
  const element = getCurrentStoryElement();
  const side = triggerCard?.dataset.storyMediaSide;
  const label = triggerCard?.dataset.storyMediaLabel || '故事';
  if (!element || (side !== 'discovery' && side !== 'specimen')) {
    return;
  }

  const image = triggerCard.querySelector('img');
  const attribution = triggerCard.querySelector('.story-media-source-value')?.textContent || '';
  const originalPreviewSrc = image?.getAttribute('src') || '';
  const originalPreviewAlt = image?.getAttribute('alt') || '';
  const modal = document.createElement('div');
  modal.className = 'story-media-modal-backdrop';
  modal.innerHTML = `
    <div class="story-media-modal" role="dialog" aria-modal="true" aria-labelledby="story-media-modal-title">
      <div class="story-media-modal-header">
        <h3 id="story-media-modal-title">编辑${escapeHTML(label)}图片</h3>
        <button class="story-media-modal-close" type="button" aria-label="关闭">×</button>
      </div>
      <div class="story-media-modal-preview">
        <img src="${escapeAttribute(originalPreviewSrc)}" alt="${escapeAttribute(originalPreviewAlt)}" data-story-media-preview-img>
        <div class="story-media-modal-placeholder" data-story-media-placeholder hidden>
          <span class="story-media-placeholder-icon">&#x1F4F7;</span>
          <span class="story-media-placeholder-text">暂无图片 / 请上传图片</span>
        </div>
        <button type="button" class="story-media-delete-btn" data-story-media-delete aria-label="删除图片">删除</button>
      </div>
      <div class="story-media-upload-dropzone" tabindex="0" role="region" aria-label="上传图片，支持拖放、点击按钮或粘贴">
        <input type="file" accept="image/png,image/jpeg,image/webp" data-story-media-file hidden>
        <div class="story-media-dropzone-content">
          <span class="story-media-dropzone-icon">&#x1F4F7;</span>
          <p class="story-media-dropzone-hint">拖放图片到此处</p>
          <button type="button" class="story-media-picker-btn" data-story-media-picker>选择本地图片</button>
          <p class="story-media-dropzone-sub">支持 PNG、JPG、WebP，最大 1 MiB，尺寸不超过 800×800</p>
          <p class="story-media-dropzone-paste">也可直接粘贴截图（Ctrl+V）</p>
        </div>
        <div class="story-media-dropzone-status" aria-live="polite"></div>
      </div>
      <label class="story-media-upload-field">
        <span>图片来源</span>
        <input type="text" data-story-media-source value="${escapeAttribute(attribution.replace(/^图片来源[:：]\s*/, ''))}" maxlength="120">
      </label>
      <div class="story-media-modal-error" role="alert" aria-live="polite"></div>
      <div class="story-media-modal-actions">
        <button type="button" class="hud-action-btn" data-story-media-cancel>取消</button>
        <button type="button" class="hud-action-btn hud-action-btn-primary" data-story-media-save>保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  bindStoryMediaModal(modal, triggerCard, { element, side, label, originalPreviewSrc, originalPreviewAlt });
  modal.querySelector('[data-story-media-source]')?.focus();
}

function bindStoryMediaModal(modal, triggerCard, context) {
  const { element, side, label, originalPreviewSrc, originalPreviewAlt } = context;
  const errorEl = modal.querySelector('.story-media-modal-error');

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.setAttribute('data-error-text', message);
    }
  }

  function hideError() {
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  function closeModal() {
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
    }
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    triggerCard?.focus();
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  modal.querySelector('.story-media-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('[data-story-media-cancel]')?.addEventListener('click', closeModal);

  let pendingFile = null;
  let currentPreviewUrl = null;

  const fileInput = modal.querySelector('[data-story-media-file]');
  const previewImg = modal.querySelector('[data-story-media-preview-img]');
  const placeholderEl = modal.querySelector('[data-story-media-placeholder]');
  const deleteBtn = modal.querySelector('[data-story-media-delete]');
  const dropzone = modal.querySelector('.story-media-upload-dropzone');
  const dropzoneStatus = modal.querySelector('.story-media-dropzone-status');

  function showPlaceholder() {
    if (previewImg) {
      previewImg.hidden = true;
    }
    if (placeholderEl) {
      placeholderEl.hidden = false;
    }
    if (deleteBtn) {
      deleteBtn.hidden = true;
    }
  }

  function showPreviewImage() {
    if (previewImg) {
      previewImg.hidden = false;
    }
    if (placeholderEl) {
      placeholderEl.hidden = true;
    }
    if (deleteBtn) {
      deleteBtn.hidden = false;
    }
  }

  function clearSelectedImage() {
    pendingFile = null;
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
    }
    if (fileInput) {
      fileInput.value = '';
    }
    if (previewImg) {
      previewImg.src = '';
      previewImg.alt = '';
    }
    showPlaceholder();
    updateDropzoneStatus('');
    hideError();
  }

  // Initial state: if the modal opened with an empty image source, hide the delete button
  if (previewImg && !previewImg.getAttribute('src')) {
    showPlaceholder();
  }

  modal.querySelector('[data-story-media-delete]')?.addEventListener('click', clearSelectedImage);

  async function handleSelectedFile(file) {
    hideError();
    if (!file) {
      pendingFile = null;
      updateDropzoneStatus('');
      return;
    }
    const validation = await validateStoryMediaFile(file);
    if (!validation.ok) {
      showError(validation.message);
      pendingFile = null;
      updateDropzoneStatus('');
      return;
    }
    pendingFile = file;
    updateDropzoneStatus(`已选择：${file.name}`);
    try {
      const objectUrl = URL.createObjectURL(file);
      if (previewImg) {
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }
        previewImg.src = objectUrl;
        currentPreviewUrl = objectUrl;
      }
      showPreviewImage();
    } catch (error) {
      showError(error?.message || '图片预览失败，请换一张图片再试。');
      pendingFile = null;
      updateDropzoneStatus('');
    }
  }

  function updateDropzoneStatus(text) {
    if (dropzoneStatus) {
      dropzoneStatus.textContent = text;
    }
  }

  fileInput?.addEventListener('change', () => {
    handleSelectedFile(fileInput.files?.[0] || null);
  });

  const pickerBtn = modal.querySelector('[data-story-media-picker]');

  function openFilePicker() {
    fileInput?.click();
  }

  if (pickerBtn) {
    pickerBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openFilePicker();
    });
  }

  // Dropzone interactions
  if (dropzone) {
    dropzone.addEventListener('click', (event) => {
      if (event.target === pickerBtn) return;
      openFilePicker();
    });

    dropzone.addEventListener('keydown', (event) => {
      if (event.target === pickerBtn) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFilePicker();
      }
    });

    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = event.dataTransfer?.files?.[0] || null;
      handleSelectedFile(file);
    });
  }

  // Paste support on the modal
  modal.addEventListener('paste', (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && STORY_MEDIA_UPLOAD_TYPES.has(item.type)) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleSelectedFile(file);
        }
        break;
      }
    }
  });

  modal.querySelector('[data-story-media-save]')?.addEventListener('click', async () => {
    hideError();
    const sourceInput = modal.querySelector('[data-story-media-source]');
    const source = (sourceInput?.value || '').trim();

    if (!source) {
      showError('请填写图片来源。');
      return;
    }

    const file = pendingFile || fileInput?.files?.[0] || null;
    if (!file) {
      showError('请选择一张图片。');
      return;
    }

    const validation = await validateStoryMediaFile(file);
    if (!validation.ok) {
      showError(validation.message);
      return;
    }

    try {
      const result = await uploadStoryMediaFile({
        atomicNumber: element.atomicNumber,
        side,
        source,
        file
      });
      if (!result.ok) {
        showError(result.error || '上传失败，请稍后重试。');
        return;
      }
      const runtimeKey = `${element.atomicNumber}-${side}`;
      const cacheBustSrc = `${result.src}?v=${Date.now()}`;
      storyMediaRuntimeUpdates.set(runtimeKey, {
        src: cacheBustSrc,
        source: result.source,
        altZh: result.altZh
      });
      updateStoryMediaCard(triggerCard, { src: cacheBustSrc, source: result.source, altZh: result.altZh });
      closeModal();
    } catch (error) {
      showError(error?.message || '上传失败，请稍后重试。');
    }
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    }
  });
}

function updateStoryMediaCard(card, media) {
  if (!card) return;
  const img = card.querySelector('img');
  if (img) {
    img.src = media.src || img.src;
    img.alt = media.altZh || img.alt;
  }
  const sourceEl = card.querySelector('.story-media-source-value');
  if (sourceEl) {
    sourceEl.textContent = media.source || '未标注';
  }
}

function validateStoryMediaFile(file) {
  if (!file) {
    return Promise.resolve({ ok: false, message: '请选择一张图片。' });
  }
  if (!STORY_MEDIA_UPLOAD_TYPES.has(file.type)) {
    return Promise.resolve({ ok: false, message: '请上传 PNG、JPG 或 WebP 图片。' });
  }
  if (file.size > STORY_MEDIA_MAX_BYTES) {
    return Promise.resolve({ ok: false, message: '图片不能超过 1 MiB。' });
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.naturalWidth > STORY_MEDIA_MAX_DIMENSION || image.naturalHeight > STORY_MEDIA_MAX_DIMENSION) {
        resolve({ ok: false, message: '图片宽高不能超过 800 × 800 像素。' });
        return;
      }
      resolve({ ok: true });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ ok: false, message: '图片读取失败，请换一张图片再试。' });
    };
    image.src = objectUrl;
  });
}

async function uploadStoryMediaFile({ atomicNumber, side, source, file }) {
  const formData = new FormData();
  formData.append('atomicNumber', String(atomicNumber));
  formData.append('side', side);
  formData.append('source', source);
  formData.append('image', file);

  const response = await fetch('/api/story-media/upload', {
    method: 'POST',
    body: formData
  });

  if (response.status === 404) {
    throw new Error('当前部署未启用图片管理上传接口。');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `上传失败（${response.status}）。`);
  }

  return data;
}
