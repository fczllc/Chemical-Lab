import { validateSimulationConfig } from './schema.js';

export function createSimulationRegistry() {
  const configsByExperimentId = new Map();

  return {
    register(config) {
      const result = validateSimulationConfig(config, config?.experimentId || 'simulation config');
      if (result.status !== 'pass') {
        throw new Error(`Invalid simulation config: ${result.errors.join('; ')}`);
      }
      if (configsByExperimentId.has(config.experimentId)) {
        throw new Error(`Simulation config already registered: ${config.experimentId}`);
      }
      configsByExperimentId.set(config.experimentId, config);
      return config;
    },

    lookup(experimentId) {
      return configsByExperimentId.get(experimentId) ?? null;
    },

    has(experimentId) {
      return configsByExperimentId.has(experimentId);
    },

    getAll() {
      return Array.from(configsByExperimentId.values());
    },

    clear() {
      configsByExperimentId.clear();
    }
  };
}

const defaultRegistry = createSimulationRegistry();

export const register = defaultRegistry.register;
export const lookup = defaultRegistry.lookup;
export const has = defaultRegistry.has;
export const getAll = defaultRegistry.getAll;
export const clear = defaultRegistry.clear;

export default defaultRegistry;
