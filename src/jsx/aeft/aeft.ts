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

// --- Material match names (AE 2024.4+ Advanced 3D) ---

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
    var file = new File(modelPath);
    if (!file.exists) {
      return JSON.stringify({ ok: false, error: "File not found: " + modelPath });
    }

    var config: any = { autoScale: true, centerInComp: true, enableTimeRemap: true };
    if (configJson) {
      try { config = JSON.parse(configJson); } catch (e) {}
    }

    var io = new ImportOptions(file);
    var footage = app.project.importFile(io);
    var comp = app.project.activeItem;

    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: true, data: { name: footage.name, addedToComp: false } });
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
    cameraLayer.property("Depth of Field").setValue(1);

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

    var lightsData = [
      { name: "Tripo4AE_Key", x: cx + dist * Math.cos(keyAngle), y: cy - dist * 0.6, z: dist * Math.sin(keyAngle), intensity: intensity },
      { name: "Tripo4AE_Fill", x: cx - dist * Math.cos(keyAngle), y: cy - dist * 0.3, z: dist * 0.5, intensity: intensity * fillRatio },
      { name: "Tripo4AE_Rim", x: cx, y: cy - dist * 0.8, z: -dist * 0.8, intensity: intensity * rimRatio },
    ];

    var created: string[] = [];
    for (var i = 0; i < lightsData.length; i++) {
      var ld = lightsData[i];
      var layer = comp.layers.addLight(ld.name, [ld.x, ld.y]);
      layer.property("Intensity").setValue(ld.intensity);
      layer.property("Color").setValue(color);
      layer.property("Position").setValue([ld.x, ld.y, ld.z]);
      layer.threeDLayer = true;
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
  return getExpression(type, params);
}
