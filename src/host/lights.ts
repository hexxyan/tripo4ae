/**
 * lights.ts — ExtendScript host module
 * Runs inside After Effects ExtendScript engine.
 * Creates a three-point lighting setup: key, fill, and rim lights.
 */

declare const app: any;
declare const CompItem: any;

interface LightsConfig {
  intensity?: number;   // master intensity (0-200), default 100
  color?: number[];     // [r, g, b] 0-1, default white [1, 1, 1]
  keyAngle?: number;    // horizontal angle for key light, default 45
  fillRatio?: number;   // fill intensity relative to key, default 0.4
  rimRatio?: number;    // rim intensity relative to key, default 0.6
}

export function createLights(config: LightsConfig = {}): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    const intensity = config.intensity || 100;
    const color = config.color || [1, 1, 1];
    const keyAngle = (config.keyAngle || 45) * (Math.PI / 180);
    const fillRatio = config.fillRatio || 0.4;
    const rimRatio = config.rimRatio || 0.6;

    const cx = comp.width / 2;
    const cy = comp.height / 2;
    const dist = Math.max(comp.width, comp.height);

    const lights: Array<{ name: string; x: number; y: number; z: number; intensity: number }> = [];

    // Key light — upper-right front
    lights.push({
      name: 'Tripo4AE_Key',
      x: cx + dist * Math.cos(keyAngle),
      y: cy - dist * 0.6,
      z: dist * Math.sin(keyAngle),
      intensity: intensity,
    });

    // Fill light — left side, softer
    lights.push({
      name: 'Tripo4AE_Fill',
      x: cx - dist * Math.cos(keyAngle),
      y: cy - dist * 0.3,
      z: dist * 0.5,
      intensity: intensity * fillRatio,
    });

    // Rim light — behind and above
    lights.push({
      name: 'Tripo4AE_Rim',
      x: cx,
      y: cy - dist * 0.8,
      z: -dist * 0.8,
      intensity: intensity * rimRatio,
    });

    const created: string[] = [];

    for (const light of lights) {
      const layer = comp.layers.addLight(light.name, [light.x, light.y]);
      layer.property('Intensity').setValue(light.intensity);
      layer.property('Color').setValue(color);
      layer.property('Position').setValue([light.x, light.y, light.z]);
      layer.threeDLayer = true;
      created.push(light.name);
    }

    return JSON.stringify({
      ok: true,
      data: { lights: created },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
