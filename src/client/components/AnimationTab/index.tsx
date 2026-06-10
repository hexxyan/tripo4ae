import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import {
  RIG_TYPES,
  BIPED_ANIMATIONS,
  CROSS_SPECIES_ANIMATIONS,
  CAMERA_PRESETS,
  MODEL_PRESETS,
  EASING_TYPES,
  LOOP_TYPES,
  MATERIAL_PRESETS,
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

export function AnimationTab() {
  const apiKey = useStore((s) => s.apiKey);
  const pipeline = useStore((s) => s.pipeline);
  const addPipelineStep = useStore((s) => s.addPipelineStep);
  const updatePipelineStep = useStore((s) => s.updatePipelineStep);
  const addModel = useStore((s) => s.addModel);
  const csInterface = useCsInterface();

  const importedTaskIds = useRef(new Set<string>());

  const importTaskToAe = useCallback(async (task: TripoTask, label: string) => {
    if (importedTaskIds.current.has(task.task_id)) return;
    importedTaskIds.current.add(task.task_id);
    try {
      const api = new TripoApiService(apiKey!);
      const modelUrl = api.getModelUrl(task.output);
      if (!modelUrl) return;

      const saveDir = TripoApiService.getModelSaveDir();
      const localPath = await api.downloadTaskResult(task, saveDir);

      await csInterface.importModel(localPath);

      const model: ModelRecord = {
        id: task.task_id,
        taskId: task.task_id,
        name: label,
        thumbnailUrl: task.output?.rendered_image,
        modelPath: localPath,
        format: 'GLB',
        createdAt: Date.now(),
        pipelineSteps: [...pipeline],
      };
      addModel(model);
    } catch {
      // Non-blocking
    }
  }, [apiKey, csInterface, addModel, pipeline]);

  // Common state
  const modelSteps = pipeline.filter((s) => s.status === 'success' && s.taskId);
  const [modelStepIdx, setModelStepIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // Task execution helper
  const taskIdxRef = useRef(-1);
  const nextStepIdx = useRef(pipeline.length);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskResult, setTaskResult] = useState<TripoTask | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const getApi = useCallback(() => {
    if (!apiKey) throw new Error('API key not set');
    return new TripoApiService(apiKey);
  }, [apiKey]);

  const runTask = useCallback(async (
    type: string,
    params: Record<string, unknown>,
  ) => {
    setError(null);
    setTaskResult(null);
    setIsRunning(true);
    setTaskProgress(0);
    setTaskStatus('Starting...');

    try {
      const api = getApi();
      const step: PipelineStep = {
        type: type as any,
        taskId: null,
        status: 'pending',
        params: params as any,
      };
      addPipelineStep(step);
      taskIdxRef.current = nextStepIdx.current++;

      const taskId = await api.createTask(params as any);
      updatePipelineStep(taskIdxRef.current, {
        taskId,
        status: 'running',
      });

      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      const result = await poller.pollUntilDone(taskId, {
        onProgress: (task) => {
          setTaskProgress(task.progress);
          setTaskStatus(`${type}... ${task.progress}%`);
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
      setTaskStatus('Complete');
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, {
          status: 'success',
          output: result.output,
        });
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Task failed');
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'failed' });
      }
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [apiKey, pipeline, getApi, addPipelineStep, updatePipelineStep]);

  // Prerigcheck
  const handlePrerigcheck = useCallback(async () => {
    const taskId = modelSteps[modelStepIdx]?.taskId;
    if (!taskId) { setError('Select a model'); return; }
    await runTask('animate_prerigcheck', {
      type: 'animate_prerigcheck',
      original_model_task_id: taskId,
    });
  }, [modelStepIdx, modelSteps, runTask]);

  // Rig
  const [rigType, setRigType] = useState<RigType>('biped');
  const [rigOutFormat, setRigOutFormat] = useState<RigOutFormat>('glb');
  const [rigSpec, setRigSpec] = useState<RigSpec>('tripo');

  const handleRig = useCallback(async () => {
    const taskId = modelSteps[modelStepIdx]?.taskId;
    if (!taskId) { setError('Select a model'); return; }
    const result = await runTask('animate_rig', {
      type: 'animate_rig',
      original_model_task_id: taskId,
      rig_type: rigType,
      out_format: rigOutFormat,
      spec: rigSpec,
    });
    if (result) {
      setTaskStatus('Importing rig to AE...');
      await importTaskToAe(result, `Rigged (${rigType})`);
      setTaskStatus('Complete');
    }
  }, [modelStepIdx, modelSteps, rigType, rigOutFormat, rigSpec, runTask, importTaskToAe]);

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
    const taskId = modelSteps[modelStepIdx]?.taskId;
    if (!taskId) { setError('Select a model'); return; }
    if (selectedAnims.length === 0) { setError('Select at least one animation'); return; }
    const result = await runTask('animate_retarget', {
      type: 'animate_retarget',
      original_model_task_id: taskId,
      animations: selectedAnims,
      out_format: 'glb',
      animate_in_place: animateInPlace,
    });
    if (result) {
      setTaskStatus('Importing animated model to AE...');
      await importTaskToAe(result, `Animated (${selectedAnims.length} anims)`);
      setTaskStatus('Complete');
    }
  }, [modelStepIdx, modelSteps, selectedAnims, animateInPlace, runTask, importTaskToAe]);

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

  // Scene & Material state
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [matPreset, setMatPreset] = useState<MaterialPresetName>('plastic');

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

  const handleSetupScene = useCallback(async () => {
    setSceneError(null);
    try {
      await csInterface.setupScene({ cameraDistance: 800, depthOfField: true, lightIntensity: 100 });
    } catch (err: any) {
      setSceneError(err.message || 'Scene setup failed');
    }
  }, [csInterface]);

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
        if (props.ambient !== undefined) setPbrAmbient(Math.round(props.ambient * 100));
        if (props.diffuse !== undefined) setPbrDiffuse(Math.round(props.diffuse * 100));
        if (props.specularIntensity !== undefined) setPbrSpecularIntensity(Math.round(props.specularIntensity * 100));
        if (props.specularShininess !== undefined) setPbrSpecularShininess(Math.round(props.specularShininess * 100));
        if (props.metal !== undefined) setPbrMetal(Math.round(props.metal * 100));
        if (props.lightTransmission !== undefined) setPbrLightTransmission(Math.round(props.lightTransmission * 100));
        if (props.reflectionIntensity !== undefined) setPbrReflectionIntensity(Math.round(props.reflectionIntensity * 100));
        if (props.reflectionSharpness !== undefined) setPbrReflectionSharpness(Math.round(props.reflectionSharpness * 100));
        if (props.transparency !== undefined) setPbrTransparency(Math.round(props.transparency * 100));
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
        ambient: pbrAmbient / 100,
        diffuse: pbrDiffuse / 100,
        specularIntensity: pbrSpecularIntensity / 100,
        specularShininess: pbrSpecularShininess / 100,
        metal: pbrMetal / 100,
        lightTransmission: pbrLightTransmission / 100,
        reflectionIntensity: pbrReflectionIntensity / 100,
        reflectionSharpness: pbrReflectionSharpness / 100,
        transparency: pbrTransparency / 100,
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
        <div style={styles.sectionTitle}>Source Model</div>
        <label style={styles.fieldLabel}>
          Pipeline Model
          <select value={modelStepIdx} onChange={(e) => setModelStepIdx(Number(e.target.value))} style={styles.select}>
            <option value={-1}>-- Select --</option>
            {modelSteps.map((step, i) => (
              <option key={i} value={i}>{step.type} ({step.taskId?.slice(0, 8)})</option>
            ))}
          </select>
        </label>
      </div>

      {/* Prerigcheck */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>Pre-Rig Check</div>
        <button onClick={handlePrerigcheck} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          Check Rig-ability
        </button>
        {taskResult && taskResult.type === 'animate_prerigcheck' && (
          <div style={styles.resultBox}>
            <span style={{ color: taskResult.output?.riggable ? '#4aff6b' : '#ff6b6b', fontSize: 10 }}>
              Riggable: {taskResult.output?.riggable ? 'Yes' : 'No'}
            </span>
            {taskResult.output?.rig_type && (
              <span style={{ color: '#aaa', fontSize: 10 }}>
                Detected: {taskResult.output.rig_type} / {taskResult.output?.topology}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rig */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>Rig Model</div>
        <div style={styles.row}>
          <label style={styles.fieldLabel}>
            Rig Type
            <select value={rigType} onChange={(e) => setRigType(e.target.value as RigType)} style={styles.select}>
              {RIG_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Format
            <select value={rigOutFormat} onChange={(e) => setRigOutFormat(e.target.value as RigOutFormat)} style={styles.select}>
              <option value="glb">GLB</option>
              <option value="fbx">FBX</option>
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Spec
            <select value={rigSpec} onChange={(e) => setRigSpec(e.target.value as RigSpec)} style={styles.select}>
              <option value="tripo">Tripo</option>
              <option value="mixamo">Mixamo</option>
            </select>
          </label>
        </div>
        <button onClick={handleRig} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          Rig Model
        </button>
      </div>

      {/* Retarget */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>
          Retarget Animation ({selectedAnims.length}/5 selected)
        </div>
        {ANIM_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <div style={styles.catLabel}>{cat.label}</div>
            <div style={styles.animGrid}>
              {cat.items.map((anim) => {
                const selected = selectedAnims.includes(anim.value);
                return (
                  <button
                    key={anim.value}
                    onClick={() => toggleAnim(anim.value)}
                    style={selected ? styles.animBtnActive : styles.animBtn}
                  >
                    {anim.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={animateInPlace} onChange={(e) => setAnimateInPlace(e.target.checked)} />
          Animate in Place
        </label>
        <button onClick={handleRetarget} disabled={isRunning || modelStepIdx < 0 || selectedAnims.length === 0} style={styles.actionBtn}>
          Retarget
        </button>
      </div>

      {/* Progress */}
      {isRunning && <ProgressBar progress={taskProgress} status={taskStatus} />}
      {error && <div style={styles.error}>{error}</div>}

      {/* Scene Setup */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>Scene Setup</div>
        <p style={styles.hint}>Creates camera + 3-point lighting + environment light in the active comp.</p>
        <button onClick={handleSetupScene} style={styles.actionBtn}>
          Setup Scene
        </button>
        {sceneError && <div style={styles.error}>{sceneError}</div>}
      </div>

      {/* Material Presets */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>Material Presets</div>
        <p style={styles.hint}>Select a 3D layer in AE, then apply a PBR material preset.</p>
        <div style={styles.presetRow}>
          {MATERIAL_PRESETS.filter((p) => p.value !== 'default').map((p) => (
            <button
              key={p.value}
              onClick={() => setMatPreset(p.value as MaterialPresetName)}
              style={matPreset === p.value ? styles.presetBtnActive : styles.presetBtn}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={styles.row}>
          <button onClick={handleApplyMaterial} style={styles.actionBtn}>
            Apply
          </button>
          <button onClick={handleReadMaterial} style={styles.secondaryBtn}>
            Read Current
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
          <span>Advanced PBR Material Options</span>
          <span>{pbrEditorExpanded ? '▼' : '▶'}</span>
        </div>
        {pbrEditorExpanded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <button onClick={handleReadMaterialAndSetSliders} style={styles.secondaryBtn}>
              Read from Selected Layer
            </button>

            <label style={styles.fieldLabel}>
              Ambient: {pbrAmbient}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrAmbient} onChange={(e) => setPbrAmbient(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Diffuse: {pbrDiffuse}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrDiffuse} onChange={(e) => setPbrDiffuse(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Specular Intensity: {pbrSpecularIntensity}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrSpecularIntensity} onChange={(e) => setPbrSpecularIntensity(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Specular Shininess (Glossiness): {pbrSpecularShininess}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrSpecularShininess} onChange={(e) => setPbrSpecularShininess(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Metalness: {pbrMetal}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrMetal} onChange={(e) => setPbrMetal(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Light Transmission: {pbrLightTransmission}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrLightTransmission} onChange={(e) => setPbrLightTransmission(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Reflection Intensity: {pbrReflectionIntensity}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrReflectionIntensity} onChange={(e) => setPbrReflectionIntensity(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Reflection Sharpness (Roughness): {pbrReflectionSharpness}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrReflectionSharpness} onChange={(e) => setPbrReflectionSharpness(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Transparency: {pbrTransparency}%
              <input
                type="range" min={0} max={100} step={1}
                value={pbrTransparency} onChange={(e) => setPbrTransparency(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <label style={styles.fieldLabel}>
              Index of Refraction (IOR): {pbrIndexOrRefraction.toFixed(2)}
              <input
                type="range" min={1.0} max={3.0} step={0.05}
                value={pbrIndexOrRefraction} onChange={(e) => setPbrIndexOrRefraction(Number(e.target.value))}
                style={styles.slider}
              />
            </label>

            <button onClick={handleApplyPBRProperties} style={styles.actionBtn}>
              Apply PBR Properties
            </button>
          </div>
        ) : (
          <p style={styles.hint}>Expand to micro-tune Ambient, Metal, Transmission, IOR, etc.</p>
        )}
      </div>

      {/* AE Animation */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>AE Animation (Local)</div>

        {/* Camera Presets */}
        <div style={styles.fieldLabel}>Camera</div>
        <div style={styles.presetRow}>
          {CAMERA_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setCamPreset(p.value)}
              style={camPreset === p.value ? styles.presetBtnActive : styles.presetBtn}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Model Presets */}
        <div style={styles.fieldLabel}>Model</div>
        <div style={styles.presetRow}>
          {MODEL_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setModelPreset(p.value)}
              style={modelPreset === p.value ? styles.presetBtnActive : styles.presetBtn}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Easing */}
        <label style={styles.fieldLabel}>
          Easing
          <select value={easing} onChange={(e) => setEasing(e.target.value as EasingType)} style={styles.select}>
            {EASING_TYPES.map((et) => <option key={et.value} value={et.value}>{et.label}</option>)}
          </select>
        </label>

        {/* Duration */}
        <label style={styles.fieldLabel}>
          Duration: {duration.toFixed(1)}s
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
            Spin
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
            Float
          </label>
          {floatEnabled && (
            <div style={styles.loopControls}>
              <label style={styles.inlineLabel}>Amp: <input type="number" value={floatAmp} onChange={(e) => setFloatAmp(Number(e.target.value))} style={styles.numInput} /></label>
              <label style={styles.inlineLabel}>Freq: <input type="number" value={floatFreq} onChange={(e) => setFloatFreq(Number(e.target.value))} style={styles.numInput} step={0.1} /></label>
            </div>
          )}

          <label style={styles.checkLabel}>
            <input type="checkbox" checked={breatheEnabled} onChange={(e) => setBreatheEnabled(e.target.checked)} />
            Breathe
          </label>
          {breatheEnabled && (
            <div style={styles.loopControls}>
              <label style={styles.inlineLabel}>Amp: <input type="number" value={breatheAmp} onChange={(e) => setBreatheAmp(Number(e.target.value))} style={styles.numInput} /></label>
              <label style={styles.inlineLabel}>Freq: <input type="number" value={breatheFreq} onChange={(e) => setBreatheFreq(Number(e.target.value))} style={styles.numInput} step={0.1} /></label>
            </div>
          )}
        </div>

        <button onClick={handleApplyAEAnim} style={styles.actionBtn}>
          Apply Animation
        </button>

        {/* Templates */}
        <div style={styles.templateSection}>
          <div style={styles.catLabel}>Templates</div>
          <div style={styles.templateRow}>
            <input
              type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..." style={styles.input}
            />
            <button onClick={saveTemplate} style={styles.smallBtn}>Save</button>
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
};
