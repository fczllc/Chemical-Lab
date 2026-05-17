export const APPARATUS_IDS = [
  'beaker',
  'test-tube',
  'graduated-cylinder',
  'dropper',
  'glass-rod',
  'funnel',
  'thermometer',
  'balance',
  'bunsen-burner',
  'evaporating-dish',
  'safety-goggles',
  'protective-screen'
];

export const VIEW_MODES = ['macro', 'micro'];
export const FALLBACK_MODES = ['canvas', 'text', 'none'];

export const SIMULATION_CONFIG_REQUIRED_FIELDS = [
  'experimentId',
  'template',
  'apparatus',
  'parameters',
  'phenomena',
  'views',
  'fallback',
  'completionCondition'
];

const APPARATUS_ID_SET = new Set(APPARATUS_IDS);
const VIEW_MODE_SET = new Set(VIEW_MODES);
const FALLBACK_MODE_SET = new Set(FALLBACK_MODES);

export const simulationConfigSchema = Object.freeze({
  requiredFields: SIMULATION_CONFIG_REQUIRED_FIELDS,
  apparatusIds: APPARATUS_IDS,
  viewModes: VIEW_MODES,
  fallbackModes: FALLBACK_MODES,
  optionalFields: ['safetyThresholds']
});

export function validateSimulationConfig(config, source = 'simulation config') {
  const errors = [];

  if (!isPlainObject(config)) {
    return {
      status: 'fail',
      source,
      errors: [`${source} must be a JSON object`]
    };
  }

  for (const field of SIMULATION_CONFIG_REQUIRED_FIELDS) {
    if (isMissing(config[field])) {
      errors.push(`${source} missing required field: ${field}`);
    }
  }

  if (!isNonEmptyString(config.experimentId)) {
    errors.push(`${source} experimentId must be a non-empty string`);
  }

  if (!isNonEmptyString(config.template)) {
    errors.push(`${source} template must be a non-empty string`);
  }

  validateApparatus(config.apparatus, source, errors);
  validateParameters(config.parameters, source, errors);
  validateStringArray(config.phenomena, `${source} phenomena`, errors);
  validateViews(config.views, source, errors);
  validateFallback(config.fallback, source, errors);

  if (!isPlainObject(config.completionCondition)) {
    errors.push(`${source} completionCondition must be an object`);
  }

  if (config.safetyThresholds !== undefined && !isPlainObject(config.safetyThresholds)) {
    errors.push(`${source} safetyThresholds must be an object when provided`);
  }

  return {
    status: errors.length === 0 ? 'pass' : 'fail',
    source,
    errors
  };
}

function validateApparatus(apparatus, source, errors) {
  if (!Array.isArray(apparatus)) {
    errors.push(`${source} apparatus must be an array`);
    return;
  }

  if (apparatus.length !== APPARATUS_IDS.length) {
    errors.push(`${source} apparatus must contain exactly ${APPARATUS_IDS.length} apparatus IDs`);
  }

  const seen = new Set();
  apparatus.forEach((apparatusId, index) => {
    if (!isNonEmptyString(apparatusId)) {
      errors.push(`${source} apparatus[${index}] must be a non-empty string`);
      return;
    }
    if (!APPARATUS_ID_SET.has(apparatusId)) {
      errors.push(`${source} apparatus[${index}] must be one of the canonical apparatus IDs: ${APPARATUS_IDS.join(', ')}`);
    }
    if (seen.has(apparatusId)) {
      errors.push(`${source} apparatus contains duplicate apparatus ID: ${apparatusId}`);
    }
    seen.add(apparatusId);
  });
}

function validateParameters(parameters, source, errors) {
  if (!isPlainObject(parameters)) {
    errors.push(`${source} parameters must be an object`);
    return;
  }

  for (const [parameterId, parameter] of Object.entries(parameters)) {
    const label = `${source} parameters.${parameterId}`;
    if (!isNonEmptyString(parameterId)) {
      errors.push(`${source} parameter IDs must be non-empty strings`);
    }
    if (!isPlainObject(parameter)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    for (const field of ['min', 'max', 'default', 'unit']) {
      if (isMissing(parameter[field])) {
        errors.push(`${label} missing required field: ${field}`);
      }
    }
    if (!isFiniteNumber(parameter.min)) {
      errors.push(`${label}.min must be a finite number`);
    }
    if (!isFiniteNumber(parameter.max)) {
      errors.push(`${label}.max must be a finite number`);
    }
    if (!isFiniteNumber(parameter.default)) {
      errors.push(`${label}.default must be a finite number`);
    }
    if (isFiniteNumber(parameter.min) && isFiniteNumber(parameter.max) && parameter.min > parameter.max) {
      errors.push(`${label}.min must be less than or equal to max`);
    }
    if (
      isFiniteNumber(parameter.min)
      && isFiniteNumber(parameter.max)
      && isFiniteNumber(parameter.default)
      && (parameter.default < parameter.min || parameter.default > parameter.max)
    ) {
      errors.push(`${label}.default must be between min and max`);
    }
    if (!isNonEmptyString(parameter.unit)) {
      errors.push(`${label}.unit must be a non-empty string`);
    }
  }
}

function validateViews(views, source, errors) {
  if (!Array.isArray(views) || views.length === 0) {
    errors.push(`${source} views must be a non-empty array`);
    return;
  }

  views.forEach((view, index) => {
    if (!VIEW_MODE_SET.has(view)) {
      errors.push(`${source} views[${index}] must be one of: ${VIEW_MODES.join(', ')}`);
    }
  });
}

function validateFallback(fallback, source, errors) {
  if (!FALLBACK_MODE_SET.has(fallback)) {
    errors.push(`${source} fallback must be one of: ${FALLBACK_MODES.join(', ')}`);
  }
}

function validateStringArray(value, label, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} must be a non-empty array`);
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${label}[${index}] must be a non-empty string`);
    }
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
