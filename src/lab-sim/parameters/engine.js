export const PARAMETER_DEFINITIONS = {
  temperatureC: {
    label: '温度',
    unit: '°C',
    min: 0,
    max: 120,
    step: 1,
    defaultValue: 25,
    safeMin: 0,
    safeMax: 90,
  },
  pressureKPa: {
    label: '压强',
    unit: 'kPa',
    min: 80,
    max: 220,
    step: 1,
    defaultValue: 101,
    safeMin: 90,
    safeMax: 160,
  },
  concentrationM: {
    label: '浓度',
    unit: 'mol/L',
    min: 0,
    max: 5,
    step: 0.1,
    defaultValue: 1,
    safeMin: 0,
    safeMax: 3,
  },
  pH: {
    label: 'pH值',
    unit: '',
    min: 0,
    max: 14,
    step: 0.1,
    defaultValue: 7,
    safeMin: 2,
    safeMax: 12,
  },
  volumeMl: {
    label: '体积',
    unit: 'mL',
    min: 0,
    max: 1000,
    step: 10,
    defaultValue: 100,
    safeMin: 5,
    safeMax: 750,
  },
  massG: {
    label: '质量',
    unit: 'g',
    min: 0,
    max: 250,
    step: 1,
    defaultValue: 10,
    safeMin: 0,
    safeMax: 150,
  },
  catalyst: {
    label: '催化剂',
    unit: '',
    type: 'boolean',
    defaultValue: false,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeValue(rawValue, definition) {
  if (definition.type === 'boolean') {
    return {
      value: Boolean(rawValue),
      factor: Boolean(rawValue) ? 1 : 0,
      wasClamped: false,
    };
  }

  const numericValue = Number.isFinite(Number(rawValue))
    ? Number(rawValue)
    : definition.defaultValue;
  const value = clamp(numericValue, definition.min, definition.max);
  const span = definition.max - definition.min || 1;

  return {
    value,
    factor: (value - definition.min) / span,
    wasClamped: value !== numericValue,
  };
}

export function normalizeParameters(parameters = {}, definitions = PARAMETER_DEFINITIONS) {
  const values = {};
  const factors = {};
  const clamped = {};

  for (const [key, definition] of Object.entries(definitions)) {
    const normalized = normalizeValue(parameters[key] ?? definition.defaultValue, definition);
    values[key] = normalized.value;
    factors[key] = normalized.factor;
    clamped[key] = normalized.wasClamped;
  }

  return { values, factors, clamped };
}

export function normalizeParameter(key, value, definitions = PARAMETER_DEFINITIONS) {
  const definition = definitions[key];
  if (!definition) {
    throw new Error(`Unknown parameter: ${key}`);
  }
  return normalizeValue(value, definition).value;
}

export function detectSafety(parameters = {}, definitions = PARAMETER_DEFINITIONS) {
  const normalized = normalizeParameters(parameters, definitions);
  const warnings = [];
  let level = 'safe';

  for (const [key, definition] of Object.entries(definitions)) {
    if (definition.type === 'boolean') {
      continue;
    }

    const value = normalized.values[key];
    if (normalized.clamped[key]) {
      warnings.push(`${definition.label}已超出可调范围，已自动限制。`);
      level = 'danger';
      continue;
    }

    if (value < definition.safeMin || value > definition.safeMax) {
      warnings.push(`${definition.label}接近实验安全阈值。`);
      if (level !== 'danger') {
        level = 'caution';
      }
    }
  }

  return {
    level,
    isSafe: level === 'safe',
    warnings,
  };
}

export function checkSafetyThresholds(parameters = {}, definitions = PARAMETER_DEFINITIONS) {
  return detectSafety(parameters, definitions);
}

export function calculateReactionEffects(parameters = {}, definitions = PARAMETER_DEFINITIONS) {
  const normalized = normalizeParameters(parameters, definitions);
  const safety = detectSafety(parameters, definitions);
  const tempFactor = normalized.factors.temperatureC;
  const massFactor = normalized.factors.massG;
  const volFactor = normalized.factors.volumeMl;

  return {
    rate: round(1 * (1 + tempFactor * 2)),
    intensity: round(1 * (1 + tempFactor * 1.5) * (1 + massFactor * 2)),
    duration: round(1 * (1 + massFactor * 0.5) * (1 + volFactor * 0.3)),
    safety,
    normalized,
  };
}

export function createParameterEngine(initialParameters = {}, definitions = PARAMETER_DEFINITIONS) {
  let state = normalizeParameters(initialParameters, definitions).values;

  function updateParameters(nextParameters = {}) {
    state = normalizeParameters({ ...state, ...nextParameters }, definitions).values;
    return getState();
  }

  function getState() {
    return {
      values: { ...state },
      effects: calculateReactionEffects(state, definitions),
    };
  }

  return {
    definitions,
    normalize: (parameters = state) => normalizeParameters(parameters, definitions),
    detectSafety: (parameters = state) => detectSafety(parameters, definitions),
    calculateReactionEffects: (parameters = state) => calculateReactionEffects(parameters, definitions),
    updateParameters,
    getState,
  };
}
