/** ===== Three.js WebGPU 场景 ===== */
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

let scene, camera, renderer, animationId;
let mouseX = 0, mouseY = 0;

export async function initScene(canvas) {
  try {
    // 创建场景
    scene = new THREE.Scene();
    
    // 相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    
    // WebGPU 渲染器（自动回退到 WebGL2）
    renderer = new WebGPURenderer({ 
      canvas, 
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    
    await renderer.init();
    
    // 鼠标视差
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
    
    return { scene, camera, renderer };
  } catch (error) {
    console.warn('WebGPU 初始化失败，使用 WebGL 回退:', error);
    // 回退到 WebGLRenderer
    renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
    
    return { scene, camera, renderer };
  }
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getMouseParallax() {
  return { x: mouseX, y: mouseY };
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function getRenderer() {
  return renderer;
}

export function render() {
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

export function dispose() {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', onResize);
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  scene = null;
  camera = null;
}
