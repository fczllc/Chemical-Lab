/** ===== 详情面板 ===== */
import { createElectronModel } from '../three/electronModel.js';
import {
  collectElement,
  getCollectedElements,
  getSelectedElement
} from './storage.js';
import { ELEMENT_CATEGORY_LABELS, SAFETY_LABELS } from '../data/contentMeta.js';
import { spectralLines } from '../data/index.js';
import { navigateTo } from './router.js';

let currentElectronModel = null;
let currentSpectrumController = null;

function getPerformanceMode() {
  return window.appState?.settings?.performanceMode || 'normal';
}

export function initDetailPanel() {
  bindStoryButton();
  bindQuizButton();
  bindLabButton();
  bindCollectButton();
  bindPanelEvents();
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
  });
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

function bindPanelEvents() {
  window.addEventListener('elementselected', (event) => {
    updateElectronModel(event.detail.element, { animated: true });
    updateCollectButton(event.detail.element.atomicNumber);
    updateSpectrum(event.detail.element);
  });

  window.addEventListener('elementcollected', (event) => {
    const selectedElement = getSelectedElement();
    if (selectedElement?.atomicNumber === event.detail.atomicNumber) {
      updateCollectButton(event.detail.atomicNumber);
    }
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
  });
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
  const spectrumProfile = buildSpectrumProfile(element, performanceMode);
  canvas.dataset.spectrumSource = spectrumProfile.source;
  canvas.dataset.spectrumSymbol = element.symbol;
  canvas.dataset.spectrumRange = `${spectrumProfile.range[0]}-${spectrumProfile.range[1]}`;
  canvas.dataset.spectrumLineCount = String(spectrumProfile.lines.length);
  canvas.dataset.spectrumWavelengths = spectrumProfile.lines
    .map((line) => line.wavelength.toFixed(4))
    .join(',');
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

    drawScale(ctx, width, height, spectrumProfile.range);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px "Noto Sans SC", sans-serif';
    ctx.fillText(`${element.chineseName} 发射光谱`, 16, 20);
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('数据来源于NIST', width - 16, 20);
    ctx.restore();

    if (spectrumProfile.lines.length === 0) {
      ctx.save();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 13px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无可见光谱数据', width / 2, height / 2 + 8);
      ctx.restore();
      return;
    }

    spectrumProfile.lines.forEach((line, index) => {
      const x = wavelengthToX(line.wavelength, width, spectrumProfile.range);
      const flicker = 0.82 + Math.sin(tick * (line.speed + index * 0.08) + line.phase) * 0.18;
      const intensity = clamp(line.intensity * pulse * flicker, 0.18, 1);
      const top = 44;
      const bottom = height - 36;

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

function drawScale(ctx, width, height, range) {
  const ticks = getSpectrumTicks(range);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Noto Sans SC", sans-serif';

  ticks.forEach((tick) => {
    const x = wavelengthToX(tick, width, range);
    ctx.beginPath();
    ctx.moveTo(x, height - 32);
    ctx.lineTo(x, height - 18);
    ctx.stroke();
    ctx.fillText(`${tick}`, x - 10, height - 6);
  });
}

function wavelengthToX(wavelength, width, range = getSpectrumRange()) {
  const start = 24;
  const end = width - 24;
  return clamp(start + ((wavelength - range[0]) / (range[1] - range[0])) * (end - start), start, end);
}

function buildSpectrumProfile(element, performanceMode) {
  const range = getSpectrumRange();
  const entry = spectralLines.elements?.[element.symbol];
  const accent = element.color || '#38bdf8';
  const visibleLines = (entry?.lines || [])
    .map((line) => ({ ...line, wavelength: Number(line.wavelengthNm) }))
    .filter((line) => Number.isFinite(line.wavelength) && line.wavelength >= range[0] && line.wavelength <= range[1])
    .sort((a, b) => a.wavelength - b.wavelength);

  if (visibleLines.length === 0) {
    return {
      source: 'empty',
      range,
      lines: []
    };
  }

  const maxima = getIntensityMaxima(visibleLines);
  const lines = visibleLines.map((line, index) => {
    const normalizedIntensity = clamp(resolveLineIntensity(line, maxima), 0, 1);
    return {
      wavelength: line.wavelength,
      source: line.wavelengthSource || 'unknown',
      label: `${formatWavelengthLabel(line.wavelength)}nm`,
      width: performanceMode === 'normal'
        ? 1 + normalizedIntensity * 1.8
        : 1.2 + normalizedIntensity * 2.2,
      intensity: clamp(normalizedIntensity, 0.18, 1),
      normalizedIntensity,
      color: blendColor(accent, getSpectrumBandColor(line.wavelength), 0.65),
      speed: 0.8 + (index % 7) * 0.12,
      phase: index * 0.37 + element.atomicNumber * 0.05,
      showLabel: false
    };
  });

  markSpectrumLabels(lines);

  return {
    source: 'nist',
    range,
    lines
  };
}

function getSpectrumRange() {
  const range = spectralLines.query?.wavelengthRangeNm;
  if (Array.isArray(range) && range.length >= 2) {
    const start = Number(range[0]);
    const end = Number(range[1]);
    if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
      return [start, end];
    }
  }

  return [380, 780];
}

function getSpectrumTicks(range) {
  const ticks = [range[0]];
  for (let tick = range[0] + 50; tick < range[1]; tick += 50) {
    ticks.push(tick);
  }
  ticks.push(range[1]);
  return Array.from(new Set(ticks));
}

function formatWavelengthLabel(wavelength) {
  return wavelength % 1 === 0
    ? wavelength.toFixed(0)
    : wavelength.toFixed(1);
}

function getIntensityMaxima(lines) {
  return {
    intensity: getPositiveMax(lines, 'intensity'),
    akiS1: getPositiveMax(lines, 'akiS1'),
    fik: getPositiveMax(lines, 'fik')
  };
}

function getPositiveMax(lines, key) {
  return lines.reduce((max, line) => {
    const value = Number(line[key]);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
}

function resolveLineIntensity(line, maxima) {
  const relativeIntensity = toFiniteNumber(line.relativeIntensity);
  if (relativeIntensity !== null) {
    return relativeIntensity;
  }

  const intensity = toFiniteNumber(line.intensity);
  if (intensity !== null && intensity > 0 && maxima.intensity > 0) {
    return intensity / maxima.intensity;
  }

  const akiS1 = toFiniteNumber(line.akiS1);
  if (akiS1 !== null && akiS1 > 0 && maxima.akiS1 > 0) {
    return akiS1 / maxima.akiS1;
  }

  const fik = toFiniteNumber(line.fik);
  if (fik !== null && fik > 0 && maxima.fik > 0) {
    return fik / maxima.fik;
  }

  return 0.22;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function markSpectrumLabels(lines) {
  const strongestIndexes = new Set(lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => b.line.normalizedIntensity - a.line.normalizedIntensity || a.line.wavelength - b.line.wavelength)
    .slice(0, 5)
    .map(({ index }) => index));
  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line, index }) => strongestIndexes.has(index) || line.normalizedIntensity >= 0.7)
    .sort((a, b) => b.line.normalizedIntensity - a.line.normalizedIntensity || a.line.wavelength - b.line.wavelength);
  const labeledWavelengths = [];

  candidates.forEach(({ line }) => {
    const isDuplicate = labeledWavelengths.some((wavelength) => Math.abs(wavelength - line.wavelength) < 1);
    if (!isDuplicate) {
      line.showLabel = true;
      labeledWavelengths.push(line.wavelength);
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSpectrumBandColor(wavelength) {
  if (wavelength < 450) return '#7c3aed';
  if (wavelength < 495) return '#2563eb';
  if (wavelength < 570) return '#22c55e';
  if (wavelength < 590) return '#eab308';
  if (wavelength < 620) return '#f97316';
  return '#ef4444';
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
