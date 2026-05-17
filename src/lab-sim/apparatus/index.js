import { createAlcoholBurner } from './alcohol-burner.js';
import { createBeaker } from './beaker.js';
import { createDropper } from './dropper.js';
import { createFunnel } from './funnel.js';
import { createGasJar } from './gas-jar.js';
import { createGlassRod } from './glass-rod.js';
import { createGraduatedCylinder } from './graduated-cylinder.js';
import { createIronStand } from './iron-stand.js';
import { createSafetyShield } from './safety-shield.js';
import { createTestTube } from './test-tube.js';
import { createThermometer } from './thermometer.js';
import { createTubing } from './tubing.js';
import { APPARATUS_METADATA } from './metadata.js';

export { APPARATUS_METADATA } from './metadata.js';

export const APPARATUS_IDS = Object.freeze([
  'beaker',
  'test-tube',
  'graduated-cylinder',
  'dropper',
  'alcohol-burner',
  'thermometer',
  'iron-stand',
  'tubing',
  'gas-jar',
  'funnel',
  'glass-rod',
  'safety-shield'
]);

const APPARATUS_FACTORIES = Object.freeze({
  'beaker': createBeaker,
  'test-tube': createTestTube,
  'graduated-cylinder': createGraduatedCylinder,
  'dropper': createDropper,
  'alcohol-burner': createAlcoholBurner,
  'thermometer': createThermometer,
  'iron-stand': createIronStand,
  'tubing': createTubing,
  'gas-jar': createGasJar,
  'funnel': createFunnel,
  'glass-rod': createGlassRod,
  'safety-shield': createSafetyShield
});

export function createApparatus(id) {
  const factory = APPARATUS_FACTORIES[id];
  if (!factory) {
    throw new Error(`Unknown apparatus: ${id}`);
  }

  const group = factory();
  group.userData.apparatusId = id;
  group.userData.metadata = APPARATUS_METADATA[id];
  return group;
}

export const apparatusFactories = APPARATUS_FACTORIES;
