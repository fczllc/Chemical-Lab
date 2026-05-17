import * as THREE from 'three';

export function createGasJar() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'gas-jar';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd9f5ff,
    transparent: true,
    opacity: 0.31,
    transmission: 0.86,
    roughness: 0.04,
    thickness: 0.09,
    side: THREE.DoubleSide
  });
  const frosted = new THREE.MeshPhysicalMaterial({
    color: 0xf3fbff,
    transparent: true,
    opacity: 0.55,
    transmission: 0.45,
    roughness: 0.72
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.45, 44, 1, true), glass);
  body.position.y = -0.02;
  group.add(body);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 44), glass);
  bottom.position.y = -0.75;
  group.add(bottom);

  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.51, 0.16, 44), frosted);
  mouth.position.y = 0.78;
  group.add(mouth);

  return group;
}
