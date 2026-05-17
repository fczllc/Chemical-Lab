import {
  Color,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
} from 'three';

const DEFAULT_SURFACE_SEGMENTS = 32;

export function createLiquidSurface({
  width = 2,
  depth = 2,
  color = 0x4fb3ff,
  opacity = 0.55,
  level = 0,
  segments = DEFAULT_SURFACE_SEGMENTS,
} = {}) {
  const geometry = new PlaneGeometry(width, depth, segments, segments);
  const material = new MeshPhysicalMaterial({
    color: new Color(color),
    transparent: true,
    opacity,
    roughness: 0.18,
    metalness: 0,
    transmission: 0.18,
    side: DoubleSide,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'LiquidSurface';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = level;
  mesh.userData.level = level;

  function setColor(nextColor) {
    material.color.set(nextColor);
  }

  function setLevel(nextLevel) {
    mesh.position.y = nextLevel;
    mesh.userData.level = nextLevel;
  }

  function setOpacity(nextOpacity) {
    material.opacity = Math.max(0, Math.min(1, nextOpacity));
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  mesh.userData.dispose = dispose;

  return {
    mesh,
    geometry,
    material,
    setColor,
    setLevel,
    setOpacity,
    dispose,
  };
}
