/**
 * 电子轨道 3D 模型
 * 性能模式会控制轨道层级和动画复杂度
 */
import * as THREE from 'three';

const MODE_CONFIG = {
  normal: {
    maxShells: 3,
    maxElectronsPerShell: 4,
    orbitTubeRadius: 0.008,
    orbitSegments: 48,
    nucleusSegments: 20,
    electronSegments: 10,
    rotationMultiplier: 0.55,
    wobbleAmplitude: 0.16,
    pulseAmplitude: 0.03,
    maxPixelRatio: 1.25,
    targetFps: 30
  },
  'high-performance': {
    maxShells: Number.POSITIVE_INFINITY,
    maxElectronsPerShell: 8,
    orbitTubeRadius: 0.01,
    orbitSegments: 100,
    nucleusSegments: 32,
    electronSegments: 16,
    rotationMultiplier: 1,
    wobbleAmplitude: 0.3,
    pulseAmplitude: 0.05,
    maxPixelRatio: 2,
    targetFps: 60
  }
};

function sanitizeMode(mode) {
  return MODE_CONFIG[mode] ? mode : 'normal';
}

function getModeConfig(mode) {
  return MODE_CONFIG[sanitizeMode(mode)];
}

function disposeObject(object) {
  if (!object) {
    return;
  }

  object.traverse?.((child) => {
    child.geometry?.dispose?.();

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material?.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  });
}

export function createElectronModel(container, electronConfig, options = {}) {
  let performanceMode = sanitizeMode(options.performanceMode || window.appState?.settings?.performanceMode);
  let modeConfig = getModeConfig(performanceMode);
  let animationId = null;
  let isPaused = false;
  let lastFrameTime = 0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, modeConfig.maxPixelRatio));
  container.appendChild(renderer.domElement);

  let nucleus = null;
  let orbitGroups = [];

  const clock = new THREE.Clock();

  function buildModel() {
    orbitGroups.forEach((group) => {
      scene.remove(group);
      disposeObject(group);
    });

    if (nucleus) {
      scene.remove(nucleus);
      disposeObject(nucleus);
      nucleus = null;
    }

    orbitGroups = [];
    modeConfig = getModeConfig(performanceMode);

    const shells = parseElectronConfig(
      electronConfig,
      modeConfig.maxShells,
      modeConfig.maxElectronsPerShell
    );

    const nucleusGeometry = new THREE.SphereGeometry(0.3, modeConfig.nucleusSegments, modeConfig.nucleusSegments);
    const nucleusMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 0.9
    });
    nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    scene.add(nucleus);

    shells.forEach((shell, shellIndex) => {
      const radius = 1.2 + shellIndex * 0.8;
      const orbitGroup = new THREE.Group();

      const orbitGeometry = new THREE.TorusGeometry(
        radius,
        modeConfig.orbitTubeRadius,
        16,
        modeConfig.orbitSegments
      );
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: performanceMode === 'normal' ? 0.2 : 0.3
      });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      orbitGroup.add(orbit);

      for (let i = 0; i < shell.electrons; i += 1) {
        const angle = (i / shell.electrons) * Math.PI * 2;
        const electronGeometry = new THREE.SphereGeometry(0.12, modeConfig.electronSegments, modeConfig.electronSegments);
        const electronMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.9
        });
        const electron = new THREE.Mesh(electronGeometry, electronMaterial);

        electron.position.set(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        );

        electron.userData = {
          radius,
          angle,
          shellIndex
        };

        orbitGroup.add(electron);
      }

      scene.add(orbitGroup);
      orbitGroups.push(orbitGroup);
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, modeConfig.maxPixelRatio));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.render(scene, camera);
  }

  function animate(now = performance.now()) {
    animationId = requestAnimationFrame(animate);

    if (isPaused || document.hidden) {
      lastFrameTime = now;
      return;
    }

    const frameDuration = 1000 / modeConfig.targetFps;
    if (now - lastFrameTime < frameDuration) {
      return;
    }

    lastFrameTime = now;
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    orbitGroups.forEach((group, index) => {
      group.rotation.z += delta * (0.3 + index * 0.1) * modeConfig.rotationMultiplier * (index % 2 === 0 ? 1 : -1);
      group.rotation.x = Math.sin(time * 0.2 + index) * modeConfig.wobbleAmplitude;
    });

    if (nucleus) {
      const pulse = 1 + Math.sin(time * 3) * modeConfig.pulseAmplitude;
      nucleus.scale.set(pulse, pulse, pulse);
    }

    renderer.render(scene, camera);
  }

  function resize() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function setPerformanceMode(mode) {
    performanceMode = sanitizeMode(mode);
    lastFrameTime = 0;
    buildModel();
  }

  function pause() {
    isPaused = true;
  }

  function resume() {
    if (document.hidden) {
      return;
    }

    isPaused = false;
    lastFrameTime = 0;
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      pause();
      return;
    }

    resume();
  }

  buildModel();
  clock.start();
  animate();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    dispose: () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      orbitGroups.forEach((group) => {
        scene.remove(group);
        disposeObject(group);
      });

      if (nucleus) {
        scene.remove(nucleus);
        disposeObject(nucleus);
      }

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
    pause,
    resume,
    resize,
    setPerformanceMode
  };
}

function parseElectronConfig(config, maxShells, maxElectronsPerShell) {
  if (!config || config === 'unknown') {
    return [{ electrons: 1 }];
  }

  const shells = [];
  const matches = config.match(/\d+[spdf]\d+/g);

  if (!matches) {
    return [{ electrons: 1 }];
  }

  const shellMap = new Map();

  matches.forEach((match) => {
    const shellNum = Number.parseInt(match[0], 10);
    const electronCount = Number.parseInt(match.slice(2), 10);

    if (!shellMap.has(shellNum)) {
      shellMap.set(shellNum, 0);
    }

    shellMap.set(shellNum, shellMap.get(shellNum) + electronCount);
  });

  const sortedShells = Array.from(shellMap.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, Number.isFinite(maxShells) ? maxShells : undefined);

  sortedShells.forEach(([shellNum, count]) => {
    shells.push({
      shell: shellNum,
      electrons: Math.min(count, maxElectronsPerShell)
    });
  });

  return shells.length > 0 ? shells : [{ electrons: 1 }];
}
