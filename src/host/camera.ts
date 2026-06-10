/**
 * camera.ts — ExtendScript host module
 * Runs inside After Effects ExtendScript engine.
 * Creates camera layers with animation presets: orbit, push, track, jib.
 */

declare const app: any;
declare const CompItem: any;

import type { CameraPreset, EasingType } from '../shared/types';

interface CameraConfig {
  preset: CameraPreset;
  easing: EasingType;
  duration: number;
  radius?: number;   // for orbit
  distance?: number;  // for push
  offset?: number;    // for track/jib
}

function setKeyframe(property: any, time: number, value: any): void {
  property.setValueAtTime(time, value);
}

export function createCameraPreset(config: CameraConfig): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    const radius = config.radius || 500;
    const duration = config.duration || 5;
    const cameraName = 'Tripo4AE_Camera';

    // Create a 2-node camera centered in the comp
    const cameraLayer = comp.layers.addCamera(cameraName, [comp.width / 2, comp.height / 2]);

    // Set initial Z position to look at center
    cameraLayer.property('Position').setValue([comp.width / 2, comp.height / 2, -radius]);

    // Enable depth of field off by default for performance
    cameraLayer.property('Depth of Field').setValue(1); // 1 = off in AE

    switch (config.preset) {
      case 'orbit': {
        // 36 keyframes forming a full circle around the center
        const pointOfInterest = cameraLayer.property('Point of Interest');
        const position = cameraLayer.property('Position');
        const cx = comp.width / 2;
        const cy = comp.height / 2;
        const numKeyframes = 36;
        for (let i = 0; i <= numKeyframes; i++) {
          const t = (i / numKeyframes) * duration;
          const angle = (i / numKeyframes) * 2 * Math.PI;
          const x = cx + radius * Math.cos(angle);
          const y = cy;
          const z = radius * Math.sin(angle);
          setKeyframe(position, t, [x, y, z]);
          // Point of interest always looks at center
          setKeyframe(pointOfInterest, t, [cx, cy, 0]);
        }
        break;
      }
      case 'push': {
        // Zoom in from far to close
        const position = cameraLayer.property('Position');
        const startZ = -(radius * 3);
        const endZ = -(radius * 0.5);
        setKeyframe(position, 0, [comp.width / 2, comp.height / 2, startZ]);
        setKeyframe(position, duration, [comp.width / 2, comp.height / 2, endZ]);
        break;
      }
      case 'track': {
        // Lateral movement from left to right
        const offset = config.offset || 400;
        const position = cameraLayer.property('Position');
        setKeyframe(position, 0, [comp.width / 2 - offset, comp.height / 2, -radius]);
        setKeyframe(position, duration, [comp.width / 2 + offset, comp.height / 2, -radius]);
        break;
      }
      case 'jib': {
        // Vertical movement — up
        const offset = config.offset || 300;
        const position = cameraLayer.property('Position');
        const pointOfInterest = cameraLayer.property('Point of Interest');
        const cx = comp.width / 2;
        const cy = comp.height / 2;
        setKeyframe(position, 0, [cx, cy + offset, -radius]);
        setKeyframe(position, duration, [cx, cy - offset, -radius]);
        setKeyframe(pointOfInterest, 0, [cx, cy, 0]);
        setKeyframe(pointOfInterest, duration, [cx, cy, 0]);
        break;
      }
    }

    return JSON.stringify({
      ok: true,
      data: {
        name: cameraLayer.name,
        preset: config.preset,
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
