import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from 'three';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function fillCloudPositions(array, count, radius, random) {
  for (let index = 0; index < count; index += 1) {
    const stride = index * 3;
    const shell = Math.cbrt(random()) * radius;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    array[stride] = shell * Math.sin(phi) * Math.cos(theta);
    array[stride + 1] = shell * Math.cos(phi);
    array[stride + 2] = shell * Math.sin(phi) * Math.sin(theta);
  }
}

export function createGasParticles({
  density = 0.45,
  maxParticles = 180,
  radius = 1.15,
  color = 0xc7f9ff,
  opacity = 0.42,
  size = 0.035,
  random = Math.random,
} = {}) {
  const safeMaxParticles = Math.max(1, Math.floor(maxParticles));
  const positions = new Float32Array(safeMaxParticles * 3);
  fillCloudPositions(positions, safeMaxParticles, radius, random);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: new Color(color),
    transparent: true,
    opacity,
    size,
    depthWrite: false,
  });
  const points = new Points(geometry, material);
  points.name = 'GasParticleCloud';

  function setDensity(nextDensity) {
    const normalizedDensity = clamp01(nextDensity);
    const particleCount = Math.max(1, Math.round(safeMaxParticles * normalizedDensity));
    geometry.setDrawRange(0, particleCount);
    points.userData.density = normalizedDensity;
    points.userData.particleCount = particleCount;
  }

  function setColor(nextColor) {
    material.color.set(nextColor);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  points.userData.dispose = dispose;
  setDensity(density);

  return {
    points,
    geometry,
    material,
    setDensity,
    setColor,
    dispose,
  };
}
