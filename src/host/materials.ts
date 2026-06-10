/**
 * materials.ts — ExtendScript host module (AE 2024.4+ / 2026)
 * Controls 3D model layer Material Options via Adobe Standard Material (ASM).
 * Uses match names for reliable cross-version property access.
 */

declare const app: any;
declare const CompItem: any;

// Match names for AE Advanced 3D Material Options
const MAT_GROUP = 'ADBE Material Options Group';
const MAT_AMBIENT = 'ADBE Ambient Coefficient';
const MAT_DIFFUSE = 'ADBE Diffuse Coefficient';
const MAT_SPECULAR_INTENSITY = 'ADBE Specular Coefficient';
const MAT_SPECULAR_SHININESS = 'ADBE Shininess Coefficient';
const MAT_METAL = 'ADBE Metal Coefficient';
const MAT_LIGHT_TRANSMISSION = 'ADBE Light Transmission';
const MAT_REFLECTION_INTENSITY = 'ADBE Reflection Coefficient';
const MAT_REFLECTION_SHARPNESS = 'ADBE Glossiness Coefficient';
const MAT_REFLECTION_ROLLOFF = 'ADBE Fresnel Coefficient';
const MAT_TRANSPARENCY = 'ADBE Transparency Coefficient';
const MAT_TRANSPARENCY_ROLLOFF = 'ADBE Transp Rolloff';
const MAT_IOR = 'ADBE Index of Refraction';

export interface MaterialProperties {
  ambient?: number;
  diffuse?: number;
  specularIntensity?: number;
  specularShininess?: number;
  metal?: number;
  lightTransmission?: number;
  reflectionIntensity?: number;
  reflectionSharpness?: number;
  reflectionRolloff?: number;
  transparency?: number;
  transparencyRolloff?: number;
  indexOrRefraction?: number;
}

const MATCH_NAME_MAP: Record<keyof MaterialProperties, string> = {
  ambient: MAT_AMBIENT,
  diffuse: MAT_DIFFUSE,
  specularIntensity: MAT_SPECULAR_INTENSITY,
  specularShininess: MAT_SPECULAR_SHININESS,
  metal: MAT_METAL,
  lightTransmission: MAT_LIGHT_TRANSMISSION,
  reflectionIntensity: MAT_REFLECTION_INTENSITY,
  reflectionSharpness: MAT_REFLECTION_SHARPNESS,
  reflectionRolloff: MAT_REFLECTION_ROLLOFF,
  transparency: MAT_TRANSPARENCY,
  transparencyRolloff: MAT_TRANSPARENCY_ROLLOFF,
  indexOrRefraction: MAT_IOR,
};

function setMaterialProp(matGroup: any, key: keyof MaterialProperties, value: number): boolean {
  const matchName = MATCH_NAME_MAP[key];
  if (!matchName) return false;
  try {
    const prop = matGroup.property(matchName);
    if (prop) {
      prop.setValue(value);
      return true;
    }
  } catch (_) {}
  return false;
}

export function setMaterialProperties(config: { layerIndex?: number; material: MaterialProperties }): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    let layer: any;
    if (config.layerIndex !== undefined) {
      layer = comp.layer(config.layerIndex + 1); // AE is 1-indexed
    } else {
      const selected = comp.selectedLayers;
      if (selected.length === 0) {
        return JSON.stringify({ ok: false, error: 'No layer selected' });
      }
      layer = selected[0];
    }

    // Check for Material Options group (3D model layers in Advanced 3D)
    const matGroup = layer.property(MAT_GROUP);
    if (!matGroup) {
      return JSON.stringify({ ok: false, error: 'Layer has no Material Options. Ensure it is a 3D model layer in Advanced 3D renderer.' });
    }

    const applied: string[] = [];
    for (const [key, value] of Object.entries(config.material)) {
      if (typeof value === 'number') {
        const ok = setMaterialProp(matGroup, key as keyof MaterialProperties, value);
        if (ok) applied.push(key);
      }
    }

    return JSON.stringify({
      ok: true,
      data: { appliedProperties: applied },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function getMaterialProperties(layerIndex?: number): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    let layer: any;
    if (layerIndex !== undefined) {
      layer = comp.layer(layerIndex + 1);
    } else {
      const selected = comp.selectedLayers;
      if (selected.length === 0) {
        return JSON.stringify({ ok: false, error: 'No layer selected' });
      }
      layer = selected[0];
    }

    const matGroup = layer.property(MAT_GROUP);
    if (!matGroup) {
      return JSON.stringify({ ok: false, error: 'Layer has no Material Options' });
    }

    const result: Record<string, number> = {};
    for (const [key, matchName] of Object.entries(MATCH_NAME_MAP)) {
      try {
        const prop = matGroup.property(matchName);
        if (prop) {
          result[key] = prop.value;
        }
      } catch (_) {}
    }

    return JSON.stringify({ ok: true, data: result });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
