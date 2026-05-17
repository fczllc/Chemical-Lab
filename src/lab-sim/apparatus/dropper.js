import * as THREE from 'three';

export function createDropper() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'dropper';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xdaf8ff,
    transparent: true,
    opacity: 0.36,
    transmission: 0.84,
    roughness: 0.04,
    thickness: 0.05
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.72 });

  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.045, 1.45, 24), glass);
  pipe.position.y = -0.12;
  group.add(pipe);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 24), glass);
  tip.position.y = -1.0;
  tip.rotation.x = Math.PI;
  group.add(tip);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.23, 32, 16), rubber);
  bulb.scale.y = 1.28;
  bulb.position.y = 0.78;
  group.add(bulb);

  return group;
}
