/**
 * index.ts — ExtendScript host entry point
 * Runs inside After Effects ExtendScript engine.
 * Exposes all host functions on (this as any).tripo4ae for CEP panel invocation.
 *
 * ExtendScript globals used:
 *   app, ImportOptions, File, Folder, CompItem, KeyframeEase, alert
 */

declare const app: any;
declare const ImportOptions: any;
declare const File: any;
declare const Folder: any;
declare const CompItem: any;
declare const KeyframeEase: any;
declare const alert: (msg: string) => void;

import { getActiveCompInfo } from './projectInfo';
import { importModelToProject } from './importModel';
import { applyAnimationPreset } from './animation';
import { getExpression } from './expressions';
import { createCameraPreset } from './camera';
import { createLights } from './lights';
import { setupE3DLayer } from './e3d';

// Expose all host functions on the global tripo4ae object
(this as any).tripo4ae = {
  getActiveCompInfo,
  importModel: importModelToProject,
  applyAnimation: applyAnimationPreset,
  createCamera: createCameraPreset,
  createLights,
  getExpression,
  setupE3D: setupE3DLayer,
};
