import * as THREE from 'three';

export function createIronStand() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'iron-stand';

  const metal = new THREE.MeshStandardMaterial({ color: 0x6d7784, metalness: 0.78, roughness: 0.24 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.75), metal);
  base.position.y = -0.85;
  group.add(base);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.25, 24), metal);
  rod.position.set(-0.45, 0.25, 0);
  group.add(rod);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 20), metal);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0, 0.55, 0);
  group.add(arm);

  const clampA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.08), metal);
  clampA.position.set(0.48, 0.62, 0.11);
  group.add(clampA);

  const clampB = clampA.clone();
  clampB.position.z = -0.11;
  group.add(clampB);

  return group;
}
