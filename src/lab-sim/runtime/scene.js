import * as THREE from 'three';
import { disposeObject3D } from '../utils/disposal.js';

function createWorkbench() {
  const group = new THREE.Group();
  group.name = 'LabWorkbench';

  const topGeometry = new THREE.BoxGeometry(12, 0.35, 5);
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b5a35,
    roughness: 0.72,
    metalness: 0.08
  });
  const top = new THREE.Mesh(topGeometry, topMaterial);
  top.name = 'WorkbenchTop';
  top.position.y = 0.9;
  top.receiveShadow = true;
  group.add(top);

  const legGeometry = new THREE.BoxGeometry(0.35, 1.8, 0.35);
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c3822,
    roughness: 0.8
  });
  const legPositions = [
    [-5.4, 0, -2.1],
    [5.4, 0, -2.1],
    [-5.4, 0, 2.1],
    [5.4, 0, 2.1]
  ];

  legPositions.forEach(([x, y, z], index) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.name = `WorkbenchLeg${index + 1}`;
    leg.position.set(x, y, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  });

  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.04, 2.8),
    new THREE.MeshStandardMaterial({
      color: 0x2c7a7b,
      roughness: 0.55,
      metalness: 0.02
    })
  );
  mat.name = 'ExperimentSafetyMat';
  mat.position.set(0, 1.1, 0);
  mat.receiveShadow = true;
  group.add(mat);

  return group;
}

function createLights(shadows) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  ambientLight.name = 'LabAmbientLight';

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
  keyLight.name = 'LabKeyLight';
  keyLight.position.set(4, 7, 5);
  keyLight.castShadow = shadows;

  if (keyLight.shadow) {
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
  }

  const fillLight = new THREE.HemisphereLight(0xb8e6ff, 0x6a4a2f, 0.5);
  fillLight.name = 'LabFillLight';

  return { ambientLight, keyLight, fillLight };
}

function resolveAspect(width, height) {
  if (width && height) {
    return width / height;
  }

  if (typeof window !== 'undefined' && window.innerHeight) {
    return window.innerWidth / window.innerHeight;
  }

  return 16 / 9;
}

export function createLabScene(options = {}) {
  const scene = new THREE.Scene();
  scene.name = 'ChemistryLabScene';
  scene.background = new THREE.Color(options.backgroundColor ?? 0xf6fbff);

  const camera = new THREE.PerspectiveCamera(
    options.fov ?? 55,
    resolveAspect(options.width, options.height),
    options.near ?? 0.1,
    options.far ?? 100
  );
  camera.name = 'ChemistryLabCamera';
  camera.position.set(0, 4.2, 9.5);
  camera.lookAt(0, 1, 0);

  const lights = createLights(Boolean(options.shadows));
  scene.add(lights.ambientLight, lights.keyLight, lights.fillLight);

  const workbench = createWorkbench();
  scene.add(workbench);

  return {
    scene,
    camera,
    lights,
    workbench,
    resize(width, height) {
      camera.aspect = resolveAspect(width, height);
      camera.updateProjectionMatrix();
    },
    dispose() {
      disposeObject3D(scene, { removeFromParent: false });
      scene.clear();
    }
  };
}
