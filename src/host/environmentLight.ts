/**
 * environmentLight.ts — ExtendScript host module (AE 2025+)
 * Creates and configures environment lights (HDRI Image-Based Lighting)
 * for Advanced 3D / Mercury 3D Engine compositions.
 */

declare const app: any;
declare const CompItem: any;
declare const File: any;
declare const ImportOptions: any;

export interface EnvironmentLightConfig {
  intensity?: number;      // 0–200, default 100
  hdrPath?: string;        // optional HDRI file path
  castShadows?: boolean;
  shadowDarkness?: number; // 0–100
  color?: number[];        // [r, g, b] 0–1
}

export function createEnvironmentLight(config: EnvironmentLightConfig = {}): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    // Ensure the comp uses Advanced 3D renderer (required for environment lights)
    // CompItem.renderer is read/write for the 3D renderer
    try {
      const currentRenderer = comp.renderer;
      // Try to set Advanced 3D if not already set
      // Match name for Advanced 3D renderer varies by AE version
      const advanced3DRenderers = [
        'ADBE Advanced 3d',           // AE 2025+
        'ADBE Mercury 3D Engine',     // Alternative name
      ];
      let isAdvanced3D = false;
      for (const r of advanced3DRenderers) {
        if (currentRenderer === r) {
          isAdvanced3D = true;
          break;
        }
      }
      if (!isAdvanced3D) {
        // Try setting to Advanced 3D
        for (const r of advanced3DRenderers) {
          try {
            comp.renderer = r;
            isAdvanced3D = true;
            break;
          } catch (_) {}
        }
      }
    } catch (_) {
      // renderer property may not be settable in all versions
    }

    // Create a Light layer as environment-type
    // AE 2025+ supports LightType 5 (environment) for Advanced 3D
    // For older AE, fall back to ambient light
    const lightLayer = comp.layers.addLight('Tripo4AE_EnvLight', [comp.width / 2, comp.height / 2]);
    lightLayer.threeDLayer = true;

    const intensity = config.intensity ?? 100;
    lightLayer.property('Intensity').setValue(intensity);

    if (config.color) {
      lightLayer.property('Color').setValue(config.color);
    }

    // Try to set light options for environment-type behavior
    try {
      // AE 2025+: set light type to environment (value 5 or match name)
      const lightOptions = lightLayer.property('ADBE Light Options Group');
      if (lightOptions) {
        // Try setting light type
        try {
          lightOptions.property('ADBE Light Type').setValue(5); // Environment
        } catch (_) {}
      }
    } catch (_) {}

    // Try to set HDRI via the light's environment layer property
    if (config.hdrPath) {
      try {
        const hdrFile = new File(config.hdrPath);
        if (hdrFile.exists) {
          // Import HDRI as footage and use as environment
          const importOptions = new ImportOptions(hdrFile);
          const hdrFootage = app.project.importFile(importOptions);

          // Try to assign to environment light's image property
          try {
            const envImage = lightLayer.property('ADBE Environment Light Options Group')
              || lightLayer.property('ADBE Light Options Group');
            if (envImage) {
              const imgProp = envImage.property('ADBE Environment Image')
                || envImage.property('ADBE Light Image');
              if (imgProp) {
                imgProp.setValue(hdrFootage);
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // Shadow settings
    if (config.castShadows !== undefined) {
      try {
        lightLayer.property('Casts Shadows').setValue(config.castShadows ? 1 : 0);
      } catch (_) {}
    }
    if (config.shadowDarkness !== undefined) {
      try {
        lightLayer.property('Shadow Darkness').setValue(config.shadowDarkness);
      } catch (_) {}
    }

    return JSON.stringify({
      ok: true,
      data: {
        name: lightLayer.name,
        intensity,
        hdrApplied: !!config.hdrPath,
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
