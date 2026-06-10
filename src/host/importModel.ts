/**
 * importModel.ts — ExtendScript host module (AE 2024.4+ / 2025 / 2026)
 * Imports a 3D model file into the AE project with Advanced 3D renderer support.
 * Detects ThreeDModelLayer (AE 24.4+), activates Advanced 3D renderer, and sets up
 * the 3D model layer for optimal display.
 */

declare const app: any;
declare const CompItem: any;
declare const ImportOptions: any;
declare const File: any;

// Advanced 3D renderer match names (varies by AE version)
const ADVANCED_3D_RENDERERS = [
  'ADBE Advanced 3d',
  'ADBE Mercury 3D Engine',
];

function ensureAdvanced3DRenderer(comp: any): boolean {
  try {
    const current = comp.renderer;
    for (const r of ADVANCED_3D_RENDERERS) {
      if (current === r) return true;
    }
    for (const r of ADVANCED_3D_RENDERERS) {
      try {
        comp.renderer = r;
        return true;
      } catch (_) {}
    }
  } catch (_) {}
  return false;
}

function enableTimeRemap(layer: any): void {
  try {
    layer.timeRemapEnabled = true;
  } catch (_) {}
}

function getEmbeddedAnimations(layer: any): string[] {
  try {
    // AE stores embedded animation names in the Animation Options property
    // Property path: Animation Options > Name (dropdown menu)
    const animOptions = layer.property('ADBE Animation Options');
    if (!animOptions) return [];

    const nameProp = animOptions.property('ADBE Animation Name')
      || animOptions.property('ADBE Anim Options Name');
    if (!nameProp) return [];

    const names: string[] = [];
    // Dropdown property: enumerate menu items
    const menuItems = nameProp.propertyGroup
      ? nameProp.value // Current selection
      : null;

    // Try to read dropdown menu values
    try {
      for (let i = 1; i <= nameProp.numKeys || 0; i++) {
        names.push(String(nameProp.keyValue(i)));
      }
    } catch (_) {}

    // If no keys, try reading the dropdown menu directly
    if (names.length === 0) {
      try {
        const dropdownVal = nameProp.value;
        if (dropdownVal !== undefined && dropdownVal !== null) {
          names.push(String(dropdownVal));
        }
      } catch (_) {}
    }

    return names;
  } catch (_) {
    return [];
  }
}

export interface ImportConfig {
  autoScale?: boolean;       // Auto-scale model to fit comp, default true
  centerInComp?: boolean;    // Center model in composition, default true
  enableTimeRemap?: boolean; // Enable time remapping for embedded animations
  selectEmbeddedAnim?: number; // Index of embedded animation to select (1-based)
}

export function importModelToProject(modelPath: string, configJson?: string): string {
  try {
    const file = new File(modelPath);
    if (!file.exists) {
      return JSON.stringify({ ok: false, error: 'File not found: ' + modelPath });
    }

    let config: ImportConfig = {
      autoScale: true,
      centerInComp: true,
      enableTimeRemap: true,
    };

    if (configJson) {
      try {
        config = JSON.parse(configJson);
      } catch (_) {}
    }

    // Import as footage
    const io = new ImportOptions(file);
    const footage = app.project.importFile(io);

    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({
        ok: true,
        data: { name: footage.name, addedToComp: false },
      });
    }

    // Ensure Advanced 3D renderer for 3D model support
    const hasAdvanced3D = ensureAdvanced3DRenderer(comp);

    // Add footage as layer
    const layer = comp.layers.add(footage);
    let isThreeDModelLayer = false;

    // Check if layer is a ThreeDModelLayer (AE 24.4+)
    try {
      // ThreeDModelLayer is a subclass of AVLayer
      // instanceof check may work in newer AE versions
      if (layer.threeDModelLayer !== undefined) {
        isThreeDModelLayer = true;
      }
      // Also check constructor name
      if (layer.constructor && layer.constructor.name === 'ThreeDModelLayer') {
        isThreeDModelLayer = true;
      }
    } catch (_) {}

    // Make the layer 3D
    try {
      layer.threeDLayer = true;
    } catch (_) {}

    // Center in comp
    if (config.centerInComp && layer.position) {
      layer.position.setValue([comp.width / 2, comp.height / 2]);
    }

    // Enable time remap for embedded animation access
    if (config.enableTimeRemap) {
      enableTimeRemap(layer);
    }

    // Select embedded animation if requested
    if (config.selectEmbeddedAnim) {
      try {
        const animOptions = layer.property('ADBE Animation Options');
        if (animOptions) {
          const nameProp = animOptions.property('ADBE Animation Name')
            || animOptions.property('ADBE Anim Options Name');
          if (nameProp) {
            nameProp.setValue(config.selectEmbeddedAnim);
          }
        }
      } catch (_) {}
    }

    // Detect embedded animations
    const embeddedAnimations = getEmbeddedAnimations(layer);

    return JSON.stringify({
      ok: true,
      data: {
        name: footage.name,
        addedToComp: true,
        isThreeDModelLayer,
        hasAdvanced3DRenderer: hasAdvanced3D,
        embeddedAnimations,
        layerIndex: layer.index - 1, // 0-indexed for external use
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
