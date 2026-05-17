import assert from 'node:assert/strict';
import test from 'node:test';

import { createSimulationRegistry } from '../../src/lab-sim/registry.js';
import {
  APPARATUS_IDS,
  FALLBACK_MODES,
  SIMULATION_CONFIG_REQUIRED_FIELDS,
  VIEW_MODES,
  validateSimulationConfig
} from '../../src/lab-sim/schema.js';

function createValidConfig(overrides = {}) {
  return {
    experimentId: 'test-simulation',
    template: 'apparatus-recognition',
    apparatus: [...APPARATUS_IDS],
    parameters: {
      focusTime: {
        min: 1,
        max: 10,
        default: 3,
        unit: 's'
      }
    },
    phenomena: ['label-match-feedback'],
    views: ['macro', 'micro'],
    fallback: 'canvas',
    completionCondition: {
      type: 'all-apparatus-recognized',
      requiredCount: APPARATUS_IDS.length
    },
    ...overrides
  };
}

test('schema exposes the required simulation contract constants', () => {
  assert.deepEqual(SIMULATION_CONFIG_REQUIRED_FIELDS, [
    'experimentId',
    'template',
    'apparatus',
    'parameters',
    'phenomena',
    'views',
    'fallback',
    'completionCondition'
  ]);
  assert.equal(APPARATUS_IDS.length, 12);
  assert.deepEqual(VIEW_MODES, ['macro', 'micro']);
  assert.deepEqual(FALLBACK_MODES, ['canvas', 'text', 'none']);
});

test('validateSimulationConfig accepts a complete simulation config', () => {
  const result = validateSimulationConfig(createValidConfig(), 'fixture.json');

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.errors, []);
});

test('validateSimulationConfig rejects missing required fields and invalid enum values', () => {
  const result = validateSimulationConfig(
    createValidConfig({
      experimentId: '',
      views: ['macro', 'nano'],
      fallback: 'video'
    }),
    'broken.json'
  );

  assert.equal(result.status, 'fail');
  assert.match(result.errors.join('\n'), /broken\.json missing required field: experimentId/u);
  assert.match(result.errors.join('\n'), /views\[1\] must be one of: macro, micro/u);
  assert.match(result.errors.join('\n'), /fallback must be one of: canvas, text, none/u);
});

test('registry can register, lookup, list, and clear configs by experimentId', () => {
  const registry = createSimulationRegistry();
  const config = createValidConfig({ experimentId: 'registry-target' });

  registry.register(config);

  assert.equal(registry.has('registry-target'), true);
  assert.equal(registry.lookup('registry-target'), config);
  assert.deepEqual(registry.getAll(), [config]);

  registry.clear();

  assert.equal(registry.has('registry-target'), false);
  assert.equal(registry.lookup('registry-target'), null);
  assert.deepEqual(registry.getAll(), []);
});

test('registry rejects invalid and duplicate simulation configs', () => {
  const registry = createSimulationRegistry();
  const config = createValidConfig({ experimentId: 'duplicate-target' });

  registry.register(config);
  assert.throws(() => registry.register(config), /already registered/u);
  assert.throws(() => registry.register(createValidConfig({ experimentId: '' })), /Invalid simulation config/u);
});
