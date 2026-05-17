import { createLabRuntime } from '../runtime/index.js';
import { createApparatus } from '../apparatus/index.js';
import { createApparatusInteraction } from '../apparatus/interaction.js';
import { getApparatusMetadata } from '../apparatus/metadata.js';

const requiredApparatus = [
  'beaker',
  'test-tube',
  'graduated-cylinder',
  'alcohol-burner',
  'thermometer',
  'safety-shield'
];

const positions = [
  { id: 'beaker', x: -2, z: 0 },
  { id: 'test-tube', x: -1, z: 0.5 },
  { id: 'graduated-cylinder', x: 0, z: 0 },
  { id: 'alcohol-burner', x: 1, z: 0.5 },
  { id: 'thermometer', x: 2, z: 0 },
  { id: 'iron-stand', x: -2, z: -1 },
  { id: 'dropper', x: -1, z: -1 },
  { id: 'tubing', x: 0, z: -1 },
  { id: 'gas-jar', x: 1, z: -1 },
  { id: 'funnel', x: 2, z: -1 },
  { id: 'glass-rod', x: -1.5, z: 1 },
  { id: 'safety-shield', x: 0, z: 1.5 }
];

function createInfoPanel() {
  const panel = document.createElement('div');
  panel.className = 'lab-apparatus-info';
  panel.style.cssText = `
    position: absolute;
    top: 16px;
    right: 16px;
    max-width: 280px;
    background: rgba(255,255,255,0.95);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #333;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10;
  `;
  return panel;
}

function createProgressIndicator() {
  const container = document.createElement('div');
  container.className = 'lab-inspection-progress';
  container.style.cssText = `
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255,255,255,0.95);
    border-radius: 20px;
    padding: 8px 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #2c7a7b;
    z-index: 10;
  `;
  return container;
}

function updateInfoPanel(panel, metadata) {
  if (!metadata) {
    panel.style.opacity = '0';
    return;
  }

  const safetyList = metadata.safetyNotes
    ? metadata.safetyNotes.map((note) => `<li>${note}</li>`).join('')
    : '';

  panel.innerHTML = `
    <h3 style="margin:0 0 8px;font-size:16px;color:#1a202c;">${metadata.name}</h3>
    <p style="margin:0 0 8px;color:#4a5568;">${metadata.usage}</p>
    ${safetyList ? `<ul style="margin:0;padding-left:18px;color:#744210;">${safetyList}</ul>` : ''}
  `;
  panel.style.opacity = '1';
}

function updateProgressIndicator(indicator, checkedCount, totalCount) {
  indicator.textContent = `已检查 ${checkedCount} / ${totalCount} 种器材`;
}

export async function createApparatusRecognitionSimulation(hostElement, options = {}) {
  if (!hostElement) {
    return { success: false, error: new Error('hostElement is required') };
  }

  let sim;
  try {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    hostElement.appendChild(canvas);

    sim = await createLabRuntime(canvas, {
      autoStart: true,
      performanceMode: options.performanceMode,
      shadows: options.shadows,
      ...options.runtime
    });
  } catch (error) {
    return { success: false, error };
  }

  const apparatusMap = new Map();
  const checkedApparatus = new Set();
  let completeCalled = false;

  for (const pos of positions) {
    const apparatus = createApparatus(pos.id);
    apparatus.position.set(pos.x, 1.2, pos.z);
    sim.scene.add(apparatus);
    apparatusMap.set(pos.id, apparatus);
  }

  const infoPanel = createInfoPanel();
  hostElement.appendChild(infoPanel);

  const progressIndicator = createProgressIndicator();
  hostElement.appendChild(progressIndicator);
  updateProgressIndicator(progressIndicator, 0, requiredApparatus.length);

  const interaction = createApparatusInteraction({
    camera: sim.camera,
    domElement: sim.renderer?.domElement || hostElement.querySelector('canvas'),
    apparatus: Array.from(apparatusMap.values()),
    onSelect(selectedGroup) {
      if (!selectedGroup) {
        updateInfoPanel(infoPanel, null);
        return;
      }

      const id = selectedGroup.userData.apparatusId;
      const metadata = getApparatusMetadata(id);
      updateInfoPanel(infoPanel, metadata);

      if (requiredApparatus.includes(id) && !checkedApparatus.has(id)) {
        checkedApparatus.add(id);
        updateProgressIndicator(progressIndicator, checkedApparatus.size, requiredApparatus.length);

        if (checkedApparatus.size === requiredApparatus.length && !completeCalled) {
          completeCalled = true;
          options.onComplete?.();
        }
      }
    }
  });

  function getProgress() {
    return {
      checked: Array.from(checkedApparatus),
      required: requiredApparatus,
      completed: checkedApparatus.size === requiredApparatus.length,
      ratio: checkedApparatus.size / requiredApparatus.length
    };
  }

  function dispose() {
    interaction.dispose();
    infoPanel.remove();
    progressIndicator.remove();
    sim.dispose();
    const canvas = hostElement.querySelector('canvas');
    if (canvas) {
      canvas.remove();
    }
  }

  return {
    success: true,
    sim,
    interaction,
    getProgress,
    dispose
  };
}
