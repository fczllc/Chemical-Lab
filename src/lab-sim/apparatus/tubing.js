import * as THREE from 'three';

export function createTubing() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'tubing';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xdcf8ff,
    transparent: true,
    opacity: 0.36,
    transmission: 0.82,
    roughness: 0.05,
    thickness: 0.05
  });
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.75, -0.35, 0),
    new THREE.Vector3(-0.35, 0.35, 0),
    new THREE.Vector3(0.28, 0.35, 0),
    new THREE.Vector3(0.72, -0.28, 0)
  ]);

  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 48, 0.055, 18, false), glass);
  group.add(tube);

  return group;
}
