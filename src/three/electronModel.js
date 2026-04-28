/**
 * 电子轨道 3D 模型
 * 简化版电子云可视化
 */
import * as THREE from 'three';

export function createElectronModel(container, electronConfig) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 解析电子排布
  const shells = parseElectronConfig(electronConfig);
  const electrons = [];
  const orbitGroups = [];

  // 原子核
  const nucleusGeometry = new THREE.SphereGeometry(0.3, 32, 32);
  const nucleusMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6644,
    transparent: true,
    opacity: 0.9
  });
  const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
  scene.add(nucleus);

  // 创建轨道和电子
  shells.forEach((shell, shellIndex) => {
    const radius = 1.2 + shellIndex * 0.8;
    const orbitGroup = new THREE.Group();
    
    // 轨道环
    const orbitGeometry = new THREE.TorusGeometry(radius, 0.01, 16, 100);
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.3
    });
    const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbit.rotation.x = Math.PI / 2;
    orbitGroup.add(orbit);

    // 电子
    for (let i = 0; i < shell.electrons; i++) {
      const angle = (i / shell.electrons) * Math.PI * 2;
      const electronGeometry = new THREE.SphereGeometry(0.12, 16, 16);
      const electronMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.9
      });
      const electron = new THREE.Mesh(electronGeometry, electronMaterial);
      
      electron.userData = {
        radius: radius,
        angle: angle,
        speed: 0.5 + shellIndex * 0.2,
        shellIndex: shellIndex
      };
      
      orbitGroup.add(electron);
      electrons.push(electron);
    }

    scene.add(orbitGroup);
    orbitGroups.push(orbitGroup);
  });

  let animationId;
  const clock = new THREE.Clock();

  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 旋转轨道组
    orbitGroups.forEach((group, i) => {
      group.rotation.z += delta * (0.3 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      group.rotation.x = Math.sin(time * 0.2 + i) * 0.3;
    });

    // 脉动原子核
    const pulse = 1 + Math.sin(time * 3) * 0.05;
    nucleus.scale.set(pulse, pulse, pulse);

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

function parseElectronConfig(config) {
  if (!config || config === 'unknown') {
    return [{ electrons: 1 }];
  }
  
  const shells = [];
  const matches = config.match(/\d+[spdf]\d+/g);
  
  if (!matches) {
    return [{ electrons: 1 }];
  }

  const shellMap = new Map();
  
  matches.forEach(match => {
    const shellNum = parseInt(match[0]);
    const electronCount = parseInt(match.slice(2));
    
    if (!shellMap.has(shellNum)) {
      shellMap.set(shellNum, 0);
    }
    shellMap.set(shellNum, shellMap.get(shellNum) + electronCount);
  });

  const sortedShells = Array.from(shellMap.entries()).sort((a, b) => a[0] - b[0]);
  
  sortedShells.forEach(([shellNum, count]) => {
    shells.push({
      shell: shellNum,
      electrons: Math.min(count, 8) // 简化显示，最多显示8个电子
    });
  });

  return shells.length > 0 ? shells : [{ electrons: 1 }];
}
