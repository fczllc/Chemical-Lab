import * as THREE from 'three';

export function createSafetyShield() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'safety-shield';

  const shieldMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xbdefff,
    transparent: true,
    opacity: 0.26,
    transmission: 0.76,
    roughness: 0.12,
    thickness: 0.08,
    side: THREE.DoubleSide
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x8ca7b7, metalness: 0.55, roughness: 0.32 });

  const panel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.35, 48, 1, true, -Math.PI / 3, Math.PI * 2 / 3), shieldMaterial);
  panel.rotation.z = Math.PI / 2;
  group.add(panel);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.18), edgeMaterial);
  base.position.y = -0.72;
  group.add(base);

  return group;
}
