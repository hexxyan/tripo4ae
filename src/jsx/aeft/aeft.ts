// Tripo4AE — After Effects ExtendScript host functions
// All functions registered via host[ns] in src/jsx/index.ts
// Runs inside AE's ExtendScript engine (ES3 target)

import { getActiveComp, getProjectDir } from "./aeft-utils";

// --- Keyframe helpers ---

function setKeyframe(property: any, time: number, value: any, easeIn?: any[], easeOut?: any[]): void {
  try {
    if (property && property.canSetValue) {
      property.setValueAtTime(time, value);
      if (easeIn || easeOut) {
        var idx = property.nearestKeyIndex(time);
        if (easeIn) property.setTemporalEaseAtKey(idx, easeIn, easeIn);
        if (easeOut) property.setTemporalEaseAtKey(idx, easeOut, easeOut);
      }
    }
  } catch (e) {
    // Ignore to prevent After Effects scripting popup errors and freezes
  }
}

function getEasingEase(type: string): { inEase: any[]; outEase: any[] } {
  switch (type) {
    case "ease-in-out":
      return { inEase: [new KeyframeEase(0, 66)], outEase: [new KeyframeEase(0, 66)] };
    case "bounce":
      return { inEase: [new KeyframeEase(0, 50)], outEase: [new KeyframeEase(0, 90)] };
    case "elastic":
      return { inEase: [new KeyframeEase(0, 33)], outEase: [new KeyframeEase(0, 80)] };
    default:
      return { inEase: [new KeyframeEase(0, 50)], outEase: [new KeyframeEase(0, 50)] };
  }
}

// --- Match name constants (verified from AE Scripting Guide) ---

// Material Options (ADBE Material Options Group)
var MAT_GROUP = "ADBE Material Options Group";
var MAT_MAP: any = {
  ambient: "ADBE Ambient Coefficient",
  diffuse: "ADBE Diffuse Coefficient",
  specularIntensity: "ADBE Specular Coefficient",
  specularShininess: "ADBE Shininess Coefficient",
  metal: "ADBE Metal Coefficient",
  lightTransmission: "ADBE Light Transmission",
  reflectionIntensity: "ADBE Reflection Coefficient",
  reflectionSharpness: "ADBE Glossiness Coefficient",
  reflectionRolloff: "ADBE Fresnel Coefficient",
  transparency: "ADBE Transparency Coefficient",
  transparencyRolloff: "ADBE Transp Rolloff",
  indexOrRefraction: "ADBE Index of Refraction",
};

// Camera Options (ADBE Camera Options Group)
var CAM_GROUP = "ADBE Camera Options Group";
var CAM_MAP: any = {
  zoom: "ADBE Camera Zoom",
  depthOfField: "ADBE Camera Depth of Field",
  focusDistance: "ADBE Camera Focus Distance",
  aperture: "ADBE Camera Aperture",
  blurLevel: "ADBE Camera Blur Level",
  irisShape: "ADBE Camera Iris Shape",
  irisRotation: "ADBE Camera Iris Rotation",
  irisRoundness: "ADBE Camera Iris Roundness",
  irisAspectRatio: "ADBE Camera Iris Aspect Ratio",
  irisDiffractionFringe: "ADBE Camera Iris Diffraction Fringe",
  irisHighlightGain: "ADBE Camera Iris Highlight Gain",
  irisHighlightThreshold: "ADBE Camera Iris Highlight Threshold",
};

// Light Options (ADBE Light Options Group)
var LIGHT_GROUP = "ADBE Light Options Group";
var LIGHT_MAP: any = {
  intensity: "ADBE Light Intensity",
  color: "ADBE Light Color",
  coneAngle: "ADBE Light Cone Angle",
  coneFeather: "ADBE Light Cone Feather",
  falloffType: "ADBE Light Falloff Type",
  falloffStart: "ADBE Light Falloff Start",
  falloffDistance: "ADBE Light Falloff Distance",
  shadowDarkness: "ADBE Light Shadow Darkness",
  shadowDiffusion: "ADBE Light Shadow Diffusion",
  castsShadows: "ADBE Light Casts Shadows",
};

// Light falloff type enum values
var FALLOFF_NONE = 0;
var FALLOFF_SMOOTH = 1;
var FALLOFF_INVERSE = 2;
var FALLOFF_INVERSE_SQUARED = 3;

// Light type enum values
var LIGHT_TYPE_POINT = 2;
var LIGHT_TYPE_AMBIENT = 3;
var LIGHT_TYPE_ENVIRONMENT = 4;

// --- Material presets (PBR SOP) ---
var MATERIAL_PRESETS: any = {
  plastic: { ambient: 0, diffuse: 80, specularIntensity: 50, specularShininess: 10, metal: 0, reflectionIntensity: 5, transparency: 0 },
  metallic: { ambient: 0, diffuse: 40, specularIntensity: 90, specularShininess: 80, metal: 100, reflectionIntensity: 80, reflectionSharpness: 90, transparency: 0 },
  glass: { ambient: 0, diffuse: 10, specularIntensity: 90, specularShininess: 90, metal: 0, reflectionIntensity: 50, transparency: 85, transparencyRolloff: 50, indexOrRefraction: 1.5, lightTransmission: 90 },
  gold: { ambient: 0, diffuse: 50, specularIntensity: 95, specularShininess: 85, metal: 100, reflectionIntensity: 90, reflectionSharpness: 95, reflectionRolloff: 80, transparency: 0 },
  matte: { ambient: 10, diffuse: 90, specularIntensity: 0, specularShininess: 0, metal: 0, reflectionIntensity: 0, transparency: 0 },
  ceramic: { ambient: 0, diffuse: 70, specularIntensity: 60, specularShininess: 40, metal: 0, reflectionIntensity: 30, reflectionSharpness: 70, transparency: 0 },
  rubber: { ambient: 0, diffuse: 90, specularIntensity: 15, specularShininess: 5, metal: 0, reflectionIntensity: 2, transparency: 0 },
  crystal: { ambient: 0, diffuse: 5, specularIntensity: 100, specularShininess: 95, metal: 0, reflectionIntensity: 60, reflectionSharpness: 95, transparency: 90, transparencyRolloff: 30, indexOrRefraction: 2.0, lightTransmission: 95 },
};

// --- Advanced 3D renderer match names ---

function isAdvanced3DName(name: string): boolean {
  var lower = name.toLowerCase();
  
  // CRITICAL: "ADBE Advanced 3d" is the internal match name for Classic 3D!
  if (name === "ADBE Advanced 3d" || lower === "adbe advanced 3d") {
    return false;
  }

  if (lower.indexOf("classic") !== -1 || lower.indexOf("经典") !== -1 || lower.indexOf("clásico") !== -1 || lower.indexOf("classique") !== -1 || lower.indexOf("klassisch") !== -1) {
    return false;
  }
  if (lower.indexOf("cinema") !== -1 || lower.indexOf("c4d") !== -1 || lower.indexOf("ernst") !== -1) {
    return false;
  }
  if (lower.indexOf("advanced") !== -1 || 
      lower.indexOf("calder") !== -1 || 
      lower.indexOf("mercury") !== -1 || 
      lower.indexOf("高级") !== -1 || 
      lower.indexOf("高度") !== -1 || 
      lower.indexOf("avanzado") !== -1 || 
      lower.indexOf("avancée") !== -1 || 
      lower.indexOf("erweitertes") !== -1 || 
      lower.indexOf("engine") !== -1) {
    return true;
  }
  return false;
}

function ensureAdvanced3DRenderer(comp: any): boolean {
  try {
    var before = String(comp.renderer);
    if (isAdvanced3DName(before)) return true;

    // 1. Scan available renderers in composition for localized name
    if (comp.renderers && comp.renderers.length) {
      for (var k = 0; k < comp.renderers.length; k++) {
        var rName = String(comp.renderers[k]);
        if (isAdvanced3DName(rName)) {
          try {
            comp.renderer = rName;
            if (isAdvanced3DName(String(comp.renderer))) return true;
          } catch (e) {}
        }
      }
    }

    // 2. Direct assignment fallbacks
    var fallbacks = ["ADBE Calder", "ADBE Mercury 3D Engine", "ADBE Mercury 3D", "Advanced 3D", "高级 3D", "高度な 3D"];
    for (var j = 0; j < fallbacks.length; j++) {
      try {
        comp.renderer = fallbacks[j];
        if (isAdvanced3DName(String(comp.renderer))) return true;
      } catch (e) {}
    }
    $.writeln("[Tripo4AE] ensureAdvanced3DRenderer failed: before=[" + before + "] after=[" + String(comp.renderer) + "]");
  } catch (e) {
    $.writeln("[Tripo4AE] ensureAdvanced3DRenderer error: " + String(e));
  }
  return false;
}

// --- Expression generators ---

function getSpinExpression(axis: string, speed: number): string {
  return "// Tripo4AE Spin Expression\nvar spd = " + speed + ";\ntime * spd * 360;";
}

function getFloatExpression(axis: string, amplitude: number, frequency: number): string {
  var axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  return "// Tripo4AE Float Expression\nvar amp = " + amplitude + ";\nvar freq = " + frequency + ";\nvar offset = amp * Math.sin(time * freq * 2 * Math.PI);\nvar pos = value;\npos[" + axisIndex + "] += offset;\npos;";
}

function getBreatheExpression(amplitude: number, frequency: number): string {
  return "// Tripo4AE Breathe Expression\nvar amp = " + (amplitude / 100) + ";\nvar freq = " + frequency + ";\nvar s = 1 + amp * Math.sin(time * freq * 2 * Math.PI);\n[value[0] * s, value[1] * s];";
}

function buildExpression(type: string, params: any): string {
  var axis = params.axis || "y";
  var speed = params.speed || 1;
  var amplitude = params.amplitude || 50;
  var frequency = params.frequency || 1;
  switch (type) {
    case "spin": return getSpinExpression(axis, speed);
    case "float": return getFloatExpression(axis, amplitude, frequency);
    case "breathe": return getBreatheExpression(amplitude, frequency);
    default: return "";
  }
}

// --- Layer resolution helper ---

function resolveLayer(comp: any, layerIndex: any): any {
  if (layerIndex !== undefined && layerIndex !== null) {
    return comp.layer(layerIndex + 1); // AE is 1-indexed
  }
  var selected = comp.selectedLayers;
  if (selected.length === 0) return null;
  return selected[0];
}

// ========== EXPORTED FUNCTIONS ==========

export function getActiveCompInfo(): string {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: true, data: null });
    }
    return JSON.stringify({
      ok: true,
      data: {
        name: comp.name,
        width: comp.width,
        height: comp.height,
        frameRate: comp.frameRate,
        duration: comp.duration,
        durationFrames: Math.round(comp.duration * comp.frameRate),
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function importModel(modelPath: string, configJson?: string): string {
  try {
    app.beginUndoGroup("Tripo4AE Import Model");

    var file = new File(modelPath);
    if (!file.exists) {
      app.endUndoGroup();
      return JSON.stringify({ ok: false, error: "File not found: " + modelPath });
    }

    var config: any = { autoScale: true, centerInComp: true, enableTimeRemap: true };
    if (configJson) {
      try { config = JSON.parse(configJson); } catch (e) {
        app.endUndoGroup();
        return JSON.stringify({ ok: false, error: "Invalid config JSON: " + String(e) });
      }
    }

    var io = new ImportOptions(file);
    var footage = app.project.importFile(io);
    var addToComp = config.addToComp !== false;
    var comp = app.project.activeItem;

    if (!addToComp) {
      app.endUndoGroup();
      return JSON.stringify({
        ok: true,
        data: {
          name: footage.name,
          addedToComp: false,
          importedToProject: true,
          hasAdvanced3DRenderer: false,
        },
      });
    }

    if (!comp || !(comp instanceof CompItem)) {
      comp = app.project.items.addComp(
        "Tripo4AE_Comp",
        1920,
        1080,
        1,
        10,
        30
      );
      try { comp.openInViewer(); } catch (e) {}
    }

    // Ensure Advanced 3D renderer
    var hasAdvanced3D = ensureAdvanced3DRenderer(comp);

    var layer = comp.layers.add(footage);
    var isThreeDModelLayer = false;

    // Check for ThreeDModelLayer (AE 24.4+)
    try {
      if (layer.threeDModelLayer !== undefined) isThreeDModelLayer = true;
    } catch (e) {}
    try {
      if (layer.constructor && layer.constructor.name === "ThreeDModelLayer") isThreeDModelLayer = true;
    } catch (e) {}

    // Make 3D
    try { layer.threeDLayer = true; } catch (e) {}

    // Enable Casts Shadows by default
    try {
      var matOpts = layer.property("ADBE Material Options Group");
      if (matOpts) {
        var castsShadowsProp = matOpts.property("ADBE Casts Shadows") || matOpts.property("Casts Shadows") || matOpts.property(1);
        if (castsShadowsProp && castsShadowsProp.canSetValue) castsShadowsProp.setValue(1);
      }
    } catch (e) {}

    // Center in comp
    if (config.centerInComp) {
      try {
        layer.property("Position").setValue([comp.width / 2, comp.height / 2, 0]);
      } catch (e) {}
    }

    // Enable time remap for embedded animation access
    if (config.enableTimeRemap) {
      try { layer.timeRemapEnabled = true; } catch (e) {}
    }

    // Select embedded animation if requested
    if (config.selectEmbeddedAnim) {
      try {
        var animOptions = layer.property("ADBE Animation Options");
        if (animOptions) {
          var nameProp = animOptions.property("ADBE Animation Name") || animOptions.property("ADBE Anim Options Name");
          if (nameProp) nameProp.setValue(config.selectEmbeddedAnim);
        }
      } catch (e) {}

      // Wait briefly for AE to load animation data
      $.sleep(500);
    }

    // Loop the embedded animation via time remap expression
    if (config.loopAnimation && layer.timeRemapEnabled) {
      try {
        var timeRemap = layer.property("Time Remap");
        if (timeRemap && timeRemap.numKeys >= 2) {
          timeRemap.expression = "loopOut('cycle');";
        }
      } catch (e) {}
    }

    app.endUndoGroup();
    return JSON.stringify({
      ok: true,
      data: {
        name: footage.name,
        addedToComp: true,
        isThreeDModelLayer: isThreeDModelLayer,
        hasAdvanced3DRenderer: hasAdvanced3D,
        layerIndex: layer.index - 1,
      },
    });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function applyAnimation(configJson: string): string {
  try {
    var config: any = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var selected = comp.selectedLayers;
    if (selected.length === 0) {
      return JSON.stringify({ ok: false, error: "No layer selected" });
    }
    var layer = selected[0];
    var appliedLoops: string[] = [];

    // Apply model preset
    if (config.modelPreset) {
      var easing = config.easing || "linear";
      var duration = config.duration || 2;
      var ease = getEasingEase(easing);
      var startTime = layer.inPoint;

      switch (config.modelPreset) {
        case "fade-in": {
          var opacity = layer.property("Opacity");
          if (opacity) {
            setKeyframe(opacity, startTime, 0, undefined, ease.outEase);
            setKeyframe(opacity, startTime + duration, 100, ease.inEase, undefined);
          }
          break;
        }
        case "scale-pop": {
          var scale = layer.property("Scale");
          if (scale) {
            setKeyframe(scale, startTime, [0, 0, 0], undefined, ease.outEase);
            setKeyframe(scale, startTime + duration * 0.7, [110, 110, 110], ease.inEase, ease.outEase);
            setKeyframe(scale, startTime + duration, [100, 100, 100], ease.inEase, undefined);
          }
          break;
        }
        case "flip": {
          var yRot = layer.property("Y Rotation");
          if (yRot) {
            setKeyframe(yRot, startTime, 90, undefined, ease.outEase);
            setKeyframe(yRot, startTime + duration, 0, ease.inEase, undefined);
          }
          break;
        }
        case "slide-in": {
          var position = layer.property("Position");
          if (position) {
            var endPos = position.value;
            var startPos = endPos.length >= 3 ? [-200, endPos[1], endPos[2]] : [-200, endPos[1]];
            setKeyframe(position, startTime, startPos, undefined, ease.outEase);
            setKeyframe(position, startTime + duration, endPos, ease.inEase, undefined);
          }
          break;
        }
        case "elastic-pop": {
          var scaleEp = layer.property("Scale");
          if (scaleEp) {
            // Remove all existing scale keyframes
            while (scaleEp.numKeys > 0) scaleEp.removeKey(1);
            setKeyframe(scaleEp, startTime, [0, 0, 0]);
            setKeyframe(scaleEp, startTime + 0.5, [100, 100, 100]);
            // Apply elastic bounce expression on scale
            scaleEp.expression =
              "// Tripo4AE Elastic Pop Expression\n" +
              "var t = time - inPoint;\n" +
              "var dur = 0.5;\n" +
              "if (t < dur) {\n" +
              "  var progress = t / dur;\n" +
              "  var bounce = Math.sin(progress * Math.PI * 3) * (1 - progress) * 30;\n" +
              "  [100 + bounce, 100 + bounce, 100 + bounce];\n" +
              "} else {\n" +
              "  [100, 100, 100];\n" +
              "}";
          }
          break;
        }
      }
    }

    // Apply loop expressions
    if (config.loops) {
      for (var i = 0; i < config.loops.length; i++) {
        var loop: any = config.loops[i];
        var expr = buildExpression(loop.type, loop);
        if (!expr) continue;

        switch (loop.type) {
          case "spin": {
            var axis = loop.axis || "y";
            var prop = axis === "x" ? "X Rotation" : axis === "y" ? "Y Rotation" : "Z Rotation";
            var rotProp = layer.property(prop) || layer.property("ADBE Rotate X") || layer.property("ADBE Rotate Y") || layer.property("ADBE Rotate Z");
            if (rotProp) rotProp.expression = expr;
            break;
          }
          case "float": {
            var posProp = layer.property("Position");
            if (posProp) posProp.expression = expr;
            break;
          }
          case "breathe": {
            var scaleProp = layer.property("Scale");
            if (scaleProp) scaleProp.expression = expr;
            break;
          }
        }
        appliedLoops.push(loop.type);
      }
    }

    return JSON.stringify({
      ok: true,
      data: { preset: config.modelPreset || "none", loops: appliedLoops },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function selectEmbeddedAnimation(configJson: string): string {
  try {
    var config: any = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var layer = resolveLayer(comp, config.layerIndex);
    if (!layer) {
      return JSON.stringify({ ok: false, error: "No layer selected" });
    }

    // Enable time remap
    if (config.enableTimeRemap) {
      try { layer.timeRemapEnabled = true; } catch (e) {}
    }

    // Select embedded animation
    if (config.animationIndex !== undefined || config.animationName) {
      try {
        var animOptions = layer.property("ADBE Animation Options");
        if (animOptions) {
          var nameProp = animOptions.property("ADBE Animation Name") || animOptions.property("ADBE Anim Options Name");
          if (nameProp) {
            if (config.animationIndex !== undefined) {
              nameProp.setValue(config.animationIndex);
            } else if (config.animationName) {
              nameProp.setValue(config.animationName);
            }
          }
        }
      } catch (e) {}
    }

    // Loop the embedded animation via time remap expression
    if (config.loopAnimation && layer.timeRemapEnabled) {
      var timeRemap = layer.property("Time Remap");
      if (timeRemap && timeRemap.numKeys >= 2) {
        timeRemap.expression = "loopOut('cycle');";
      }
    }

    return JSON.stringify({
      ok: true,
      data: {
        animationSelected: config.animationName || config.animationIndex || "default",
        loopEnabled: !!config.loopAnimation,
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function createCamera(configJson: string): string {
  try {
    var config: any = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    // Check if camera and control layers already exist
    var cameraLayer = null;
    var nullLayer = null;
    for (var l = comp.numLayers; l >= 1; l--) {
      var lyr = comp.layer(l);
      if (lyr.name === "Tripo4AE_Camera") {
        cameraLayer = lyr;
      } else if (lyr.name === "Tripo4AE_CameraCtrl") {
        nullLayer = lyr;
      }
    }

    var radius = config.radius || 500;
    var duration = config.duration || 5;
    var cx = comp.width / 2;
    var cy = comp.height / 2;

    // Reuse or Create the 3D Null Object for Camera Control
    if (!nullLayer) {
      nullLayer = comp.layers.addNull();
      nullLayer.name = "Tripo4AE_CameraCtrl";
      nullLayer.threeDLayer = true;
      nullLayer.property("Position").setValue([cx, cy, 0]);
      try { nullLayer.property("Scale").setValue([380, 380, 380]); } catch (e) {}
      try { nullLayer.property("Orientation").setValue([0, 300, 0]); } catch (e) {}
    } else {
      nullLayer.threeDLayer = true;
      nullLayer.property("Position").setValue([cx, cy, 0]);
      try { nullLayer.property("Scale").setValue([380, 380, 380]); } catch (e) {}
      try { nullLayer.property("Orientation").setValue([0, 300, 0]); } catch (e) {}
    }

    // Reuse or Create the Camera
    if (!cameraLayer) {
      cameraLayer = comp.layers.addCamera("Tripo4AE_Camera", [cx, cy]);
    }
    cameraLayer.parent = nullLayer;

    // Set Camera Local Position & Point of Interest relative to the Null
    cameraLayer.property("Position").setValue([0, 0, -radius]);
    var poiProp = cameraLayer.property("Point of Interest");
    if (poiProp && poiProp.canSetValue) {
      try { poiProp.setValue([0, 0, 0]); } catch (e) {}
    }

    // Camera Options via match names
    var camGroup = cameraLayer.property(CAM_GROUP);
    if (camGroup) {
      if (config.depthOfField !== undefined) {
        try { camGroup.property(CAM_MAP.depthOfField).setValue(config.depthOfField ? 1 : 0); } catch (e) {}
      } else {
        try { camGroup.property(CAM_MAP.depthOfField).setValue(1); } catch (e) {}
      }
      if (config.focusDistance !== undefined) {
        try { camGroup.property(CAM_MAP.focusDistance).setValue(config.focusDistance); } catch (e) {}
      }
      if (config.aperture !== undefined) {
        try { camGroup.property(CAM_MAP.aperture).setValue(config.aperture); } catch (e) {}
      }
      if (config.blurLevel !== undefined) {
        try { camGroup.property(CAM_MAP.blurLevel).setValue(config.blurLevel); } catch (e) {}
      }
      if (config.zoom !== undefined) {
        try { camGroup.property(CAM_MAP.zoom).setValue(config.zoom); } catch (e) {}
      }
      // Iris properties (AE 25.0+)
      if (config.irisShape !== undefined) {
        try { camGroup.property(CAM_MAP.irisShape).setValue(config.irisShape); } catch (e) {}
      }
      if (config.irisRotation !== undefined) {
        try { camGroup.property(CAM_MAP.irisRotation).setValue(config.irisRotation); } catch (e) {}
      }
      if (config.irisRoundness !== undefined) {
        try { camGroup.property(CAM_MAP.irisRoundness).setValue(config.irisRoundness); } catch (e) {}
      }
    }

    switch (config.preset) {
      case "orbit": {
        // Simple and elegant: animate Y Rotation of the parent Null layer!
        var nullRotY = nullLayer.property("Y Rotation");
        if (nullRotY) {
          while (nullRotY.numKeys > 0) nullRotY.removeKey(1);
          setKeyframe(nullRotY, 0, 0);
          setKeyframe(nullRotY, duration, 360);
        }
        break;
      }
      case "push": {
        // Clear old keyframes and animate local camera Z position (dolly in/out)
        var camPos = cameraLayer.property("Position");
        if (camPos) {
          while (camPos.numKeys > 0) camPos.removeKey(1);
          setKeyframe(camPos, 0, [0, 0, -(radius * 3)]);
          setKeyframe(camPos, duration, [0, 0, -(radius * 0.5)]);
        }
        break;
      }
      case "track": {
        // Clear old keyframes and animate Null position (pan/truck)
        var offset = config.offset || 400;
        var nullPos = nullLayer.property("Position");
        if (nullPos) {
          while (nullPos.numKeys > 0) nullPos.removeKey(1);
          setKeyframe(nullPos, 0, [cx - offset, cy, 0]);
          setKeyframe(nullPos, duration, [cx + offset, cy, 0]);
        }
        break;
      }
      case "jib": {
        // Clear old keyframes and animate Null position vertically (pedestal/boom)
        var offsetJib = config.offset || 300;
        var nullPosJib = nullLayer.property("Position");
        if (nullPosJib) {
          while (nullPosJib.numKeys > 0) nullPosJib.removeKey(1);
          setKeyframe(nullPosJib, 0, [cx, cy + offsetJib, 0]);
          setKeyframe(nullPosJib, duration, [cx, cy - offsetJib, 0]);
        }
        break;
      }
      case "dolly-zoom": {
        // Vertigo effect: move camera in while zooming out
        var startZoom = config.startZoom || 200;
        var endZoom = config.endZoom || 800;
        if (camGroup) {
          try {
            var zoomProp = camGroup.property(CAM_MAP.zoom);
            if (zoomProp) {
              while (zoomProp.numKeys > 0) zoomProp.removeKey(1);
              if (zoomProp.canSetValue) {
                zoomProp.setValueAtTime(0, startZoom);
                zoomProp.setValueAtTime(duration, endZoom);
              }
            }
          } catch (e) {}
        }
        var camPosDz = cameraLayer.property("Position");
        if (camPosDz) {
          while (camPosDz.numKeys > 0) camPosDz.removeKey(1);
          setKeyframe(camPosDz, 0, [0, 0, -(radius * 2)]);
          setKeyframe(camPosDz, duration, [0, 0, -(radius * 0.4)]);
        }
        break;
      }
      case "crane": {
        // Compound crane shot using both Null and Camera local coordinates
        var nullPosCrane = nullLayer.property("Position");
        var nullRotYCrane = nullLayer.property("Y Rotation");
        var camPosCrane = cameraLayer.property("Position");

        if (nullPosCrane) {
          while (nullPosCrane.numKeys > 0) nullPosCrane.removeKey(1);
          setKeyframe(nullPosCrane, 0, [cx, cy + 200, 0]);
          setKeyframe(nullPosCrane, duration, [cx, cy - 200, 0]);
        }
        if (nullRotYCrane) {
          while (nullRotYCrane.numKeys > 0) nullRotYCrane.removeKey(1);
          setKeyframe(nullRotYCrane, 0, 0);
          setKeyframe(nullRotYCrane, duration, 270);
        }
        if (camPosCrane) {
          while (camPosCrane.numKeys > 0) camPosCrane.removeKey(1);
          setKeyframe(camPosCrane, 0, [0, 0, -(radius * 1.5)]);
          setKeyframe(camPosCrane, duration, [0, 0, -(radius * 0.5)]);
        }
        break;
      }
    }

    return JSON.stringify({ ok: true, data: { name: cameraLayer.name, preset: config.preset } });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function createLights(configJson: string): string {
  try {
    var config: any = configJson ? JSON.parse(configJson) : {};
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var intensity = config.intensity || 100;
    var color = config.color || [1, 1, 1];
    var keyAngle = (config.keyAngle || 45) * (Math.PI / 180);
    var fillRatio = config.fillRatio || 0.4;
    var rimRatio = config.rimRatio || 0.6;
    var cx = comp.width / 2;
    var cy = comp.height / 2;
    var dist = Math.max(comp.width, comp.height);

    // Light falloff config
    var falloffType = config.falloffType !== undefined ? config.falloffType : FALLOFF_SMOOTH;
    var falloffStart = config.falloffStart || 0;
    var falloffDistance = config.falloffDistance || dist * 2;
    var castShadows = config.castShadows !== undefined ? config.castShadows : true;
    var shadowDarkness = config.shadowDarkness !== undefined ? config.shadowDarkness : 50;
    var shadowDiffusion = config.shadowDiffusion !== undefined ? config.shadowDiffusion : 10;

    var lightsData = [
      {
        name: "Tripo4AE_Key", x: cx + dist * Math.cos(keyAngle), y: cy - dist * 0.6,
        z: -dist * Math.sin(keyAngle), intensity: intensity,
        coneAngle: config.coneAngle, coneFeather: config.coneFeather,
      },
      {
        name: "Tripo4AE_Fill", x: cx - dist * Math.cos(keyAngle), y: cy - dist * 0.3,
        z: -dist * 0.5, intensity: intensity * fillRatio,
        coneAngle: undefined, coneFeather: undefined,
      },
      {
        name: "Tripo4AE_Rim", x: cx, y: cy - dist * 0.8, z: dist * 0.8,
        intensity: intensity * rimRatio,
        coneAngle: undefined, coneFeather: undefined,
      },
    ];

    var created: string[] = [];
    for (var i = 0; i < lightsData.length; i++) {
      var ld = lightsData[i];
      var layer = comp.layers.addLight(ld.name, [ld.x, ld.y]);
      layer.threeDLayer = true;
      try { layer.lightType = LIGHT_TYPE_POINT; } catch (e) {}
      layer.property("Position").setValue([ld.x, ld.y, ld.z]);
      layer.property("Intensity").setValue(ld.intensity);
      layer.property("Color").setValue(color);

      // Apply light options via match names
      var lightGroup = layer.property(LIGHT_GROUP);
      if (lightGroup) {
        try { lightGroup.property(LIGHT_MAP.falloffType).setValue(falloffType); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.falloffStart).setValue(falloffStart); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.falloffDistance).setValue(falloffDistance); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.castsShadows).setValue(castShadows ? 1 : 0); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.shadowDarkness).setValue(shadowDarkness); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.shadowDiffusion).setValue(shadowDiffusion); } catch (e) {}
        if (ld.coneAngle !== undefined) {
          try { lightGroup.property(LIGHT_MAP.coneAngle).setValue(ld.coneAngle); } catch (e) {}
        }
        if (ld.coneFeather !== undefined) {
          try { lightGroup.property(LIGHT_MAP.coneFeather).setValue(ld.coneFeather); } catch (e) {}
        }
      }

      created.push(ld.name);
    }

    return JSON.stringify({ ok: true, data: { lights: created } });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function setupE3D(modelPath: string): string {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var solidLayer = comp.layers.addSolid([0.1, 0.1, 0.1], "Tripo4AE_E3D", comp.width, comp.height, 1, comp.duration);
    solidLayer.threeDLayer = true;

    var e3dEffectNames = ["Element", "Element 3D", "VideoCopilot Element 3D"];
    var effectApplied = false;
    for (var i = 0; i < e3dEffectNames.length; i++) {
      try {
        var effect = solidLayer.Effects.addProperty(e3dEffectNames[i]);
        if (effect) { effectApplied = true; break; }
      } catch (e) {}
    }

    if (!effectApplied) {
      return JSON.stringify({
        ok: true,
        data: {
          layer: "Tripo4AE_E3D",
          effectApplied: false,
          guidance: "Element 3D effect could not be applied automatically. Please apply it manually, then open Scene Setup and import: " + modelPath,
        },
      });
    }

    return JSON.stringify({
      ok: true,
      data: {
        layer: "Tripo4AE_E3D",
        effectApplied: true,
        guidance: "Element 3D effect applied. Open Scene Setup and import: " + modelPath,
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function setMaterialProperties(configJson: string): string {
  try {
    var config: any = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var layer = resolveLayer(comp, config.layerIndex);
    if (!layer) {
      return JSON.stringify({ ok: false, error: "No layer selected" });
    }

    var matGroup = layer.property(MAT_GROUP);
    if (!matGroup) {
      return JSON.stringify({ ok: false, error: "Layer has no Material Options. Ensure it is a 3D model layer in Advanced 3D renderer." });
    }

    var applied: string[] = [];
    var material: any = config.material || {};
    for (var key in material) {
      if (typeof material[key] === "number" && MAT_MAP[key]) {
        try {
          var prop = matGroup.property(MAT_MAP[key]);
          if (prop) { prop.setValue(material[key]); applied.push(key); }
        } catch (e) {}
      }
    }

    return JSON.stringify({ ok: true, data: { appliedProperties: applied } });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function getMaterialProperties(layerIndexStr?: string): string {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var layerIndex = layerIndexStr !== undefined ? parseInt(layerIndexStr) : undefined;
    var layer = resolveLayer(comp, isNaN(layerIndex as number) ? undefined : layerIndex);
    if (!layer) {
      return JSON.stringify({ ok: false, error: "No layer selected" });
    }

    var matGroup = layer.property(MAT_GROUP);
    if (!matGroup) {
      return JSON.stringify({ ok: false, error: "Layer has no Material Options" });
    }

    var result: any = {};
    for (var key in MAT_MAP) {
      try {
        var prop = matGroup.property(MAT_MAP[key]);
        if (prop) result[key] = prop.value;
      } catch (e) {}
    }

    return JSON.stringify({ ok: true, data: result });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function createEnvironmentLight(configJson?: string): string {
  try {
    var config: any = configJson ? JSON.parse(configJson) : {};
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    // Try to ensure Advanced 3D renderer
    ensureAdvanced3DRenderer(comp);

    var intensity = config.intensity !== undefined ? config.intensity : 100;
    var lightLayer = comp.layers.addLight("Tripo4AE_EnvLight", [comp.width / 2, comp.height / 2]);
    lightLayer.threeDLayer = true;
    lightLayer.property("Intensity").setValue(intensity);

    if (config.color) {
      lightLayer.property("Color").setValue(config.color);
    }

    // Set light type: Environment (5) if HDR path present, else Ambient (4) (or fallback to Ambient)
    var isEnv = !!config.hdrPath;
    try {
      if (isEnv && typeof LightType !== "undefined" && LightType.ENVIRONMENT !== undefined) {
        lightLayer.lightType = LightType.ENVIRONMENT;
      } else if (!isEnv && typeof LightType !== "undefined" && LightType.AMBIENT !== undefined) {
        lightLayer.lightType = LightType.AMBIENT;
      } else {
        var lightOptions = lightLayer.property("ADBE Light Options Group");
        if (lightOptions) {
          lightOptions.property("ADBE Light Type").setValue(isEnv ? 5 : 4);
        }
      }
      
      // If Environment Light, make background visible so user can see the HDR
      if (isEnv) {
        var envLightGroup = lightLayer.property("ADBE Light Options Group");
        if (envLightGroup) {
          try { envLightGroup.property("ADBE Light Backgd Visible").setValue(1); } catch (e) {}
        }
      }
    } catch (e) {
      try {
        var lightOptions = lightLayer.property("ADBE Light Options Group");
        if (lightOptions) {
          lightOptions.property("ADBE Light Type").setValue(isEnv ? 5 : 4);
        }
      } catch (err) {}
    }

    // Try to set HDRI
    if (config.hdrPath) {
      try {
        var hdrFile = new File(config.hdrPath);
        if (hdrFile.exists) {
          // Remove existing Tripo4AE_EnvMap layer if it exists
          for (var l = comp.numLayers; l >= 1; l--) {
            var lyr = comp.layer(l);
            if (lyr.name === "Tripo4AE_EnvMap") {
              try { lyr.remove(); } catch (e) {}
            }
          }

          var io = new ImportOptions(hdrFile);
          var hdrFootage = app.project.importFile(io);
          var hdrLayer = comp.layers.add(hdrFootage);
          hdrLayer.name = "Tripo4AE_EnvMap";
          hdrLayer.enabled = false; // Disable eyeball

          try {
            lightLayer.lightSource = hdrLayer;
          } catch (e) {
            try {
              var envImage = lightLayer.property("ADBE Environment Light Options Group") || lightLayer.property("ADBE Light Options Group");
              if (envImage) {
                var imgProp = envImage.property("ADBE Environment Image") || envImage.property("ADBE Light Image");
                if (imgProp) imgProp.setValue(hdrLayer);
              }
            } catch (err) {}
          }
        }
      } catch (e) {}
    }

    if (config.castShadows !== undefined) {
      try {
        var envLightGroup = lightLayer.property(LIGHT_GROUP);
        if (envLightGroup) envLightGroup.property(LIGHT_MAP.castsShadows).setValue(config.castShadows ? 1 : 0);
      } catch (e) {}
    }
    if (config.shadowDarkness !== undefined) {
      try {
        var envLightGroup2 = lightLayer.property(LIGHT_GROUP);
        if (envLightGroup2) envLightGroup2.property(LIGHT_MAP.shadowDarkness).setValue(config.shadowDarkness);
      } catch (e) {}
    }

    return JSON.stringify({
      ok: true,
      data: { name: lightLayer.name, intensity: intensity, hdrApplied: !!config.hdrPath },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function getExpression(type: string, paramsJson?: string): string {
  var params: any = {};
  if (paramsJson) {
    try { params = JSON.parse(paramsJson); } catch (e) {}
  }
  return buildExpression(type, params);
}

export function applyMaterialPreset(configJson: string): string {
  try {
    var config: any = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var layer = resolveLayer(comp, config.layerIndex);
    if (!layer) {
      return JSON.stringify({ ok: false, error: "No layer selected" });
    }

    var matGroup = layer.property(MAT_GROUP);
    if (!matGroup) {
      return JSON.stringify({ ok: false, error: "Layer has no Material Options. Ensure it is a 3D layer in Advanced 3D renderer." });
    }

    var presetName = config.preset || "plastic";
    var preset = MATERIAL_PRESETS[presetName];
    if (!preset) {
      return JSON.stringify({ ok: false, error: "Unknown preset: " + presetName + ". Available: " + Object.keys(MATERIAL_PRESETS).join(", ") });
    }

    // Merge custom overrides on top of preset
    var material: any = {};
    for (var k in preset) material[k] = preset[k];
    if (config.overrides) {
      for (var ok in config.overrides) material[ok] = config.overrides[ok];
    }

    var applied: string[] = [];
    for (var key in material) {
      if (typeof material[key] === "number" && MAT_MAP[key]) {
        try {
          var prop = matGroup.property(MAT_MAP[key]);
          if (prop) { prop.setValue(material[key]); applied.push(key); }
        } catch (e) {}
      }
    }

    return JSON.stringify({ ok: true, data: { preset: presetName, appliedProperties: applied } });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function getMaterialPresets(): string {
  var names = [];
  for (var k in MATERIAL_PRESETS) names.push(k);
  return JSON.stringify({ ok: true, data: { presets: names } });
}

export function setupScene(configJson?: string): string {
  try {
    var config: any = configJson ? JSON.parse(configJson) : {};
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    app.beginUndoGroup("Tripo4AE Setup Scene");

    // 1. Ensure Advanced 3D renderer
    var hasAdvanced3D = ensureAdvanced3DRenderer(comp);

    var cx = comp.width / 2;
    var cy = comp.height / 2;
    var dist = Math.max(comp.width, comp.height);

    // 2. Camera Rig (Camera parented to 3D Null for easy control)
    // Clean up existing camera and control layers first to prevent duplicates
    for (var l = comp.numLayers; l >= 1; l--) {
      var lyr = comp.layer(l);
      if (lyr.name === "Tripo4AE_Camera" || lyr.name === "Tripo4AE_CameraCtrl") {
        try { lyr.remove(); } catch (e) {}
      }
    }

    var nullLayer = comp.layers.addNull();
    nullLayer.name = "Tripo4AE_CameraCtrl";
    nullLayer.threeDLayer = true;
    nullLayer.property("Position").setValue([cx, cy, 0]);
    try { nullLayer.property("Scale").setValue([380, 380, 380]); } catch (e) {}
    try { nullLayer.property("Orientation").setValue([0, 300, 0]); } catch (e) {}

    var cameraLayer = comp.layers.addCamera("Tripo4AE_Camera", [cx, cy]);
    cameraLayer.parent = nullLayer;
    cameraLayer.property("Position").setValue([0, 0, -(config.cameraDistance || 800)]);
    var poiProp = cameraLayer.property("Point of Interest");
    if (poiProp && poiProp.canSetValue) {
      try { poiProp.setValue([0, 0, 0]); } catch (e) {}
    }
    var camGroup = cameraLayer.property(CAM_GROUP);
    if (camGroup) {
      try { camGroup.property(CAM_MAP.depthOfField).setValue(config.depthOfField !== false ? 1 : 0); } catch (e) {}
      if (config.focusDistance) {
        try { camGroup.property(CAM_MAP.focusDistance).setValue(config.focusDistance); } catch (e) {}
      }
      if (config.aperture) {
        try { camGroup.property(CAM_MAP.aperture).setValue(config.aperture); } catch (e) {}
      }
    }

    // 3. 3-point lighting with falloff
    var lightIntensity = config.lightIntensity || 100;
    var lightColor = config.lightColor || [1, 1, 1];
    var keyAngle = ((config.keyAngle || 45) * Math.PI) / 180;
    var lightsConfig = [
      { name: "Tripo4AE_Key", x: cx + dist * Math.cos(keyAngle), y: cy - dist * 0.6, z: -dist * Math.sin(keyAngle), int: lightIntensity },
      { name: "Tripo4AE_Fill", x: cx - dist * Math.cos(keyAngle), y: cy - dist * 0.3, z: -dist * 0.5, int: lightIntensity * 0.4 },
      { name: "Tripo4AE_Rim", x: cx, y: cy - dist * 0.8, z: dist * 0.8, int: lightIntensity * 0.6 },
    ];

    var createdLights: string[] = [];
    for (var i = 0; i < lightsConfig.length; i++) {
      var lc = lightsConfig[i];
      var lightLayer = comp.layers.addLight(lc.name, [lc.x, lc.y]);
      lightLayer.threeDLayer = true;
      lightLayer.property("Position").setValue([lc.x, lc.y, lc.z]);
      lightLayer.property("Intensity").setValue(lc.int);
      lightLayer.property("Color").setValue(lightColor);
      var lightGroup = lightLayer.property(LIGHT_GROUP);
      if (lightGroup) {
        try { lightGroup.property(LIGHT_MAP.falloffType).setValue(FALLOFF_SMOOTH); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.falloffStart).setValue(0); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.falloffDistance).setValue(dist * 2); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.castsShadows).setValue(1); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.shadowDarkness).setValue(80); } catch (e) {}
      }
      createdLights.push(lc.name);
    }

    // 4. Environment light (if Advanced 3D available)
    var envLightCreated = false;
    if (hasAdvanced3D) {
      try {
        var envLayer = comp.layers.addLight("Tripo4AE_EnvLight", [cx, cy]);
        envLayer.threeDLayer = true;
        envLayer.property("Intensity").setValue(config.envIntensity || 60);
        try {
          var envLightGroup = envLayer.property(LIGHT_GROUP);
          if (envLightGroup) {
            try { envLightGroup.property(LIGHT_MAP.falloffType).setValue(FALLOFF_NONE); } catch (e) {}
          }
        } catch (e) {}

        // Set light type: Environment (5) if HDR path present, else Ambient (4)
        var isEnv = !!config.hdrPath;
        try {
          if (isEnv && typeof LightType !== "undefined" && LightType.ENVIRONMENT !== undefined) {
            envLayer.lightType = LightType.ENVIRONMENT;
          } else if (!isEnv && typeof LightType !== "undefined" && LightType.AMBIENT !== undefined) {
            envLayer.lightType = LightType.AMBIENT;
          } else {
            var lightOpts = envLayer.property("ADBE Light Options Group");
            if (lightOpts) {
              lightOpts.property("ADBE Light Type").setValue(isEnv ? 5 : 4);
            }
          }
          
          // If Environment Light, make background visible so user can see the HDR
          if (isEnv) {
            var envLightGroup = envLayer.property("ADBE Light Options Group");
            if (envLightGroup) {
              try { envLightGroup.property("ADBE Light Backgd Visible").setValue(1); } catch (e) {}
              // Enable Casts Shadows on Environment Light to get Ambient Occlusion / realistic grounding
              try { envLightGroup.property("ADBE Casts Shadows").setValue(1); } catch (e) {}
            }
          }
        } catch (e) {
          try {
            var lightOpts = envLayer.property("ADBE Light Options Group");
            if (lightOpts) {
              lightOpts.property("ADBE Light Type").setValue(isEnv ? 5 : 4);
            }
          } catch (err) {}
        }

        // Load HDR if present
        if (config.hdrPath) {
          try {
            var hdrFile = new File(config.hdrPath);
            if (hdrFile.exists) {
              // Remove existing Tripo4AE_EnvMap layer if it exists
              for (var l = comp.numLayers; l >= 1; l--) {
                var lyr = comp.layer(l);
                if (lyr.name === "Tripo4AE_EnvMap") {
                  try { lyr.remove(); } catch (e) {}
                }
              }

              var io = new ImportOptions(hdrFile);
              var hdrFootage = app.project.importFile(io);
              var hdrLayer = comp.layers.add(hdrFootage);
              hdrLayer.name = "Tripo4AE_EnvMap";
              hdrLayer.enabled = false; // Disable eyeball

              try {
                envLayer.lightSource = hdrLayer;
              } catch (e) {
                try {
                  var envImage = envLayer.property("ADBE Environment Light Options Group") || envLayer.property("ADBE Light Options Group");
                  if (envImage) {
                    var imgProp = envImage.property("ADBE Environment Image") || envImage.property("ADBE Light Image");
                    if (imgProp) imgProp.setValue(hdrLayer);
                  }
                } catch (err) {}
              }
            }
          } catch (e) {}
        }

        envLightCreated = true;
      } catch (e) {}
    }

    // 5. Create professional Studio Background & Shadow Catcher Ground (One-click premium background)
    try {
      // Remove existing Tripo4AE background and ground layers if they exist
      for (var l = comp.numLayers; l >= 1; l--) {
        var lyr = comp.layer(l);
        if (lyr.name === "Tripo4AE_Background" || lyr.name === "Tripo4AE_Ground") {
          try { lyr.remove(); } catch (e) {}
        }
      }

      // Create 2D Background Solid with Gradient (premium light silver/grey vignette)
      var bgLayer = comp.layers.addSolid([0.95, 0.96, 0.98], "Tripo4AE_Background", comp.width, comp.height, 1.0);
      bgLayer.moveToEnd(); // Move to the bottom of the layer stack

      // Apply ADBE Ramp (Gradient)
      try {
        var ramp = bgLayer.Effects.addProperty("ADBE Ramp");
        if (ramp) {
          var shapeProp = ramp.property("ADBE Ramp-0005") || ramp.property(5);
          if (shapeProp) shapeProp.setValue(2); // Radial
          
          var startProp = ramp.property("ADBE Ramp-0001") || ramp.property(1);
          if (startProp) startProp.setValue([comp.width / 2, comp.height / 2]);
          
          var endProp = ramp.property("ADBE Ramp-0003") || ramp.property(3);
          if (endProp) endProp.setValue([comp.width * 0.9, comp.height * 0.1]);
          
          var startColProp = ramp.property("ADBE Ramp-0002") || ramp.property(2);
          if (startColProp) startColProp.setValue([0.95, 0.96, 0.98]); // Soft pearl white
          
          var endColProp = ramp.property("ADBE Ramp-0004") || ramp.property(4);
          if (endColProp) endColProp.setValue([0.75, 0.76, 0.80]); // Light silver grey
        }
      } catch (e) {}

      // Create 3D Ground Shadow Catcher Solid
      var groundLayer = comp.layers.addSolid([0.85, 0.85, 0.85], "Tripo4AE_Ground", 5000, 5000, 1.0);
      groundLayer.threeDLayer = true;
      
      // Orient flat (X Rotation = 90)
      var groundRotX = groundLayer.property("X Rotation") || groundLayer.property("ADBE Rotate X");
      if (groundRotX) {
        try { groundRotX.setValue(90); } catch (e) {}
      }
      
      // Position just below the center so models touch it
      var groundPos = groundLayer.property("Position") || groundLayer.property("ADBE Position");
      if (groundPos) {
        try { groundPos.setValue([comp.width / 2, comp.height / 2 + 50, 0]); } catch (e) {}
      }
      
      // Enable shadow catching (Shadows Only)
      var groundMat = groundLayer.property("ADBE Material Options Group");
      if (groundMat) {
        try {
          var acceptsShadowsProp = groundMat.property("ADBE Accepts Shadows") || groundMat.property(3);
          if (acceptsShadowsProp) {
            acceptsShadowsProp.setValue(1); // On (Visible Floor)
          }
          // Turn off cast shadows for ground to prevent self-shadowing issues
          var castsShadowsProp = groundMat.property("ADBE Casts Shadows") || groundMat.property(1);
          if (castsShadowsProp) {
            castsShadowsProp.setValue(0);
          }
          // Set light transmission so it doesn't block background lights
          var lightTransProp = groundMat.property("ADBE Light Transmission") || groundMat.property(2);
          if (lightTransProp) {
            lightTransProp.setValue(100);
          }
        } catch (e) {}
      }

      // Auto-align ground to model
      try {
        var modelLayer = null;
        for (var i = 1; i <= comp.numLayers; i++) {
          var lyr = comp.layer(i);
          if (lyr.threeDLayer && lyr.name.indexOf("Tripo4AE") === -1 && lyr.name.indexOf("Camera") === -1) {
            modelLayer = lyr;
            break;
          }
        }
        if (modelLayer && groundLayer) {
          var rect = modelLayer.sourceRectAtTime(comp.time, false);
          var scaleY = modelLayer.property("Scale").value[1] / 100;
          var posY = modelLayer.property("Position").value[1];
          var anchorY = modelLayer.property("Anchor Point").value[1];
          var offset = rect.top + rect.height - anchorY;
          if (rect.width === 0 || rect.height === 0 || rect.width === comp.width) offset = 0;
          var targetGroundY = posY + offset * scaleY;
          var posProp = groundLayer.property("Position");
          posProp.setValue([posProp.value[0], targetGroundY, posProp.value[2]]);
        }
      } catch (e) {}
    } catch (e) {}

    app.endUndoGroup();

    return JSON.stringify({
      ok: true,
      data: {
        camera: cameraLayer.name,
        lights: createdLights,
        environmentLight: envLightCreated,
        hasAdvanced3D: hasAdvanced3D,
      },
    });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function createParametricMesh(configJson: string): string {
  try {
    var config: any = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    // Ensure Advanced 3D renderer
    ensureAdvanced3DRenderer(comp);

    app.beginUndoGroup("Tripo4AE Parametric Mesh");

    var meshType = config.meshType || "Sphere"; // Sphere, Plane, Cylinder, Cone, Torus, Cube
    var layer: any = null;

    // ParametricMeshLayer is AE Beta 26.3+ — try menu command approach
    // Falls back to solid layer with geometry effect if unavailable
    try {
      // Method 1: Try direct Layer > New > Parametric Mesh (AE 26.3+)
      // The API for ParametricMeshLayer is not yet in standard ExtendScript.
      // Use a placeholder solid + effect approach.
      var solid = comp.layers.addSolid(
        config.color || [0.5, 0.5, 0.5],
        "Tripo4AE_" + meshType,
        comp.width, comp.height, 1, comp.duration
      );
      solid.threeDLayer = true;

      // Try to apply geometry options via match names
      var planeGroup = solid.property("ADBE Plane Options Group");
      var extrsnGroup = solid.property("ADBE Extrsn Options Group");

      if (planeGroup) {
        // Plane/extrusion geometry
        if (config.curvature !== undefined) {
          try { planeGroup.property("ADBE Plane Curvature").setValue(config.curvature); } catch (e) {}
        }
        if (config.segments !== undefined) {
          try { planeGroup.property("ADBE Plane Segments").setValue(config.segments); } catch (e) {}
        }
      }

      if (extrsnGroup) {
        if (config.extrusionDepth !== undefined) {
          try { extrsnGroup.property("ADBE Extrsn Depth").setValue(config.extrusionDepth); } catch (e) {}
        }
        if (config.bevelDepth !== undefined) {
          try { extrsnGroup.property("ADBE Bevel Depth").setValue(config.bevelDepth); } catch (e) {}
        }
      }

      // Position center
      solid.property("Position").setValue([comp.width / 2, comp.height / 2]);

      layer = solid;
    } catch (e) {
      app.endUndoGroup();
      return JSON.stringify({ ok: false, error: "Parametric mesh not available: " + String(e) });
    }

    // Apply material preset if requested
    if (config.materialPreset && layer) {
      var matGroup = layer.property(MAT_GROUP);
      if (matGroup) {
        var preset = MATERIAL_PRESETS[config.materialPreset];
        if (preset) {
          for (var key in preset) {
            if (typeof preset[key] === "number" && MAT_MAP[key]) {
              try { matGroup.property(MAT_MAP[key]).setValue(preset[key]); } catch (e) {}
            }
          }
        }
      }
    }

    app.endUndoGroup();
    return JSON.stringify({
      ok: true,
      data: {
        meshType: meshType,
        layerName: layer ? layer.name : meshType,
        note: "ParametricMeshLayer requires AE 26.3+. Using solid + geometry fallback.",
      },
    });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function alignModelToGround(): string {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var groundLayer = null;
    for (var i = 1; i <= comp.numLayers; i++) {
      if (comp.layer(i).name === "Tripo4AE_Ground") {
        groundLayer = comp.layer(i);
        break;
      }
    }
    if (!groundLayer) {
      return JSON.stringify({ ok: false, error: "Ground layer (Tripo4AE_Ground) not found." });
    }

    var modelLayer = null;
    var selected = comp.selectedLayers;
    if (selected.length > 0) {
      for (var i = 0; i < selected.length; i++) {
        if (selected[i].name !== "Tripo4AE_Ground" && selected[i].name !== "Tripo4AE_Background" && selected[i].name !== "Tripo4AE_CameraCtrl" && selected[i].name !== "Tripo4AE_Camera" && selected[i].threeDLayer) {
          modelLayer = selected[i];
          break;
        }
      }
    }
    if (!modelLayer) {
      for (var i = 1; i <= comp.numLayers; i++) {
        var lyr = comp.layer(i);
        if (lyr.threeDLayer && lyr.name.indexOf("Tripo4AE") === -1 && lyr.name.indexOf("Camera") === -1) {
          modelLayer = lyr;
          break;
        }
      }
    }

    if (!modelLayer) {
      return JSON.stringify({ ok: false, error: "No 3D model layer found to align." });
    }

    app.beginUndoGroup("Align Model to Ground");
    var groundY = groundLayer.property("Position").value[1];
    var rect = modelLayer.sourceRectAtTime(comp.time, false);
    var scaleY = modelLayer.property("Scale").value[1] / 100;
    var anchorY = modelLayer.property("Anchor Point").value[1];
    
    var offset = rect.top + rect.height - anchorY;
    if (rect.width === 0 || rect.height === 0 || rect.width === comp.width) {
      offset = 0; // Fallback: align anchor point directly
    }
    var newPosY = groundY - offset * scaleY;
    var posProp = modelLayer.property("Position");
    var currentPos = posProp.value;
    posProp.setValue([currentPos[0], newPosY, currentPos[2]]);
    app.endUndoGroup();

    return JSON.stringify({ ok: true, data: { model: modelLayer.name, alignedY: newPosY } });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function alignGroundToModel(): string {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var groundLayer = null;
    for (var i = 1; i <= comp.numLayers; i++) {
      if (comp.layer(i).name === "Tripo4AE_Ground") {
        groundLayer = comp.layer(i);
        break;
      }
    }
    if (!groundLayer) {
      return JSON.stringify({ ok: false, error: "Ground layer (Tripo4AE_Ground) not found." });
    }

    var modelLayer = null;
    var selected = comp.selectedLayers;
    if (selected.length > 0) {
      for (var i = 0; i < selected.length; i++) {
        if (selected[i].name !== "Tripo4AE_Ground" && selected[i].name !== "Tripo4AE_Background" && selected[i].name !== "Tripo4AE_CameraCtrl" && selected[i].name !== "Tripo4AE_Camera" && selected[i].threeDLayer) {
          modelLayer = selected[i];
          break;
        }
      }
    }
    if (!modelLayer) {
      for (var i = 1; i <= comp.numLayers; i++) {
        var lyr = comp.layer(i);
        if (lyr.threeDLayer && lyr.name.indexOf("Tripo4AE") === -1 && lyr.name.indexOf("Camera") === -1) {
          modelLayer = lyr;
          break;
        }
      }
    }

    if (!modelLayer) {
      return JSON.stringify({ ok: false, error: "No 3D model layer found to align ground to." });
    }

    app.beginUndoGroup("Align Ground to Model");
    var rect = modelLayer.sourceRectAtTime(comp.time, false);
    var scaleY = modelLayer.property("Scale").value[1] / 100;
    var posY = modelLayer.property("Position").value[1];
    var anchorY = modelLayer.property("Anchor Point").value[1];
    
    var offset = rect.top + rect.height - anchorY;
    if (rect.width === 0 || rect.height === 0 || rect.width === comp.width) {
      offset = 0; // Fallback: align anchor point directly
    }
    var targetGroundY = posY + offset * scaleY;
    
    var posProp = groundLayer.property("Position");
    var currentPos = posProp.value;
    posProp.setValue([currentPos[0], targetGroundY, currentPos[2]]);
    app.endUndoGroup();

    return JSON.stringify({ ok: true, data: { ground: groundLayer.name, alignedY: targetGroundY } });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function updateSceneProperties(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    app.beginUndoGroup("Tripo4AE Update Scene Properties");

    var envLight = null;
    var keyLight = null;
    var fillLight = null;
    var rimLight = null;

    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      if (layer instanceof LightLayer) {
        if (layer.name === "Tripo4AE_EnvLight") {
          envLight = layer;
        } else if (layer.name === "Tripo4AE_Key") {
          keyLight = layer;
        } else if (layer.name === "Tripo4AE_Fill") {
          fillLight = layer;
        } else if (layer.name === "Tripo4AE_Rim") {
          rimLight = layer;
        }
      }
    }

    if (envLight && config.envIntensity !== undefined) {
      envLight.property("Intensity").setValue(config.envIntensity);
    }

    if (keyLight) {
      if (config.lightIntensity !== undefined) {
        keyLight.property("Intensity").setValue(config.lightIntensity);
      }
      if (config.lightColor !== undefined && config.lightColor.length === 3) {
        keyLight.property("Color").setValue(config.lightColor);
      }
      var keyGroup = keyLight.property("ADBE Light Options Group");
      if (keyGroup) {
        if (config.castShadows !== undefined) {
          try { keyGroup.property("ADBE Light Casts Shadows").setValue(config.castShadows ? 1 : 0); } catch (e) {}
        }
        if (config.shadowDarkness !== undefined) {
          try { keyGroup.property("ADBE Light Shadow Darkness").setValue(config.shadowDarkness); } catch (e) {}
        }
        if (config.shadowDiffusion !== undefined) {
          try { keyGroup.property("ADBE Light Shadow Diffusion").setValue(config.shadowDiffusion); } catch (e) {}
        }
      }
    }

    if (config.lightIntensity !== undefined) {
      if (fillLight) {
        fillLight.property("Intensity").setValue(config.lightIntensity * 0.4);
      }
      if (rimLight) {
        rimLight.property("Intensity").setValue(config.lightIntensity * 0.6);
      }
    }

    app.endUndoGroup();
    return JSON.stringify({ ok: true });
  } catch (err) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(err) });
  }
}

export function getThreeDNullLayers(): string {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify([]);
    }

    var list: Array<{ index: number; name: string }> = [];
    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      if (layer.threeDLayer && (layer.nullLayer === true || (layer instanceof AVLayer && !layer.source))) {
        list.push({ index: i, name: layer.name });
      }
    }
    return JSON.stringify(list);
  } catch (e) {
    return JSON.stringify([]);
  }
}

export function bindModelToTracker(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var trackerLayerIdx = parseInt(config.trackerLayerIndex, 10);
    var modelLayerIdx = config.modelLayerIndex ? parseInt(config.modelLayerIndex, 10) : -1;

    var trackerLayer = comp.layer(trackerLayerIdx);
    if (!trackerLayer) {
      return JSON.stringify({ ok: false, error: "Tracker layer not found" });
    }

    var modelLayer = null;
    if (modelLayerIdx > 0) {
      modelLayer = comp.layer(modelLayerIdx);
    } else {
      if (comp.selectedLayers.length > 0) {
        modelLayer = comp.selectedLayers[0];
      } else {
        for (var i = 1; i <= comp.numLayers; i++) {
          var l = comp.layer(i);
          if (l.threeDLayer && !l.nullLayer && l !== trackerLayer) {
            modelLayer = l;
            break;
          }
        }
      }
    }

    if (!modelLayer) {
      return JSON.stringify({ ok: false, error: "No target 3D model layer found to bind." });
    }

    app.beginUndoGroup("Bind Model to Tracker");
    modelLayer.parent = trackerLayer;
    modelLayer.property("Position").setValue([0, 0, 0]);
    
    if (modelLayer.property("Orientation")) {
      modelLayer.property("Orientation").setValue([0, 0, 0]);
    }
    if (modelLayer.property("Rotation")) {
      modelLayer.property("Rotation").setValue(0);
    }
    if (modelLayer.property("X Rotation")) modelLayer.property("X Rotation").setValue(0);
    if (modelLayer.property("Y Rotation")) modelLayer.property("Y Rotation").setValue(0);
    if (modelLayer.property("Z Rotation")) modelLayer.property("Z Rotation").setValue(0);
    
    app.endUndoGroup();
    return JSON.stringify({ ok: true, data: { model: modelLayer.name, tracker: trackerLayer.name } });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function createShadowCatcher(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var trackerLayerIdx = parseInt(config.trackerLayerIndex, 10);
    var trackerLayer = comp.layer(trackerLayerIdx);
    if (!trackerLayer) {
      return JSON.stringify({ ok: false, error: "Tracker layer not found" });
    }

    app.beginUndoGroup("Create Shadow Catcher");
    
    var catcher = comp.layers.addSolid([1, 1, 1], "Tripo_Shadow_Catcher", 2000, 2000, 1.0);
    catcher.threeDLayer = true;
    catcher.parent = trackerLayer;
    
    catcher.property("Position").setValue([0, 0, 0]);
    if (catcher.property("Orientation")) {
      catcher.property("Orientation").setValue([90, 0, 0]);
    } else {
      if (catcher.property("X Rotation")) catcher.property("X Rotation").setValue(90);
    }

    var matOpts = catcher.property("Material Options");
    if (matOpts) {
      var acceptsShadows = matOpts.property("Accepts Shadows") || matOpts.property("ADBE Material Accepts Shadows");
      if (acceptsShadows) {
        acceptsShadows.setValue(2); // Only
      }
      var acceptsLights = matOpts.property("Accepts Lights") || matOpts.property("ADBE Material Accepts Lights");
      if (acceptsLights) {
        acceptsLights.setValue(1); // On
      }
    }

    app.endUndoGroup();
    return JSON.stringify({ ok: true, data: { catcher: catcher.name, parent: trackerLayer.name } });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function hotSwapLayerSource(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var layerIdx = config.layerIndex ? parseInt(config.layerIndex, 10) : -1;
    var layer = null;
    if (layerIdx > 0) {
      layer = comp.layer(layerIdx);
    } else {
      if (comp.selectedLayers.length > 0) {
        layer = comp.selectedLayers[0];
      }
    }

    if (!layer || !(layer instanceof AVLayer)) {
      return JSON.stringify({ ok: false, error: "No selected or valid 3D model layer found to swap." });
    }

    var originalFootage = layer.source;
    if (!originalFootage || !(originalFootage instanceof FootageItem)) {
      return JSON.stringify({ ok: false, error: "Target layer has no replaceable footage source." });
    }

    var newFile = new File(config.newFilePath);
    if (!newFile.exists) {
      return JSON.stringify({ ok: false, error: "New GLB file not found on disk: " + config.newFilePath });
    }

    app.beginUndoGroup("Tripo4AE Hot-Swap Action");
    
    var duplicatedFootage = originalFootage.duplicate();
    layer.replaceSource(duplicatedFootage, false);
    duplicatedFootage.replace(newFile);
    
    app.endUndoGroup();
    return JSON.stringify({ ok: true, data: { layer: layer.name, file: duplicatedFootage.name } });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function applyAntiSlidingWalkSync(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var layerIdx = config.modelLayerIndex ? parseInt(config.modelLayerIndex, 10) : -1;
    var layer = null;
    if (layerIdx > 0) {
      layer = comp.layer(layerIdx);
    } else {
      if (comp.selectedLayers.length > 0) {
        layer = comp.selectedLayers[0];
      }
    }

    if (!layer) {
      return JSON.stringify({ ok: false, error: "No target layer found." });
    }

    var speed = config.walkSpeedRatio !== undefined ? parseFloat(config.walkSpeedRatio) : 150.0;
    
    var targetProp = layer.property("Position");
    if (!targetProp) {
      return JSON.stringify({ ok: false, error: "Position property not found." });
    }

    app.beginUndoGroup("Apply Anti-Sliding Sync");
    
    targetProp.expression = 
      "// Tripo4AE Anti-Sliding Walk Expression\n" +
      "var speed = " + speed + ";\n" +
      "var dir = [0, 0, -1]; // Move forward along Z axis\n" +
      "var t = Math.max(0, time - inPoint);\n" +
      "value + dir * t * speed;";

    app.endUndoGroup();
    return JSON.stringify({ ok: true, data: { layer: layer.name, speed: speed } });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function exportCurrentFrameToPng(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var file = new File(config.tempPath);
    comp.saveFrameToPng(comp.time, file);

    if (!file.exists) {
      return JSON.stringify({ ok: false, error: "Failed to save frame PNG." });
    }

    return JSON.stringify({ ok: true, data: { path: config.tempPath } });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function createSmartMatchLightRig(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var keyColor = config.keyColor || [1, 1, 1];
    var fillColor = config.fillColor || [0.4, 0.4, 0.4];
    var ambientColor = config.ambientColor || [0.2, 0.2, 0.2];
    var intensity = config.intensity || 100;

    app.beginUndoGroup("Tripo4AE Smart Match Light Rig");

    var smartNames = ["Tripo4AE_Smart_Key", "Tripo4AE_Smart_Fill", "Tripo4AE_Smart_Ambient"];
    for (var j = comp.numLayers; j >= 1; j--) {
      var lyr = comp.layer(j);
      for (var k = 0; k < smartNames.length; k++) {
        if (lyr.name === smartNames[k]) {
          lyr.remove();
          break;
        }
      }
    }

    var cx = comp.width / 2;
    var cy = comp.height / 2;
    var dist = Math.max(comp.width, comp.height);

    // 1. Create Key Light (Point Light, casts shadows)
    var keyLight = comp.layers.addLight("Tripo4AE_Smart_Key", [cx + dist * 0.7, cy - dist * 0.6]);
    keyLight.threeDLayer = true;
    try { keyLight.lightType = LIGHT_TYPE_POINT; } catch (_) {}
    keyLight.property("Position").setValue([cx + dist * 0.7, cy - dist * 0.6, -dist * 0.7]);
    keyLight.property("Intensity").setValue(intensity);
    keyLight.property("Color").setValue(keyColor);
    
    var keyOpts = keyLight.property("Light Options");
    if (keyOpts) {
      try { keyOpts.property(LIGHT_MAP.castsShadows).setValue(1); } catch (_) {}
      try { keyOpts.property(LIGHT_MAP.shadowDarkness).setValue(40); } catch (_) {}
      try { keyOpts.property(LIGHT_MAP.shadowDiffusion).setValue(10); } catch (_) {}
    }

    // 2. Create Fill Light (Point Light, no shadows)
    var fillLight = comp.layers.addLight("Tripo4AE_Smart_Fill", [cx - dist * 0.5, cy - dist * 0.3]);
    fillLight.threeDLayer = true;
    try { fillLight.lightType = LIGHT_TYPE_POINT; } catch (_) {}
    fillLight.property("Position").setValue([cx - dist * 0.5, cy - dist * 0.3, -dist * 0.4]);
    fillLight.property("Intensity").setValue(intensity * 0.4);
    fillLight.property("Color").setValue(fillColor);
    
    var fillOpts = fillLight.property("Light Options");
    if (fillOpts) {
      try { fillOpts.property(LIGHT_MAP.castsShadows).setValue(0); } catch (_) {}
    }

    // 3. Create Ambient Light (Ambient Light, no shadows)
    var ambLight = comp.layers.addLight("Tripo4AE_Smart_Ambient", [cx, cy]);
    ambLight.threeDLayer = true;
    try { ambLight.lightType = LIGHT_TYPE_AMBIENT; } catch (_) {}
    ambLight.property("Intensity").setValue(intensity * 0.3);
    ambLight.property("Color").setValue(ambientColor);

    app.endUndoGroup();

    return JSON.stringify({
      ok: true,
      data: {
        lights: ["Tripo4AE_Smart_Key", "Tripo4AE_Smart_Fill", "Tripo4AE_Smart_Ambient"]
      }
    });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

export function toggleLayerProxy(configJson: string): string {
  try {
    var config = JSON.parse(configJson);
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: "No active composition" });
    }

    var layerIdx = config.layerIndex ? parseInt(config.layerIndex, 10) : -1;
    var layer = null;
    if (layerIdx > 0) {
      layer = comp.layer(layerIdx);
    } else {
      if (comp.selectedLayers.length > 0) {
        layer = comp.selectedLayers[0];
      }
    }

    if (!layer || !(layer instanceof AVLayer)) {
      return JSON.stringify({ ok: false, error: "No selected or valid 3D layer found to swap." });
    }

    var footage = layer.source;
    if (!footage || !(footage instanceof FootageItem)) {
      return JSON.stringify({ ok: false, error: "Target layer has no replaceable footage source." });
    }

    var targetFile = new File(config.targetFilePath);
    if (!targetFile.exists) {
      return JSON.stringify({ ok: false, error: "Target model file not found on disk: " + config.targetFilePath });
    }

    app.beginUndoGroup("Tripo4AE Toggle Viewport Proxy");
    footage.replace(targetFile);
    app.endUndoGroup();

    return JSON.stringify({ ok: true, data: { footage: footage.name, file: targetFile.name } });
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return JSON.stringify({ ok: false, error: String(e) });
  }
}





