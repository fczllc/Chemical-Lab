const PERFORMANCE_MODES = Object.freeze({
  normal: Object.freeze({
    mode: 'normal',
    targetFps: 30,
    maxPixelRatio: 1.25,
    antialias: true,
    shadows: false,
    powerPreference: 'default'
  }),
  'high-performance': Object.freeze({
    mode: 'high-performance',
    targetFps: 60,
    maxPixelRatio: 2,
    antialias: true,
    shadows: true,
    powerPreference: 'high-performance'
  })
});

export const DEFAULT_PERFORMANCE_MODE = 'normal';

export function sanitizePerformanceMode(mode) {
  return Object.hasOwn(PERFORMANCE_MODES, mode) ? mode : DEFAULT_PERFORMANCE_MODE;
}

export function getPerformanceConfig(mode = DEFAULT_PERFORMANCE_MODE) {
  return PERFORMANCE_MODES[sanitizePerformanceMode(mode)];
}

export function getTargetFrameDuration(mode = DEFAULT_PERFORMANCE_MODE) {
  return 1000 / getPerformanceConfig(mode).targetFps;
}

export function getCappedPixelRatio(mode = DEFAULT_PERFORMANCE_MODE, devicePixelRatio = 1) {
  const pixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(pixelRatio, getPerformanceConfig(mode).maxPixelRatio);
}

export function listPerformanceModes() {
  return Object.keys(PERFORMANCE_MODES);
}
