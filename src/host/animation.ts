/**
 * animation.ts — ExtendScript host module (AE 2024.4+ / 2025 / 2026)
 * Applies model animation presets, loop expressions, and embedded animation control.
 */

declare const app: any;
declare const CompItem: any;
declare const KeyframeEase: any;

import type { ModelPreset, EasingType, LoopType } from '../shared/types';
import { getExpression } from './expressions';

// --- Keyframe helper ---

function setKeyframe(
  property: any,
  time: number,
  value: any,
  easeIn?: any[],
  easeOut?: any[]
): void {
  property.setValueAtTime(time, value);
  if (easeIn || easeOut) {
    const idx = property.nearestKeyIndex(time);
    if (easeIn) property.setTemporalEaseAtKey(idx, easeIn, easeIn);
    if (easeOut) property.setTemporalEaseAtKey(idx, easeOut, easeOut);
  }
}

function getEasingEase(type: EasingType): { inEase: any[]; outEase: any[] } {
  switch (type) {
    case 'ease-in-out':
      return {
        inEase: [new KeyframeEase(0, 66)],
        outEase: [new KeyframeEase(0, 66)],
      };
    case 'bounce':
      return {
        inEase: [new KeyframeEase(0, 50)],
        outEase: [new KeyframeEase(0, 90)],
      };
    case 'elastic':
      return {
        inEase: [new KeyframeEase(0, 33)],
        outEase: [new KeyframeEase(0, 80)],
      };
    default: // linear
      return {
        inEase: [new KeyframeEase(0, 50)],
        outEase: [new KeyframeEase(0, 50)],
      };
  }
}

// --- Model presets ---

interface PresetConfig {
  modelPreset: ModelPreset;
  easing: EasingType;
  duration: number;
}

function applyFadeIn(layer: any, config: PresetConfig): void {
  const { duration, easing } = config;
  const { inEase, outEase } = getEasingEase(easing);
  const opacity = layer.property('Opacity');
  if (!opacity) return;
  const startTime = layer.inPoint;
  setKeyframe(opacity, startTime, 0, undefined, outEase);
  setKeyframe(opacity, startTime + duration, 100, inEase, undefined);
}

function applyScalePop(layer: any, config: PresetConfig): void {
  const { duration, easing } = config;
  const { inEase, outEase } = getEasingEase(easing);
  const scale = layer.property('Scale');
  if (!scale) return;
  const startTime = layer.inPoint;
  setKeyframe(scale, startTime, [0, 0], undefined, outEase);
  setKeyframe(scale, startTime + duration * 0.7, [110, 110], inEase, outEase);
  setKeyframe(scale, startTime + duration, [100, 100], inEase, undefined);
}

function applyFlip(layer: any, config: PresetConfig): void {
  const { duration, easing } = config;
  const { inEase, outEase } = getEasingEase(easing);
  const yRot = layer.property('Y Rotation');
  if (!yRot) return;
  const startTime = layer.inPoint;
  setKeyframe(yRot, startTime, 90, undefined, outEase);
  setKeyframe(yRot, startTime + duration, 0, inEase, undefined);
}

function applySlideIn(layer: any, config: PresetConfig): void {
  const { duration, easing } = config;
  const { inEase, outEase } = getEasingEase(easing);
  const position = layer.property('Position');
  if (!position) return;
  const startTime = layer.inPoint;
  const endPos = position.value;
  setKeyframe(position, startTime, [-200, endPos[1]], undefined, outEase);
  setKeyframe(position, startTime + duration, endPos, inEase, undefined);
}

// --- Loop expression application ---

function applyLoopExpression(
  layer: any,
  loop: { type: LoopType; axis?: 'x' | 'y' | 'z'; speed?: number; amplitude?: number; frequency?: number }
): void {
  const expr = getExpression(loop.type, {
    axis: loop.axis,
    speed: loop.speed,
    amplitude: loop.amplitude,
    frequency: loop.frequency,
  });
  if (!expr) return;

  switch (loop.type) {
    case 'spin': {
      const axis = loop.axis || 'y';
      const prop = axis === 'x' ? 'X Rotation' : axis === 'y' ? 'Y Rotation' : 'Z Rotation';
      const rotProp = layer.property(prop);
      if (rotProp) rotProp.expression = expr;
      break;
    }
    case 'float': {
      const posProp = layer.property('Position');
      if (posProp) posProp.expression = expr;
      break;
    }
    case 'breathe': {
      const scaleProp = layer.property('Scale');
      if (scaleProp) scaleProp.expression = expr;
      break;
    }
  }
}

// --- Embedded animation control ---

export function selectEmbeddedAnimation(config: {
  layerIndex?: number;
  animationIndex?: number;
  animationName?: string;
  enableTimeRemap?: boolean;
  loopAnimation?: boolean;
}): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    let layer: any;
    if (config.layerIndex !== undefined) {
      layer = comp.layer(config.layerIndex + 1);
    } else {
      const selected = comp.selectedLayers;
      if (selected.length === 0) {
        return JSON.stringify({ ok: false, error: 'No layer selected' });
      }
      layer = selected[0];
    }

    // Enable time remap if requested
    if (config.enableTimeRemap) {
      try {
        layer.timeRemapEnabled = true;
      } catch (_) {}
    }

    // Select embedded animation via Animation Options
    if (config.animationIndex !== undefined || config.animationName) {
      try {
        const animOptions = layer.property('ADBE Animation Options');
        if (animOptions) {
          const nameProp = animOptions.property('ADBE Animation Name')
            || animOptions.property('ADBE Anim Options Name');
          if (nameProp) {
            if (config.animationIndex !== undefined) {
              nameProp.setValue(config.animationIndex);
            } else if (config.animationName) {
              // Try to find the animation by name in the dropdown
              // AE dropdown: try setting by name if value lookup fails
              nameProp.setValue(config.animationName);
            }
          }
        }
      } catch (_) {}
    }

    // Set time remap to loop the embedded animation
    if (config.loopAnimation && layer.timeRemapEnabled) {
      const timeRemap = layer.property('Time Remap');
      if (timeRemap) {
        const duration = timeRemap.keyValue(2) - timeRemap.keyValue(1);
        timeRemap.expression = [
          '// Tripo4AE Embedded Animation Loop',
          'var duration = ' + duration + ';',
          'var start = ' + timeRemap.keyValue(1) + ';',
          'var t = (time - inPoint) % duration;',
          'start + t;',
        ].join('\n');
      }
    }

    return JSON.stringify({
      ok: true,
      data: {
        animationSelected: config.animationName || config.animationIndex || 'default',
        loopEnabled: !!config.loopAnimation,
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}

// --- Main entry point ---

interface AnimationConfig {
  modelPreset?: ModelPreset;
  easing: EasingType;
  duration: number;
  loops?: Array<{
    type: LoopType;
    axis?: 'x' | 'y' | 'z';
    speed?: number;
    amplitude?: number;
    frequency?: number;
  }>;
}

export function applyAnimationPreset(config: AnimationConfig): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: false, error: 'No active composition' });
    }

    const layers = comp.selectedLayers;
    if (layers.length === 0) {
      return JSON.stringify({ ok: false, error: 'No layer selected' });
    }

    const layer = layers[0];

    // Apply model preset
    if (config.modelPreset) {
      const presetConfig: PresetConfig = {
        modelPreset: config.modelPreset,
        easing: config.easing,
        duration: config.duration,
      };
      switch (config.modelPreset) {
        case 'fade-in':
          applyFadeIn(layer, presetConfig);
          break;
        case 'scale-pop':
          applyScalePop(layer, presetConfig);
          break;
        case 'flip':
          applyFlip(layer, presetConfig);
          break;
        case 'slide-in':
          applySlideIn(layer, presetConfig);
          break;
      }
    }

    // Apply loop expressions
    if (config.loops) {
      for (const loop of config.loops) {
        applyLoopExpression(layer, loop);
      }
    }

    return JSON.stringify({
      ok: true,
      data: {
        preset: config.modelPreset || 'none',
        loops: (config.loops || []).map((l) => l.type),
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
