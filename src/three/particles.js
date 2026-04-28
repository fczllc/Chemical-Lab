/** ===== 粒子系统 ===== */
import * as THREE from 'three';
import { getScene, getCamera, getRenderer, getMouseParallax } from './scene.js';

let starField, energyParticles, energyLines;
let animationId;
const clock = new THREE.Clock();

export function initParticles() {
  const scene = getScene();
  if (!scene) return;
  
  createStarField(scene);
  createEnergyParticles(scene);
  createEnergyLines(scene);
  
  animate();
}

function createStarField(scene) {
  const count = 5000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinklePhase = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
    sizes[i] = Math.random() * 2 + 0.5;
    twinklePhase[i] = Math.random() * Math.PI * 2;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
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
  scene.add(starField);
}

function createEnergyParticles(scene) {
  const count = 200;
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
  
  for (let i = 0; i < count; i++) {
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

function createEnergyLines(scene) {
  const lineCount = 30;
  const lines = [];
  
  for (let i = 0; i < lineCount; i++) {
    const points = [];
    const segments = 20;
    const startX = (Math.random() - 0.5) * 80;
    const startY = (Math.random() - 0.5) * 50;
    const startZ = -20 + Math.random() * 10;
    
    for (let j = 0; j < segments; j++) {
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

function animate() {
  animationId = requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const delta = clock.getDelta();
  const parallax = getMouseParallax();
  
  // 星空视差
  if (starField) {
    starField.rotation.y += 0.0002;
    starField.position.x = parallax.x * 2;
    starField.position.y = parallax.y * 2;
    
    // 闪烁效果
    const sizes = starField.geometry.attributes.size.array;
    const twinkles = starField.geometry.attributes.twinkle.array;
    for (let i = 0; i < sizes.length; i++) {
      const twinkle = Math.sin(time * 2 + twinkles[i]) * 0.3 + 0.7;
      sizes[i] = (starField.geometry.attributes.size.array[i] || 1) * twinkle;
    }
    starField.geometry.attributes.size.needsUpdate = true;
  }
  
  // 能量粒子流动
  if (energyParticles) {
    const positions = energyParticles.geometry.attributes.position.array;
    const velocities = energyParticles.userData.velocities;
    
    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;
      
      // 边界重置
      if (Math.abs(positions[i * 3]) > 30) velocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > 20) velocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > 10) velocities[i].z *= -1;
    }
    
    energyParticles.geometry.attributes.position.needsUpdate = true;
    energyParticles.rotation.y = time * 0.02;
  }
  
  // 能量线波动
  if (energyLines) {
    energyLines.forEach(line => {
      const positions = line.geometry.attributes.position.array;
      const speed = line.userData.speed;
      const offset = line.userData.offset;
      
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += Math.sin(time * speed + offset + i * 0.3) * 0.01;
      }
      line.geometry.attributes.position.needsUpdate = true;
    });
  }
  
  // 渲染
  const renderer = getRenderer();
  const camera = getCamera();
  const scene = getScene();
  if (renderer && camera && scene) {
    renderer.render(scene, camera);
  }
}

export function disposeParticles() {
  if (animationId) cancelAnimationFrame(animationId);
  
  const scene = getScene();
  if (!scene) return;
  
  if (starField) {
    scene.remove(starField);
    starField.geometry.dispose();
    starField.material.dispose();
  }
  if (energyParticles) {
    scene.remove(energyParticles);
    energyParticles.geometry.dispose();
    energyParticles.material.dispose();
  }
  if (energyLines) {
    energyLines.forEach(line => {
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    });
  }
}
