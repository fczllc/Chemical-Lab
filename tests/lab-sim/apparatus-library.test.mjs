import assert from 'node:assert/strict';
import test from 'node:test';

import * as THREE from 'three';

import { APPARATUS_METADATA } from '../../src/lab-sim/apparatus/metadata.js';
import { APPARATUS_IDS, createApparatus } from '../../src/lab-sim/apparatus/index.js';
import { createApparatusInteraction } from '../../src/lab-sim/apparatus/interaction.js';

const REQUIRED_IDS = [
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
];

function collectMaterials(group) {
  const materials = [];
  group.traverse((object) => {
    if (object.isMesh) {
      if (Array.isArray(object.material)) {
        materials.push(...object.material);
      } else {
        materials.push(object.material);
      }
    }
  });
  return materials;
}

test('apparatus metadata exposes Chinese-first copy for all MVP apparatus IDs', () => {
  assert.deepEqual(APPARATUS_IDS, REQUIRED_IDS);
  assert.deepEqual(Object.keys(APPARATUS_METADATA), REQUIRED_IDS);

  for (const id of REQUIRED_IDS) {
    const metadata = APPARATUS_METADATA[id];
    assert.equal(typeof metadata.name, 'string');
    assert.ok(metadata.name.length > 0);
    assert.equal(typeof metadata.nameEn, 'string');
    assert.ok(metadata.nameEn.length > 0);
    assert.equal(typeof metadata.usage, 'string');
    assert.ok(metadata.usage.includes('用于'));
    assert.ok(Array.isArray(metadata.safetyNotes));
    assert.ok(metadata.safetyNotes.length >= 2);
  }
});

test('createApparatus returns tagged THREE.Group instances with physical glass and metallic stand materials', () => {
  for (const id of REQUIRED_IDS) {
    const group = createApparatus(id);

    assert.equal(group.type, 'Group');
    assert.equal(group.userData.apparatusId, id);
    assert.ok(group.children.length > 0);
  }

  const beakerMaterials = collectMaterials(createApparatus('beaker'));
  assert.ok(beakerMaterials.some((material) => material instanceof THREE.MeshPhysicalMaterial));
  assert.ok(beakerMaterials.some((material) => material.transparent && material.transmission > 0));

  const standMaterials = collectMaterials(createApparatus('iron-stand'));
  assert.ok(standMaterials.some((material) => material instanceof THREE.MeshStandardMaterial));
  assert.ok(standMaterials.some((material) => material.metalness > 0.5));

  assert.throws(() => createApparatus('unknown-tool'), /Unknown apparatus/u);
});

test('interaction controller tracks hover and selection callbacks for apparatus groups', () => {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const beaker = createApparatus('beaker');
  const target = beaker.children.find((child) => child.isMesh);
  assert.ok(target, 'fixture needs at least one mesh child');

  const domElement = {
    clientWidth: 100,
    clientHeight: 100,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    },
    addEventListener() {},
    removeEventListener() {}
  };
  const events = [];
  const interaction = createApparatusInteraction({
    camera,
    domElement,
    apparatus: [beaker],
    onHover: (group) => events.push(['hover', group?.userData.apparatusId ?? null]),
    onSelect: (group) => events.push(['select', group?.userData.apparatusId ?? null])
  });

  interaction.highlight(beaker);
  assert.equal(interaction.getHovered(), beaker);
  assert.equal(events.at(-1)[0], 'hover');
  assert.equal(events.at(-1)[1], 'beaker');

  interaction.select(beaker);
  assert.equal(interaction.getSelected(), beaker);
  assert.equal(beaker.userData.selected, true);
  assert.deepEqual(events.at(-1), ['select', 'beaker']);

  interaction.clearHighlight();
  assert.equal(interaction.getHovered(), null);
  assert.equal(beaker.userData.highlighted, false);

  interaction.dispose();
});
