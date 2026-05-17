import { Color, PointLight } from 'three';

export function createHeatGlow({
  color = 0xff7a1a,
  intensity = 1.2,
  distance = 2.8,
  decay = 2,
  pulseSpeed = 2.4,
  pulseAmount = 0.35,
} = {}) {
  const light = new PointLight(new Color(color), intensity, distance, decay);
  light.name = 'HeatGlow';
  light.userData.baseIntensity = intensity;
  light.userData.heat = 1;

  function update(elapsedSeconds = 0) {
    const pulse = 1 + Math.sin(elapsedSeconds * pulseSpeed) * pulseAmount;
    light.intensity = light.userData.baseIntensity * light.userData.heat * pulse;
  }

  function setHeat(nextHeat) {
    light.userData.heat = Math.max(0, nextHeat);
  }

  function setColor(nextColor) {
    light.color.set(nextColor);
  }

  function dispose() {
    light.removeFromParent();
  }

  light.userData.dispose = dispose;

  return {
    light,
    update,
    setHeat,
    setColor,
    dispose,
  };
}
