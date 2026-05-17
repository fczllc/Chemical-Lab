import {
  getTargetFrameDuration,
  sanitizePerformanceMode
} from '../utils/performance.js';

function getNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function canScheduleAnimationFrame() {
  return typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
}

export function createAnimationLoop(options = {}) {
  const { renderer, scene, camera, controls = null, update = null } = options;
  let performanceMode = sanitizePerformanceMode(options.performanceMode);
  let animationFrameId = null;
  let running = false;
  let paused = Boolean(options.paused);
  let lastRenderTime = Number.NEGATIVE_INFINITY;

  function render(now = getNow()) {
    if (paused || !renderer || !scene || !camera) {
      return false;
    }

    const frameDuration = getTargetFrameDuration(performanceMode);
    if (now - lastRenderTime < frameDuration) {
      return false;
    }

    const delta = Number.isFinite(lastRenderTime) ? (now - lastRenderTime) / 1000 : 0;
    lastRenderTime = now;

    controls?.update?.();
    update?.({ delta, now, performanceMode });
    renderer.render(scene, camera);
    return true;
  }

  function tick(now) {
    render(now);

    if (running && canScheduleAnimationFrame()) {
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  function start() {
    if (running) {
      return;
    }

    running = true;
    lastRenderTime = Number.NEGATIVE_INFINITY;

    if (canScheduleAnimationFrame()) {
      animationFrameId = requestAnimationFrame(tick);
      return;
    }

    render();
  }

  function stop() {
    running = false;

    if (animationFrameId !== null && canScheduleAnimationFrame()) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = null;
    lastRenderTime = Number.NEGATIVE_INFINITY;
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
    lastRenderTime = Number.NEGATIVE_INFINITY;
  }

  return {
    start,
    stop,
    pause,
    resume,
    render,
    dispose: stop,
    isRunning() {
      return running;
    },
    isPaused() {
      return paused;
    },
    setPerformanceMode(mode) {
      performanceMode = sanitizePerformanceMode(mode);
      lastRenderTime = Number.NEGATIVE_INFINITY;
      return performanceMode;
    },
    getPerformanceMode() {
      return performanceMode;
    }
  };
}
