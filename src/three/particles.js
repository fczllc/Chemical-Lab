/** ===== 粒子系统 ===== */
import * as THREE from 'three';
import {
  getScene,
  getMouseParallax,
  getPerformanceMode,
  getTargetFrameDuration,
  isRendererPaused
} from './scene.js';

const PARTICLE_LEVELS = {
  normal: 0.5,
  'high-performance': 1
};

const MAX_COUNTS = {
  stars: 5000,
  particles: 200,
  lines: 30
};

let starField = null;
let energyParticles = null;
let energyLines = [];
let animationId = null;
let performanceMode = 'normal';
let lastUpdateTime = 0;
const clock = new THREE.Clock();

function getDensityMultiplier(mode = performanceMode) {
  return PARTICLE_LEVELS[mode] || PARTICLE_LEVELS.normal;
}

function getCounts(mode = performanceMode) {
  const density = getDensityMultiplier(mode);

  return {
    stars: Math.max(1, Math.floor(MAX_COUNTS.stars * density)),
    particles: Math.max(1, Math.floor(MAX_COUNTS.particles * density)),
    lines: Math.max(1, Math.floor(MAX_COUNTS.lines * density))
  };
}

function clearObject3D(object, activeScene) {
  if (!object) {
    return;
  }

  activeScene?.remove(object);
  object.geometry?.dispose?.();

  if (Array.isArray(object.material)) {
    object.material.forEach((material) => material?.dispose?.());
  } else {
    object.material?.dispose?.();
  }
}

function clearEffectObjects() {
  const scene = getScene();

  clearObject3D(starField, scene);
  clearObject3D(energyParticles, scene);

  energyLines.forEach((line) => {
    clearObject3D(line, scene);
  });

  starField = null;
  energyParticles = null;
  energyLines = [];
}

function createStarField(scene, count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const baseSizes = new Float32Array(count);
  const twinklePhase = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
    baseSizes[i] = Math.random() * 2 + 0.5;
    twinklePhase[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(baseSizes), 1));
  geometry.setAttribute('twinkle', new THREE.BufferAttribute(twinklePhase, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });

  starField = new THREE.Points(geometry, material);
  starField.userData.baseSizes = baseSizes;
  scene.add(starField);
}

function createEnergyParticles(scene, count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocities = [];

  const colorPalette = [
    new THREE.Color(0x00f0ff),
    new THREE.Color(0xb829ff),
    new THREE.Color(0xff8c00),
    new THREE.Color(0x00ff88)
  ];

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    velocities.push({
      x: (Math.random() - 0.5) * 0.02,
      y: (Math.random() - 0.5) * 0.02,
      z: (Math.random() - 0.5) * 0.01
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2,
    transparent: true,
    opacity: 0.6,
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });

  energyParticles = new THREE.Points(geometry, material);
  energyParticles.userData.velocities = velocities;
  scene.add(energyParticles);
}

function createEnergyLines(scene, lineCount) {
  const lines = [];

  for (let i = 0; i < lineCount; i += 1) {
    const points = [];
    const segments = 20;
    const startX = (Math.random() - 0.5) * 80;
    const startY = (Math.random() - 0.5) * 50;
    const startZ = -20 + Math.random() * 10;

    for (let j = 0; j < segments; j += 1) {
      points.push(new THREE.Vector3(
        startX + j * 2,
        startY + Math.sin(j * 0.5) * 3,
        startZ
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: Math.random() > 0.5 ? 0x00f0ff : 0xb829ff,
      transparent: true,
      opacity: 0.15
    });

    const line = new THREE.Line(geometry, material);
    line.userData.speed = 0.2 + Math.random() * 0.3;
    line.userData.offset = Math.random() * Math.PI * 2;
    lines.push(line);
    scene.add(line);
  }

  energyLines = lines;
}

function recreateParticles() {
  const scene = getScene();
  if (!scene) {
    return;
  }

  clearEffectObjects();
  const counts = getCounts();
  createStarField(scene, counts.stars);
  createEnergyParticles(scene, counts.particles);
  createEnergyLines(scene, counts.lines);
}

function animate(now = performance.now()) {
  animationId = requestAnimationFrame(animate);

  if (document.hidden || isRendererPaused()) {
    lastUpdateTime = now;
    return;
  }

  const frameDuration = getTargetFrameDuration();
  if (now - lastUpdateTime < frameDuration) {
    return;
  }

  lastUpdateTime = now;
  const time = clock.getElapsedTime();
  const parallax = getMouseParallax();

  if (starField) {
    starField.rotation.y += performanceMode === 'normal' ? 0.00012 : 0.0002;
    starField.position.x = parallax.x * 2;
    starField.position.y = parallax.y * 2;

    const sizes = starField.geometry.attributes.size.array;
    const baseSizes = starField.userData.baseSizes || sizes;
    const twinkles = starField.geometry.attributes.twinkle.array;

    for (let i = 0; i < sizes.length; i += 1) {
      const twinkle = Math.sin(time * 2 + twinkles[i]) * 0.3 + 0.7;
      sizes[i] = baseSizes[i] * twinkle;
    }

    starField.geometry.attributes.size.needsUpdate = true;
  }

  if (energyParticles) {
    const positions = energyParticles.geometry.attributes.position.array;
    const velocities = energyParticles.userData.velocities || [];

    for (let i = 0; i < velocities.length; i += 1) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;

      if (Math.abs(positions[i * 3]) > 30) velocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > 20) velocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > 10) velocities[i].z *= -1;
    }

    energyParticles.geometry.attributes.position.needsUpdate = true;
    energyParticles.rotation.y = time * (performanceMode === 'normal' ? 0.012 : 0.02);
  }

  energyLines.forEach((line) => {
    const positions = line.geometry.attributes.position.array;
    const speed = line.userData.speed;
    const offset = line.userData.offset;

    for (let i = 0; i < positions.length / 3; i += 1) {
      positions[i * 3 + 1] += Math.sin(time * speed + offset + i * 0.3) * 0.01;
    }

    line.geometry.attributes.position.needsUpdate = true;
  });
}

export function initParticles(mode = getPerformanceMode()) {
  performanceMode = mode;
  recreateParticles();

  if (!animationId) {
    clock.start();
    lastUpdateTime = 0;
    animate();
  }
}

export function setParticleDensity(mode = getPerformanceMode()) {
  performanceMode = mode;
  lastUpdateTime = 0;
  recreateParticles();
}

export function disposeParticles() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  clearEffectObjects();
  clock.stop();
  lastUpdateTime = 0;
}
