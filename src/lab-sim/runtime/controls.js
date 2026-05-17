import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createOrbitControls(camera, domElement, options = {}) {
  if (!camera || !domElement) {
    return null;
  }

  const controls = new OrbitControls(camera, domElement);
  const target = options.target || new THREE.Vector3(0, 1, 0);

  controls.enableDamping = options.enableDamping ?? true;
  controls.dampingFactor = options.dampingFactor ?? 0.08;
  controls.enablePan = options.enablePan ?? false;
  controls.enableZoom = options.enableZoom ?? true;
  controls.rotateSpeed = options.rotateSpeed ?? 0.65;
  controls.zoomSpeed = options.zoomSpeed ?? 0.8;
  controls.minDistance = options.minDistance ?? 4;
  controls.maxDistance = options.maxDistance ?? 18;
  controls.minPolarAngle = options.minPolarAngle ?? 0.15;
  controls.maxPolarAngle = options.maxPolarAngle ?? Math.PI * 0.48;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.target.copy(target);
  controls.update();

  return controls;
}
