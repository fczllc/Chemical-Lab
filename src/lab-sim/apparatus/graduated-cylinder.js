import * as THREE from 'three';

export function createGraduatedCylinder() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'graduated-cylinder';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd4f6ff,
    transparent: true,
    opacity: 0.3,
    transmission: 0.88,
    roughness: 0.04,
    thickness: 0.08,
    side: THREE.DoubleSide
  });
  const mark = new THREE.MeshStandardMaterial({ color: 0x234052, roughness: 0.45 });

  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.2, 40, 1, true), glass);
  cylinder.position.y = 0.25;
  group.add(cylinder);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 40), glass);
  base.position.y = -0.9;
  group.add(base);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 8, 40), glass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.35;
  group.add(rim);

  for (let i = 0; i < 10; i += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(i % 5 === 0 ? 0.18 : 0.11, 0.012, 0.01), mark);
    line.position.set(0.32, -0.65 + i * 0.18, 0);
    group.add(line);
  }

  return group;
}
