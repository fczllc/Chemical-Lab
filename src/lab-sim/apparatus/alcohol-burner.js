import * as THREE from 'three';

export function createAlcoholBurner() {
  const group = new THREE.Group();
  group.userData.apparatusId = 'alcohol-burner';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xcfefff,
    transparent: true,
    opacity: 0.38,
    transmission: 0.8,
    roughness: 0.08,
    thickness: 0.1
  });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8593a3, metalness: 0.72, roughness: 0.28 });
  const wickMaterial = new THREE.MeshStandardMaterial({ color: 0x3f342a, roughness: 0.9 });
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa629, transparent: true, opacity: 0.74 });

  const base = new THREE.Mesh(new THREE.SphereGeometry(0.48, 40, 20), glass);
  base.scale.y = 0.55;
  base.position.y = -0.28;
  group.add(base);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.45, 32), glass);
  neck.position.y = 0.08;
  group.add(neck);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32), metal);
  collar.position.y = 0.34;
  group.add(collar);

  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 16), wickMaterial);
  wick.position.y = 0.5;
  group.add(wick);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 24), flameMaterial);
  flame.position.y = 0.82;
  group.add(flame);

  return group;
}
