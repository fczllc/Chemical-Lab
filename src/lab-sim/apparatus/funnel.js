import * as THREE from 'three';

export function createFunnel() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'funnel';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd9f7ff,
    transparent: true,
    opacity: 0.34,
    transmission: 0.84,
    roughness: 0.04,
    thickness: 0.06,
    side: THREE.DoubleSide
  });

  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.9, 44, 1, true), glass);
  cone.rotation.x = Math.PI;
  cone.position.y = 0.28;
  group.add(cone);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 8, 44), glass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.73;
  group.add(rim);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.82, 28), glass);
  neck.position.y = -0.5;
  group.add(neck);

  return group;
}
