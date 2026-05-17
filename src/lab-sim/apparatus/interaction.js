import * as THREE from 'three';

const HIGHLIGHT_COLOR = new THREE.Color(0x65d9ff);
const SELECTED_COLOR = new THREE.Color(0xffd166);

export function createApparatusInteraction({
  camera,
  domElement,
  apparatus = [],
  onHover = () => {},
  onSelect = () => {}
} = {}) {
  if (!camera) {
    throw new Error('createApparatusInteraction requires a camera');
  }
  if (!domElement) {
    throw new Error('createApparatusInteraction requires a domElement');
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const apparatusGroups = new Set(apparatus);
  let hovered = null;
  let selected = null;

  function setApparatus(nextApparatus) {
    apparatusGroups.clear();
    nextApparatus.forEach((group) => apparatusGroups.add(group));
  }

  function getInteractiveObjects() {
    const objects = [];
    apparatusGroups.forEach((group) => {
      group.traverse((object) => {
        if (object.isMesh) {
          objects.push(object);
        }
      });
    });
    return objects;
  }

  function updatePointer(event) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pick(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(getInteractiveObjects(), true);
    return hit ? findApparatusGroup(hit.object, apparatusGroups) : null;
  }

  function highlight(group) {
    if (hovered === group) {
      return;
    }
    if (hovered) {
      hovered.userData.highlighted = false;
      applyTint(hovered, hovered === selected ? SELECTED_COLOR : null);
    }

    hovered = group ?? null;
    if (hovered) {
      hovered.userData.highlighted = true;
      if (hovered !== selected) {
        applyTint(hovered, HIGHLIGHT_COLOR);
      }
    }
    onHover(hovered);
  }

  function clearHighlight() {
    highlight(null);
  }

  function select(group) {
    if (selected && selected !== group) {
      selected.userData.selected = false;
      applyTint(selected, selected === hovered ? HIGHLIGHT_COLOR : null);
    }

    selected = group ?? null;
    if (selected) {
      selected.userData.selected = true;
      applyTint(selected, SELECTED_COLOR);
    }
    onSelect(selected);
  }

  function handlePointerMove(event) {
    highlight(pick(event));
  }

  function handleClick(event) {
    const group = pick(event);
    if (group) {
      select(group);
    }
  }

  domElement.addEventListener('pointermove', handlePointerMove);
  domElement.addEventListener('click', handleClick);

  return {
    raycaster,
    setApparatus,
    highlight,
    clearHighlight,
    select,
    getHovered: () => hovered,
    getSelected: () => selected,
    dispose() {
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('click', handleClick);
      clearHighlight();
      select(null);
      apparatusGroups.clear();
    }
  };
}

function findApparatusGroup(object, apparatusGroups) {
  let current = object;
  while (current) {
    if (apparatusGroups.has(current) || current.userData?.apparatusId) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function applyTint(group, color) {
  group.traverse((object) => {
    if (!object.isMesh) {
      return;
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => tintMaterial(material, color));
  });
}

function tintMaterial(material, color) {
  if (!material) {
    return;
  }
  if (!material.userData.originalEmissive && material.emissive) {
    material.userData.originalEmissive = material.emissive.clone();
  }

  if (material.emissive) {
    material.emissive.copy(color ?? material.userData.originalEmissive ?? new THREE.Color(0x000000));
  }
}
