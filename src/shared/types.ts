// === Tripo API Types ===

export type TaskType =
  | 'text_to_model' | 'image_to_model' | 'multiview_to_model' | 'refine_model'
  | 'generate_image' | 'text_to_image' | 'generate_multiview_image' | 'edit_multiview_image'
  | 'texture_model'
  | 'animate_prerigcheck' | 'animate_rig' | 'animate_retarget'
  | 'convert_model' | 'stylize_model'
  | 'mesh_segmentation' | 'mesh_completion' | 'highpoly_to_lowpoly'
  | 'import_model';

export type TaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown' | 'banned' | 'expired';
export type ImportWorkflow = 'advanced3d' | 'project_only' | 'element3d';

export type ModelVersion =
  | 'P1-20260311' | 'Turbo-v1.0-20250506'
  | 'v3.1-20260211' | 'v3.0-20250812' | 'v2.5-20250123'
  | 'v2.0-20240919' | 'v1.4-20240625';

export type TextureQuality = 'standard' | 'detailed' | 'extreme';
export type GeometryQuality = 'standard' | 'detailed';
export type TextureAlignment = 'original_image' | 'geometry';

export type RigType = 'biped' | 'quadruped' | 'hexapod' | 'octopod' | 'avian' | 'serpentine' | 'aquatic';
export type AnimateRigVersion = 'v2.5-20260210' | 'v1.0-20240301';
export type RigSpec = 'tripo' | 'mixamo';
export type RigTopology = 'bip' | 'quad';
export type RigOutFormat = 'glb' | 'fbx';

export type AnimationPreset = string; // e.g. 'preset:biped:walk', 'preset:idle'

export type ConvertFormat = 'GLTF' | 'USDZ' | 'FBX' | 'OBJ' | 'STL' | '3MF';
export type TextureFormat = 'BMP' | 'DPX' | 'HDR' | 'JPEG' | 'OPEN_EXR' | 'PNG' | 'TARGA' | 'TIFF' | 'WEBP';
export type FbxPreset = 'blender' | '3dsmax' | 'mixamo' | 'bake_scale';
export type ExportOrientation = '+x' | '-x' | '+y' | '-y';

export type StylizeStyle = 'lego' | 'voxel' | 'voronoi' | 'minecraft' | 'keyring' | 'fridge_magnet' | 'keycap';

export type GenerateStyle =
  | 'person:person2cartoon' | 'animal:venom'
  | 'object:clay' | 'object:steampunk' | 'object:christmas' | 'object:barbie'
  | 'gold' | 'ancient_bronze';

export type ImageGenModel = 'flux.1_kontext_pro' | 'flux.1_dev' | 'seedream_v4' | 'gemini_2.5_flash_image_preview';

// === File Input ===

export interface FileInput {
  type: string;
  file_token?: string;
  url?: string;
  object?: { bucket: string; key: string };
}

// === API Request Types ===

export interface TextToModelRequest {
  type: 'text_to_model';
  prompt: string;
  negative_prompt?: string;
  model_version?: ModelVersion;
  model_seed?: number;
  texture_seed?: number;
  image_seed?: number;
  face_limit?: number;
  texture?: boolean;
  pbr?: boolean;
  texture_quality?: TextureQuality;
  quad?: boolean;
  smart_low_poly?: boolean;
  geometry_quality?: GeometryQuality;
  style?: GenerateStyle;
  auto_size?: boolean;
  export_uv?: boolean;
  render_image?: boolean;
}

export interface ImageToModelRequest {
  type: 'image_to_model';
  file: FileInput;
  model_seed?: number;
  texture_seed?: number;
  model_version?: ModelVersion;
  face_limit?: number;
  texture?: boolean;
  pbr?: boolean;
  texture_quality?: TextureQuality;
  quad?: boolean;
  smart_low_poly?: boolean;
  geometry_quality?: GeometryQuality;
  style?: GenerateStyle;
  orientation?: 'align_image' | 'default';
  enable_image_autofix?: boolean;
  generate_parts?: boolean;
  auto_size?: boolean;
  export_uv?: boolean;
  render_image?: boolean;
}

export interface MultiviewToModelRequest {
  type: 'multiview_to_model';
  files?: FileInput[];
  original_task_id?: string;
  mode?: 'LEFT' | 'RIGHT';
  model_version?: ModelVersion;
  model_seed?: number;
  texture_seed?: number;
  face_limit?: number;
  texture?: boolean;
  pbr?: boolean;
  texture_quality?: TextureQuality;
  quad?: boolean;
  geometry_quality?: GeometryQuality;
  style?: GenerateStyle;
  orientation?: 'align_image' | 'default';
  auto_size?: boolean;
  export_uv?: boolean;
  render_image?: boolean;
}

export interface RefineModelRequest {
  type: 'refine_model';
  draft_model_task_id: string;
}

export interface TextureModelRequest {
  type: 'texture_model';
  original_model_task_id: string;
  texture_prompt?: {
    text?: string;
    image?: FileInput;
    images?: FileInput[];
    style_image?: FileInput;
  };
  texture?: boolean;
  pbr?: boolean;
  texture_quality?: TextureQuality;
  texture_alignment?: TextureAlignment;
  texture_seed?: number;
  model_version?: 'v3.0-20250812' | 'v2.5-20250123';
  part_names?: string[];
  bake?: boolean;
}

export interface AnimatePrerigcheckRequest {
  type: 'animate_prerigcheck';
  original_model_task_id: string;
}

export interface AnimateRigRequest {
  type: 'animate_rig';
  original_model_task_id: string;
  rig_type?: RigType;
  out_format?: RigOutFormat;
  spec?: RigSpec;
  model_version?: AnimateRigVersion;
}

export interface AnimateRetargetRequest {
  type: 'animate_retarget';
  original_model_task_id: string;
  animation?: AnimationPreset;
  animations?: AnimationPreset[];
  out_format?: RigOutFormat;
  bake_animation?: boolean;
  export_with_geometry?: boolean;
  animate_in_place?: boolean;
}

export interface ConvertModelRequest {
  type: 'convert_model';
  original_model_task_id: string;
  format: ConvertFormat;
  quad?: boolean;
  force_symmetry?: boolean;
  face_limit?: number;
  flatten_bottom?: boolean;
  texture_size?: number;
  texture_format?: TextureFormat;
  pivot_to_center_bottom?: boolean;
  scale_factor?: number;
  with_animation?: boolean;
  pack_uv?: boolean;
  bake?: boolean;
  part_names?: string[];
  export_vertex_colors?: boolean;
  export_orientation?: ExportOrientation;
  fbx_preset?: FbxPreset;
  assemble_animation?: boolean;
  animate_in_place?: boolean;
}

export interface StylizeModelRequest {
  type: 'stylize_model';
  original_model_task_id: string;
  style: StylizeStyle;
  block_size?: number;
}

export interface MeshSegmentationRequest {
  type: 'mesh_segmentation';
  original_model_task_id: string;
}

export interface MeshCompletionRequest {
  type: 'mesh_completion';
  original_model_task_id: string;
  part_names?: string[];
}

export interface HighPolyToLowPolyRequest {
  type: 'highpoly_to_lowpoly';
  original_model_task_id: string;
  quad: boolean;
  face_limit?: number;
  model_version?: 'P-v2.0-20251225';
  bake?: boolean;
  part_names?: string[];
}

export interface GenerateImageRequest {
  type: 'generate_image';
  prompt: string;
  model_version?: ImageGenModel;
  file?: FileInput;
  files?: FileInput[];
  t_pose?: boolean;
  sketch_to_render?: boolean;
}

export interface GenerateMultiviewImageRequest {
  type: 'generate_multiview_image';
  file: FileInput;
}

export interface EditMultiviewImageRequest {
  type: 'edit_multiview_image';
  original_task_id: string;
  prompts: Array<{ prompt: string; view: 'front' | 'left' | 'back' | 'right' }>;
}

export interface ImportModelRequest {
  type: 'import_model';
  file: FileInput;
}

// Union type for all task requests
export type TripoTaskRequest =
  | TextToModelRequest | ImageToModelRequest | MultiviewToModelRequest
  | RefineModelRequest | TextureModelRequest
  | AnimatePrerigcheckRequest | AnimateRigRequest | AnimateRetargetRequest
  | ConvertModelRequest | StylizeModelRequest
  | MeshSegmentationRequest | MeshCompletionRequest | HighPolyToLowPolyRequest
  | GenerateImageRequest | GenerateMultiviewImageRequest | EditMultiviewImageRequest
  | ImportModelRequest;

// === API Response Types ===

export interface TripoTask {
  task_id: string;
  type: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output: {
    model?: string;
    base_model?: string;
    pbr_model?: string;
    rendered_image?: string;
    generated_image?: string;
    riggable?: boolean;
    rig_type?: string;
    topology?: string;
    generate_multiview_image?: {
      front_view_url: string;
      left_view_url: string;
      back_view_url: string;
      right_view_url: string;
    };
    consumed_credit?: number;
  };
  progress: number;
  error_code?: number;
  error_msg?: string;
  create_time: number;
  running_left_time?: number;
  queuing_num?: number;
}

export interface BalanceResponse {
  balance: number;
  frozen: number;
}

// === Pipeline ===

export interface PipelineStep {
  type: TaskType;
  taskId: string | null;
  status: TaskStatus | 'pending';
  output?: TripoTask['output'];
  thumbnailPath?: string;
  params: TripoTaskRequest;
  workflow?: ImportWorkflow;
}

// === Model Library ===

export interface ModelRecord {
  id: string;
  taskId: string;
  name: string;
  prompt?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  modelPath?: string;
  format: string;
  workflow?: ImportWorkflow;
  faceCount?: number;
  createdAt: number;
  pipelineSteps: PipelineStep[];
}

// === AE Context ===

export interface CompInfo {
  name: string;
  width: number;
  height: number;
  frameRate: number;
  duration: number;
  durationFrames: number;
}

// === AE Animation Presets ===

export type CameraPreset = 'orbit' | 'push' | 'track' | 'jib';
export type ModelPreset = 'fade-in' | 'scale-pop' | 'elastic-pop' | 'flip' | 'slide-in';
export type EasingType = 'linear' | 'ease-in-out' | 'bounce' | 'elastic';
export type LoopType = 'spin' | 'float' | 'breathe';

export interface AnimationConfig {
  cameraPreset?: CameraPreset;
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

export interface AnimTemplate {
  id: string;
  name: string;
  config: AnimationConfig;
  savedAt: number;
}

// === AE 2026 Advanced 3D ===

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

export interface ImportConfig {
  addToComp?: boolean;
  autoScale?: boolean;
  centerInComp?: boolean;
  enableTimeRemap?: boolean;
  selectEmbeddedAnim?: number;
  loopAnimation?: boolean;
}

export interface EnvironmentLightConfig {
  intensity?: number;
  hdrPath?: string;
  castShadows?: boolean;
  shadowDarkness?: number;
  color?: number[];
}

export interface EmbeddedAnimationConfig {
  layerIndex?: number;
  animationIndex?: number;
  animationName?: string;
  enableTimeRemap?: boolean;
  loopAnimation?: boolean;
}

// === Material Presets ===

export type MaterialPresetName = 'plastic' | 'metallic' | 'glass' | 'gold' | 'matte' | 'ceramic' | 'rubber' | 'crystal';

export interface MaterialPresetConfig {
  layerIndex?: number;
  preset: MaterialPresetName;
  overrides?: Partial<MaterialProperties>;
}

// === Scene Setup SOP ===

export interface SceneSetupConfig {
  cameraDistance?: number;
  depthOfField?: boolean;
  focusDistance?: number;
  aperture?: number;
  lightIntensity?: number;
  lightColor?: number[];
  keyAngle?: number;
  envIntensity?: number;
}

// === Parametric Mesh (AE 26.3+) ===

export type ParametricMeshType = 'Sphere' | 'Plane' | 'Cylinder' | 'Cone' | 'Torus' | 'Cube';

export interface ParametricMeshConfig {
  meshType: ParametricMeshType;
  color?: number[];
  materialPreset?: MaterialPresetName;
  curvature?: number;
  segments?: number;
  extrusionDepth?: number;
  bevelDepth?: number;
}

// === Camera Config (enhanced) ===

export interface CameraConfig {
  preset?: CameraPreset | 'dolly-zoom' | 'crane';
  radius?: number;
  duration?: number;
  offset?: number;
  depthOfField?: boolean;
  focusDistance?: number;
  aperture?: number;
  blurLevel?: number;
  zoom?: number;
  irisShape?: number;
  irisRotation?: number;
  irisRoundness?: number;
  startZoom?: number;
  endZoom?: number;
}

// === Lights Config (enhanced) ===

export interface LightsConfig {
  intensity?: number;
  color?: number[];
  keyAngle?: number;
  fillRatio?: number;
  rimRatio?: number;
  falloffType?: 0 | 1 | 2 | 3;
  falloffStart?: number;
  falloffDistance?: number;
  castShadows?: boolean;
  shadowDarkness?: number;
  shadowDiffusion?: number;
  coneAngle?: number;
  coneFeather?: number;
}

// === Rig Wizard ===

export interface RigCheckResult {
  riggable: boolean;
  rigType: RigType;
  message?: string;
}

export type RigWizardStep = 'select-model' | 'pre-rig-check' | 'select-animation' | 'execute';

export interface AnimationExecutionState {
  animationId: string;
  animationName: string;
  status: 'queued' | 'rigging' | 'retargeting' | 'downloading' | 'importing' | 'done' | 'failed';
  progress: number;
  error?: string;
  resultTaskId?: string;
  resultModelPath?: string;
}
