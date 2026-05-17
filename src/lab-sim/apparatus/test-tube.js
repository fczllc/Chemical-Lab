import * as THREE from 'three';

export function createTestTube() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'test-tube';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd9f7ff,
    transparent: true,
    opacity: 0.32,
    transmission: 0.86,
    roughness: 0.03,
    thickness: 0.06,
    side: THREE.DoubleSide
  });

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.8, 32, 1, true), glass);
  tube.position.y = 0.18;
  group.add(tube);

  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass);
  bottom.position.y = -0.72;
  group.add(bottom);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 32), glass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.08;
  group.add(rim);

  return group;
}
