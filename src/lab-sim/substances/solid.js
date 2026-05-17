import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';

function randomOffset(random, spread) {
  return (random() - 0.5) * spread;
}

export function createSolidParticles({
  count = 24,
  color = 0xf2c94c,
  particleSize = 0.08,
  spread = 0.9,
  shape = 'mixed',
  random = Math.random,
} = {}) {
  const group = new Group();
  group.name = 'SolidParticles';

  const boxGeometry = new BoxGeometry(particleSize, particleSize, particleSize);
  const sphereGeometry = new SphereGeometry(particleSize * 0.55, 12, 8);
  const material = new MeshStandardMaterial({
    color: new Color(color),
    roughness: 0.75,
    metalness: 0.02,
  });
  const particles = [];

  for (let index = 0; index < count; index += 1) {
    const useSphere = shape === 'sphere' || (shape === 'mixed' && index % 2 === 1);
    const mesh = new Mesh(useSphere ? sphereGeometry : boxGeometry, material);
    mesh.name = `SolidParticle-${index + 1}`;
    mesh.position.set(
      randomOffset(random, spread),
      random() * particleSize * 2,
      randomOffset(random, spread),
    );
    mesh.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    group.add(mesh);
    particles.push(mesh);
  }

  function setColor(nextColor) {
    material.color.set(nextColor);
  }

  function dispose() {
    group.clear();
    boxGeometry.dispose();
    sphereGeometry.dispose();
    material.dispose();
  }

  group.userData.dispose = dispose;

  return {
    group,
    particles,
    setColor,
    dispose,
  };
}
