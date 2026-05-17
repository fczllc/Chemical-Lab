import { getPerformanceConfig, sanitizePerformanceMode } from '../utils/performance.js';
import { createRenderer } from './renderer.js';
import { createLabScene } from './scene.js';
import { createAnimationLoop } from './loop.js';
import { createOrbitControls } from './controls.js';

function getCanvasSize(canvas, width, height) {
  return {
    width: width || canvas?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1),
    height: height || canvas?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1)
  };
}

export async function createLabRuntime(canvas, options = {}) {
  let performanceMode = sanitizePerformanceMode(options.performanceMode);
  const size = getCanvasSize(canvas, options.width, options.height);
  const rendererState = await createRenderer(canvas, {
    ...options,
    performanceMode,
    width: size.width,
    height: size.height
  });
  const sceneState = createLabScene({
    ...options.scene,
    width: size.width,
    height: size.height,
    shadows: getPerformanceConfig(performanceMode).shadows
  });
  const controls = createOrbitControls(
    sceneState.camera,
    rendererState.getRenderer()?.domElement || canvas,
    options.controls
  );
  const loop = createAnimationLoop({
    renderer: rendererState.renderer,
    scene: sceneState.scene,
    camera: sceneState.camera,
    controls,
    update: options.update,
    performanceMode,
    paused: options.paused
  });

  function resize(width, height) {
    const nextSize = getCanvasSize(canvas, width, height);
    rendererState.resize(nextSize.width, nextSize.height);
    sceneState.resize(nextSize.width, nextSize.height);
  }

  function setPerformanceMode(mode) {
    performanceMode = rendererState.setPerformanceMode(mode);
    loop.setPerformanceMode(performanceMode);
    return performanceMode;
  }

  function dispose() {
    loop.dispose();
    controls?.dispose?.();
    sceneState.dispose();
    rendererState.dispose();
  }

  if (options.autoStart) {
    loop.start();
  }

  return {
    scene: sceneState.scene,
    camera: sceneState.camera,
    renderer: rendererState.renderer,
    rendererType: rendererState.getRendererType(),
    controls,
    loop,
    start: loop.start,
    stop: loop.stop,
    pause: loop.pause,
    resume: loop.resume,
    render: loop.render,
    resize,
    setPerformanceMode,
    getPerformanceMode() {
      return performanceMode;
    },
    getRendererType: rendererState.getRendererType,
    dispose
  };
}

export async function createLabSimulation(hostElement, options = {}) {
  if (!hostElement) {
    throw new Error('hostElement is required');
  }

  const documentRef = options.documentRef || globalThis.document;
  if (!documentRef) {
    throw new Error('createLabSimulation requires a document object.');
  }

  const canvas = documentRef.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  hostElement.appendChild(canvas);

  const sim = await createLabRuntime(canvas, {
    autoStart: true,
    performanceMode: options.performanceMode,
    shadows: options.shadows,
    ...options.runtime,
    update: options.update,
  });

  const disposeRuntime = sim.dispose;
  sim.canvas = canvas;
  sim.dispose = () => {
    disposeRuntime();
    canvas.remove();
  };

  return sim;
}

export { createRenderer } from './renderer.js';
export { createLabScene } from './scene.js';
export { createAnimationLoop } from './loop.js';
export { createOrbitControls } from './controls.js';
export {
  DEFAULT_PERFORMANCE_MODE,
  getCappedPixelRatio,
  getPerformanceConfig,
  getTargetFrameDuration,
  listPerformanceModes,
  sanitizePerformanceMode
} from '../utils/performance.js';
export {
  disposeMaterial,
  disposeObject3D,
  disposeRendererResources
} from '../utils/disposal.js';
