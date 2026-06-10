/**
 * e3d.ts — ExtendScript host module
 * Runs inside After Effects ExtendScript engine.
 * Integrates with Element 3D plugin by creating a solid layer with E3D effect applied.
 */

declare const app: any;
declare const CompItem: any;

export function setupE3DLayer(modelPath: string): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    // Create a solid layer named for E3D
    const solidName = 'Tripo4AE_E3D';
    const solidLayer = comp.layers.addSolid(
      [0.1, 0.1, 0.1], // dark gray
      solidName,
      comp.width,
      comp.height,
      1,      // pixel aspect ratio
      comp.duration
    );

    // Make it 3D
    solidLayer.threeDLayer = true;

    // Attempt to apply Element 3D effect
    const e3dEffectNames = [
      'Element',
      'Element 3D',
      'VideoCopilot Element 3D',
    ];

    let effectApplied = false;
    for (const name of e3dEffectNames) {
      try {
        const effect = solidLayer.Effects.addProperty(name);
        if (effect) {
          effectApplied = true;
          break;
        }
      } catch (_) {
        // Effect not found, try next
      }
    }

    if (!effectApplied) {
      return JSON.stringify({
        ok: true,
        data: {
          layer: solidName,
          effectApplied: false,
          guidance:
            'Element 3D effect could not be applied automatically. ' +
            'Please apply "Element" effect manually from the Effect menu, ' +
            'then open Scene Setup and import the model from: ' + modelPath,
        },
      });
    }

    return JSON.stringify({
      ok: true,
      data: {
        layer: solidName,
        effectApplied: true,
        guidance:
          'Element 3D effect applied. Open Scene Setup and import the model from: ' +
          modelPath +
          '. Configure materials and render settings as needed.',
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
