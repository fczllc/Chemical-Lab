import * as THREE from 'three';

export function createBeaker() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'beaker';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xc9f4ff,
    transparent: true,
    opacity: 0.34,
    transmission: 0.82,
    roughness: 0.05,
    thickness: 0.08,
    side: THREE.DoubleSide
  });
  const edge = new THREE.MeshPhysicalMaterial({
    color: 0xe8fbff,
    transparent: true,
    opacity: 0.62,
    transmission: 0.72,
    roughness: 0.02
  });

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.72, 1.35, 48, 1, true), glass);
  wall.position.y = 0.1;
  group.add(wall);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 48), glass);
  bottom.position.y = -0.6;
  group.add(bottom);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 12, 48), edge);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.8;
  group.add(rim);

  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 3), edge);
  spout.rotation.set(Math.PI / 2, 0, Math.PI / 6);
  spout.position.set(0.78, 0.8, 0);
  group.add(spout);

  return group;
}
