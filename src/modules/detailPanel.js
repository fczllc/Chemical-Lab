/** ===== 详情面板 ===== */
import { createElectronModel } from '../three/electronModel.js';
import {
  addComparedElement,
  collectElement,
  getCollectedElements,
  getCompareList,
  getSelectedElement
} from './storage.js';
import { navigateTo } from './router.js';

let currentElectronModel = null;
let currentSpectrumCanvas = null;

function getPerformanceMode() {
  return window.appState?.settings?.performanceMode || 'normal';
}

export function initDetailPanel() {
  const collectBtn = document.getElementById('btn-collect');
  if (collectBtn) {
    collectBtn.addEventListener('click', () => {
      const element = getSelectedElement();
      if (element) {
        collectElement(element.atomicNumber);
        updateCollectButton(element.atomicNumber);
      }
    });
  }

  const compareBtn = document.getElementById('btn-compare-add');
  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      const element = getSelectedElement();
      if (element && getCompareList().length < 3) {
        addComparedElement(element.atomicNumber);
      }
    });
  }

  const storyBtn = document.getElementById('btn-story');
  if (storyBtn) {
    storyBtn.addEventListener('click', () => {
      navigateTo('story');
    });
  }

  const quizBtn = document.getElementById('btn-quiz');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      const modal = document.getElementById('quiz-modal');
      if (modal) {
        modal.classList.add('show');
        window.dispatchEvent(new CustomEvent('startquiz', {
          detail: { element: getSelectedElement() }
        }));
      }
    });
  }

  const labBtn = document.getElementById('btn-lab');
  if (labBtn) {
    labBtn.addEventListener('click', () => {
      navigateTo('lab');
    });
  }

  window.addEventListener('elementselected', (event) => {
    updateElectronModel(event.detail.element);
    updateSpectrum(event.detail.element);
    updateCollectButton(event.detail.element.atomicNumber);
  });

  window.addEventListener('elementcollected', (event) => {
    const selectedElement = getSelectedElement();
    if (selectedElement?.atomicNumber === event.detail.atomicNumber) {
      updateCollectButton(event.detail.atomicNumber);
    }
  });

  window.addEventListener('performancemodechange', () => {
    const selectedElement = getSelectedElement();
    if (selectedElement) {
      updateElectronModel(selectedElement);
    }
  });

  window.addEventListener('resize', () => {
    currentElectronModel?.resize?.();
  });

  window.addEventListener('statereset', () => {
    updateCollectButton(null);
  });
}

function updateCollectButton(atomicNumber) {
  const collectBtn = document.getElementById('btn-collect');
  if (!collectBtn) {
    return;
  }

  const isCollected = atomicNumber !== null && getCollectedElements().has(atomicNumber);
  collectBtn.style.color = isCollected ? '#ffd43b' : '';
  collectBtn.textContent = isCollected ? '\u2605' : '\u2606';
}

function updateElectronModel(element) {
  if (currentElectronModel) {
    currentElectronModel.dispose();
    currentElectronModel = null;
  }

  const container = document.getElementById('electron-canvas');
  if (!container) return;
  container.innerHTML = '';

  currentElectronModel = createElectronModel(container, element.electronConfiguration, {
    performanceMode: getPerformanceMode()
  });
}

function updateSpectrum(element) {
  const container = document.getElementById('spectrum-canvas');
  if (!container) return;
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth || 340;
  canvas.height = 120;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  drawSpectrum(ctx, canvas.width, canvas.height, element);

  currentSpectrumCanvas = canvas;
}

function drawSpectrum(ctx, width, height, element) {
  const colors = getSpectrumColors(element.atomicNumber);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px "Noto Sans SC", sans-serif';
  ctx.fillText('光谱特征', 12, 20);

  const lineY = height / 2 + 10;
  colors.forEach((color) => {
    const x = Math.random() * (width - 40) + 20;
    const intensity = 0.3 + Math.random() * 0.7;

    ctx.strokeStyle = color;
    ctx.globalAlpha = intensity;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, lineY - 20);
    ctx.lineTo(x, lineY + 20);
    ctx.stroke();

    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, lineY - 15);
    ctx.lineTo(x, lineY + 15);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  ctx.globalAlpha = 1;

  ctx.fillStyle = '#475569';
  ctx.font = '10px sans-serif';
  ctx.fillText('400nm', 20, height - 10);
  ctx.fillText('700nm', width - 50, height - 10);

  const gradient = ctx.createLinearGradient(20, 0, width - 20, 0);
  gradient.addColorStop(0, '#8b00ff');
  gradient.addColorStop(0.2, '#0000ff');
  gradient.addColorStop(0.4, '#00ff00');
  gradient.addColorStop(0.6, '#ffff00');
  gradient.addColorStop(0.8, '#ff8800');
  gradient.addColorStop(1, '#ff0000');

  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(20, height - 30, width - 40, 4);
  ctx.globalAlpha = 1;
}

function getSpectrumColors(atomicNumber) {
  const palettes = [
    ['#ff0000', '#ff6600', '#ffaa00'],
    ['#00ff00', '#00ff88', '#00ffcc'],
    ['#0088ff', '#0044ff', '#4400ff'],
    ['#ff00ff', '#ff0088', '#ff0044'],
    ['#ffff00', '#ff8800', '#ff4400'],
    ['#00ffff', '#0088ff', '#0044ff'],
    ['#ff8888', '#ff4444', '#ff0000'],
    ['#88ff88', '#44ff44', '#00ff00']
  ];

  return palettes[atomicNumber % palettes.length];
}
