# Story Media Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser-local story media overrides so each element story image card can be opened, previewed, replaced with a validated local image, attributed, saved, and restored on reload.

**Architecture:** Extend `src/modules/storage.js` with a focused `storyMediaOverrides` state slice keyed by atomic number and side. Update `src/modules/storyMode.js` to merge canonical story media from `storyMediaByAtomicNumber` with local overrides, then add accessible modal editing behavior. Add CSS for clipped, left-top aligned image display and tests for storage helpers plus browser UI behavior.

**Tech Stack:** Vite, vanilla JavaScript ES modules, localStorage through existing storage adapter, Playwright, Node validation scripts, existing CSS modules.

---

## Files to create or modify

* Modify: `src/modules/storage.js`, add `storyMediaOverrides`, normalization, serialization, migration support, and exported get, set, clear APIs.
* Modify: `src/modules/storyMode.js`, merge overrides into story media cards, accept safe data URLs, bind double-click and keyboard activation, render and manage the modal.
* Modify: `src/styles/story.css` or the existing story-mode stylesheet that contains `.story-media-grid`, `.story-media-card`, and `.story-media-frame`, add modal and image clipping styles.
* Create or modify: `tests/storage/story-media-overrides.spec.js` or the existing storage test location, cover persistence helpers and migration.
* Create or modify: `tests/content/story-media-upload.spec.js` or the existing story mode Playwright test location, cover modal and upload flows.
* Do not modify: `src/data/storyMedia/*`, `src/data/index.js`, package dependencies, binary assets, backend code.

## Implementation constraints

* Runtime persistence only. Save overrides under `element-explorer-kids-state` with the existing schema envelope.
* Keep `SCHEMA_VERSION = 'v2'` unless a broader storage migration policy requires a version change.
* Accept only `discovery` and `specimen` side values.
* Accept uploads only after MIME, byte size, decoded width, and decoded height validation pass.
* Read files as data URLs only after validation passes.
* Do not change canonical `storyMediaByAtomicNumber` records.
* Use Chinese UI copy for labels and errors.
* No new npm dependency.
* Do not commit unless a human explicitly asks for a commit.

### Task 1: Add storage tests for story media overrides

**Files:**
* Create or modify: `tests/storage/story-media-overrides.spec.js`
* Modify later: `src/modules/storage.js`

- [ ] **Step 1: Find the existing test convention**

Run:

```bash
Get-ChildItem -Recurse -File tests
```

Expected: identify whether tests are JavaScript, TypeScript, Playwright-only, or Node-based. Place the new storage tests next to the closest existing storage or module tests. If no storage test folder exists, create `tests/storage/story-media-overrides.spec.js` and use the repo's existing test runner pattern.

- [ ] **Step 2: Write failing tests for default, set, get, clear, and migration**

Use this test behavior exactly, adapting only imports and setup to the repo's existing test runner:

```js
import {
  initializeState,
  getStateSnapshot,
  getStoryMediaOverride,
  getStoryMediaOverrides,
  setStoryMediaOverride,
  clearStoryMediaOverride,
  migratePersistedEnvelope
} from '../../src/modules/storage.js';

const elements = [
  { atomicNumber: 29, symbol: 'Cu', chineseName: '铜' }
];

function createOverride(source = '本机上传：显微镜照片') {
  return {
    src: 'data:image/png;base64,iVBORw0KGgo=',
    source,
    altZh: '铜发现故事图片',
    updatedAt: '2026-05-18T00:00:00.000Z'
  };
}

describe('story media overrides', () => {
  beforeEach(() => {
    initializeState(elements);
  });

  it('starts with no story media overrides', () => {
    expect(getStoryMediaOverrides()).toEqual({});
    expect(getStoryMediaOverride(29, 'discovery')).toBeNull();
    expect(getStateSnapshot().storyMediaOverrides).toEqual({});
  });

  it('stores a discovery override by atomic number and side', () => {
    const saved = setStoryMediaOverride(29, 'discovery', createOverride());

    expect(saved).toEqual(createOverride());
    expect(getStoryMediaOverride(29, 'discovery')).toEqual(createOverride());
    expect(getStoryMediaOverrides()).toEqual({
      29: {
        discovery: createOverride()
      }
    });
  });

  it('clears only the requested side', () => {
    const discovery = createOverride('发现图片来源');
    const specimen = createOverride('样品图片来源');
    setStoryMediaOverride(29, 'discovery', discovery);
    setStoryMediaOverride(29, 'specimen', specimen);

    clearStoryMediaOverride(29, 'discovery');

    expect(getStoryMediaOverride(29, 'discovery')).toBeNull();
    expect(getStoryMediaOverride(29, 'specimen')).toEqual(specimen);
  });

  it('drops invalid sides and unsafe src values during migration', () => {
    const migrated = migratePersistedEnvelope({
      version: 'v2',
      data: {
        storyMediaOverrides: {
          29: {
            discovery: createOverride(),
            hero: createOverride('非法 side'),
            specimen: {
              src: 'https://example.com/image.png',
              source: '远程图片',
              altZh: '铜样品图片',
              updatedAt: '2026-05-18T00:00:00.000Z'
            }
          }
        }
      }
    });

    expect(migrated.storyMediaOverrides).toEqual({
      29: {
        discovery: createOverride()
      }
    });
  });
});
```

- [ ] **Step 3: Run the focused storage test and confirm it fails**

Run the repo's focused test command for this file. If the repo has no storage test command, add the least invasive Node or Playwright-compatible test command used by existing tests.

Expected: fail because `getStoryMediaOverride`, `getStoryMediaOverrides`, `setStoryMediaOverride`, and `clearStoryMediaOverride` are not exported yet.

### Task 2: Implement storage override APIs

**Files:**
* Modify: `src/modules/storage.js`
* Test: `tests/storage/story-media-overrides.spec.js`

- [ ] **Step 1: Add constants and defaults**

Add near existing constants:

```js
const STORY_MEDIA_OVERRIDE_SIDES = new Set(['discovery', 'specimen']);
const STORY_MEDIA_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,/i;
```

Add to `createDefaultState()`:

```js
storyMediaOverrides: {},
```

- [ ] **Step 2: Add normalizers**

Add helpers near other normalizers:

```js
function normalizeStoryMediaSide(side) {
  return STORY_MEDIA_OVERRIDE_SIDES.has(side) ? side : null;
}

function normalizeStoryMediaOverride(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const src = typeof value.src === 'string' ? value.src.trim() : '';
  const source = typeof value.source === 'string' ? value.source.trim() : '';
  const altZh = typeof value.altZh === 'string' ? value.altZh.trim() : '';
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt.trim() : '';

  if (!STORY_MEDIA_DATA_URL_PATTERN.test(src) || !source) {
    return null;
  }

  return {
    src,
    source,
    altZh,
    updatedAt: updatedAt || new Date().toISOString()
  };
}

function normalizeStoryMediaOverrides(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [atomicNumberKey, sideMap]) => {
    const atomicNumber = sanitizeAtomicNumber(atomicNumberKey);
    if (atomicNumber === null || !isPlainObject(sideMap)) {
      return accumulator;
    }

    const normalizedSideMap = Object.entries(sideMap).reduce((sideAccumulator, [side, override]) => {
      const normalizedSide = normalizeStoryMediaSide(side);
      const normalizedOverride = normalizeStoryMediaOverride(override);
      if (normalizedSide && normalizedOverride) {
        sideAccumulator[normalizedSide] = normalizedOverride;
      }
      return sideAccumulator;
    }, {});

    if (Object.keys(normalizedSideMap).length > 0) {
      accumulator[String(atomicNumber)] = normalizedSideMap;
    }

    return accumulator;
  }, {});
}
```

- [ ] **Step 3: Serialize and migrate the field**

Add `storyMediaOverrides` to `serializeState()`:

```js
storyMediaOverrides: cloneValue(appState.storyMediaOverrides),
```

Add to `migrateV0ToV1(data)` return object:

```js
storyMediaOverrides: normalizeStoryMediaOverrides(data.storyMediaOverrides),
```

Add to `normalizePersistedData(data)` normalized state:

```js
storyMediaOverrides: normalizeStoryMediaOverrides(data.storyMediaOverrides),
```

Add to `getStateSnapshot()`:

```js
storyMediaOverrides: cloneValue(appState.storyMediaOverrides),
```

- [ ] **Step 4: Export mutation APIs**

Add after experiment title override APIs or near other state APIs:

```js
export function getStoryMediaOverrides() {
  return cloneValue(appState.storyMediaOverrides);
}

export function getStoryMediaOverride(atomicNumber, side) {
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  const normalizedSide = normalizeStoryMediaSide(side);
  if (normalizedAtomicNumber === null || !normalizedSide) {
    return null;
  }

  return cloneValue(appState.storyMediaOverrides[String(normalizedAtomicNumber)]?.[normalizedSide] ?? null);
}

export function setStoryMediaOverride(atomicNumber, side, override) {
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  const normalizedSide = normalizeStoryMediaSide(side);
  const normalizedOverride = normalizeStoryMediaOverride(override);
  if (normalizedAtomicNumber === null || !normalizedSide || !normalizedOverride) {
    return null;
  }

  const oldValue = cloneValue(appState.storyMediaOverrides);
  const atomicNumberKey = String(normalizedAtomicNumber);
  appState.storyMediaOverrides = {
    ...appState.storyMediaOverrides,
    [atomicNumberKey]: {
      ...(appState.storyMediaOverrides[atomicNumberKey] || {}),
      [normalizedSide]: normalizedOverride
    }
  };

  emitStateChange('storyMediaOverrides', oldValue, appState.storyMediaOverrides, 'storymediaoverridechange', {
    atomicNumber: normalizedAtomicNumber,
    side: normalizedSide
  });
  return cloneValue(normalizedOverride);
}

export function clearStoryMediaOverride(atomicNumber, side) {
  const normalizedAtomicNumber = sanitizeAtomicNumber(atomicNumber);
  const normalizedSide = normalizeStoryMediaSide(side);
  if (normalizedAtomicNumber === null || !normalizedSide) {
    return null;
  }

  const atomicNumberKey = String(normalizedAtomicNumber);
  const currentSideMap = appState.storyMediaOverrides[atomicNumberKey];
  if (!currentSideMap?.[normalizedSide]) {
    return null;
  }

  const oldValue = cloneValue(appState.storyMediaOverrides);
  const nextSideMap = { ...currentSideMap };
  delete nextSideMap[normalizedSide];

  appState.storyMediaOverrides = { ...appState.storyMediaOverrides };
  if (Object.keys(nextSideMap).length === 0) {
    delete appState.storyMediaOverrides[atomicNumberKey];
  } else {
    appState.storyMediaOverrides[atomicNumberKey] = nextSideMap;
  }

  emitStateChange('storyMediaOverrides', oldValue, appState.storyMediaOverrides, 'storymediaoverridechange', {
    atomicNumber: normalizedAtomicNumber,
    side: normalizedSide,
    cleared: true
  });
  return null;
}
```

- [ ] **Step 5: Run focused storage tests**

Run the focused storage test command from Task 1.

Expected: all storage override tests pass.

### Task 3: Add story UI tests for modal and upload validation

**Files:**
* Create or modify: `tests/content/story-media-upload.spec.js`
* Modify later: `src/modules/storyMode.js`
* Modify later: story CSS file found in Task 5

- [ ] **Step 1: Write Playwright tests for interaction behavior**

Create a test that does this:

```js
import { test, expect } from '@playwright/test';

test('story media card opens an upload modal and saves a local image override', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.getByText('铜').first().click();
  await page.getByRole('button', { name: /故事|Story/i }).click();

  const discoveryCard = page.locator('.story-media-card-discovery').first();
  await discoveryCard.dblclick();

  const modal = page.getByRole('dialog', { name: /编辑发现故事图片/ });
  await expect(modal).toBeVisible();
  await expect(modal.locator('img')).toBeVisible();
  await modal.getByLabel(/图片来源/).fill('本机上传：铜发现照片');

  await modal.getByLabel(/选择图片/).setInputFiles({
    name: 'copper.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lXwU9wAAAABJRU5ErkJggg==',
      'base64'
    )
  });

  await modal.getByRole('button', { name: '保存' }).click();

  await expect(modal).toBeHidden();
  await expect(discoveryCard.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(discoveryCard).toContainText('本机上传：铜发现照片');

  await page.reload();
  await page.getByRole('button', { name: /故事|Story/i }).click();
  await expect(page.locator('.story-media-card-discovery').first().locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
});
```

Adjust navigation selectors only to match existing tests. Keep the user-observable expectations unchanged.

- [ ] **Step 2: Write validation tests**

Add Playwright coverage for these cases:

```js
test('story media upload rejects oversized files and missing source', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.getByText('铜').first().click();
  await page.getByRole('button', { name: /故事|Story/i }).click();
  await page.locator('.story-media-card-specimen').first().dblclick();

  const modal = page.getByRole('dialog', { name: /编辑元素样品图片/ });
  await modal.getByRole('button', { name: '保存' }).click();
  await expect(modal.getByText('请填写图片来源。')).toBeVisible();

  await modal.getByLabel(/图片来源/).fill('本机上传：过大图片');
  await modal.getByLabel(/选择图片/).setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(1024 * 1024 + 1)
  });
  await expect(modal.getByText('图片不能超过 1 MiB。')).toBeVisible();
});
```

- [ ] **Step 3: Run the focused Playwright test and confirm it fails**

Run:

```bash
npx playwright test tests/content/story-media-upload.spec.js
```

Expected: fail because the modal behavior and upload inputs do not exist yet.

### Task 4: Implement story media modal behavior

**Files:**
* Modify: `src/modules/storyMode.js`
* Test: `tests/content/story-media-upload.spec.js`

- [ ] **Step 1: Import storage APIs**

Change the storage import to include overrides:

```js
import {
  clearStoryMediaOverride,
  getSelectedElement,
  getStoryMediaOverride,
  setStoryMediaOverride
} from './storage.js';
```

- [ ] **Step 2: Add upload constants**

Add near existing patterns:

```js
const STORY_MEDIA_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,/i;
const STORY_MEDIA_UPLOAD_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const STORY_MEDIA_MAX_BYTES = 1024 * 1024;
const STORY_MEDIA_MAX_DIMENSION = 800;
```

- [ ] **Step 3: Merge canonical media with overrides**

Change `renderStoryMediaGrid(storyMediaRecord)` to accept the element:

```js
${renderStoryMediaGrid(storyMediaRecord, element)}
```

Implement:

```js
function renderStoryMediaGrid(storyMedia, element) {
  if (!storyMedia || !element) {
    return '';
  }

  const cards = [
    renderStoryMediaCard(getEffectiveStoryMedia(element, storyMedia.discoveryMedia, 'discovery'), '发现故事', 'discovery', element),
    renderStoryMediaCard(getEffectiveStoryMedia(element, storyMedia.specimenMedia, '元素样品', 'specimen'), '元素样品', 'specimen', element)
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
  const override = getStoryMediaOverride(element.atomicNumber, side);
  if (!canonicalMedia && !override) {
    return null;
  }

  return {
    ...(canonicalMedia || {}),
    ...(override || {}),
    side,
    atomicNumber: element.atomicNumber,
    hasOverride: Boolean(override)
  };
}
```

- [ ] **Step 4: Allow safe data URL rendering and add card activation attributes**

Replace `isLocalStoryMediaSrc()` use with `isSafeStoryMediaSrc()`:

```js
function renderStoryMediaCard(media, label, side, element) {
  if (!media || !isSafeStoryMediaSrc(media.src)) {
    return '';
  }

  const alt = sanitizePlainText(media.altZh, `${element?.chineseName || media.symbol || ''}${label}图片`);
  const source = sanitizePlainText(media.source, '图片来源：');

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
      <div class="story-media-attribution">${escapeHTML(source)}</div>
    </article>
  `;
}

function isSafeStoryMediaSrc(src) {
  return isLocalStoryMediaSrc(src) || (typeof src === 'string' && STORY_MEDIA_DATA_URL_PATTERN.test(src));
}
```

- [ ] **Step 5: Bind double-click and keyboard activation**

Add inside `bindStoryActions(container, neighbors)`:

```js
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
```

- [ ] **Step 6: Implement modal rendering and close behavior**

Add functions in `storyMode.js`:

```js
function openStoryMediaModal(triggerCard) {
  const element = getCurrentStoryElement();
  const side = triggerCard?.dataset.storyMediaSide;
  const label = triggerCard?.dataset.storyMediaLabel || '故事';
  if (!element || (side !== 'discovery' && side !== 'specimen')) {
    return;
  }

  const image = triggerCard.querySelector('img');
  const attribution = triggerCard.querySelector('.story-media-attribution')?.textContent || '';
  const existingOverride = getStoryMediaOverride(element.atomicNumber, side);
  const modal = document.createElement('div');
  modal.className = 'story-media-modal-backdrop';
  modal.innerHTML = `
    <div class="story-media-modal" role="dialog" aria-modal="true" aria-labelledby="story-media-modal-title">
      <button class="story-media-modal-close" type="button" aria-label="关闭">×</button>
      <h3 id="story-media-modal-title">编辑${escapeHTML(label)}图片</h3>
      <div class="story-media-modal-preview">
        <img src="${escapeAttribute(image?.getAttribute('src') || '')}" alt="${escapeAttribute(image?.getAttribute('alt') || '')}">
      </div>
      <label class="story-media-upload-field">
        <span>选择图片</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" data-story-media-file>
      </label>
      <label class="story-media-upload-field">
        <span>图片来源</span>
        <input type="text" data-story-media-source value="${escapeAttribute(attribution.replace(/^图片来源[:：]\s*/, ''))}" maxlength="120">
      </label>
      <p class="story-media-modal-error" role="alert" aria-live="polite" hidden></p>
      <div class="story-media-modal-actions">
        <button type="button" class="hud-action-btn" data-story-media-cancel>取消</button>
        <button type="button" class="hud-action-btn" data-story-media-clear ${existingOverride ? '' : 'disabled'}>清除本地图片</button>
        <button type="button" class="hud-action-btn hud-action-btn-primary" data-story-media-save>保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  bindStoryMediaModal(modal, triggerCard, { element, side, label });
  modal.querySelector('[data-story-media-source]')?.focus();
}
```

Implement `bindStoryMediaModal()` with Escape close, backdrop close, close button, cancel button, clear button, save button, and focus restoration to `triggerCard`.

- [ ] **Step 7: Implement validation and data URL reading**

Add helpers:

```js
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败，请换一张图片再试。'));
    reader.readAsDataURL(file);
  });
}
```

Save behavior must call `validateStoryMediaFile(file)` before `readFileAsDataUrl(file)`, require source text, then call `setStoryMediaOverride()` and `renderStoryShell()`.

- [ ] **Step 8: Run focused UI test**

Run:

```bash
npx playwright test tests/content/story-media-upload.spec.js
```

Expected: modal and upload tests pass.

### Task 5: Add CSS for modal and clipped media display

**Files:**
* Modify: `src/styles/story.css` or the existing story stylesheet found by searching `.story-media-frame`
* Test: `tests/content/story-media-upload.spec.js`

- [ ] **Step 1: Locate story media CSS**

Run:

```bash
rg "story-media-frame|story-media-card|story-media-grid" src/styles src
```

Expected: identify the stylesheet that already owns story media card styling.

- [ ] **Step 2: Add clipping and left-top alignment styles**

Add to the story media stylesheet:

```css
.story-media-frame,
.story-media-modal-preview {
  overflow: hidden;
}

.story-media-frame img,
.story-media-modal-preview img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: left top;
}

.story-media-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(3, 10, 24, 0.72);
  backdrop-filter: blur(10px);
}

.story-media-modal {
  width: min(920px, 96vw);
  max-height: 92vh;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  padding: 24px;
  background: rgba(8, 20, 40, 0.96);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
}

.story-media-modal-close {
  float: right;
}

.story-media-modal-preview {
  width: min(800px, 90vw);
  height: min(800px, 70vh);
  margin: 16px 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
}

.story-media-upload-field {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.story-media-modal-error {
  color: #ffb4b4;
}

.story-media-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}
```

- [ ] **Step 3: Run focused UI test again**

Run:

```bash
npx playwright test tests/content/story-media-upload.spec.js
```

Expected: tests pass and no visual overflow occurs in screenshots or trace.

### Task 6: Add final verification and manual check

**Files:**
* Check: `src/modules/storage.js`
* Check: `src/modules/storyMode.js`
* Check: story CSS file
* Check: new tests

- [ ] **Step 1: Run diagnostics on changed source files**

Run LSP diagnostics for:

```text
src/modules/storage.js
src/modules/storyMode.js
src/styles/story.css
tests/storage/story-media-overrides.spec.js
tests/content/story-media-upload.spec.js
```

Expected: zero errors in changed files.

- [ ] **Step 2: Run story media data validator**

Run:

```bash
npm run validate:story-media
```

Expected: exit code 0. Canonical story media remains valid.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npx playwright test tests/content/story-media-upload.spec.js
```

Expected: exit code 0.

Run the storage test command established in Task 1.

Expected: exit code 0.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: exit code 0.

- [ ] **Step 5: Browser manual check**

Run:

```bash
npm run dev
```

Manual steps:

1. Open the app in a browser.
2. Select 铜 Cu.
3. Open story mode.
4. Double-click the discovery image card.
5. Confirm the dialog opens, the large preview is visible, Escape closes it, and focus returns to the card.
6. Open it again, upload a PNG, JPG, or WebP image under 1 MiB and 800 × 800, fill `图片来源`, save.
7. Confirm the card updates immediately.
8. Reload the page and confirm the local image and source remain.
9. Repeat for the specimen card.
10. Upload a file over 1 MiB and confirm `图片不能超过 1 MiB。` appears.
11. Upload an image over 800 × 800 and confirm `图片宽高不能超过 800 × 800 像素。` appears.
12. Confirm card and modal image previews are scaled, aligned to the left top, and clipped without layout overflow.

Expected: all manual checks pass.

## Self-review checklist

* Requirement coverage: double-click, modal, preview, upload, source field, save, browser-local persistence, 1 MiB limit, 800 × 800 limit, scaled display, left-top alignment, overflow hidden, keyboard access, close behavior, focused tests, `npm run validate:story-media`, `npm run build`, browser manual check.
* Scope control: no backend, no cloud sync, no image editing, no new dependency, no canonical data edits.
* Type consistency: `storyMediaOverrides`, `discovery`, `specimen`, `getStoryMediaOverride`, `getStoryMediaOverrides`, `setStoryMediaOverride`, and `clearStoryMediaOverride` use the same names across tasks.
