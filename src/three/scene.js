/** ===== Three.js 渲染器抽象 ===== */
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

const PERFORMANCE_MODES = {
  normal: {
    maxPixelRatio: 1.25,
    targetFps: 30
  },
  'high-performance': {
    maxPixelRatio: 2,
    targetFps: 60
  }
};

let scene = null;
let camera = null;
let renderer = null;
let rendererType = 'webgl';
let canvasElement = null;
let mouseX = 0;
let mouseY = 0;
let performanceMode = 'normal';
let activeSection = 'periodic-table';
let manualPause = false;
let isVisibilityPaused = false;
let resizeTimeoutId = null;
let lastRenderTime = 0;

function getModeConfig(mode = performanceMode) {
  return PERFORMANCE_MODES[mode] || PERFORMANCE_MODES.normal;
}

function sanitizePerformanceMode(mode) {
  return PERFORMANCE_MODES[mode] ? mode : 'normal';
}

function createSceneState() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;
}

function applyRendererSettings() {
  if (!renderer) {
    return;
  }

  const { maxPixelRatio } = getModeConfig();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setClearColor(0x000000, 0);
}

async function createRenderer(canvas) {
  try {
    const nextRenderer = new WebGPURenderer({
      canvas,
      antialias: true,
      alpha: true
    });

    if (typeof nextRenderer.init === 'function') {
      await nextRenderer.init();
    }

    rendererType = 'webgpu';
    console.info('[three] Active renderer: webgpu');
    return nextRenderer;
  } catch (error) {
    console.warn('[three] WebGPU unavailable, falling back to WebGLRenderer.', error);
  }

  try {
    const nextRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    rendererType = 'webgl';
    console.info('[three] Active renderer: webgl');
    return nextRenderer;
  } catch (error) {
    console.error('[three] Renderer creation failed. UI will continue without background rendering.', error);
    rendererType = 'webgl';
    return null;
  }
}

function onMouseMove(event) {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

function performResize() {
  resizeTimeoutId = null;

  if (!camera || !renderer) {
    return;
  }

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  applyRendererSettings();
}

function onResize() {
  if (resizeTimeoutId) {
    window.clearTimeout(resizeTimeoutId);
  }

  resizeTimeoutId = window.setTimeout(performResize, 200);
}

function shouldAggressivelyPauseForRoute() {
  return performanceMode === 'normal' && !['periodic-table', 'lab'].includes(activeSection);
}

function syncPauseState() {
  isVisibilityPaused = typeof document !== 'undefined' ? document.hidden : false;
}

function handleVisibilityChange() {
  syncPauseState();

  if (isVisibilityPaused) {
    pauseRenderer();
    return;
  }

  resumeRenderer();
}

function handlePageChange(event) {
  activeSection = event?.detail?.section || activeSection;
}

function attachEventListeners() {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onResize);
  window.addEventListener('pagechange', handlePageChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function detachEventListeners() {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('pagechange', handlePageChange);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function disposeCurrentRenderer() {
  if (!renderer) {
    return;
  }

  renderer.dispose();
  renderer = null;
}

export async function initScene(canvas, options = {}) {
  canvasElement = canvas || null;
  performanceMode = sanitizePerformanceMode(options.performanceMode || window.appState?.settings?.performanceMode);
  activeSection = options.section || activeSection;
  manualPause = false;
  syncPauseState();
  createSceneState();

  if (!canvasElement) {
    console.warn('[three] No canvas provided for renderer initialization.');
    return { scene, camera, renderer };
  }

  detachEventListeners();
  renderer = await createRenderer(canvasElement);
  applyRendererSettings();
  attachEventListeners();

  return { scene, camera, renderer };
}

export function getMouseParallax() {
  return { x: mouseX, y: mouseY };
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function getRenderer() {
  return renderer;
}

export function getRendererType() {
  return rendererType;
}

export function getPerformanceMode() {
  return performanceMode;
}

export function getTargetFrameDuration() {
  return 1000 / getModeConfig().targetFps;
}

export function isRendererPaused() {
  return manualPause || isVisibilityPaused || shouldAggressivelyPauseForRoute();
}

export function setActiveSection(section) {
  activeSection = section || activeSection;
}

export function setPerformanceMode(mode) {
  performanceMode = sanitizePerformanceMode(mode);
  lastRenderTime = 0;
  applyRendererSettings();
}

export function pauseRenderer() {
  manualPause = true;
}

export function resumeRenderer() {
  if (typeof document !== 'undefined' && document.hidden) {
    return;
  }

  manualPause = false;
  lastRenderTime = 0;
}

export function render(now = performance.now()) {
  if (!renderer || !scene || !camera || isRendererPaused()) {
    return;
  }

  const frameDuration = getTargetFrameDuration();
  if (now - lastRenderTime < frameDuration) {
    return;
  }

  lastRenderTime = now;
  renderer.render(scene, camera);
}

export function disposeRenderer() {
  detachEventListeners();

  if (resizeTimeoutId) {
    window.clearTimeout(resizeTimeoutId);
    resizeTimeoutId = null;
  }

  disposeCurrentRenderer();
  scene = null;
  camera = null;
  canvasElement = null;
  manualPause = false;
  isVisibilityPaused = false;
  lastRenderTime = 0;
}

export function dispose() {
  disposeRenderer();
}
