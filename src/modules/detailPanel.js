/** ===== 详情面板 ===== */
import { createElectronModel } from '../three/electronModel.js';
import {
  addComparedElement,
  collectElement,
  getCollectedElements,
  getCompareList,
  getSelectedElement
} from './storage.js';
import { showToast } from './compare.js';
import { navigateTo } from './router.js';

const CATEGORY_LABELS = {
  'alkali metal': '碱金属',
  'alkaline earth metal': '碱土金属',
  'transition metal': '过渡金属',
  'post-transition metal': '后过渡金属',
  metalloid: '类金属',
  'reactive nonmetal': '非金属',
  'noble gas': '稀有气体',
  halogen: '卤素',
  lanthanide: '镧系',
  actinide: '锕系'
};

const SAFETY_LABELS = {
  safe: '安全',
  caution: '注意',
  dangerous: '危险',
  radioactive: '放射性',
  'extremely dangerous': '极度危险'
};

let currentElectronModel = null;
let currentSpectrumController = null;

function getPerformanceMode() {
  return window.appState?.settings?.performanceMode || 'normal';
}

export function initDetailPanel() {
  bindCollectButton();
  bindCompareButton();
  bindStoryButton();
  bindQuizButton();
  bindLabButton();
  bindPanelEvents();
}

function bindCollectButton() {
  const collectBtn = document.getElementById('btn-collect');
  if (!collectBtn) {
    return;
  }

  collectBtn.addEventListener('click', () => {
    const element = getSelectedElement();
    if (!element) {
      return;
    }

    const didCollect = collectElement(element.atomicNumber);
    updateCollectButton(element.atomicNumber);

    if (!didCollect) {
      collectBtn.classList.remove('button-bump');
      void collectBtn.offsetWidth;
      collectBtn.classList.add('button-bump');
    }
  });
}

function bindCompareButton() {
  const compareBtn = document.getElementById('btn-compare-add');
  if (!compareBtn) {
    return;
  }

  compareBtn.addEventListener('click', () => {
    const element = getSelectedElement();
    if (!element) {
      return;
    }

    const previousLength = getCompareList().length;
    addComparedElement(element.atomicNumber);
    const currentLength = getCompareList().length;

    updateCompareButton(element.atomicNumber);

    if (currentLength > previousLength) {
      showToast(`已将 ${element.chineseName} 加入对比`, 'success');
    } else if (currentLength >= 3) {
      showToast('对比列表已满（最多 3 个）', 'error');
    }
  });
}

function bindStoryButton() {
  const storyBtn = document.getElementById('btn-story');
  if (!storyBtn) {
    return;
  }

  storyBtn.addEventListener('click', () => {
    const element = getSelectedElement();
    if (!element) {
      return;
    }

    window.dispatchEvent(new CustomEvent('storyrequested', {
      detail: { element }
    }));

    navigateTo('story');
  });
}

function bindQuizButton() {
  const quizBtn = document.getElementById('btn-quiz');
  if (!quizBtn) {
    return;
  }

  quizBtn.addEventListener('click', () => {
    const element = getSelectedElement();
    if (!element) {
      return;
    }

    window.dispatchEvent(new CustomEvent('startquiz', {
      detail: { element }
    }));
  });
}

function bindLabButton() {
  const labBtn = document.getElementById('btn-lab');
  if (!labBtn) {
    return;
  }

  labBtn.addEventListener('click', () => {
    const element = getSelectedElement();
    if (!element) {
      return;
    }

    window.dispatchEvent(new CustomEvent('labfocusrequest', {
      detail: { element }
    }));

    navigateTo('lab');
    window.requestAnimationFrame(() => {
      highlightRelatedExperiments(element);
    });
  });
}

function bindPanelEvents() {
  window.addEventListener('elementselected', (event) => {
    updateElectronModel(event.detail.element, { animated: true });
    updateSpectrum(event.detail.element);
    updateCollectButton(event.detail.element.atomicNumber);
    updateCompareButton(event.detail.element.atomicNumber);
  });

  window.addEventListener('elementcollected', (event) => {
    const selectedElement = getSelectedElement();
    if (selectedElement?.atomicNumber === event.detail.atomicNumber) {
      updateCollectButton(event.detail.atomicNumber);
    }
  });

  window.addEventListener('compareupdated', () => {
    const selectedElement = getSelectedElement();
    updateCompareButton(selectedElement?.atomicNumber ?? null);
  });

  window.addEventListener('performancemodechange', () => {
    const selectedElement = getSelectedElement();
    if (!selectedElement) {
      return;
    }

    updateElectronModel(selectedElement, { animated: false });
    updateSpectrum(selectedElement);
  });

  window.addEventListener('resize', () => {
    currentElectronModel?.resize?.();
    currentSpectrumController?.resize?.();
  });

  window.addEventListener('statereset', () => {
    updateCollectButton(null);
    updateCompareButton(null);
  });
}

function updateCollectButton(atomicNumber) {
  const collectBtn = document.getElementById('btn-collect');
  if (!collectBtn) {
    return;
  }

  const isCollected = atomicNumber !== null && getCollectedElements().has(atomicNumber);
  collectBtn.style.color = isCollected ? '#ffd43b' : '';
  collectBtn.textContent = isCollected ? '★' : '☆';
  collectBtn.title = isCollected ? '已自动收集' : '加入收藏';
  collectBtn.classList.toggle('is-active', isCollected);
}

function updateCompareButton(atomicNumber) {
  const compareBtn = document.getElementById('btn-compare-add');
  if (!compareBtn) {
    return;
  }

  const compareList = getCompareList();
  const isInCompare = atomicNumber !== null && compareList.some((item) => item.atomicNumber === atomicNumber);
  const isFull = compareList.length >= 3;
  const isDisabled = atomicNumber === null || isInCompare || isFull;

  compareBtn.disabled = isDisabled;
  compareBtn.classList.toggle('is-active', isInCompare);
  compareBtn.textContent = isInCompare ? '✓' : '+';
  compareBtn.title = isInCompare
    ? '已加入对比'
    : isFull
      ? '对比列表已满（最多 3 个）'
      : '加入对比';
}

function updateElectronModel(element, options = {}) {
  const container = document.getElementById('electron-canvas');
  if (!container) {
    return;
  }

  container.classList.toggle('is-transitioning', Boolean(options.animated));

  currentElectronModel?.dispose?.();
  currentElectronModel = null;
  container.innerHTML = '';

  currentElectronModel = createElectronModel(container, element.electronConfiguration, {
    performanceMode: getPerformanceMode(),
    accentColor: element.color,
    animatedEntrance: Boolean(options.animated)
  });

  window.setTimeout(() => {
    container.classList.remove('is-transitioning');
  }, 320);
}

function updateSpectrum(element) {
  const container = document.getElementById('spectrum-canvas');
  if (!container) {
    return;
  }

  currentSpectrumController?.dispose?.();
  currentSpectrumController = createSpectrumController(container, element, getPerformanceMode());
}

function createSpectrumController(container, element, performanceMode) {
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const lineProfile = buildSpectrumProfile(element, performanceMode);
  const shouldAnimate = true;
  const pulseAmplitude = performanceMode === 'normal' ? 0.05 : 0.12;
  const flickerSpeed = performanceMode === 'normal' ? 1.15 : 2.1;
  let frameId = null;
  let disposed = false;
  let time = 0;

  function resize() {
    const width = container.clientWidth || 340;
    const height = container.clientHeight || 120;
    canvas.width = width;
    canvas.height = height;
    draw(0);
  }

  function draw(tick) {
    if (!ctx) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const accent = element.color || '#38bdf8';
    const pulse = 1 + Math.sin(tick * flickerSpeed) * pulseAmplitude;

    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, 'rgba(2, 6, 23, 0.92)');
    background.addColorStop(1, 'rgba(15, 23, 42, 0.72)');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const spectrumGradient = ctx.createLinearGradient(24, 0, width - 24, 0);
    spectrumGradient.addColorStop(0, '#6d28d9');
    spectrumGradient.addColorStop(0.18, '#2563eb');
    spectrumGradient.addColorStop(0.38, '#06b6d4');
    spectrumGradient.addColorStop(0.56, '#22c55e');
    spectrumGradient.addColorStop(0.75, '#f59e0b');
    spectrumGradient.addColorStop(1, '#ef4444');
    ctx.fillStyle = spectrumGradient;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(24, height - 28, width - 48, 8);
    ctx.globalAlpha = 1;

    drawScale(ctx, width, height);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px "Noto Sans SC", sans-serif';
    ctx.fillText(`${element.chineseName} 发射光谱`, 16, 20);
    ctx.font = '10px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${CATEGORY_LABELS[element.category] || element.category} · ${SAFETY_LABELS[element.safety] || element.safety}`, 16, 36);

    lineProfile.forEach((line, index) => {
      const x = wavelengthToX(line.wavelength, width);
      const flicker = 0.82 + Math.sin(tick * (line.speed + index * 0.08) + line.phase) * 0.18;
      const intensity = line.intensity * pulse * flicker;
      const top = 44 + (index % 2) * 4;
      const bottom = height - 36 - (index % 3) * 2;

      ctx.save();
      ctx.strokeStyle = line.color;
      ctx.shadowColor = line.color;
      ctx.shadowBlur = performanceMode === 'normal' ? 10 : 18;
      ctx.globalAlpha = Math.min(1, intensity);
      ctx.lineWidth = line.width;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.font = '9px "Noto Sans SC", sans-serif';
      ctx.fillText(`${line.wavelength}nm`, Math.max(8, x - 14), bottom + 14);
      ctx.restore();
    });
  }

  function animate() {
    if (disposed) {
      return;
    }

    time += performanceMode === 'normal' ? 0.012 : 0.02;
    draw(time);
    if (shouldAnimate) {
      frameId = window.requestAnimationFrame(animate);
    }
  }

  resize();
  animate();

  return {
    resize,
    dispose() {
      disposed = true;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    }
  };
}

function drawScale(ctx, width, height) {
  const ticks = [400, 450, 500, 550, 600, 650, 700];
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Noto Sans SC", sans-serif';

  ticks.forEach((tick) => {
    const x = wavelengthToX(tick, width);
    ctx.beginPath();
    ctx.moveTo(x, height - 32);
    ctx.lineTo(x, height - 18);
    ctx.stroke();
    ctx.fillText(`${tick}`, x - 10, height - 6);
  });
}

function wavelengthToX(wavelength, width) {
  const start = 24;
  const end = width - 24;
  return start + ((wavelength - 400) / 300) * (end - start);
}

function buildSpectrumProfile(element, performanceMode) {
  const baseCount = performanceMode === 'normal' ? 4 : 7;
  const normalizedConfig = normalizeElectronConfig(element.electronConfiguration);
  const shellMatches = Array.from(normalizedConfig.matchAll(/(\d)[spdf](\d+)/g));
  const accent = element.color || '#38bdf8';

  const lines = shellMatches.slice(0, baseCount).map((match, index) => {
    const shell = Number(match[1]);
    const electrons = Number(match[2]);
    const wavelength = 410 + ((element.atomicNumber * 17 + shell * 37 + electrons * 11 + index * 23) % 270);
    return {
      wavelength,
      width: performanceMode === 'normal' ? 1.8 : 2.4 + (electrons % 2) * 0.4,
      intensity: 0.48 + ((electrons + shell) % 5) * 0.1,
      color: blendColor(accent, getSpectrumBandColor(wavelength), 0.58),
      speed: 0.8 + shell * 0.2,
      phase: index * 0.7 + element.atomicNumber * 0.05
    };
  });

  while (lines.length < baseCount) {
    const index = lines.length;
    const wavelength = 420 + ((element.atomicNumber * 29 + index * 41) % 250);
    lines.push({
      wavelength,
      width: performanceMode === 'normal' ? 1.8 : 2.2,
      intensity: 0.5 + (index % 3) * 0.12,
      color: blendColor(accent, getSpectrumBandColor(wavelength), 0.52),
      speed: 1 + index * 0.14,
      phase: index * 0.9
    });
  }

  return lines.sort((a, b) => a.wavelength - b.wavelength);
}

function getSpectrumBandColor(wavelength) {
  if (wavelength < 450) return '#7c3aed';
  if (wavelength < 495) return '#2563eb';
  if (wavelength < 570) return '#22c55e';
  if (wavelength < 590) return '#eab308';
  if (wavelength < 620) return '#f97316';
  return '#ef4444';
}

function normalizeElectronConfig(config = '') {
  return config
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, (digit) => ({
      '⁰': '0',
      '¹': '1',
      '²': '2',
      '³': '3',
      '⁴': '4',
      '⁵': '5',
      '⁶': '6',
      '⁷': '7',
      '⁸': '8',
      '⁹': '9'
    }[digit] || digit))
    .replace(/\s+/g, ' ')
    .trim();
}

function blendColor(primary, secondary, ratio) {
  const start = hexToRgb(primary);
  const end = hexToRgb(secondary);
  if (!start || !end) {
    return secondary;
  }

  const mix = (from, to) => Math.round(from + (to - from) * ratio);
  return `rgb(${mix(start.r, end.r)}, ${mix(start.g, end.g)}, ${mix(start.b, end.b)})`;
}

function hexToRgb(color) {
  const value = color?.replace('#', '');
  if (!value || ![3, 6].includes(value.length)) {
    return null;
  }

  const normalized = value.length === 3
    ? value.split('').map((char) => `${char}${char}`).join('')
    : value;

  const number = Number.parseInt(normalized, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255
  };
}
