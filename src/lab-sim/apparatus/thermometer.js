import * as THREE from 'three';

export function createThermometer() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'thermometer';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe5fbff,
    transparent: true,
    opacity: 0.35,
    transmission: 0.86,
    roughness: 0.03,
    thickness: 0.04
  });
  const red = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.35 });
  const tick = new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.45 });

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.9, 24), glass);
  tube.position.y = 0.22;
  group.add(tube);

  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.35, 16), red);
  liquid.position.y = -0.05;
  group.add(liquid);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), glass);
  bulb.position.y = -0.85;
  group.add(bulb);

  const bulbLiquid = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), red);
  bulbLiquid.position.y = -0.85;
  group.add(bulbLiquid);

  for (let i = 0; i < 8; i += 1) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(i % 2 === 0 ? 0.14 : 0.09, 0.01, 0.01), tick);
    mark.position.set(0.08, -0.48 + i * 0.22, 0);
    group.add(mark);
  }

  return group;
}
