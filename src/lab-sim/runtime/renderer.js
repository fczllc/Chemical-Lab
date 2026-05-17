import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import {
  getCappedPixelRatio,
  getPerformanceConfig,
  sanitizePerformanceMode
} from '../utils/performance.js';
import { disposeRendererResources } from '../utils/disposal.js';

function getViewportSize(canvas, width, height) {
  const viewport = typeof window !== 'undefined' ? window : null;

  return {
    width: Math.max(1, width || canvas?.clientWidth || viewport?.innerWidth || 1),
    height: Math.max(1, height || canvas?.clientHeight || viewport?.innerHeight || 1)
  };
}

function getDevicePixelRatio() {
  return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
}

function applyRendererSettings(renderer, canvas, performanceMode, width, height) {
  if (!renderer) {
    return;
  }

  const { shadows } = getPerformanceConfig(performanceMode);
  const size = getViewportSize(canvas, width, height);

  renderer.setSize(size.width, size.height, false);
  renderer.setPixelRatio(getCappedPixelRatio(performanceMode, getDevicePixelRatio()));
  renderer.setClearColor(0x000000, 0);

  if (renderer.shadowMap) {
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
}

async function createWebGPURenderer(canvas, config, factory) {
  const renderer = await factory({
    canvas,
    antialias: config.antialias,
    alpha: true
  });

  try {
    if (typeof renderer.init === 'function') {
      await renderer.init();
    }
  } catch (error) {
    disposeRendererResources(renderer);
    throw error;
  }

  return renderer;
}

function createWebGLRenderer(canvas, config, factory) {
  return factory({
    canvas,
    antialias: config.antialias,
    alpha: true,
    powerPreference: config.powerPreference
  });
}

export async function createRenderer(canvas, options = {}) {
  if (!canvas) {
    throw new Error('[lab-sim] A canvas is required to create the renderer.');
  }

  let performanceMode = sanitizePerformanceMode(options.performanceMode);
  let renderer = null;
  let rendererType = 'none';
  const config = getPerformanceConfig(performanceMode);
  const rendererFactories = {
    webgpu: (rendererOptions) => new WebGPURenderer(rendererOptions),
    webgl: (rendererOptions) => new THREE.WebGLRenderer(rendererOptions),
    ...options.rendererFactories
  };

  try {
    renderer = await createWebGPURenderer(canvas, config, rendererFactories.webgpu);
    rendererType = 'webgpu';
    console.info('[lab-sim] Active renderer: webgpu');
  } catch (error) {
    console.warn('[lab-sim] WebGPU unavailable, falling back to WebGLRenderer.', error);

    try {
      renderer = createWebGLRenderer(canvas, config, rendererFactories.webgl);
      rendererType = 'webgl';
      console.info('[lab-sim] Active renderer: webgl');
    } catch (fallbackError) {
      console.error('[lab-sim] Renderer creation failed. Lab runtime will continue without rendering.', fallbackError);
      renderer = null;
      rendererType = 'none';
    }
  }

  applyRendererSettings(renderer, canvas, performanceMode, options.width, options.height);

  return {
    renderer,
    rendererType,
    getRenderer() {
      return renderer;
    },
    getRendererType() {
      return rendererType;
    },
    getPerformanceMode() {
      return performanceMode;
    },
    resize(width, height) {
      applyRendererSettings(renderer, canvas, performanceMode, width, height);
    },
    setPerformanceMode(mode) {
      performanceMode = sanitizePerformanceMode(mode);
      applyRendererSettings(renderer, canvas, performanceMode, options.width, options.height);
      return performanceMode;
    },
    dispose() {
      disposeRendererResources(renderer);
      renderer = null;
    }
  };
}
