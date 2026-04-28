/**
 * 元素光谱能量可视化
 * 使用 Three.js 展示元素特征能量
 */
import * as THREE from 'three';

export function createElementEnergyScene(container, element) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 根据元素类别设置颜色
  const categoryColors = {
    'alkali metal': 0xff4444,
    'alkaline earth metal': 0xff8844,
    'transition metal': 0xffdd44,
    'post-transition metal': 0x44ff44,
    'metalloid': 0x44ffaa,
    'reactive nonmetal': 0x44aaff,
    'noble gas': 0x8844ff,
    'halogen': 0xff44ff,
    'lanthanide': 0xff4488,
    'actinide': 0xff88aa,
    'unknown': 0x888888
  };

  const color = categoryColors[element.category] || 0x44aaff;

  // 创建多层能量环
  const rings = [];
  const ringCount = Math.min(element.period + 2, 7);
  
  for (let i = 0; i < ringCount; i++) {
    const geometry = new THREE.TorusGeometry(0.8 + i * 0.5, 0.03, 16, 100);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6 - i * 0.08
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    rings.push(ring);
  }

  // 中心核心球
  const coreGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(core);

  // 能量粒子
  const particleCount = 50;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 3;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    velocities.push({
      angle: angle,
      radius: radius,
      speed: 0.01 + Math.random() * 0.02,
      yOffset: Math.random() * Math.PI * 2
    });
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: color,
    size: 0.1,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  let animationId;
  const clock = new THREE.Clock();

  function animate() {
    animationId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // 旋转环
    rings.forEach((ring, i) => {
      ring.rotation.z += 0.005 * (i % 2 === 0 ? 1 : -1) * (1 + i * 0.2);
    });

    // 脉动核心
    const scale = 1 + Math.sin(time * 2) * 0.1;
    core.scale.set(scale, scale, scale);

    // 更新粒子位置
    const posArray = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const v = velocities[i];
      v.angle += v.speed;
      posArray[i * 3] = Math.cos(v.angle) * v.radius;
      posArray[i * 3 + 1] = Math.sin(time + v.yOffset) * 0.5;
      posArray[i * 3 + 2] = Math.sin(v.angle) * v.radius;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y = time * 0.1;

    renderer.render(scene, camera);
  }

  animate();

  return {
    dispose: () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
    resize: () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
  };
}
