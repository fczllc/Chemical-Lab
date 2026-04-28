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
    wobbleAmplitude: 0.12,
    pulseAmplitude: 0.028,
    maxPixelRatio: 1.25,
    targetFps: 30,
    electronSpeedMultiplier: 0.8,
    glowOpacity: 0.2,
    electronScale: 0.1
  },
  'high-performance': {
    maxShells: Number.POSITIVE_INFINITY,
    maxElectronsPerShell: 8,
    orbitTubeRadius: 0.01,
    orbitSegments: 100,
    nucleusSegments: 32,
    electronSegments: 16,
    rotationMultiplier: 1,
    wobbleAmplitude: 0.24,
    pulseAmplitude: 0.05,
    maxPixelRatio: 2,
    targetFps: 60,
    electronSpeedMultiplier: 1.15,
    glowOpacity: 0.34,
    electronScale: 0.12
  }
};

const SUPERSCRIPT_MAP = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9'
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
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, modeConfig.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const ambient = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0x7dd3fc, 1.4, 30, 2);
  pointLight.position.set(2.6, 3.2, 6);
  scene.add(pointLight);

  let nucleus = null;
  let aura = null;
  let orbitGroups = [];

  const clock = new THREE.Clock();
  const accentColor = new THREE.Color(options.accentColor || '#38bdf8');

  function buildModel() {
    orbitGroups.forEach((group) => {
      sceneRoot.remove(group);
      disposeObject(group);
    });

    if (nucleus) {
      sceneRoot.remove(nucleus);
      disposeObject(nucleus);
      nucleus = null;
    }

    if (aura) {
      sceneRoot.remove(aura);
      disposeObject(aura);
      aura = null;
    }

    orbitGroups = [];
    modeConfig = getModeConfig(performanceMode);

    const shells = parseElectronConfig(
      electronConfig,
      modeConfig.maxShells,
      modeConfig.maxElectronsPerShell
    );

    const maxRadius = 1.2 + Math.max(0, shells.length - 1) * 0.84;

    const nucleusGeometry = new THREE.SphereGeometry(0.32, modeConfig.nucleusSegments, modeConfig.nucleusSegments);
    const nucleusMaterial = new THREE.MeshPhongMaterial({
      color: accentColor.clone().lerp(new THREE.Color('#ffffff'), 0.18),
      emissive: accentColor.clone().multiplyScalar(0.35),
      transparent: true,
      opacity: 0.94,
      shininess: 90
    });
    nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    sceneRoot.add(nucleus);

    const auraGeometry = new THREE.SphereGeometry(0.54, 18, 18);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: modeConfig.glowOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    aura = new THREE.Mesh(auraGeometry, auraMaterial);
    sceneRoot.add(aura);

    shells.forEach((shell, shellIndex) => {
      const radius = 1.2 + shellIndex * 0.84;
      const orbitGroup = new THREE.Group();
      const tilt = shellIndex * 0.42;

      const orbitGeometry = new THREE.TorusGeometry(
        radius,
        modeConfig.orbitTubeRadius,
        16,
        modeConfig.orbitSegments
      );
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: accentColor.clone().lerp(new THREE.Color('#dbeafe'), 0.25),
        transparent: true,
        opacity: performanceMode === 'normal' ? 0.18 : 0.3
      });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      orbitGroup.add(orbit);

      for (let index = 0; index < shell.electrons; index += 1) {
        const electronGeometry = new THREE.SphereGeometry(
          modeConfig.electronScale,
          modeConfig.electronSegments,
          modeConfig.electronSegments
        );
        const electronMaterial = new THREE.MeshBasicMaterial({
          color: accentColor.clone().lerp(new THREE.Color('#ffffff'), 0.35),
          transparent: true,
          opacity: 0.94
        });
        const electron = new THREE.Mesh(electronGeometry, electronMaterial);
        const angle = (index / shell.electrons) * Math.PI * 2;
        const axis = new THREE.Vector3(
          Math.cos(tilt + index * 0.8),
          0,
          Math.sin(tilt + index * 0.8)
        ).normalize();

        electron.userData = {
          radius,
          baseAngle: angle,
          orbitAxis: axis,
          orbitNormal: new THREE.Vector3(0, 1, 0),
          speed: (0.45 + shellIndex * 0.12 + (index % 3) * 0.06) * modeConfig.electronSpeedMultiplier,
          phase: index * 0.75,
          wobble: 0.04 + shellIndex * 0.008
        };

        positionElectron(electron, 0);
        orbitGroup.add(electron);
      }

      orbitGroup.rotation.y = tilt;
      orbitGroup.rotation.x = (shellIndex % 2 === 0 ? 1 : -1) * tilt * 0.55;
      sceneRoot.add(orbitGroup);
      orbitGroups.push(orbitGroup);
    });

    sceneRoot.scale.setScalar(options.animatedEntrance ? 0.84 : 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, modeConfig.maxPixelRatio));
    resize(maxRadius);
    renderer.render(scene, camera);
  }

  function positionElectron(electron, time) {
    const { radius, baseAngle, orbitAxis, orbitNormal, speed, phase, wobble } = electron.userData;
    const angle = baseAngle + time * speed + phase;
    const orbitalVector = orbitAxis.clone().multiplyScalar(Math.cos(angle) * radius);
    const verticalVector = orbitNormal.clone().multiplyScalar(Math.sin(angle) * radius);
    electron.position.copy(orbitalVector.add(verticalVector));

    const scale = 1 + Math.sin(time * 2.8 + phase) * wobble;
    electron.scale.setScalar(scale);
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
      group.rotation.z += delta * (0.18 + index * 0.06) * modeConfig.rotationMultiplier * (index % 2 === 0 ? 1 : -1);
      group.rotation.x += Math.sin(time * 0.35 + index) * 0.0009;

      group.children.forEach((child) => {
        if (child.geometry?.type === 'SphereGeometry') {
          positionElectron(child, time);
        }
      });
    });

    if (nucleus) {
      const pulse = 1 + Math.sin(time * 3) * modeConfig.pulseAmplitude;
      nucleus.scale.set(pulse, pulse, pulse);
    }

    if (aura) {
      const auraPulse = 1.06 + Math.sin(time * 2.2) * 0.05;
      aura.scale.set(auraPulse, auraPulse, auraPulse);
    }

    if (options.animatedEntrance && sceneRoot.scale.x < 1) {
      const nextScale = Math.min(1, sceneRoot.scale.x + delta * 1.8);
      sceneRoot.scale.setScalar(nextScale);
    }

    sceneRoot.rotation.y += delta * 0.16;
    renderer.render(scene, camera);
  }

  function resize(maxRadiusOverride) {
    const width = Math.max(container.clientWidth || 1, 1);
    const height = Math.max(container.clientHeight || Math.min(260, Math.max(180, width * 0.58)), 1);
    const maxRadius = maxRadiusOverride || inferMaxRadius();

    camera.aspect = width / height;
    camera.position.set(0, 0, Math.max(6.8, maxRadius * 2.8));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function inferMaxRadius() {
    return orbitGroups.reduce((maxRadius, group) => {
      const electrons = group.children.filter((child) => child.userData?.radius);
      const groupRadius = electrons.reduce((groupMax, electron) => Math.max(groupMax, electron.userData.radius), 1.2);
      return Math.max(maxRadius, groupRadius);
    }, 1.2);
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
        sceneRoot.remove(group);
        disposeObject(group);
      });

      if (nucleus) {
        sceneRoot.remove(nucleus);
        disposeObject(nucleus);
      }

      if (aura) {
        sceneRoot.remove(aura);
        disposeObject(aura);
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
  const normalizedConfig = normalizeElectronConfig(config);
  if (!normalizedConfig || normalizedConfig === 'unknown') {
    return [{ shell: 1, electrons: 1 }];
  }

  const shellMap = new Map();
  const matches = Array.from(normalizedConfig.matchAll(/(\d)([spdfg])(\d+)/g));

  if (matches.length === 0) {
    return [{ shell: 1, electrons: 1 }];
  }

  matches.forEach((match) => {
    const shellNum = Number.parseInt(match[1], 10);
    const electronCount = Number.parseInt(match[3], 10);

    if (!shellMap.has(shellNum)) {
      shellMap.set(shellNum, 0);
    }

    shellMap.set(shellNum, shellMap.get(shellNum) + electronCount);
  });

  const sortedShells = Array.from(shellMap.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, Number.isFinite(maxShells) ? maxShells : undefined)
    .map(([shell, electrons]) => ({
      shell,
      electrons: Math.max(1, Math.min(electrons, maxElectronsPerShell))
    }));

  return sortedShells.length > 0 ? sortedShells : [{ shell: 1, electrons: 1 }];
}

function normalizeElectronConfig(config = '') {
  return config
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (character) => SUPERSCRIPT_MAP[character] || character)
    .replace(/\s+/g, ' ')
    .trim();
}
