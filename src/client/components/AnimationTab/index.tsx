import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller, CancelledError } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import { useTranslation } from '../../hooks/useTranslation';
import {
  RIG_TYPES,
  BIPED_ANIMATIONS,
  CROSS_SPECIES_ANIMATIONS,
  CAMERA_PRESETS,
  MODEL_PRESETS,
  EASING_TYPES,
  LOOP_TYPES,
  MATERIAL_PRESETS,
  HDR_PRESETS,
  HDR_SAVE_DIR,
} from '../../../shared/constants';
import type {
  RigType,
  RigSpec,
  RigOutFormat,
  AnimationPreset,
  CameraPreset,
  ModelPreset,
  EasingType,
  LoopType,
  TripoTask,
  PipelineStep,
  AnimationConfig,
  ModelRecord,
  AnimTemplate,
  MaterialPresetName,
} from '../../../shared/types';
import { ProgressBar } from '../common/ProgressBar';
import { ModelSelector } from '../common/ModelSelector';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Animation categories for retarget
interface AnimCategory {
  label: string;
  items: { value: string; label: string }[];
}

function categorizeAnimations(): AnimCategory[] {
  const extractLabel = (v: string) => {
    const parts = v.split(':');
    return parts[parts.length - 1].replace(/_/g, ' ');
  };

  const categories: AnimCategory[] = [
    {
      label: 'Basic',
      items: [
        { value: 'preset:biped:idle', label: 'Idle' },
        { value: 'preset:biped:walk', label: 'Walk' },
        { value: 'preset:biped:run', label: 'Run' },
        { value: 'preset:biped:jump', label: 'Jump' },
        { value: 'preset:biped:fall', label: 'Fall' },
        { value: 'preset:biped:dive', label: 'Dive' },
        { value: 'preset:biped:flip', label: 'Climb/Flip' },
      ],
    },
    {
      label: 'Combat',
      items: [
        { value: 'preset:biped:slash', label: 'Slash' },
        { value: 'preset:biped:shoot', label: 'Shoot' },
        { value: 'preset:biped:hurt', label: 'Hurt' },
      ],
    },
    {
      label: 'Dance',
      items: [
        { value: 'preset:biped:dance_01', label: 'Dance 1' },
        { value: 'preset:biped:dance_02', label: 'Dance 2' },
        { value: 'preset:biped:dance_03', label: 'Dance 3' },
        { value: 'preset:biped:dance_04', label: 'Dance 4' },
        { value: 'preset:biped:dance_05', label: 'Dance 5' },
        { value: 'preset:biped:dance_06', label: 'Dance 6' },
      ],
    },
    {
      label: 'Performance',
      items: [
        { value: 'preset:biped:sing_01', label: 'Sing 1' },
        { value: 'preset:biped:sing_02', label: 'Sing 2' },
        { value: 'preset:biped:sing_03', label: 'Sing 3' },
        { value: 'preset:biped:sing_04', label: 'Sing 4' },
        { value: 'preset:biped:clap', label: 'Clap' },
        { value: 'preset:biped:cheer', label: 'Cheer' },
        { value: 'preset:biped:laugh_01', label: 'Laugh' },
        { value: 'preset:biped:cry', label: 'Cry' },
        { value: 'preset:biped:bow', label: 'Bow' },
        { value: 'preset:biped:wave_goodbye_01', label: 'Wave' },
      ],
    },
    {
      label: 'Sports',
      items: [
        { value: 'preset:biped:golf', label: 'Golf' },
        { value: 'preset:biped:basketball_shot', label: 'Basketball' },
        { value: 'preset:biped:volleyball', label: 'Volleyball' },
        { value: 'preset:biped:football_pass', label: 'Football Pass' },
        { value: 'preset:biped:swim', label: 'Swim' },
        { value: 'preset:biped:surf', label: 'Surf' },
      ],
    },
    {
      label: 'Daily',
      items: [
        { value: 'preset:biped:sit', label: 'Sit' },
        { value: 'preset:biped:hug', label: 'Hug' },
        { value: 'preset:biped:scratch', label: 'Scratch' },
        { value: 'preset:biped:make_a_call_01', label: 'Phone' },
      ],
    },
    {
      label: 'Cross-Species',
      items: CROSS_SPECIES_ANIMATIONS.map((v) => ({ value: v, label: extractLabel(v) })),
    },
  ];

  return categories;
}

const ANIM_CATEGORIES = categorizeAnimations();

const HDR_INFO: Record<string, { desc: string, zhDesc: string, gradient: string }> = {
  studio_small_03: { desc: 'Studio Soft Light', zhDesc: '摄影棚柔光', gradient: 'linear-gradient(135deg, #5c5c5c 0%, #a0a0a0 100%)' },
  potsdamer_platz: { desc: 'Urban City Lights', zhDesc: '都市霓虹夜景', gradient: 'linear-gradient(135deg, #121026 0%, #462c82 100%)' },
  venice_sunset: { desc: 'Sunset Golden Hour', zhDesc: '威尼斯落日金辉', gradient: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)' },
  kiara_1_dawn: { desc: 'Kiara Morning Dawn', zhDesc: '清晨曦光', gradient: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)' },
  forest_slope: { desc: 'Natural Green Forest', zhDesc: '林地翠绿日光', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  rooitou_park: { desc: 'Open Park Grassy', zhDesc: '公园草地日光', gradient: 'linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%)' },
  empty_warehouse_01: { desc: 'Industrial Warehouse', zhDesc: '空旷工业厂房', gradient: 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)' },
  dikhololo_night: { desc: 'Starry Night Outdoor', zhDesc: '户外繁星夜空', gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 100%)' },
};

export function AnimationTab() {
  const apiKey = useStore((s) => s.apiKey);
  const pipeline = useStore((s) => s.pipeline);
  const addPipelineStep = useStore((s) => s.addPipelineStep);
  const updatePipelineStep = useStore((s) => s.updatePipelineStep);
  const addModel = useStore((s) => s.addModel);
  const setBalance = useStore((s) => s.setBalance);
  const models = useStore((s) => s.models);
  const csInterface = useCsInterface();
  const {
    hotSwapLayerSource,
    applyAntiSlidingWalkSync,
    createJointTrackingNull,
    importTextureToProject,
  } = csInterface;
  const { t, language } = useTranslation();

  const importedTaskIds = useRef(new Set<string>());
  const pollerRef = useRef<TaskPoller | null>(null);

  // Common state
  const modelSteps = pipeline.filter((s) => s.status === 'success' && s.taskId);
  const [modelStepIdx, setModelStepIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // Hot-swap & anti-sliding Walk State & Callbacks
  const [selectedHotSwapAnim, setSelectedHotSwapAnim] = useState<string>('preset:biped:walk');
  const [walkSpeedRatio, setWalkSpeedRatio] = useState<number>(150);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapProgress, setSwapProgress] = useState<number>(0);
  const [swapStatus, setSwapStatus] = useState<string>('');

  // Joint Tracker & Texture Exporter State
  const [availableBones, setAvailableBones] = useState<string[]>([]);
  const [selectedJointBone, setSelectedJointBone] = useState<string>('mixamorig:Head');

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [trackingProgress, setTrackingProgress] = useState<number>(0);
  const [trackingStatus, setTrackingStatus] = useState<string>('');

  const [isExportingTextures, setIsExportingTextures] = useState<boolean>(false);
  const [exportingProgress, setExportingProgress] = useState<number>(0);
  const [exportingStatus, setExportingStatus] = useState<string>('');

  const getModelTaskId = useCallback(() => {
    return modelSteps[modelStepIdx]?.taskId ?? null;
  }, [modelStepIdx, modelSteps]);

  const handleHotSwapAction = useCallback(async () => {
    const taskId = getModelTaskId();
    if (!taskId) {
      setError(t('selectModelWarning'));
      return;
    }
    setError(null);
    setIsSwapping(true);
    setSwapProgress(0);
    setSwapStatus(t('swapping'));

    try {
      if (!apiKey) throw new Error(t('failedToConnect'));
      const api = new TripoApiService(apiKey);

      let originalRigTaskId = taskId;
      const rigStep = [...pipeline].reverse().find(
        (s) =>
          s.type === 'animate_rig' &&
          s.status === 'success' &&
          s.taskId &&
          (s.params as any)?.original_model_task_id === taskId
      );
      if (rigStep && rigStep.taskId) {
        originalRigTaskId = rigStep.taskId;
      }

      const retargetReq = {
        type: 'animate_retarget',
        original_model_task_id: originalRigTaskId,
        animations: [selectedHotSwapAnim],
        out_format: 'glb',
        animate_in_place: true,
      };

      const retargetTaskId = await api.createTask(retargetReq as any);
      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      pollerRef.current = poller;

      const retargetResult = await poller.pollUntilDone(retargetTaskId, {
        onProgress: (task) => {
          setSwapProgress(task.progress);
          setSwapStatus(`${t('swapping')}... ${task.progress}%`);
        }
      });

      setSwapProgress(90);
      setSwapStatus(t('statusDownloading'));
      const saveDir = TripoApiService.getModelSaveDir();
      const localPath = await api.downloadTaskResult(retargetResult, saveDir);

      setSwapProgress(95);
      setSwapStatus(t('importing'));
      const result = await hotSwapLayerSource({
        newFilePath: localPath,
      });

      const parsed = JSON.parse(result);
      if (parsed && parsed.ok) {
        setSwapStatus(`${t('statusSuccess')}: Swapped action!`);
      } else {
        throw new Error(parsed.error || 'Failed to replace layer source.');
      }
      setSwapProgress(100);
    } catch (e: any) {
      if (e instanceof CancelledError) return;
      setError(e.message || 'Swap failed.');
      setSwapStatus(t('statusFailed'));
    } finally {
      setIsSwapping(false);
      pollerRef.current = null;
      setTimeout(() => setSwapStatus(''), 3000);
    }
  }, [apiKey, selectedHotSwapAnim, getModelTaskId, modelStepIdx, modelSteps, hotSwapLayerSource, t]);

  const handleApplyAntiSliding = useCallback(async () => {
    setError(null);
    setSwapStatus(t('applyingSync'));
    try {
      const result = await applyAntiSlidingWalkSync({
        walkSpeedRatio,
      });
      const parsed = JSON.parse(result);
      if (parsed && parsed.ok) {
        setSwapStatus(`${t('statusSuccess')}: Applied walk sync!`);
      } else {
        setError(parsed.error || 'Failed to apply expression.');
      }
    } catch (e: any) {
      setError(e.message || 'Walk sync failed.');
    } finally {
      setTimeout(() => setSwapStatus(''), 3000);
    }
  }, [walkSpeedRatio, applyAntiSlidingWalkSync, t]);

  // Auto-scan bones when selected model changes
  React.useEffect(() => {
    const taskId = modelSteps[modelStepIdx]?.taskId;
    if (!taskId) {
      setAvailableBones([]);
      return;
    }
    const modelRecord = models.find(m => m.taskId === taskId || m.id === taskId);
    const modelPath = modelRecord?.modelPath;
    if (!modelPath) {
      setAvailableBones([]);
      return;
    }

    const fs = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('fs') : null;
    if (!fs || !fs.existsSync(modelPath)) return;

    try {
      const buffer = fs.readFileSync(modelPath);
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      const blobUrl = URL.createObjectURL(blob);

      const loader = new GLTFLoader();
      loader.load(blobUrl, (gltf) => {
        const bones: string[] = [];
        gltf.scene.traverse((node) => {
          if ((node as THREE.Bone).isBone) {
            bones.push(node.name);
          }
        });
        URL.revokeObjectURL(blobUrl);
        if (bones.length > 0) {
          setAvailableBones(bones);
          const headBone = bones.find(b => b.toLowerCase().includes('head'));
          const handBone = bones.find(b => b.toLowerCase().includes('hand'));
          if (headBone) {
            setSelectedJointBone(headBone);
          } else if (handBone) {
            setSelectedJointBone(handBone);
          } else {
            setSelectedJointBone(bones[0]);
          }
        } else {
          setAvailableBones([
            'mixamorig:Head',
            'mixamorig:RightHand',
            'mixamorig:LeftHand',
            'mixamorig:RightFoot',
            'mixamorig:LeftFoot',
            'mixamorig:Hips'
          ]);
          setSelectedJointBone('mixamorig:Head');
        }
      }, undefined, (err) => {
        console.error('[Tripo4AE] Error loading GLB for bone scan', err);
        URL.revokeObjectURL(blobUrl);
      });
    } catch (e) {
      console.error('[Tripo4AE] Error scanning bones', e);
    }
  }, [modelStepIdx, modelSteps, models]);

  const handleExtractJoint = useCallback(async () => {
    const taskId = getModelTaskId();
    if (!taskId) {
      setError(t('selectModelWarning') || 'Please select a model first');
      return;
    }
    const modelRecord = models.find(m => m.taskId === taskId || m.id === taskId);
    const modelPath = modelRecord?.modelPath;
    if (!modelPath) {
      setError('Model file path not found.');
      return;
    }

    setError(null);
    setIsTracking(true);
    setTrackingProgress(10);
    setTrackingStatus(t('extractingJoint') || 'Analyzing skeleton...');

    const fs = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('fs') : null;
    if (!fs || !fs.existsSync(modelPath)) {
      setError('Node.js fs module is not available or file not found.');
      setIsTracking(false);
      return;
    }

    let blobUrl = '';
    try {
      const compInfo = await csInterface.getActiveCompInfo();
      if (!compInfo) {
        throw new Error('No active composition found. Please open a composition.');
      }

      setTrackingProgress(30);
      const buffer = fs.readFileSync(modelPath);
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      blobUrl = URL.createObjectURL(blob);

      const loader = new GLTFLoader();
      loader.load(blobUrl, async (gltf) => {
        try {
          const modelRoot = gltf.scene;
          
          // Find target bone
          let targetBone: THREE.Object3D | null = null;
          modelRoot.traverse((node) => {
            if (node.name === selectedJointBone) {
              targetBone = node;
            }
          });

          if (!targetBone) {
            throw new Error(`Bone "${selectedJointBone}" not found in model skeleton.`);
          }

          setTrackingProgress(50);
          
          // Get model bounding box size
          const box = new THREE.Box3().setFromObject(modelRoot);
          const size = new THREE.Vector3();
          box.getSize(size);
          const threeSize = [size.x, size.y, size.z];

          const sampleFps = compInfo.frameRate || 30;
          let animDuration = compInfo.duration || 10;
          let mixer: THREE.AnimationMixer | null = null;

          if (gltf.animations && gltf.animations.length > 0) {
            animDuration = gltf.animations[0].duration;
            mixer = new THREE.AnimationMixer(modelRoot);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
          }

          const totalDuration = Math.min(animDuration, compInfo.duration);
          const totalFrames = Math.max(1, Math.round(totalDuration * sampleFps));
          const keyframes: Array<{ time: number; value: number[] }> = [];

          for (let f = 0; f < totalFrames; f++) {
            const time = f / sampleFps;
            if (mixer) {
              mixer.setTime(time);
            }
            modelRoot.updateMatrixWorld(true);

            const boneWorldPos = new THREE.Vector3();
            (targetBone as THREE.Object3D).getWorldPosition(boneWorldPos);

            const relativePos = boneWorldPos.clone();
            modelRoot.worldToLocal(relativePos);

            // X_ae = X_three, Y_ae = -Y_three, Z_ae = -Z_three
            keyframes.push({
              time: time,
              value: [relativePos.x, -relativePos.y, -relativePos.z]
            });
          }

          setTrackingProgress(80);
          setTrackingStatus('Writing keyframes to AE tracker null...');

          const cleanBoneName = selectedJointBone.replace(/[^a-zA-Z0-9_]/g, '_');
          const result = await createJointTrackingNull({
            nullName: `Tripo4AE_${cleanBoneName}_Track`,
            keyframes,
            threeSize
          });

          const parsed = JSON.parse(result);
          if (parsed && parsed.ok) {
            setTrackingProgress(100);
            setTrackingStatus('Skeletal joint tracking Null created!');
          } else {
            throw new Error(parsed.error || 'Failed to create tracking Null in After Effects.');
          }
        } catch (innerErr: any) {
          setError(innerErr.message || 'Error parsing bone animation.');
        } finally {
          setIsTracking(false);
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          setTimeout(() => setTrackingStatus(''), 4000);
        }
      }, undefined, (loaderErr: any) => {
        setError(`Failed to load GLB: ${loaderErr.message || String(loaderErr)}`);
        setIsTracking(false);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      });

    } catch (e: any) {
      setError(e.message || 'Tracking failed.');
      setIsTracking(false);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
  }, [selectedJointBone, getModelTaskId, models, createJointTrackingNull, csInterface, t]);

  const handleExportTextures = useCallback(async () => {
    const taskId = getModelTaskId();
    if (!taskId) {
      setError(t('selectModelWarning') || 'Please select a model first');
      return;
    }
    const modelRecord = models.find(m => m.taskId === taskId || m.id === taskId);
    const modelPath = modelRecord?.modelPath;
    if (!modelPath) {
      setError('Model file path not found.');
      return;
    }

    setError(null);
    setIsExportingTextures(true);
    setExportingProgress(10);
    setExportingStatus(t('exportingTextures') || 'Extracting embedded texture maps...');

    const fs = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('fs') : null;
    const nodePath = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('path') : null;
    if (!fs || !nodePath || !fs.existsSync(modelPath)) {
      setError('Node.js modules not available or file not found.');
      setIsExportingTextures(false);
      return;
    }

    let blobUrl = '';
    try {
      const buffer = fs.readFileSync(modelPath);
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      blobUrl = URL.createObjectURL(blob);

      setExportingProgress(30);

      const loader = new GLTFLoader();
      loader.load(blobUrl, async (gltf) => {
        try {
          const uniqueTextures: Array<{ matName: string; type: string; texture: THREE.Texture }> = [];
          const seenTextures = new Set<string>();

          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                  const stdMat = mat as THREE.MeshStandardMaterial;
                  const matName = stdMat.name || 'Material';

                  const checkAndAdd = (type: string, tex: THREE.Texture | null) => {
                    if (!tex || !tex.image) return;
                    const key = `${matName}_${type}`;
                    if (!seenTextures.has(key)) {
                      seenTextures.add(key);
                      uniqueTextures.push({ matName, type, texture: tex });
                    }
                  };

                  checkAndAdd('Diffuse', stdMat.map);
                  checkAndAdd('Normal', stdMat.normalMap);
                  checkAndAdd('Roughness', stdMat.roughnessMap);
                  checkAndAdd('Metalness', stdMat.metalnessMap);
                  checkAndAdd('AO', stdMat.aoMap);
                  checkAndAdd('Emissive', stdMat.emissiveMap);
                }
              });
            }
          });

          if (uniqueTextures.length === 0) {
            throw new Error('No embedded PBR textures found in the model.');
          }

          setExportingProgress(50);
          const saveDir = nodePath.dirname(modelPath);
          const modelName = nodePath.basename(modelPath, nodePath.extname(modelPath));

          for (let i = 0; i < uniqueTextures.length; i++) {
            const item = uniqueTextures[i];
            const cleanMatName = item.matName.replace(/[^a-zA-Z0-9_]/g, '_');
            const cleanType = item.type;
            const fileName = `${modelName}_${cleanMatName}_${cleanType}.png`;
            const fileSavePath = nodePath.join(saveDir, fileName);

            setExportingStatus(`Saving ${cleanType} texture (${i + 1}/${uniqueTextures.length})...`);
            
            // Convert THREE.Texture image to canvas & save to PNG
            await new Promise<void>((resolveSave, rejectSave) => {
              try {
                const img = item.texture.image as any;
                const canvas = document.createElement('canvas');
                canvas.width = img.width || img.naturalWidth || 1024;
                canvas.height = img.height || img.naturalHeight || 1024;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  throw new Error('Failed to get 2D canvas context');
                }
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
                fs.writeFileSync(fileSavePath, Buffer.from(base64Data, 'base64'));
                resolveSave();
              } catch (e) {
                rejectSave(e);
              }
            });

            // Import texture to AE Project
            setExportingStatus(`Importing ${cleanType} map to AE Project...`);
            const importRes = await importTextureToProject({
              filePath: fileSavePath,
              name: fileName
            });
            const parsed = JSON.parse(importRes);
            if (!parsed || !parsed.ok) {
              console.warn(`Failed to import ${fileName}: ${parsed?.error}`);
            }

            const pct = Math.floor(50 + (40 * (i + 1) / uniqueTextures.length));
            setExportingProgress(pct);
          }

          setExportingProgress(100);
          setExportingStatus(`Successfully exported ${uniqueTextures.length} textures!`);
        } catch (innerErr: any) {
          setError(innerErr.message || 'Error extracting textures.');
        } finally {
          setIsExportingTextures(false);
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          setTimeout(() => setExportingStatus(''), 4000);
        }
      }, undefined, (loaderErr: any) => {
        setError(`Failed to load GLB: ${loaderErr.message || String(loaderErr)}`);
        setIsExportingTextures(false);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      });

    } catch (e: any) {
      setError(e.message || 'Texture export failed.');
      setIsExportingTextures(false);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
  }, [getModelTaskId, models, importTextureToProject, t]);

  const importTaskToAe = useCallback(async (task: TripoTask, label: string, formatOverride?: string) => {
    if (importedTaskIds.current.has(task.task_id)) return;
    importedTaskIds.current.add(task.task_id);
    setIsRunning(true);
    setTaskProgress(0);
    setTaskStatus(t('statusDownloading'));
    try {
      const api = new TripoApiService(apiKey!);
      const modelUrl = api.getModelUrl(task.output ?? {});
      if (!modelUrl) return;

      const saveDir = TripoApiService.getModelSaveDir();
      const localPath = await api.downloadTaskResult(task, saveDir, (bytes, total) => {
        if (total > 0) {
          const pct = Math.floor((bytes / total) * 100);
          setTaskProgress(pct);
          setTaskStatus(`${t('statusDownloading')} ${pct}%`);
        } else {
          const mb = (bytes / 1048576).toFixed(1);
          setTaskStatus(`${t('statusDownloading')} (${mb} MB)`);
        }
      });

      setTaskProgress(90);
      setTaskStatus(t('importing'));

      // Import with time remap and auto-loop for animated/rigged models (out-of-box experience)
      const isAnimated = label.includes('Animated') || label.includes('Rigged') || task.type === 'animate_retarget';
      await csInterface.importModel(localPath, {
        enableTimeRemap: isAnimated,
        selectEmbeddedAnim: isAnimated ? 1 : undefined,
        loopAnimation: isAnimated ? true : undefined,
        centerInComp: true,
      });

      setTaskProgress(100);
      setTaskStatus(t('statusSuccess'));

      // Derive format from file extension or caller-provided override
      let format: string;
      if (formatOverride) {
        format = formatOverride;
      } else {
        const ext = localPath.split('.').pop()?.toUpperCase();
        format = (ext === 'FBX' || ext === 'OBJ' || ext === 'GLTF') ? ext : 'GLB';
      }

      // Refresh credit balance
      try {
        const balRes = await api.getBalance();
        setBalance(balRes.balance);
      } catch {}

      const model: ModelRecord = {
        id: task.task_id,
        taskId: task.task_id,
        name: label,
        thumbnailUrl: task.output?.rendered_image,
        thumbnailPath: TripoApiService.getLocalThumbnailPath(task.task_id),
        modelPath: localPath,
        format,
        workflow: 'advanced3d',
        createdAt: Date.now(),
        pipelineSteps: [...useStore.getState().pipeline],
      };
      addModel(model);
    } catch (err: any) {
      setError(err.message || t('statusFailed'));
    } finally {
      setIsRunning(false);
    }
  }, [apiKey, csInterface, addModel, setBalance, t]);



  // Task execution helper
  const taskIdxRef = useRef(-1);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskResult, setTaskResult] = useState<TripoTask | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Clean up pollers on unmount
  React.useEffect(() => {
    return () => {
      if (pollerRef.current) {
        pollerRef.current.abort();
      }
    };
  }, []);

  const getApi = useCallback(() => {
    if (!apiKey) throw new Error(t('failedToConnect'));
    return new TripoApiService(apiKey);
  }, [apiKey, t]);

  const runTask = useCallback(async (
    type: string,
    params: Record<string, unknown>,
  ) => {
    setError(null);
    setTaskResult(null);
    setIsRunning(true);
    setTaskProgress(0);
    setTaskStatus(t('starting'));

    try {
      const api = getApi();
      const step: PipelineStep = {
        type: type as any,
        taskId: null,
        status: 'pending',
        params: params as any,
      };
      addPipelineStep(step);
      const stepIdx = useStore.getState().pipeline.length - 1;
      taskIdxRef.current = stepIdx;

      const taskId = await api.createTask(params as any);
      updatePipelineStep(taskIdxRef.current, {
        taskId,
        status: 'running',
      });

      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      pollerRef.current = poller;
      const result = await poller.pollUntilDone(taskId, {
        onProgress: (task) => {
          setTaskProgress(task.progress);
          setTaskStatus(`${t(type)}... ${task.progress}%`);
          if (taskIdxRef.current >= 0) {
            updatePipelineStep(taskIdxRef.current, {
              status: task.status,
              output: task.output,
            });
          }
        },
      });

      setTaskResult(result);
      setTaskProgress(100);
      setTaskStatus(t('statusSuccess'));
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, {
          status: 'success',
          output: result.output,
        });
      }
      // Refresh balance after API task completes
      try {
        const balApi = getApi();
        const balRes = await balApi.getBalance();
        setBalance(balRes.balance);
      } catch {}
      return result;
    } catch (err: any) {
      if (err instanceof CancelledError) {
        // User cancelled — do not treat as error, do not update pipeline as failed
        return null;
      }
      setError(err.message || t('statusFailed'));
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'failed' });
      }
      return null;
    } finally {
      setIsRunning(false);
      pollerRef.current = null;
    }
  }, [apiKey, getApi, addPipelineStep, updatePipelineStep, setBalance, t]);

  // Prerigcheck
  const handlePrerigcheck = useCallback(async () => {
    const taskId = modelSteps[modelStepIdx]?.taskId;
    if (!taskId) { setError(t('selectModelError')); return; }
    await runTask('animate_prerigcheck', {
      type: 'animate_prerigcheck',
      original_model_task_id: taskId,
    });
  }, [modelStepIdx, modelSteps, runTask, t]);

  // Rig
  const [rigType, setRigType] = useState<RigType>('biped');
  const [rigOutFormat, setRigOutFormat] = useState<RigOutFormat>('glb');
  const [rigSpec, setRigSpec] = useState<RigSpec>('tripo');

  const handleRig = useCallback(async () => {
    const taskId = modelSteps[modelStepIdx]?.taskId;
    if (!taskId) { setError(t('selectModelError')); return; }
    const result = await runTask('animate_rig', {
      type: 'animate_rig',
      original_model_task_id: taskId,
      rig_type: rigType,
      out_format: rigOutFormat,
      spec: rigSpec,
    });
    if (result) {
      setTaskStatus(t('statusImportingAE'));
      await importTaskToAe(result, `Rigged (${rigType})`, rigOutFormat.toUpperCase() === 'FBX' ? 'FBX' : 'GLB');
      setTaskStatus(t('statusSuccess'));
    }
  }, [modelStepIdx, modelSteps, rigType, rigOutFormat, rigSpec, runTask, importTaskToAe, t]);

  // Retarget
  const [selectedAnims, setSelectedAnims] = useState<AnimationPreset[]>([]);
  const [animateInPlace, setAnimateInPlace] = useState(false);

  const toggleAnim = useCallback((value: AnimationPreset) => {
    setSelectedAnims((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= 5) return prev;
      return [...prev, value];
    });
  }, []);

  const handleRetarget = useCallback(async () => {
    const selectedModelTaskId = modelSteps[modelStepIdx]?.taskId;
    if (!selectedModelTaskId) { setError(t('selectModelError')); return; }
    if (selectedAnims.length === 0) { setError(t('selectAnimError')); return; }

    // For retarget to work, we need the rig output task ID, not the raw source model.
    // Find the most recent animate_rig step with status 'success' based on the selected model.
    let taskId: string = selectedModelTaskId;
    const fullPipeline = useStore.getState().pipeline;
    for (let i = fullPipeline.length - 1; i >= 0; i--) {
      const step = fullPipeline[i];
      if (
        step.type === 'animate_rig' &&
        step.status === 'success' &&
        step.taskId &&
        (step.params as any)?.original_model_task_id === selectedModelTaskId
      ) {
        taskId = step.taskId;
        break;
      }
    }

    const result = await runTask('animate_retarget', {
      type: 'animate_retarget',
      original_model_task_id: taskId,
      animations: selectedAnims,
      out_format: 'glb',
      animate_in_place: animateInPlace,
    });
    if (result) {
      setTaskStatus(t('statusImportingAE'));
      await importTaskToAe(result, `Animated (${selectedAnims.length} anims)`);
      setTaskStatus(t('statusSuccess'));
    }
  }, [modelStepIdx, modelSteps, selectedAnims, animateInPlace, runTask, importTaskToAe, t]);

  // AE Animation
  const [camPreset, setCamPreset] = useState<CameraPreset>('orbit');
  const [modelPreset, setModelPreset] = useState<ModelPreset>('fade-in');
  const [easing, setEasing] = useState<EasingType>('ease-in-out');
  const [duration, setDuration] = useState(2);
  const [loops, setLoops] = useState<AnimationConfig['loops']>([]);

  // Loop toggles
  const [spinEnabled, setSpinEnabled] = useState(false);
  const [spinAxis, setSpinAxis] = useState<'x' | 'y' | 'z'>('y');
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [floatEnabled, setFloatEnabled] = useState(false);
  const [floatAmp, setFloatAmp] = useState(10);
  const [floatFreq, setFloatFreq] = useState(1);
  const [breatheEnabled, setBreatheEnabled] = useState(false);
  const [breatheAmp, setBreatheAmp] = useState(5);
  const [breatheFreq, setBreatheFreq] = useState(0.5);

  // Embedded Animations state
  const [embedAnimIndex, setEmbedAnimIndex] = useState(1);
  const [embedLoopEnabled, setEmbedLoopEnabled] = useState(true);

  // Custom Lighting & Environment states
  const [lightIntensity, setLightIntensity] = useState(100);
  const [lightColor, setLightColor] = useState('#ffffff');
  const [keyAngle, setKeyAngle] = useState(45);
  const [envIntensity, setEnvIntensity] = useState(60);
  const [hdrPath, setHdrPath] = useState('');
  const [castShadows, setCastShadows] = useState(true);
  const [shadowDarkness, setShadowDarkness] = useState(50);
  const [lightsEnvExpanded, setLightsEnvExpanded] = useState(false);

  // One-Click Rig & Animate Wizard states
  const [isMagicRunning, setIsMagicRunning] = useState(false);
  const [magicStatus, setMagicStatus] = useState('');
  const [magicProgress, setMagicProgress] = useState(0);

  // Key Light Shadow Diffusion state
  const [shadowDiffusion, setShadowDiffusion] = useState(10);

  const handleUpdateSceneProp = useCallback(
    async (changes: Record<string, any>) => {
      try {
        await csInterface.updateSceneProperties(changes);
      } catch (err) {
        console.warn('[Tripo4AE] Real-time scene update skipped:', err);
      }
    },
    [csInterface],
  );

  const handleMagicAnimate = useCallback(async () => {
    const taskId = modelSteps[modelStepIdx]?.taskId;
    if (!taskId) {
      setError(t('selectModelError'));
      return;
    }
    if (selectedAnims.length === 0) {
      setError(t('selectAnimError'));
      return;
    }

    setError(null);
    setIsMagicRunning(true);
    setMagicProgress(0);
    setMagicStatus(t('statusCheckingRig'));

    try {
      const api = getApi();

      // Step 1: Pre-rig check
      setMagicStatus(`${t('statusCheckingRig')}...`);
      const checkReq = {
        type: 'animate_prerigcheck',
        original_model_task_id: taskId,
      };
      const checkStep: PipelineStep = {
        type: 'animate_prerigcheck',
        taskId: null,
        status: 'pending',
        params: checkReq as any,
      };
      addPipelineStep(checkStep);
      const checkStepIdx = useStore.getState().pipeline.length - 1;

      const checkTaskId = await api.createTask(checkReq as any);
      updatePipelineStep(checkStepIdx, { taskId: checkTaskId, status: 'running' });

      const checkPoller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      pollerRef.current = checkPoller;
      const checkResult = await checkPoller.pollUntilDone(checkTaskId, {
        onProgress: (task) => {
          setMagicProgress(Math.floor(task.progress * 0.1)); // 0% - 10%
          setMagicStatus(`${t('statusCheckingRig')}... ${task.progress}%`);
          updatePipelineStep(checkStepIdx, { status: task.status, output: task.output });
        }
      });
      updatePipelineStep(checkStepIdx, { status: 'success', output: checkResult.output });

      if (!checkResult.output?.riggable) {
        throw new Error(t('riggableFalse') || 'Character is not riggable');
      }

      // Step 2: Auto Rig
      setMagicStatus(`${t('statusRigging')}...`);
      const rigReq = {
        type: 'animate_rig',
        original_model_task_id: taskId,
        rig_type: rigType,
        out_format: rigOutFormat,
        spec: rigSpec,
      };
      const rigStep: PipelineStep = {
        type: 'animate_rig',
        taskId: null,
        status: 'pending',
        params: rigReq as any,
      };
      addPipelineStep(rigStep);
      const rigStepIdx = useStore.getState().pipeline.length - 1;

      const rigTaskId = await api.createTask(rigReq as any);
      updatePipelineStep(rigStepIdx, { taskId: rigTaskId, status: 'running' });

      const rigPoller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      pollerRef.current = rigPoller;
      const rigResult = await rigPoller.pollUntilDone(rigTaskId, {
        onProgress: (task) => {
          setMagicProgress(10 + Math.floor(task.progress * 0.4)); // 10% - 50%
          setMagicStatus(`${t('statusRigging')}... ${task.progress}%`);
          updatePipelineStep(rigStepIdx, { status: task.status, output: task.output });
        }
      });
      updatePipelineStep(rigStepIdx, { status: 'success', output: rigResult.output });

      // Step 3: Retarget
      setMagicStatus(`${t('statusRetargeting')}...`);
      const retargetReq = {
        type: 'animate_retarget',
        original_model_task_id: rigResult.task_id,
        animations: selectedAnims,
        out_format: 'glb',
        animate_in_place: animateInPlace,
      };
      const retargetStep: PipelineStep = {
        type: 'animate_retarget',
        taskId: null,
        status: 'pending',
        params: retargetReq as any,
      };
      addPipelineStep(retargetStep);
      const retargetStepIdx = useStore.getState().pipeline.length - 1;

      const retargetTaskId = await api.createTask(retargetReq as any);
      updatePipelineStep(retargetStepIdx, { taskId: retargetTaskId, status: 'running' });

      const retargetPoller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      pollerRef.current = retargetPoller;
      const retargetResult = await retargetPoller.pollUntilDone(retargetTaskId, {
        onProgress: (task) => {
          setMagicProgress(50 + Math.floor(task.progress * 0.4)); // 50% - 90%
          setMagicStatus(`${t('statusRetargeting')}... ${task.progress}%`);
          updatePipelineStep(retargetStepIdx, { status: task.status, output: task.output });
        }
      });
      updatePipelineStep(retargetStepIdx, { status: 'success', output: retargetResult.output });

      // Step 4: Download & Import
      setMagicProgress(95);
      setMagicStatus(t('statusDownloading') || 'Downloading model...');
      await importTaskToAe(
        retargetResult,
        `Magic Animated (${selectedAnims.length} anims)`,
        rigOutFormat.toUpperCase() === 'FBX' ? 'FBX' : 'GLB'
      );

      setMagicProgress(100);
      setMagicStatus(t('statusSuccess'));
    } catch (err: any) {
      if (err instanceof CancelledError) {
        return;
      }
      setError(err.message || t('statusFailed'));
      setMagicStatus(t('statusFailed'));
    } finally {
      setIsMagicRunning(false);
      pollerRef.current = null;
    }
  }, [apiKey, getApi, modelStepIdx, modelSteps, selectedAnims, rigType, rigOutFormat, rigSpec, animateInPlace, importTaskToAe, addPipelineStep, updatePipelineStep, t]);

  // Scene & Material state
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [matPreset, setMatPreset] = useState<MaterialPresetName>('plastic');

  // Helper to convert hex color to [R, G, B] in [0, 1] range
  const hexToRgbArray = useCallback((hexColor: string): [number, number, number] => {
    const hex = hexColor.replace(/^#/, '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b];
  }, []);

  const handleBrowseHdr = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).cep) {
      const showOpenDialog = (window as any).cep.fs.showOpenDialogEx || (window as any).cep.fs.showOpenDialog;
      if (showOpenDialog) {
        const result = showOpenDialog(false, false, 'Select HDRI Map', '', ['hdr', 'exr']);
        if (result && result.data && result.data.length > 0) {
          const filePath = decodeURIComponent(result.data[0].replace(/^file:\/\//, ''));
          setHdrPath(filePath);
        }
      }
    }
  }, []);

  const [hdrDownloading, setHdrDownloading] = useState<string | null>(null);
  const handleDownloadHdrPreset = useCallback(async (preset: typeof HDR_PRESETS[number]) => {
    if (!apiKey) return;
    const fs = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('fs') : null;
    const nodePath = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('path') : null;
    const nodeOs = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('os') : null;
    if (!fs || !nodePath || !nodeOs) return;

    const dir = nodePath.join(nodeOs.homedir(), HDR_SAVE_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const savePath = nodePath.join(dir, `${preset.id}.hdr`);

    if (fs.existsSync(savePath)) {
      setHdrPath(savePath);
      return;
    }

    setHdrDownloading(preset.id);
    try {
      const api = new TripoApiService(apiKey);
      await api.downloadModel(preset.url, savePath);
      setHdrPath(savePath);
      console.log(`[Tripo4AE] HDR preset downloaded: ${savePath}`);
    } catch (err: any) {
      setSceneError(`HDR download failed: ${err.message}`);
    } finally {
      setHdrDownloading(null);
    }
  }, [apiKey]);

  const handleApplyEmbeddedAnim = useCallback(async () => {
    setError(null);
    try {
      await csInterface.selectEmbeddedAnimation({
        animationIndex: embedAnimIndex,
        enableTimeRemap: true,
        loopAnimation: embedLoopEnabled,
      });
    } catch (err: any) {
      setError(err.message || 'Apply embedded animation failed');
    }
  }, [csInterface, embedAnimIndex, embedLoopEnabled]);

  const handleCreateEnvLight = useCallback(async () => {
    setSceneError(null);
    try {
      await csInterface.createEnvironmentLight({
        intensity: envIntensity,
        hdrPath: hdrPath.trim() || undefined,
        castShadows,
        shadowDarkness,
      });
    } catch (err: any) {
      setSceneError(err.message || 'Create environment light failed');
    }
  }, [csInterface, envIntensity, hdrPath, castShadows, shadowDarkness]);

  const handleCreateLights = useCallback(async () => {
    setSceneError(null);
    try {
      await csInterface.createLights({
        intensity: lightIntensity,
        color: hexToRgbArray(lightColor),
        keyAngle,
        fillRatio: 0.4,
        rimRatio: 0.6,
      });
    } catch (err: any) {
      setSceneError(err.message || 'Create lights failed');
    }
  }, [csInterface, lightIntensity, lightColor, keyAngle, hexToRgbArray]);

  const handleSetupScene = useCallback(async () => {
    setSceneError(null);
    try {
      await csInterface.setupScene({
        cameraDistance: 800,
        depthOfField: true,
        lightIntensity,
        lightColor: hexToRgbArray(lightColor),
        keyAngle,
        envIntensity,
        hdrPath: hdrPath.trim() || undefined,
      });
    } catch (err: any) {
      setSceneError(err.message || 'Scene setup failed');
    }
  }, [csInterface, lightIntensity, lightColor, keyAngle, envIntensity, hdrPath, hexToRgbArray]);

  const handleAlignModelToGround = useCallback(async () => {
    setSceneError(null);
    try {
      await csInterface.alignModelToGround();
    } catch (err: any) {
      setSceneError(err.message || 'Align model to ground failed');
    }
  }, [csInterface]);

  const handleAlignGroundToModel = useCallback(async () => {
    setSceneError(null);
    try {
      await csInterface.alignGroundToModel();
    } catch (err: any) {
      setSceneError(err.message || 'Align ground to model failed');
    }
  }, [csInterface]);

  // Advanced PBR Material Option states
  const [pbrEditorExpanded, setPbrEditorExpanded] = useState(false);
  const [pbrAmbient, setPbrAmbient] = useState(0);
  const [pbrDiffuse, setPbrDiffuse] = useState(80);
  const [pbrSpecularIntensity, setPbrSpecularIntensity] = useState(50);
  const [pbrSpecularShininess, setPbrSpecularShininess] = useState(50);
  const [pbrMetal, setPbrMetal] = useState(0);
  const [pbrLightTransmission, setPbrLightTransmission] = useState(0);
  const [pbrReflectionIntensity, setPbrReflectionIntensity] = useState(0);
  const [pbrReflectionSharpness, setPbrReflectionSharpness] = useState(50);
  const [pbrTransparency, setPbrTransparency] = useState(0);
  const [pbrIndexOrRefraction, setPbrIndexOrRefraction] = useState(1.5);

  const handleApplyMaterial = useCallback(async () => {
    setSceneError(null);
    try {
      await csInterface.applyMaterialPreset({ preset: matPreset });
    } catch (err: any) {
      setSceneError(err.message || 'Material preset failed');
    }
  }, [csInterface, matPreset]);

  const handleReadMaterial = useCallback(async () => {
    setSceneError(null);
    try {
      const props = await csInterface.getMaterialProperties();
      alert(JSON.stringify(props, null, 2));
    } catch (err: any) {
      setSceneError(err.message || 'Read material failed');
    }
  }, [csInterface]);

  const handleReadMaterialAndSetSliders = useCallback(async () => {
    setSceneError(null);
    try {
      const props = await csInterface.getMaterialProperties();
      if (props) {
        if (props.ambient !== undefined) setPbrAmbient(Math.round(props.ambient));
        if (props.diffuse !== undefined) setPbrDiffuse(Math.round(props.diffuse));
        if (props.specularIntensity !== undefined) setPbrSpecularIntensity(Math.round(props.specularIntensity));
        if (props.specularShininess !== undefined) setPbrSpecularShininess(Math.round(props.specularShininess));
        if (props.metal !== undefined) setPbrMetal(Math.round(props.metal));
        if (props.lightTransmission !== undefined) setPbrLightTransmission(Math.round(props.lightTransmission));
        if (props.reflectionIntensity !== undefined) setPbrReflectionIntensity(Math.round(props.reflectionIntensity));
        if (props.reflectionSharpness !== undefined) setPbrReflectionSharpness(Math.round(props.reflectionSharpness));
        if (props.transparency !== undefined) setPbrTransparency(Math.round(props.transparency));
        if (props.indexOrRefraction !== undefined) setPbrIndexOrRefraction(props.indexOrRefraction);
      }
    } catch (err: any) {
      setSceneError(err.message || 'Read material failed');
    }
  }, [csInterface]);

  const handleApplyPBRProperties = useCallback(async () => {
    setSceneError(null);
    try {
      const material = {
        ambient: pbrAmbient,
        diffuse: pbrDiffuse,
        specularIntensity: pbrSpecularIntensity,
        specularShininess: pbrSpecularShininess,
        metal: pbrMetal,
        lightTransmission: pbrLightTransmission,
        reflectionIntensity: pbrReflectionIntensity,
        reflectionSharpness: pbrReflectionSharpness,
        transparency: pbrTransparency,
        indexOrRefraction: pbrIndexOrRefraction,
      };
      await csInterface.setMaterialProperties({ material });
    } catch (err: any) {
      setSceneError(err.message || 'Apply PBR properties failed');
    }
  }, [
    csInterface,
    pbrAmbient,
    pbrDiffuse,
    pbrSpecularIntensity,
    pbrSpecularShininess,
    pbrMetal,
    pbrLightTransmission,
    pbrReflectionIntensity,
    pbrReflectionSharpness,
    pbrTransparency,
    pbrIndexOrRefraction,
  ]);

  const buildAnimConfig = useCallback((): AnimationConfig => {
    const builtLoops: AnimationConfig['loops'] = [];
    if (spinEnabled) builtLoops.push({ type: 'spin', axis: spinAxis, speed: spinSpeed });
    if (floatEnabled) builtLoops.push({ type: 'float', amplitude: floatAmp, frequency: floatFreq });
    if (breatheEnabled) builtLoops.push({ type: 'breathe', amplitude: breatheAmp, frequency: breatheFreq });
    return {
      cameraPreset: camPreset,
      modelPreset,
      easing,
      duration,
      loops: builtLoops,
    };
  }, [camPreset, modelPreset, easing, duration, spinEnabled, spinAxis, spinSpeed,
    floatEnabled, floatAmp, floatFreq, breatheEnabled, breatheAmp, breatheFreq]);

  const handleApplyAEAnim = useCallback(async () => {
    const config = buildAnimConfig();
    try {
      await csInterface.applyAnimation(config);
      await csInterface.createCamera({ preset: camPreset, duration });
    } catch (err: any) {
      setError(err.message || 'AE animation failed');
    }
  }, [buildAnimConfig, csInterface, camPreset, duration]);

  // Templates
  const [templateName, setTemplateName] = useState('');
  const templates = useStore((s) => s.templates);
  const addTemplate = useStore((s) => s.addTemplate);

  const saveTemplate = useCallback(() => {
    if (!templateName.trim()) return;
    const tmpl: AnimTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      config: buildAnimConfig(),
      savedAt: Date.now(),
    };
    addTemplate(tmpl);
    setTemplateName('');
  }, [templateName, buildAnimConfig, addTemplate]);

  const loadTemplate = useCallback((tmpl: AnimTemplate) => {
    const c = tmpl.config;
    setEasing(c.easing);
    setDuration(c.duration);
    if (c.cameraPreset) setCamPreset(c.cameraPreset);
    if (c.modelPreset) setModelPreset(c.modelPreset);
    if (c.loops) {
      setSpinEnabled(false); setFloatEnabled(false); setBreatheEnabled(false);
      for (const loop of c.loops) {
        if (loop.type === 'spin') { setSpinEnabled(true); setSpinAxis(loop.axis ?? 'y'); setSpinSpeed(loop.speed ?? 1); }
        if (loop.type === 'float') { setFloatEnabled(true); setFloatAmp(loop.amplitude ?? 10); setFloatFreq(loop.frequency ?? 1); }
        if (loop.type === 'breathe') { setBreatheEnabled(true); setBreatheAmp(loop.amplitude ?? 5); setBreatheFreq(loop.frequency ?? 0.5); }
      }
    }
  }, []);

  return (
    <div style={styles.container}>
      {/* Model Selector */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('sourceModelLabel')}</div>
        <ModelSelector
          steps={modelSteps}
          selectedIdx={modelStepIdx}
          onSelect={setModelStepIdx}
          emptyText={language === 'zh' ? '请先生成一个模型' : 'Generate a model first'}
        />
      </div>

      {/* Magic One-Click Rig & Animate Wizard */}
      <div style={styles.sectionBoxMagic}>
        <div style={{ ...styles.sectionTitle, color: '#d89cff', fontWeight: 'bold' }}>
          ✨ {t('magicAnimateBtn')}
        </div>
        <div style={styles.hint}>
          {language === 'zh'
            ? '选择上方的一个角色模型，并在下方勾选需要应用的动作（最多5个），点击下方按钮即可一键完成检测、自动骨骼绑定、动画重定向并自动载入 AE 循环播放。'
            : 'Select a model above, check animation presets below, and click to automatically rig and apply animation in one go.'}
        </div>
        {isMagicRunning ? (
          <div style={{ padding: '6px 0' }}>
            <ProgressBar progress={magicProgress} status={magicStatus} />
          </div>
        ) : (
          <button
            onClick={handleMagicAnimate}
            disabled={modelStepIdx < 0 || selectedAnims.length === 0}
            style={modelStepIdx < 0 || selectedAnims.length === 0 ? styles.actionBtnDisabled : styles.actionBtnMagic}
          >
            {t('magicAnimateBtn')}
          </button>
        )}
      </div>

      {/* Timeline Quick Motion Hot-Swap & Anti-Sliding Walk Sync */}
      <div style={styles.sectionBoxHotSwap}>
        <div style={{ ...styles.sectionTitle, color: '#4a9eff', fontWeight: 'bold' }}>
          🔄 {t('hotSwapHeader')}
        </div>
        <div style={styles.hint}>
          {t('hotSwapDesc')}
        </div>

        <label style={styles.fieldLabel}>
          {t('motionPresetLabel')}
          <select
            value={selectedHotSwapAnim}
            onChange={(e) => setSelectedHotSwapAnim(e.target.value)}
            style={styles.select}
          >
            {BIPED_ANIMATIONS.map((a) => (
              <option key={a} value={a}>
                {t(a)}
              </option>
            ))}
          </select>
        </label>

        {isSwapping ? (
          <div style={{ padding: '6px 0' }}>
            <ProgressBar progress={swapProgress} status={swapStatus} />
          </div>
        ) : (
          <button
            onClick={handleHotSwapAction}
            disabled={modelStepIdx < 0}
            style={modelStepIdx < 0 ? styles.actionBtnDisabled : styles.actionBtnHotSwap}
          >
            {t('applyHotSwapBtn')}
          </button>
        )}

        {/* Anti-Sliding Walk Sync */}
        <div style={styles.antiSlidingSection}>
          <div style={{ ...styles.catLabel, color: '#bbb' }}>🏃‍♂️ {t('antiSlidingHeader')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <input
              type="range"
              min={20}
              max={500}
              value={walkSpeedRatio}
              onChange={(e) => setWalkSpeedRatio(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#2e7d32' }}
            />
            <span style={{ fontSize: 9, color: '#ccc', width: 30, textAlign: 'right' }}>{walkSpeedRatio}</span>
          </div>
          <button
            onClick={handleApplyAntiSliding}
            disabled={modelStepIdx < 0}
            style={modelStepIdx < 0 ? styles.actionBtnDisabled : styles.actionBtnAntiSliding}
          >
            {t('applyAntiSlidingBtn')}
          </button>
        </div>

        {swapStatus && !isSwapping && (
          <div style={{ fontSize: 9, color: '#4a9eff', marginTop: 2 }}>
            {swapStatus}
          </div>
        )}
      </div>

      {/* Skeletal Joint Tracker */}
      <div style={styles.sectionBoxHotSwap}>
        <div style={{ ...styles.sectionTitle, color: '#ffb300', fontWeight: 'bold' }}>
          🦴 {t('jointTrackerHeader')}
        </div>
        <div style={styles.hint}>
          {t('jointTrackerDesc')}
        </div>

        <label style={styles.fieldLabel}>
          {t('selectBoneLabel')}
          <select
            value={selectedJointBone}
            onChange={(e) => setSelectedJointBone(e.target.value)}
            style={styles.select}
            disabled={availableBones.length === 0}
          >
            {availableBones.length === 0 ? (
              <option value="mixamorig:Head">mixamorig:Head (Scan model GLB...)</option>
            ) : (
              availableBones.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))
            )}
          </select>
        </label>

        {isTracking ? (
          <div style={{ padding: '6px 0' }}>
            <ProgressBar progress={trackingProgress} status={trackingStatus} />
          </div>
        ) : (
          <button
            onClick={handleExtractJoint}
            disabled={modelStepIdx < 0 || isTracking}
            style={modelStepIdx < 0 ? styles.actionBtnDisabled : styles.actionBtnJointTracker}
          >
            {t('extractJointBtn')}
          </button>
        )}

        {trackingStatus && !isTracking && (
          <div style={{ fontSize: 9, color: '#ffb300', marginTop: 2 }}>
            {trackingStatus}
          </div>
        )}
      </div>

      {/* PBR Multi-Pass Map Exporter */}
      <div style={styles.sectionBoxHotSwap}>
        <div style={{ ...styles.sectionTitle, color: '#8e24aa', fontWeight: 'bold' }}>
          🎨 {t('textureExporterHeader')}
        </div>
        <div style={styles.hint}>
          {t('textureExporterDesc')}
        </div>

        {isExportingTextures ? (
          <div style={{ padding: '6px 0' }}>
            <ProgressBar progress={exportingProgress} status={exportingStatus} />
          </div>
        ) : (
          <button
            onClick={handleExportTextures}
            disabled={modelStepIdx < 0 || isExportingTextures}
            style={modelStepIdx < 0 ? styles.actionBtnDisabled : styles.actionBtnTextureExporter}
          >
            {t('exportTexturesBtn')}
          </button>
        )}

        {exportingStatus && !isExportingTextures && (
          <div style={{ fontSize: 9, color: '#8e24aa', marginTop: 2 }}>
            {exportingStatus}
          </div>
        )}
      </div>

      {/* Prerigcheck */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('checkRigLabel')}</div>
        <button onClick={handlePrerigcheck} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          {isRunning && taskStatus.includes('prerigcheck') ? t('statusCheckingRig') : t('checkRigLabel')}
        </button>
        {taskResult && taskResult.type === 'animate_prerigcheck' && (
          <div style={styles.resultBox}>
            <span style={{ color: taskResult.output?.riggable ? '#4aff6b' : '#ff6b6b', fontSize: 10 }}>
              {taskResult.output?.riggable ? t('riggableTrue') : t('riggableFalse')}
            </span>
            {taskResult.output?.rig_type && (
              <span style={{ color: '#aaa', fontSize: 10 }}>
                {t('detectedRigType')}: {t(taskResult.output.rig_type)} / {taskResult.output?.topology}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rig */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('rigModelLabel')}</div>
        <div style={styles.row}>
          <label style={styles.fieldLabel}>
            {t('rigTypeLabel')}
            <select value={rigType} onChange={(e) => setRigType(e.target.value as RigType)} style={styles.select}>
              {RIG_TYPES.map((r) => <option key={r.value} value={r.value}>{t(r.value)}</option>)}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {t('formatLabel')}
            <select value={rigOutFormat} onChange={(e) => setRigOutFormat(e.target.value as RigOutFormat)} style={styles.select}>
              <option value="glb">GLB</option>
              <option value="fbx">FBX</option>
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {t('rigSpecLabel')}
            <select value={rigSpec} onChange={(e) => setRigSpec(e.target.value as RigSpec)} style={styles.select}>
              <option value="tripo">Tripo</option>
              <option value="mixamo">Mixamo</option>
            </select>
          </label>
        </div>
        <button onClick={handleRig} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          {isRunning && taskStatus.includes('rig') ? t('statusRigging') : t('rigModelLabel')}
        </button>
      </div>

      {/* Retarget */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>
          {t('retargetLabel')} ({selectedAnims.length}/5)
        </div>
        {ANIM_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <div style={styles.catLabel}>{t(cat.label)}</div>
            <div style={styles.animGrid}>
              {cat.items.map((anim) => {
                const selected = selectedAnims.includes(anim.value as AnimationPreset);
                return (
                  <button
                    key={anim.value}
                    onClick={() => toggleAnim(anim.value as AnimationPreset)}
                    style={selected ? styles.animBtnActive : styles.animBtn}
                  >
                    {t(anim.value, anim.label)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={animateInPlace} onChange={(e) => setAnimateInPlace(e.target.checked)} />
          {t('animateInPlace')}
        </label>
        <button onClick={handleRetarget} disabled={isRunning || modelStepIdx < 0 || selectedAnims.length === 0} style={styles.actionBtn}>
          {isRunning && taskStatus.includes('retarget') ? t('statusRetargeting') : t('retargetLabel')}
        </button>
      </div>

      {/* Embedded Animations */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('embeddedAnimHeader')}</div>
        <div style={styles.row}>
          <label style={{ ...styles.fieldLabel, flex: 1 }}>
            {t('animIndexLabel')} (1 - 20)
            <input
              type="number"
              min={1}
              max={20}
              value={embedAnimIndex}
              onChange={(e) => setEmbedAnimIndex(Number(e.target.value))}
              style={styles.numInput}
            />
          </label>
          <label style={{ ...styles.checkLabel, flex: 1, justifyContent: 'center' }}>
            <input
              type="checkbox"
              checked={embedLoopEnabled}
              onChange={(e) => setEmbedLoopEnabled(e.target.checked)}
            />
            {t('loopAnimLabel')}
          </label>
        </div>
        <button onClick={handleApplyEmbeddedAnim} style={styles.actionBtn}>
          {t('applyEmbeddedBtn')}
        </button>
      </div>

      {/* Progress */}
      {isRunning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ProgressBar progress={taskProgress} status={taskStatus} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
            <button
              onClick={() => {
                if (pollerRef.current) {
                  pollerRef.current.abort();
                  pollerRef.current = null;
                }
                setIsRunning(false);
                setTaskProgress(0);
                setTaskStatus('');
              }}
              style={styles.cancelBtn}
            >
              {t('cancelBtn')}
            </button>
          </div>
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}

      {/* Scene Setup */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('sceneSetupTitle')}</div>
        <p style={styles.hint}>{t('sceneSetupHint')}</p>

        {/* Collapsible Advanced Lights/Env Config */}
        <div
          onClick={() => setLightsEnvExpanded(!lightsEnvExpanded)}
          style={{ ...styles.sectionSubTitle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{t('lightsEnvConfigHeader')}</span>
          <span>{lightsEnvExpanded ? '▼' : '▶'}</span>
        </div>

        {lightsEnvExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {/* 3-Point Light Params */}
            <div style={styles.row}>
              <label style={{ ...styles.fieldLabel, flex: 1 }}>
                {t('lightIntensityLabel')}: {lightIntensity}%
                <input
                  type="range" min={0} max={200} step={5}
                  value={lightIntensity} onChange={(e) => {
                    const val = Number(e.target.value);
                    setLightIntensity(val);
                    void handleUpdateSceneProp({ lightIntensity: val });
                  }}
                  style={styles.slider}
                />
              </label>
              <label style={{ ...styles.fieldLabel, width: 60 }}>
                {t('lightColorLabel')}
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLightColor(val);
                    void handleUpdateSceneProp({ lightColor: hexToRgbArray(val) });
                  }}
                  style={{ width: '100%', height: 20, border: '1px solid #444', padding: 0, backgroundColor: 'transparent', cursor: 'pointer' }}
                />
              </label>
            </div>

            <label style={styles.fieldLabel}>
              {t('keyAngleLabel')}: {keyAngle}°
              <input
                type="range" min={-180} max={180} step={5}
                value={keyAngle} onChange={(e) => setKeyAngle(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            {/* Env Light Params */}
            <label style={styles.fieldLabel}>
              {t('envIntensityLabel')}: {envIntensity}%
              <input
                type="range" min={0} max={200} step={5}
                value={envIntensity} onChange={(e) => {
                  const val = Number(e.target.value);
                  setEnvIntensity(val);
                  void handleUpdateSceneProp({ envIntensity: val });
                }}
                style={styles.slider}
              />
            </label>

            {/* HDRI Path Input & Browse */}
            <div style={styles.fieldLabel}>
              {t('hdrPathLabel')}
              <div style={styles.row}>
                <input
                  type="text"
                  value={hdrPath}
                  onChange={(e) => setHdrPath(e.target.value)}
                  style={styles.input}
                  placeholder="e.g. /path/to/map.hdr"
                />
                <button onClick={handleBrowseHdr} style={styles.browseBtn}>
                  {t('browseBtn')}
                </button>
              </div>
            </div>

            {/* HDR Presets Gallery */}
            <div style={{ ...styles.fieldLabel, marginTop: 8 }}>
              <span style={{ fontSize: 10, color: '#ccc', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Free HDR Environment Presets (CC0)
              </span>
              <div style={styles.hdrGrid}>
                {HDR_PRESETS.map((p) => {
                  const info = HDR_INFO[p.id] || { desc: '', zhDesc: '', gradient: 'linear-gradient(135deg, #333 0%, #555 100%)' };
                  const isActive = hdrPath.endsWith(`${p.id}.hdr`);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleDownloadHdrPreset(p)}
                      disabled={!!hdrDownloading}
                      style={isActive ? styles.hdrCardActive : styles.hdrCard}
                      title={p.label}
                    >
                      <div style={{ ...styles.hdrColorBlock, background: info.gradient }}>
                        {hdrDownloading === p.id && <span style={styles.hdrDownloadSpinner}>⟳</span>}
                      </div>
                      <div style={styles.hdrCardInfo}>
                        <div style={styles.hdrCardName}>{p.label}</div>
                        <div style={styles.hdrCardDesc}>{language === 'zh' ? info.zhDesc : info.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shadow options */}
            <div style={styles.row}>
              <label style={{ ...styles.checkLabel, flex: 1 }}>
                <input
                  type="checkbox"
                  checked={castShadows}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setCastShadows(val);
                    void handleUpdateSceneProp({ castShadows: val });
                  }}
                />
                {t('castShadowsLabel')}
              </label>
            </div>
            {castShadows && (
              <div style={styles.row}>
                <label style={{ ...styles.fieldLabel, flex: 1 }}>
                  {t('shadowDarknessLabel')}: {shadowDarkness}%
                  <input
                    type="range" min={0} max={100} step={5}
                    value={shadowDarkness} onChange={(e) => {
                      const val = Number(e.target.value);
                      setShadowDarkness(val);
                      void handleUpdateSceneProp({ shadowDarkness: val });
                    }}
                    style={styles.slider}
                  />
                </label>
                <label style={{ ...styles.fieldLabel, flex: 1 }}>
                  {t('shadowDiffusionLabel')}: {shadowDiffusion}px
                  <input
                    type="range" min={0} max={100} step={2}
                    value={shadowDiffusion} onChange={(e) => {
                      const val = Number(e.target.value);
                      setShadowDiffusion(val);
                      void handleUpdateSceneProp({ shadowDiffusion: val });
                    }}
                    style={styles.slider}
                  />
                </label>
              </div>
            )}

            {/* Independent Trigger Buttons */}
            <div style={styles.row}>
              <button onClick={handleCreateLights} style={{ ...styles.secondaryBtn, flex: 1, padding: '4px 0', fontSize: 9 }}>
                {t('createLightsBtn')}
              </button>
              <button onClick={handleCreateEnvLight} style={{ ...styles.secondaryBtn, flex: 1, padding: '4px 0', fontSize: 9 }}>
                {t('createEnvLightBtn')}
              </button>
            </div>
          </div>
        )}

        <button onClick={handleSetupScene} style={styles.actionBtn}>
          {t('sceneSetupBtn')}
        </button>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={handleAlignModelToGround} style={{ ...styles.secondaryBtn, flex: 1, margin: 0, padding: '6px 0', fontSize: '11px' }}>
            {t('alignModelToGround')}
          </button>
          <button onClick={handleAlignGroundToModel} style={{ ...styles.secondaryBtn, flex: 1, margin: 0, padding: '6px 0', fontSize: '11px' }}>
            {t('alignGroundToModel')}
          </button>
        </div>

        {sceneError && <div style={styles.error}>{sceneError}</div>}
      </div>

      {/* Material Presets */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('advancedPbrHeader')}</div>
        <p style={styles.hint}>{t('materialPresetHint')}</p>
        <div style={styles.presetRow}>
          {MATERIAL_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setMatPreset(p.value as MaterialPresetName)}
              style={matPreset === p.value ? styles.presetBtnActive : styles.presetBtn}
            >
              {t(p.value)}
            </button>
          ))}
        </div>
        <div style={styles.row}>
          <button onClick={handleApplyMaterial} style={styles.actionBtn}>
            {t('applyBtn')}
          </button>
          <button onClick={handleReadMaterial} style={styles.secondaryBtn}>
            {t('readCurrentBtn')}
          </button>
        </div>
        {sceneError && <div style={styles.error}>{sceneError}</div>}
      </div>

      {/* PBR Material Properties (Advanced) */}
      <div style={styles.sectionBox}>
        <div
          onClick={() => setPbrEditorExpanded(!pbrEditorExpanded)}
          style={{ ...styles.sectionTitle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{t('advancedPbrHeader')}</span>
          <span>{pbrEditorExpanded ? '▼' : '▶'}</span>
        </div>
        {pbrEditorExpanded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', padding: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', lineHeight: '1.4' }}>
              <strong>{t('note')}:</strong> GLB models use their embedded materials and are lit primarily by the Environment Light.
            </div>
            <button onClick={handleReadMaterialAndSetSliders} style={styles.secondaryBtn}>
              {t('readFromLayerBtn')}
            </button>

            <label style={styles.fieldLabel}>
              {t('ambient')}: {pbrAmbient}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrAmbient} onChange={(e) => setPbrAmbient(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('diffuse')}: {pbrDiffuse}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrDiffuse} onChange={(e) => setPbrDiffuse(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('specularIntensity')}: {pbrSpecularIntensity}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrSpecularIntensity} onChange={(e) => setPbrSpecularIntensity(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('specularShininess')}: {pbrSpecularShininess}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrSpecularShininess} onChange={(e) => setPbrSpecularShininess(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('metalness')}: {pbrMetal}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrMetal} onChange={(e) => setPbrMetal(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('lightTransmission')}: {pbrLightTransmission}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrLightTransmission} onChange={(e) => setPbrLightTransmission(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('reflectionIntensity')}: {pbrReflectionIntensity}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrReflectionIntensity} onChange={(e) => setPbrReflectionIntensity(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('reflectionSharpness')}: {pbrReflectionSharpness}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrReflectionSharpness} onChange={(e) => setPbrReflectionSharpness(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('transparency')}: {pbrTransparency}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrTransparency} onChange={(e) => setPbrTransparency(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('ior')}: {pbrIndexOrRefraction.toFixed(2)}
              <input
                type="range" min={1.0} max={3.0} step={0.05}
                value={pbrIndexOrRefraction} onChange={(e) => setPbrIndexOrRefraction(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <button onClick={handleApplyPBRProperties} style={styles.actionBtn}>
              {t('applyPbrBtn')}
            </button>
          </div>
        ) : (
          <p style={styles.hint}>{t('advancedPbrHint')}</p>
        )}
      </div>

      {/* AE Animation */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('aeAnimationLocal')}</div>

        {/* Camera Presets */}
        <div style={styles.fieldLabel}>{t('cameraLabel')}</div>
        <div style={styles.presetRow}>
          {CAMERA_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setCamPreset(p.value)}
              style={camPreset === p.value ? styles.presetBtnActive : styles.presetBtn}
            >
              {t(p.value)}
            </button>
          ))}
        </div>

        {/* Model Presets */}
        <div style={styles.fieldLabel}>{t('modelLabel')}</div>
        <div style={styles.presetRow}>
          {MODEL_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setModelPreset(p.value)}
              style={modelPreset === p.value ? styles.presetBtnActive : styles.presetBtn}
            >
              {t(p.value)}
            </button>
          ))}
        </div>

        {/* Easing */}
        <label style={styles.fieldLabel}>
          {t('easingLabel')}
          <select value={easing} onChange={(e) => setEasing(e.target.value as EasingType)} style={styles.select}>
            {EASING_TYPES.map((et) => <option key={et.value} value={et.value}>{t(et.value)}</option>)}
          </select>
        </label>

        {/* Duration */}
        <label style={styles.fieldLabel}>
          {t('durationLabel')}: {duration.toFixed(1)}s
          <input
            type="range" min={0.5} max={10} step={0.1}
            value={duration} onChange={(e) => setDuration(Number(e.target.value))}
            style={styles.slider}
          />
        </label>

        {/* Loop Toggles */}
        <div style={styles.loopSection}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={spinEnabled} onChange={(e) => setSpinEnabled(e.target.checked)} />
            {t('spinLabel')}
          </label>
          {spinEnabled && (
            <div style={styles.loopControls}>
              <select value={spinAxis} onChange={(e) => setSpinAxis(e.target.value as any)} style={styles.selectSmall}>
                <option value="x">X</option><option value="y">Y</option><option value="z">Z</option>
              </select>
              <label style={styles.inlineLabel}>Speed: <input type="number" value={spinSpeed} onChange={(e) => setSpinSpeed(Number(e.target.value))} style={styles.numInput} min={0.1} step={0.1} /></label>
            </div>
          )}

          <label style={styles.checkLabel}>
            <input type="checkbox" checked={floatEnabled} onChange={(e) => setFloatEnabled(e.target.checked)} />
            {t('floatLabel')}
          </label>
          {floatEnabled && (
            <div style={styles.loopControls}>
              <label style={styles.inlineLabel}>Amp: <input type="number" value={floatAmp} onChange={(e) => setFloatAmp(Number(e.target.value))} style={styles.numInput} /></label>
              <label style={styles.inlineLabel}>Freq: <input type="number" value={floatFreq} onChange={(e) => setFloatFreq(Number(e.target.value))} style={styles.numInput} step={0.1} /></label>
            </div>
          )}

          <label style={styles.checkLabel}>
            <input type="checkbox" checked={breatheEnabled} onChange={(e) => setBreatheEnabled(e.target.checked)} />
            {t('breatheLabel')}
          </label>
          {breatheEnabled && (
            <div style={styles.loopControls}>
              <label style={styles.inlineLabel}>Amp: <input type="number" value={breatheAmp} onChange={(e) => setBreatheAmp(Number(e.target.value))} style={styles.numInput} /></label>
              <label style={styles.inlineLabel}>Freq: <input type="number" value={breatheFreq} onChange={(e) => setBreatheFreq(Number(e.target.value))} style={styles.numInput} step={0.1} /></label>
            </div>
          )}
        </div>

        <button onClick={handleApplyAEAnim} style={styles.actionBtn}>
          {t('applyAnimBtn')}
        </button>

        {/* Templates */}
        <div style={styles.templateSection}>
          <div style={styles.catLabel}>{t('templatesTitle')}</div>
          <div style={styles.templateRow}>
            <input
              type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t('templateNamePlaceholder')} style={styles.input}
            />
            <button onClick={saveTemplate} style={styles.smallBtn}>{t('saveBtn')}</button>
          </div>
          {templates.map((tmpl) => (
            <button key={tmpl.id} onClick={() => loadTemplate(tmpl)} style={styles.templateItem}>
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 8, padding: 10 },
  sectionBox: {
    display: 'flex', flexDirection: 'column', gap: 6,
    padding: 8, border: '1px solid #333', borderRadius: 4, backgroundColor: '#252525',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 600, color: '#ccc',
    paddingBottom: 4, borderBottom: '1px solid #333',
  },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10, color: '#aaa' },
  select: {
    padding: '3px 4px', fontSize: 10, backgroundColor: '#2a2a2a',
    border: '1px solid #444', borderRadius: 3, color: '#e0e0e0', outline: 'none',
  },
  selectSmall: {
    padding: '2px 3px', fontSize: 9, backgroundColor: '#2a2a2a',
    border: '1px solid #444', borderRadius: 3, color: '#e0e0e0', outline: 'none',
  },
  row: { display: 'flex', gap: 6 },
  actionBtn: {
    padding: '6px 0', border: 'none', borderRadius: 3,
    backgroundColor: '#4a9eff', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '6px 0', border: '1px solid #444', borderRadius: 3,
    backgroundColor: '#3d3d3d', color: '#aaa', fontSize: 10, cursor: 'pointer',
  },
  hint: { fontSize: 9, color: '#666', margin: '0 0 4px 0' },
  resultBox: { display: 'flex', flexDirection: 'column', gap: 2 },
  error: {
    padding: '4px 6px', backgroundColor: '#3a1a1a',
    border: '1px solid #662222', borderRadius: 3, color: '#ff6b6b', fontSize: 10,
  },
  catLabel: { fontSize: 9, color: '#888', fontWeight: 600, marginTop: 4 },
  animGrid: { display: 'flex', flexWrap: 'wrap', gap: 3 },
  animBtn: {
    padding: '2px 5px', fontSize: 9, backgroundColor: '#3d3d3d',
    border: '1px solid #444', borderRadius: 3, color: '#aaa', cursor: 'pointer',
  },
  animBtnActive: {
    padding: '2px 5px', fontSize: 9, backgroundColor: '#2a3a4f',
    border: '1px solid #4a9eff', borderRadius: 3, color: '#4a9eff', cursor: 'pointer',
  },
  checkLabel: {
    display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#ccc', cursor: 'pointer',
  },
  presetRow: { display: 'flex', gap: 4, marginBottom: 4 },
  presetBtn: {
    padding: '3px 6px', fontSize: 9, backgroundColor: '#3d3d3d',
    border: '1px solid #444', borderRadius: 3, color: '#aaa', cursor: 'pointer',
  },
  presetBtnActive: {
    padding: '3px 6px', fontSize: 9, backgroundColor: '#2a3a4f',
    border: '1px solid #4a9eff', borderRadius: 3, color: '#4a9eff', cursor: 'pointer', fontWeight: 600,
  },
  slider: { width: '100%', accentColor: '#4a9eff' },
  loopSection: { display: 'flex', flexDirection: 'column', gap: 4 },
  loopControls: { display: 'flex', gap: 8, paddingLeft: 16, alignItems: 'center' },
  inlineLabel: { fontSize: 9, color: '#aaa', display: 'flex', alignItems: 'center', gap: 3 },
  numInput: {
    width: 45, padding: '1px 3px', fontSize: 9,
    backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: 2, color: '#e0e0e0',
  },
  templateSection: { borderTop: '1px solid #333', paddingTop: 6, marginTop: 2 },
  templateRow: { display: 'flex', gap: 4, marginBottom: 4 },
  input: {
    flex: 1, padding: '3px 4px', fontSize: 10,
    backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: 3,
    color: '#e0e0e0', outline: 'none',
  },
  smallBtn: {
    padding: '3px 8px', fontSize: 9,
    backgroundColor: '#3d3d3d', border: '1px solid #444', borderRadius: 3, color: '#aaa', cursor: 'pointer',
  },
  templateItem: {
    padding: '3px 6px', fontSize: 9,
    backgroundColor: '#333', border: '1px solid #444', borderRadius: 3,
    color: '#ccc', cursor: 'pointer', textAlign: 'left' as const, marginBottom: 2,
  },
  sectionSubTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#999',
    marginTop: 4,
    paddingBottom: 2,
    borderBottom: '1px dotted #333',
  },
  browseBtn: {
    padding: '3px 8px',
    fontSize: 9,
    backgroundColor: '#3d3d3d',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#4a9eff',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '3px 8px',
    border: '1px solid #662222',
    borderRadius: 3,
    backgroundColor: '#3a1a1a',
    color: '#ff6b6b',
    fontSize: 9,
    cursor: 'pointer',
  },

  actionBtnMagic: {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    borderRadius: 3,
    backgroundColor: '#8e24aa',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 0 10px rgba(142, 36, 170, 0.3)',
    textAlign: 'center',
  },
  actionBtnDisabled: {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    borderRadius: 3,
    backgroundColor: '#2d2d2d',
    color: '#666',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'not-allowed',
    textAlign: 'center',
  },
  sectionBoxMagic: {
    padding: 10,
    backgroundColor: '#20162a',
    border: '1px solid #7b1fa2',
    borderRadius: 6,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  hdrGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 6,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  hdrCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: 4,
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  hdrCardActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    backgroundColor: '#2a3a4f',
    border: '1px solid #4a9eff',
    borderRadius: 4,
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  hdrColorBlock: {
    width: 24,
    height: 24,
    borderRadius: 3,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hdrCardInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  },
  hdrCardName: {
    fontSize: 9,
    fontWeight: 600,
    color: '#e0e0e0',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  hdrCardDesc: {
    fontSize: 8,
    color: '#777',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  hdrDownloadSpinner: {
    fontSize: 10,
    color: '#fff',
  },
  sectionBoxHotSwap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 8,
    border: '1px solid #1a3a5a',
    borderRadius: 4,
    backgroundColor: '#1b2633',
  },
  actionBtnHotSwap: {
    padding: '6px 0',
    border: 'none',
    borderRadius: 3,
    backgroundColor: '#00bcd4',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnAntiSliding: {
    padding: '4px 0',
    border: 'none',
    borderRadius: 3,
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: 9,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  actionBtnJointTracker: {
    padding: '6px 0',
    border: 'none',
    borderRadius: 3,
    backgroundColor: '#ffb300',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnTextureExporter: {
    padding: '6px 0',
    border: 'none',
    borderRadius: 3,
    backgroundColor: '#8e24aa',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  antiSlidingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingTop: 6,
    borderTop: '1px solid #333',
    marginTop: 4,
  },
};
