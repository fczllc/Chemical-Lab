function disposeResource(resource, disposedResources) {
  if (!resource || typeof resource.dispose !== 'function' || disposedResources.has(resource)) {
    return;
  }

  disposedResources.add(resource);
  resource.dispose();
}

function disposeMaterialTextures(material, disposedResources) {
  for (const value of Object.values(material)) {
    if (value && value.isTexture) {
      disposeResource(value, disposedResources);
    }
  }

  if (material.uniforms) {
    for (const uniform of Object.values(material.uniforms)) {
      const value = uniform?.value;
      if (value && value.isTexture) {
        disposeResource(value, disposedResources);
      }
    }
  }
}

export function disposeMaterial(material, disposedResources = new Set()) {
  if (Array.isArray(material)) {
    material.forEach((entry) => disposeMaterial(entry, disposedResources));
    return;
  }

  if (!material) {
    return;
  }

  disposeMaterialTextures(material, disposedResources);
  disposeResource(material, disposedResources);
}

export function disposeObject3D(object, options = {}) {
  const {
    removeFromParent = true,
    disposeGeometry = true,
    disposeMaterials = true,
    disposeSkeletons = true
  } = options;
  const disposedResources = new Set();

  if (!object || typeof object.traverse !== 'function') {
    return;
  }

  object.traverse((child) => {
    if (disposeGeometry) {
      disposeResource(child.geometry, disposedResources);
    }

    if (disposeMaterials) {
      disposeMaterial(child.material, disposedResources);
    }

    if (disposeSkeletons) {
      disposeResource(child.skeleton, disposedResources);
    }
  });

  if (removeFromParent && object.parent) {
    object.parent.remove(object);
  }
}

export function disposeRendererResources(renderer) {
  if (!renderer) {
    return;
  }

  renderer.renderLists?.dispose?.();
  renderer.dispose?.();
}
