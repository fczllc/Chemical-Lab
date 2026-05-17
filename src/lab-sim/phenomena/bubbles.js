import {
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  SphereGeometry,
} from 'three';

function resetBubble(mesh, radius, random) {
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * radius;
  mesh.position.set(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance,
  );
  mesh.userData.phase = random();
}

export function createBubbleSystem({
  count = 28,
  radius = 0.75,
  height = 1.6,
  bubbleSize = 0.035,
  color = 0xffffff,
  opacity = 0.5,
  speed = 0.45,
  random = Math.random,
} = {}) {
  const group = new Group();
  group.name = 'BubbleSystem';

  const geometry = new SphereGeometry(bubbleSize, 12, 8);
  const bubbles = [];
  const materials = [];

  for (let index = 0; index < count; index += 1) {
    const material = new MeshPhysicalMaterial({
      color: new Color(color),
      transparent: true,
      opacity,
      roughness: 0.05,
      transmission: 0.55,
      depthWrite: false,
    });
    const bubble = new Mesh(geometry, material);
    bubble.name = `Bubble-${index + 1}`;
    resetBubble(bubble, radius, random);
    bubble.position.y = random() * height;
    group.add(bubble);
    bubbles.push(bubble);
    materials.push(material);
  }

  function update(deltaSeconds = 1 / 60) {
    for (const bubble of bubbles) {
      bubble.position.y += speed * deltaSeconds * (0.65 + bubble.userData.phase * 0.7);
      if (bubble.position.y > height) {
        resetBubble(bubble, radius, random);
      }
      const progress = Math.max(0, Math.min(1, bubble.position.y / height));
      bubble.material.opacity = opacity * (1 - progress * 0.75);
      const wobble = Math.sin((progress + bubble.userData.phase) * Math.PI * 2) * 0.006;
      bubble.position.x += wobble;
    }
  }

  function setOpacity(nextOpacity) {
    const safeOpacity = Math.max(0, Math.min(1, nextOpacity));
    for (const material of materials) {
      material.opacity = safeOpacity;
    }
  }

  function dispose() {
    group.clear();
    geometry.dispose();
    for (const material of materials) {
      material.dispose();
    }
  }

  group.userData.dispose = dispose;

  return {
    group,
    bubbles,
    update,
    setOpacity,
    dispose,
  };
}
