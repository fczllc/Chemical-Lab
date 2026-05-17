import * as THREE from 'three';

export function createGlassRod() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'glass-rod';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe4fbff,
    transparent: true,
    opacity: 0.38,
    transmission: 0.88,
    roughness: 0.03,
    thickness: 0.04
  });

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.85, 24), glass);
  rod.rotation.z = -0.38;
  group.add(rod);

  return group;
}
