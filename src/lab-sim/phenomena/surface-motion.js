export function createSurfaceMotion(surfaceMesh, {
  amplitude = 0.025,
  frequency = 4.5,
  speed = 1.4,
} = {}) {
  if (!surfaceMesh?.geometry?.attributes?.position) {
    throw new Error('createSurfaceMotion requires a mesh with position geometry.');
  }

  const position = surfaceMesh.geometry.attributes.position;
  const original = Float32Array.from(position.array);
  let enabled = true;

  function update(elapsedSeconds = 0) {
    if (!enabled) {
      return;
    }

    for (let index = 0; index < position.count; index += 1) {
      const stride = index * 3;
      const x = original[stride];
      const y = original[stride + 1];
      position.array[stride + 2] = original[stride + 2]
        + Math.sin(x * frequency + elapsedSeconds * speed) * amplitude
        + Math.cos(y * frequency * 0.7 + elapsedSeconds * speed * 0.8) * amplitude * 0.5;
    }
    position.needsUpdate = true;
    surfaceMesh.geometry.computeVertexNormals();
  }

  function reset() {
    position.array.set(original);
    position.needsUpdate = true;
    surfaceMesh.geometry.computeVertexNormals();
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    if (!enabled) {
      reset();
    }
  }

  function dispose() {
    reset();
  }

  surfaceMesh.userData.surfaceMotion = { update, dispose };

  return {
    update,
    reset,
    setEnabled,
    dispose,
  };
}
