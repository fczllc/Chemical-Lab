import { Color } from 'three';
import { createLabSimulation } from '../runtime/index.js';
import { createApparatus } from '../apparatus/index.js';
import { createLiquidSurface } from '../substances/liquid.js';
import { createBubbleSystem } from '../phenomena/bubbles.js';
import { createParameterControls } from '../parameters/ui.js';
import {
  normalizeParameter,
  checkSafetyThresholds,
  calculateReactionEffects,
} from '../parameters/engine.js';

const SODIUM_WATER_PARAMETERS = Object.freeze({
  temperatureC: {
    label: '水温',
    unit: '°C',
    min: 10,
    max: 80,
    step: 1,
    defaultValue: 25,
    safeMin: 10,
    safeMax: 60,
  },
  massG: {
    label: '钠块质量',
    unit: 'g',
    min: 0.01,
    max: 0.2,
    step: 0.01,
    defaultValue: 0.05,
    safeMin: 0.01,
    safeMax: 0.15,
  },
  volumeMl: {
    label: '水体积',
    unit: 'mL',
    min: 50,
    max: 300,
    step: 10,
    defaultValue: 150,
    safeMin: 50,
    safeMax: 300,
  },
});

const DEFAULT_PARAMETERS = Object.freeze({
  temperatureC: 25,
  massG: 0.05,
  volumeMl: 150,
});

function createExperimentParameterEngine(initialParameters = {}) {
  let values = normalizeExperimentParameters({
    ...DEFAULT_PARAMETERS,
    ...initialParameters,
  });

  function getState() {
    return {
      values: { ...values },
      effects: calculateReactionEffects(values, SODIUM_WATER_PARAMETERS),
    };
  }

  return {
    definitions: SODIUM_WATER_PARAMETERS,
    updateParameters(nextParameters = {}) {
      values = normalizeExperimentParameters({ ...values, ...nextParameters });
      return getState();
    },
    getState,
  };
}

function normalizeExperimentParameters(parameters) {
  return Object.fromEntries(
    Object.keys(SODIUM_WATER_PARAMETERS).map((key) => [
      key,
      normalizeParameter(key, parameters[key], SODIUM_WATER_PARAMETERS),
    ]),
  );
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  const ratio = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin || 1)));
  return outMin + (outMax - outMin) * ratio;
}

function createSafetyWarning(documentRef) {
  const warning = documentRef.createElement('div');
  warning.className = 'lab-safety-warning';
  warning.setAttribute('role', 'alert');
  warning.style.cssText = `
    position:absolute;
    top:16px;
    left:16px;
    max-width:320px;
    padding:12px 14px;
    border-radius:12px;
    background:rgba(255, 244, 214, 0.96);
    border:1px solid rgba(217, 119, 6, 0.45);
    color:#92400e;
    font:600 14px/1.45 system-ui, -apple-system, sans-serif;
    box-shadow:0 8px 24px rgba(146, 64, 14, 0.16);
    z-index:12;
    display:none;
  `;
  return warning;
}

function updateSafetyWarning(warning, parameters) {
  const warnings = [];
  if (parameters.temperatureC > 60) {
    warnings.push('水温超过 60°C，钠与水反应会明显加快。');
  }
  if (parameters.massG > 0.15) {
    warnings.push('钠块质量超过 0.15g，请保持防护罩并降低投放量。');
  }

  const thresholdState = checkSafetyThresholds(parameters, SODIUM_WATER_PARAMETERS);
  warning.textContent = warnings.length > 0
    ? warnings.join(' ')
    : thresholdState.warnings.join(' ');
  warning.style.display = warning.textContent ? 'block' : 'none';
}

function updateBubbleDensity(bubbleSystem, intensity) {
  const visibleRatio = Math.max(0.15, Math.min(1, intensity / 4));
  bubbleSystem.bubbles.forEach((bubble, index) => {
    bubble.visible = index / bubbleSystem.bubbles.length <= visibleRatio;
  });
  bubbleSystem.setOpacity(Math.max(0.18, Math.min(0.82, 0.18 + intensity * 0.14)));
}

function updateLiquidColor(liquidSurface, progress, intensity) {
  const calm = new Color(0x4fb3ff);
  const reactive = new Color(0xd8f7ff);
  const heated = new Color(0xffd69a);
  const color = calm.clone().lerp(reactive, Math.min(1, progress * 1.4));
  color.lerp(heated, Math.max(0, Math.min(0.35, (intensity - 2) * 0.1)));
  liquidSurface.setColor(color);
}

export async function createSodiumWaterSimulation(hostElement, options = {}) {
  let bubbleSystem;
  let liquidSurface;
  let reactionRate = 1;
  let reactionIntensity = 1;
  let reactionProgress = 0;

  let sim;
  try {
    sim = await createLabSimulation(hostElement, {
      ...options,
      update(deltaSeconds = 1 / 60) {
        reactionProgress = Math.min(1, reactionProgress + (deltaSeconds / 15) * reactionRate);
        bubbleSystem?.update(deltaSeconds * reactionIntensity);
        if (liquidSurface) {
          updateLiquidColor(liquidSurface, reactionProgress, reactionIntensity);
        }
        options.update?.(deltaSeconds, { progress: reactionProgress });
      },
    });
  } catch (error) {
    return { success: false, error };
  }

  const documentRef = options.documentRef || globalThis.document;
  const parameterEngine = createExperimentParameterEngine(options.parameters);
  const initialState = parameterEngine.getState();
  const initialParameters = initialState.values;

  const shield = createApparatus('safety-shield');
  shield.name = 'SodiumWaterSafetyShield';
  shield.position.set(0, 1.05, 1.45);
  sim.scene.add(shield);

  const beaker = createApparatus('beaker');
  beaker.name = 'SodiumWaterBeaker';
  beaker.position.set(0, 0.9, 0);
  beaker.scale.setScalar(1.5);
  sim.scene.add(beaker);

  const thermometer = createApparatus('thermometer');
  thermometer.name = 'SodiumWaterThermometer';
  thermometer.position.set(1.55, 1.25, 0.1);
  thermometer.rotation.z = -0.18;
  sim.scene.add(thermometer);

  liquidSurface = createLiquidSurface({
    width: 1.75,
    depth: 1.75,
    color: 0x4fb3ff,
    opacity: 0.58,
    level: mapRange(initialParameters.volumeMl, 50, 300, 0.45, 1.12),
  });
  sim.scene.add(liquidSurface.mesh);

  bubbleSystem = createBubbleSystem({
    count: 54,
    radius: 0.68,
    height: 1.2,
    bubbleSize: 0.032,
    opacity: 0.34,
    speed: 0.5,
  });
  bubbleSystem.group.position.set(0, 0.4, 0);
  sim.scene.add(bubbleSystem.group);

  const warning = createSafetyWarning(documentRef);
  hostElement.appendChild(warning);

  const controls = createParameterControls({
    engine: parameterEngine,
    values: initialParameters,
    documentRef,
    onChange({ values, effects }) {
      applyParameterEffects(values, effects);
    },
  });
  controls.element.style.cssText = `
    position:absolute;
    right:16px;
    bottom:16px;
    z-index:11;
  `;
  hostElement.appendChild(controls.element);

  function applyParameterEffects(parameters, effects = calculateReactionEffects(parameters, SODIUM_WATER_PARAMETERS)) {
    reactionRate = effects.rate;
    reactionIntensity = effects.intensity;
    updateBubbleDensity(bubbleSystem, effects.intensity);
    liquidSurface.setLevel(mapRange(parameters.volumeMl, 50, 300, 0.45, 1.12));
    updateLiquidColor(liquidSurface, reactionProgress, effects.intensity);
    updateSafetyWarning(warning, parameters);
  }

  applyParameterEffects(initialParameters, initialState.effects);

  let completeCalled = false;
  const completionTimer = setTimeout(() => {
    if (!completeCalled) {
      completeCalled = true;
      reactionProgress = 1;
      updateLiquidColor(liquidSurface, reactionProgress, reactionIntensity);
      options.onComplete?.();
    }
  }, 15_000);

  function getParameters() {
    return controls.getValues();
  }

  function dispose() {
    clearTimeout(completionTimer);
    controls.dispose();
    warning.remove();
    liquidSurface.dispose();
    bubbleSystem.dispose();
    sim.dispose();
  }

  return {
    success: true,
    sim,
    getParameters,
    dispose,
  };
}
