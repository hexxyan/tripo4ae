import type { ModelVersion, RigType, AnimationPreset, StylizeStyle, ConvertFormat, GenerateStyle, ImageGenModel, CameraPreset, ModelPreset, EasingType, LoopType, ImportWorkflow } from './types';

export const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';

export const MODEL_VERSIONS: { value: ModelVersion; label: string; description: string }[] = [
  { value: 'v3.1-20260211', label: 'v3.1', description: 'Latest high-quality' },
  { value: 'P1-20260311', label: 'P1', description: 'Low-poly optimized' },
  { value: 'Turbo-v1.0-20250506', label: 'Turbo', description: 'Fast draft' },
  { value: 'v3.0-20250812', label: 'v3.0', description: 'Stable v3' },
  { value: 'v2.5-20250123', label: 'v2.5', description: 'Legacy default' },
];

export const FACE_LIMIT_PRESETS = [
  { label: 'Low (3k)', value: 3000 },
  { label: 'Medium (10k)', value: 10000 },
  { label: 'High (20k)', value: 20000 },
  { label: 'Auto', value: undefined },
];

export const GENERATE_STYLES: { value: GenerateStyle; label: string }[] = [
  { value: 'person:person2cartoon', label: 'Person → Cartoon' },
  { value: 'animal:venom', label: 'Animal → Venom' },
  { value: 'object:clay', label: 'Clay' },
  { value: 'object:steampunk', label: 'Steampunk' },
  { value: 'object:christmas', label: 'Christmas' },
  { value: 'object:barbie', label: 'Barbie' },
  { value: 'gold', label: 'Gold' },
  { value: 'ancient_bronze', label: 'Ancient Bronze' },
];

export const RIG_TYPES: { value: RigType; label: string }[] = [
  { value: 'biped', label: 'Biped (Humanoid)' },
  { value: 'quadruped', label: 'Quadruped' },
  { value: 'hexapod', label: 'Hexapod (6-leg)' },
  { value: 'octopod', label: 'Octopod (8-leg)' },
  { value: 'avian', label: 'Avian (Bird)' },
  { value: 'serpentine', label: 'Serpentine (Snake)' },
  { value: 'aquatic', label: 'Aquatic (Fish)' },
];

export const BIPED_ANIMATIONS: AnimationPreset[] = [
  'preset:biped:idle', 'preset:biped:walk', 'preset:biped:run',
  'preset:biped:jump', 'preset:biped:fall', 'preset:biped:dive',
  'preset:biped:dance_01', 'preset:biped:dance_02', 'preset:biped:dance_03',
  'preset:biped:dance_04', 'preset:biped:dance_05', 'preset:biped:dance_06',
  'preset:biped:slash', 'preset:biped:shoot', 'preset:biped:hurt',
  'preset:biped:wave_goodbye_01', 'preset:biped:wave_goodbye_02',
  'preset:biped:bow', 'preset:biped:clap', 'preset:biped:cheer',
  'preset:biped:sit', 'preset:biped:hug', 'preset:biped:laugh_01',
  'preset:biped:cry', 'preset:biped:scratch', 'preset:biped:flip',
  'preset:biped:surf', 'preset:biped:swim', 'preset:biped:golf',
  'preset:biped:basketball_shot', 'preset:biped:volleyball',
  'preset:biped:football_pass', 'preset:biped:football_catch',
  'preset:biped:sing_01', 'preset:biped:sing_02', 'preset:biped:sing_03',
  'preset:biped:sing_04', 'preset:biped:play_video_game',
  'preset:biped:make_a_call_01', 'preset:biped:make_a_call_02',
];

export const CROSS_SPECIES_ANIMATIONS: AnimationPreset[] = [
  'preset:idle', 'preset:walk', 'preset:run', 'preset:dive',
  'preset:climb', 'preset:jump', 'preset:slash', 'preset:shoot',
  'preset:hurt', 'preset:fall', 'preset:turn',
  'preset:quadruped:walk', 'preset:hexapod:walk', 'preset:octopod:walk',
  'preset:serpentine:march', 'preset:aquatic:march',
];

export const CONVERT_FORMATS: { value: ConvertFormat; label: string }[] = [
  { value: 'FBX', label: 'FBX (Animation + E3D)' },
  { value: 'OBJ', label: 'OBJ (Static)' },
  { value: 'GLTF', label: 'GLTF' },
  { value: 'USDZ', label: 'USDZ (AR/iOS)' },
  { value: 'STL', label: 'STL (Print)' },
  { value: '3MF', label: '3MF (Print)' },
];

export const STYLIZE_STYLES: { value: StylizeStyle; label: string }[] = [
  { value: 'lego', label: 'Lego' },
  { value: 'voxel', label: 'Voxel' },
  { value: 'voronoi', label: 'Voronoi' },
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'keyring', label: 'Keyring' },
  { value: 'fridge_magnet', label: 'Fridge Magnet' },
  { value: 'keycap', label: 'Keycap' },
];

export const IMAGE_GEN_MODELS: { value: ImageGenModel; label: string }[] = [
  { value: 'seedream_v4', label: 'SeeDream v4 (Default)' },
  { value: 'flux.1_dev', label: 'FLUX.1 Dev' },
  { value: 'flux.1_kontext_pro', label: 'FLUX.1 Kontext Pro' },
  { value: 'gemini_2.5_flash_image_preview', label: 'Gemini 2.5 Flash' },
];

export const IMPORT_WORKFLOWS: { value: ImportWorkflow; label: string; description: string }[] = [
  { value: 'advanced3d', label: 'AE Native (Advanced 3D)', description: 'Import as native 3D layer and activate Advanced 3D renderer' },
  { value: 'project_only', label: 'Project Only', description: 'Import asset into Project panel only without placing in comp' },
  { value: 'element3d', label: 'Element 3D (Semi-automatic)', description: 'Convert to OBJ, save to E3D folder, and setup layer (requires manual scene load)' },
];

// AE Animation Presets
export const CAMERA_PRESETS: { value: CameraPreset; label: string }[] = [
  { value: 'orbit', label: 'Orbit' },
  { value: 'push', label: 'Push In' },
  { value: 'track', label: 'Track' },
  { value: 'jib', label: 'Jib Up' },
];

export const MODEL_PRESETS: { value: ModelPreset; label: string }[] = [
  { value: 'fade-in', label: 'Fade In' },
  { value: 'scale-pop', label: 'Scale Pop' },
  { value: 'elastic-pop', label: 'Elastic Pop' },
  { value: 'flip', label: 'Flip In' },
  { value: 'slide-in', label: 'Slide In' },
];

export const EASING_TYPES: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in-out', label: 'Ease In/Out' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'elastic', label: 'Elastic' },
];

export const LOOP_TYPES: { value: LoopType; label: string }[] = [
  { value: 'spin', label: 'Spin' },
  { value: 'float', label: 'Float' },
  { value: 'breathe', label: 'Breathe' },
];

// AE 2026 Material Presets (Adobe Standard Material)
export const MATERIAL_PRESETS: { value: string; label: string; material: import('./types').MaterialProperties }[] = [
  { value: 'default', label: 'Default', material: {} },
  { value: 'metallic', label: 'Metallic', material: { metal: 1, reflectionIntensity: 80, reflectionSharpness: 90, diffuse: 30, specularIntensity: 80 } },
  { value: 'glass', label: 'Glass', material: { transparency: 80, indexOrRefraction: 1.5, reflectionIntensity: 30, specularIntensity: 90, lightTransmission: 90 } },
  { value: 'plastic', label: 'Plastic', material: { metal: 0, diffuse: 80, specularIntensity: 40, specularShininess: 30 } },
  { value: 'rubber', label: 'Rubber', material: { metal: 0, diffuse: 90, specularIntensity: 10, specularShininess: 5 } },
  { value: 'ceramic', label: 'Ceramic', material: { metal: 0, diffuse: 70, specularIntensity: 60, specularShininess: 80, reflectionIntensity: 20 } },
  { value: 'gold', label: 'Gold', material: { metal: 1, ambient: 50, diffuse: 60, reflectionIntensity: 90, reflectionSharpness: 70, specularIntensity: 70 } },
  { value: 'clay', label: 'Clay', material: { metal: 0, diffuse: 90, specularIntensity: 5, ambient: 20 } },
];

export const MODEL_SAVE_DIR = 'Tripo4AE/Models';
export const TEMPLATE_SAVE_DIR = 'Tripo4AE/Templates';
export const HDR_SAVE_DIR = 'Tripo4AE/HDR';

// Free CC0 HDR environment maps from Poly Haven via pmndrs/drei-assets & gh-proxy (1k resolution, ~1.5MB each)
export const HDR_PRESETS = [
  { id: 'studio_small_03', label: 'Studio Soft', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/studio_small_03_1k.hdr' },
  { id: 'potsdamer_platz', label: 'City Lights', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/potsdamer_platz_1k.hdr' },
  { id: 'venice_sunset', label: 'Sunset Glow', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/venice_sunset_1k.hdr' },
  { id: 'kiara_1_dawn', label: 'Dawn Kiara', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/kiara_1_dawn_1k.hdr' },
  { id: 'forest_slope', label: 'Forest Slope', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/forest_slope_1k.hdr' },
  { id: 'rooitou_park', label: 'Park Grassy', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/rooitou_park_1k.hdr' },
  { id: 'empty_warehouse_01', label: 'Warehouse Empty', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/empty_warehouse_01_1k.hdr' },
  { id: 'dikhololo_night', label: 'Night Starry', url: 'https://gh-proxy.com/https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/dikhololo_night_1k.hdr' },
];
