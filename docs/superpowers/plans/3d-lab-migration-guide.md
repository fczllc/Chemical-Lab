# 3D Lab Migration Guide

This guide provides instructions for extending and maintaining the 3D lab simulation system in Element Explorer Kids.

## Adding a New 3D Experiment

1. Create a new experiment data file in `src/data/experiments/`.
2. Define the experiment schema according to `src/data/schemas/simulation.schema.json`.
3. Register the experiment in `src/modules/experimentRegistry.js`.
4. Implement the specific simulation logic in `src/three/simulations/`.
5. Add the simulation entry point to the 3D runtime loader in `src/three/runtime.js`.

## Reaction Template List

Current supported reaction templates:
- `neutralization`: Acid-base neutralization reactions.
- `displacement`: Single and double displacement reactions.
- `combustion`: Exothermic combustion reactions.
- `redox`: Oxidation-reduction reactions.

Templates are located in `src/three/simulations/templates/`.

## Adding New Equipment Components

1. Create the 3D model (GLTF/GLB) and place it in `src/assets/models/apparatus/`.
2. Define the component interaction behavior in `src/three/components/`.
3. Register the component in `src/three/apparatusManager.js` to enable dragging and placement logic.

For further details, consult the codebase or reach out to the development team.
