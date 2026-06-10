// Tripo4AE — After Effects ExtendScript host functions
// All functions registered via host[ns] in src/jsx/index.ts
// Runs inside AE's ExtendScript engine (ES3 target)

import { getActiveComp, getProjectDir } from "./aeft-utils";

// --- Keyframe helpers ---

function setKeyframe(property: any, time: number, value: any, easeIn?: any[], easeOut?: any[]): void {
  property.setValueAtTime(time, value);
  if (easeIn || easeOut) {
    var idx = property.nearestKeyIndex(time);
    if (easeIn) property.setTemporalEaseAtKey(idx, easeIn, easeIn);
    if (easeOut) property.setTemporalEaseAtKey(idx, easeOut, easeOut);
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

// --- Material presets (PBR SOP) ---
var MATERIAL_PRESETS: any = {
  plastic: { ambient: 0, diffuse: 0.8, specularIntensity: 0.5, specularShininess: 0.1, metal: 0, reflectionIntensity: 0.05, transparency: 0 },
  metal: { ambient: 0, diffuse: 0.4, specularIntensity: 0.9, specularShininess: 0.8, metal: 1, reflectionIntensity: 0.8, reflectionSharpness: 0.9, transparency: 0 },
  glass: { ambient: 0, diffuse: 0.1, specularIntensity: 0.9, specularShininess: 0.9, metal: 0, reflectionIntensity: 0.5, transparency: 0.85, transparencyRolloff: 0.5, indexOrRefraction: 1.5, lightTransmission: 0.9 },
  gold: { ambient: 0, diffuse: 0.5, specularIntensity: 0.95, specularShininess: 0.85, metal: 1, reflectionIntensity: 0.9, reflectionSharpness: 0.95, reflectionRolloff: 0.8, transparency: 0 },
  matte: { ambient: 0.1, diffuse: 0.9, specularIntensity: 0, specularShininess: 0, metal: 0, reflectionIntensity: 0, transparency: 0 },
  ceramic: { ambient: 0, diffuse: 0.7, specularIntensity: 0.6, specularShininess: 0.4, metal: 0, reflectionIntensity: 0.3, reflectionSharpness: 0.7, transparency: 0 },
  rubber: { ambient: 0, diffuse: 0.9, specularIntensity: 0.15, specularShininess: 0.05, metal: 0, reflectionIntensity: 0.02, transparency: 0 },
  crystal: { ambient: 0, diffuse: 0.05, specularIntensity: 1, specularShininess: 0.95, metal: 0, reflectionIntensity: 0.6, reflectionSharpness: 0.95, transparency: 0.9, transparencyRolloff: 0.3, indexOrRefraction: 2.0, lightTransmission: 0.95 },
};

// --- Advanced 3D renderer match names ---

var ADVANCED_3D_RENDERERS = ["ADBE Advanced 3d", "ADBE Mercury 3D Engine"];

function ensureAdvanced3DRenderer(comp: any): boolean {
  try {
    var current = comp.renderer;
    for (var i = 0; i < ADVANCED_3D_RENDERERS.length; i++) {
      if (current === ADVANCED_3D_RENDERERS[i]) return true;
    }
    for (var j = 0; j < ADVANCED_3D_RENDERERS.length; j++) {
      try {
        comp.renderer = ADVANCED_3D_RENDERERS[j];
        return true;
      } catch (e) {}
    }
  } catch (e) {}
  return false;
}

// --- Expression generators ---

function getSpinExpression(axis: string, speed: number): string {
  var axisProp = axis === "x" ? "X Rotation" : axis === "y" ? "Y Rotation" : "Z Rotation";
  return "// Tripo4AE Spin Expression\nvar spd = " + speed + ";\n" + axisProp + " = time * spd * 360;";
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
      try { config = JSON.parse(configJson); } catch (e) {}
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

    // Center in comp
    if (config.centerInComp && layer.position) {
      layer.position.setValue([comp.width / 2, comp.height / 2]);
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
            setKeyframe(scale, startTime, [0, 0], undefined, ease.outEase);
            setKeyframe(scale, startTime + duration * 0.7, [110, 110], ease.inEase, ease.outEase);
            setKeyframe(scale, startTime + duration, [100, 100], ease.inEase, undefined);
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
            setKeyframe(position, startTime, [-200, endPos[1]], undefined, ease.outEase);
            setKeyframe(position, startTime + duration, endPos, ease.inEase, undefined);
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
            var rotProp = layer.property(prop);
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
      if (timeRemap) {
        var duration = timeRemap.keyValue(2) - timeRemap.keyValue(1);
        var startVal = timeRemap.keyValue(1);
        timeRemap.expression =
          "// Tripo4AE Embedded Animation Loop\n" +
          "var duration = " + duration + ";\n" +
          "var start = " + startVal + ";\n" +
          "var t = (time - inPoint) % duration;\n" +
          "start + t;";
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

    var radius = config.radius || 500;
    var duration = config.duration || 5;
    var cameraLayer = comp.layers.addCamera("Tripo4AE_Camera", [comp.width / 2, comp.height / 2]);
    cameraLayer.property("Position").setValue([comp.width / 2, comp.height / 2, -radius]);

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

    var cx = comp.width / 2;
    var cy = comp.height / 2;

    switch (config.preset) {
      case "orbit": {
        var pointOfInterest = cameraLayer.property("Point of Interest");
        var position = cameraLayer.property("Position");
        var numKeyframes = 36;
        for (var i = 0; i <= numKeyframes; i++) {
          var t = (i / numKeyframes) * duration;
          var angle = (i / numKeyframes) * 2 * Math.PI;
          setKeyframe(position, t, [cx + radius * Math.cos(angle), cy, radius * Math.sin(angle)]);
          setKeyframe(pointOfInterest, t, [cx, cy, 0]);
        }
        break;
      }
      case "push": {
        var pos = cameraLayer.property("Position");
        setKeyframe(pos, 0, [cx, cy, -(radius * 3)]);
        setKeyframe(pos, duration, [cx, cy, -(radius * 0.5)]);
        break;
      }
      case "track": {
        var offset = config.offset || 400;
        var posTrack = cameraLayer.property("Position");
        setKeyframe(posTrack, 0, [cx - offset, cy, -radius]);
        setKeyframe(posTrack, duration, [cx + offset, cy, -radius]);
        break;
      }
      case "jib": {
        var offsetJib = config.offset || 300;
        var posJib = cameraLayer.property("Position");
        var poiJib = cameraLayer.property("Point of Interest");
        setKeyframe(posJib, 0, [cx, cy + offsetJib, -radius]);
        setKeyframe(posJib, duration, [cx, cy - offsetJib, -radius]);
        setKeyframe(poiJib, 0, [cx, cy, 0]);
        setKeyframe(poiJib, duration, [cx, cy, 0]);
        break;
      }
      case "dolly-zoom": {
        // Vertigo effect: move camera in while zooming out (or vice versa)
        var poi = cameraLayer.property("Point of Interest");
        var posDz = cameraLayer.property("Position");
        poi.setValue([cx, cy, 0]);
        var startZoom = config.startZoom || 200;
        var endZoom = config.endZoom || 800;
        try {
          camGroup.property(CAM_MAP.zoom).setValueAtTime(0, startZoom);
          camGroup.property(CAM_MAP.zoom).setValueAtTime(duration, endZoom);
        } catch (e) {}
        setKeyframe(posDz, 0, [cx, cy, -(radius * 2)]);
        setKeyframe(posDz, duration, [cx, cy, -(radius * 0.4)]);
        break;
      }
      case "crane": {
        // Multi-axis crane: rise + orbit + push
        var poiCrane = cameraLayer.property("Point of Interest");
        var posCrane = cameraLayer.property("Position");
        var craneSteps = 24;
        for (var ci = 0; ci <= craneSteps; ci++) {
          var ct = (ci / craneSteps) * duration;
          var ca = (ci / craneSteps) * Math.PI * 1.5;
          var cr = radius * (1.5 - ci / craneSteps);
          var cyOff = -200 + 400 * (ci / craneSteps);
          setKeyframe(posCrane, ct, [cx + cr * Math.cos(ca), cy + cyOff, cr * Math.sin(ca)]);
          setKeyframe(poiCrane, ct, [cx, cy, 0]);
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
        z: dist * Math.sin(keyAngle), intensity: intensity,
        coneAngle: config.coneAngle, coneFeather: config.coneFeather,
      },
      {
        name: "Tripo4AE_Fill", x: cx - dist * Math.cos(keyAngle), y: cy - dist * 0.3,
        z: dist * 0.5, intensity: intensity * fillRatio,
        coneAngle: undefined, coneFeather: undefined,
      },
      {
        name: "Tripo4AE_Rim", x: cx, y: cy - dist * 0.8, z: -dist * 0.8,
        intensity: intensity * rimRatio,
        coneAngle: undefined, coneFeather: undefined,
      },
    ];

    var created: string[] = [];
    for (var i = 0; i < lightsData.length; i++) {
      var ld = lightsData[i];
      var layer = comp.layers.addLight(ld.name, [ld.x, ld.y]);
      layer.threeDLayer = true;
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

    // Try to set as environment light type (AE 2025+)
    try {
      var lightOptions = lightLayer.property("ADBE Light Options Group");
      if (lightOptions) {
        try { lightOptions.property("ADBE Light Type").setValue(5); } catch (e) {}
      }
    } catch (e) {}

    // Try to set HDRI
    if (config.hdrPath) {
      try {
        var hdrFile = new File(config.hdrPath);
        if (hdrFile.exists) {
          var io = new ImportOptions(hdrFile);
          var hdrFootage = app.project.importFile(io);
          try {
            var envImage = lightLayer.property("ADBE Environment Light Options Group") || lightLayer.property("ADBE Light Options Group");
            if (envImage) {
              var imgProp = envImage.property("ADBE Environment Image") || envImage.property("ADBE Light Image");
              if (imgProp) imgProp.setValue(hdrFootage);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (config.castShadows !== undefined) {
      try { lightLayer.property("Casts Shadows").setValue(config.castShadows ? 1 : 0); } catch (e) {}
    }
    if (config.shadowDarkness !== undefined) {
      try { lightLayer.property("Shadow Darkness").setValue(config.shadowDarkness); } catch (e) {}
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

    // 2. Camera
    var cameraLayer = comp.layers.addCamera("Tripo4AE_Camera", [cx, cy]);
    cameraLayer.property("Position").setValue([cx, cy, -(config.cameraDistance || 800)]);
    cameraLayer.property("Point of Interest").setValue([cx, cy, 0]);
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
      { name: "Tripo4AE_Key", x: cx + dist * Math.cos(keyAngle), y: cy - dist * 0.6, z: dist * Math.sin(keyAngle), int: lightIntensity },
      { name: "Tripo4AE_Fill", x: cx - dist * Math.cos(keyAngle), y: cy - dist * 0.3, z: dist * 0.5, int: lightIntensity * 0.4 },
      { name: "Tripo4AE_Rim", x: cx, y: cy - dist * 0.8, z: -dist * 0.8, int: lightIntensity * 0.6 },
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
        try { lightGroup.property(LIGHT_MAP.falloffDistance).setValue(dist * 2); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.castsShadows).setValue(1); } catch (e) {}
        try { lightGroup.property(LIGHT_MAP.shadowDarkness).setValue(50); } catch (e) {}
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
        // Try environment light type (AE 2025+)
        try {
          var lightOpts = envLayer.property("ADBE Light Options Group");
          if (lightOpts) { try { lightOpts.property("ADBE Light Type").setValue(5); } catch (e) {} }
        } catch (e) {}
        envLightCreated = true;
      } catch (e) {}
    }

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
