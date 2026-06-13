import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller, CancelledError } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import { useTranslation } from '../../hooks/useTranslation';
import { STYLIZE_STYLES, CONVERT_FORMATS } from '../../../shared/constants';
import type {
  StylizeStyle,
  ConvertFormat,
  FbxPreset,
  TripoTask,
  PipelineStep,
  ModelRecord,
} from '../../../shared/types';
import { ProgressBar } from '../common/ProgressBar';
import { ModelSelector } from '../common/ModelSelector';

export function TransformTab() {
  const apiKey = useStore((s) => s.apiKey);
  const pipeline = useStore((s) => s.pipeline);
  const addPipelineStep = useStore((s) => s.addPipelineStep);
  const updatePipelineStep = useStore((s) => s.updatePipelineStep);
  const addModel = useStore((s) => s.addModel);
  const models = useStore((s) => s.models);
  const csInterface = useCsInterface();
  const {
    getThreeDNullLayers,
    bindModelToTracker,
    createShadowCatcher,
    exportCurrentFrameToPng,
    createSmartMatchLightRig,
    toggleLayerProxy
  } = csInterface;
  const { t } = useTranslation();

  const importedTaskIds = useRef(new Set<string>());
  const pollerRef = useRef<TaskPoller | null>(null);

  // Matchmoving & Compositing State
  const [trackerLayers, setTrackerLayers] = useState<Array<{ index: number; name: string }>>([]);
  const [selectedTrackerIdx, setSelectedTrackerIdx] = useState<number>(-1);
  const [compositingStatus, setCompositingStatus] = useState<string>('');
  const [matchingStatus, setMatchingStatus] = useState<string>('');
  const [proxyStatus, setProxyStatus] = useState<string>('');
  const [isProxyMode, setIsProxyMode] = useState<boolean>(false);

  const modelSteps = React.useMemo(() => pipeline.filter((s) => s.status === 'success' && s.taskId), [pipeline]);
  const [modelStepIdx, setModelStepIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TripoTask | null>(null);

  const refreshTrackers = useCallback(async () => {
    try {
      const res = await getThreeDNullLayers();
      let parsed: Array<{ index: number; name: string }> = [];
      if (res) {
        parsed = JSON.parse(res);
      }
      setTrackerLayers(parsed);
      if (parsed.length > 0) {
        setSelectedTrackerIdx(parsed[0].index);
      } else {
        setSelectedTrackerIdx(-1);
      }
    } catch (e) {
      console.error('Failed to get 3D Null layers', e);
    }
  }, [getThreeDNullLayers]);

  React.useEffect(() => {
    refreshTrackers();
  }, [refreshTrackers]);

  const handleBindToTracker = useCallback(async () => {
    if (selectedTrackerIdx === -1) {
      setError(t('selectTrackerWarning'));
      return;
    }
    setError(null);
    setCompositingStatus(t('aligning'));
    try {
      const result = await bindModelToTracker({
        trackerLayerIndex: selectedTrackerIdx,
      });
      const parsed = JSON.parse(result);
      if (parsed && parsed.ok) {
        setCompositingStatus(`${t('statusSuccess')}: ${parsed.data.model} → ${parsed.data.tracker}`);
      } else {
        setError(parsed.error || 'Failed to bind.');
      }
    } catch (e: any) {
      setError(e.message || 'Binding failed.');
    } finally {
      setTimeout(() => setCompositingStatus(''), 3000);
    }
  }, [selectedTrackerIdx, bindModelToTracker, t]);

  const handleCreateShadowCatcher = useCallback(async () => {
    if (selectedTrackerIdx === -1) {
      setError(t('selectTrackerWarning'));
      return;
    }
    setError(null);
    setCompositingStatus(t('creatingCatcher'));
    try {
      const result = await createShadowCatcher({
        trackerLayerIndex: selectedTrackerIdx,
      });
      const parsed = JSON.parse(result);
      if (parsed && parsed.ok) {
        setCompositingStatus(`${t('statusSuccess')}: Shadow catcher created.`);
      } else {
        setError(parsed.error || 'Failed to create shadow catcher.');
      }
    } catch (e: any) {
      setError(e.message || 'Shadow catcher creation failed.');
    } finally {
      setTimeout(() => setCompositingStatus(''), 3000);
    }
  }, [selectedTrackerIdx, createShadowCatcher, t]);

  const extractPalette = useCallback((dataUrl: string): Promise<{
    keyColor: [number, number, number];
    fillColor: [number, number, number];
    ambientColor: [number, number, number];
  }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 16;
          canvas.height = 16;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, 16, 16);
          const imgData = ctx.getImageData(0, 0, 16, 16).data;

          let totalR = 0, totalG = 0, totalB = 0, count = 0;
          let brightestVal = -1;
          let brightestColor: [number, number, number] = [255, 255, 255];
          let darkestVal = Infinity;
          let darkestColor: [number, number, number] = [0, 0, 0];

          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i+1];
            const b = imgData[i+2];
            const a = imgData[i+3];

            if (a < 50) continue; // skip transparent background

            totalR += r;
            totalG += g;
            totalB += b;
            count++;

            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            if (brightness > brightestVal) {
              brightestVal = brightness;
              brightestColor = [r, g, b];
            }

            if (brightness < darkestVal) {
              darkestVal = brightness;
              darkestColor = [r, g, b];
            }
          }

          if (count === 0) {
            resolve({
              keyColor: [1, 1, 1],
              fillColor: [0.4, 0.4, 0.4],
              ambientColor: [0.2, 0.2, 0.2]
            });
            return;
          }

          const ambientColor: [number, number, number] = [
            (totalR / count) / 255,
            (totalG / count) / 255,
            (totalB / count) / 255
          ];

          const keyColor: [number, number, number] = [
            brightestColor[0] / 255,
            brightestColor[1] / 255,
            brightestColor[2] / 255
          ];

          const fillColor: [number, number, number] = [
            darkestColor[0] / 255,
            darkestColor[1] / 255,
            darkestColor[2] / 255
          ];

          resolve({ keyColor, fillColor, ambientColor });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load frame image'));
      img.src = dataUrl;
    });
  }, []);

  const handleMatchLighting = useCallback(async () => {
    setError(null);
    setMatchingStatus(t('matchingLighting'));

    const fs = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('fs') : null;
    const path = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('path') : null;
    const os = (typeof window !== 'undefined' && (window as any).cep) ? (globalThis as any).require('os') : null;

    if (!fs || !path || !os) {
      setError('Node.js filesystem environment is not available to export frames.');
      setMatchingStatus('');
      return;
    }

    const tempDir = os.tmpdir();
    const tempPngPath = path.join(tempDir, `tripo4ae_match_${Date.now()}.png`);

    try {
      const res = await exportCurrentFrameToPng({ tempPath: tempPngPath });
      const parsedRes = JSON.parse(res);
      if (!parsedRes || !parsedRes.ok) {
        throw new Error(parsedRes.error || 'Failed to export frame.');
      }

      if (!fs.existsSync(tempPngPath)) {
        throw new Error('Exported PNG not found on disk.');
      }

      const dataUrl = `data:image/png;base64,${fs.readFileSync(tempPngPath).toString('base64')}`;

      try {
        fs.unlinkSync(tempPngPath);
      } catch (err) {
        console.warn('Failed to delete temp frame PNG', err);
      }

      const palette = await extractPalette(dataUrl);

      const rigResult = await createSmartMatchLightRig({
        keyColor: palette.keyColor,
        fillColor: palette.fillColor,
        ambientColor: palette.ambientColor,
        intensity: 100
      });

      const parsedRig = JSON.parse(rigResult);
      if (parsedRig && parsedRig.ok) {
        setMatchingStatus(`${t('statusSuccess')}: Created smart light rig!`);
      } else {
        throw new Error(parsedRig.error || 'Failed to construct light rig.');
      }
    } catch (e: any) {
      setError(e.message || 'Lighting match failed.');
      setMatchingStatus('');
    } finally {
      setTimeout(() => setMatchingStatus(''), 3000);
    }
  }, [exportCurrentFrameToPng, createSmartMatchLightRig, extractPalette, t]);

  const getProxyAndOriginalPaths = useCallback(() => {
    const selectedModel = modelSteps[modelStepIdx];
    if (!selectedModel || !selectedModel.taskId) return null;

    const originalTaskId = selectedModel.taskId;
    const originalRecord = models.find((m) => m.taskId === originalTaskId);
    const originalPath = originalRecord?.modelPath;

    // Scan global pipeline for a successful simplify task associated with this model
    const simplifyStep = [...pipeline].reverse().find(
      (s) =>
        s.type === 'highpoly_to_lowpoly' &&
        s.status === 'success' &&
        s.taskId &&
        (s.params as any)?.original_model_task_id === originalTaskId
    );

    let proxyPath: string | undefined = undefined;
    if (simplifyStep && simplifyStep.taskId) {
      const proxyRecord = models.find((m) => m.taskId === simplifyStep.taskId);
      proxyPath = proxyRecord?.modelPath;
    }

    return {
      originalPath,
      proxyPath,
    };
  }, [modelSteps, modelStepIdx, pipeline, models]);

  const handleToggleProxy = useCallback(async (enableProxy: boolean) => {
    setError(null);
    setProxyStatus(t('switchingProxy'));
    try {
      const paths = getProxyAndOriginalPaths();
      if (!paths || !paths.originalPath) {
        throw new Error(t('selectModelWarning'));
      }

      const targetPath = enableProxy ? paths.proxyPath : paths.originalPath;
      if (!targetPath) {
        throw new Error(enableProxy ? t('noProxyFoundWarning') : 'Original model path not found.');
      }

      const result = await toggleLayerProxy({
        targetFilePath: targetPath,
      });

      const parsed = JSON.parse(result);
      if (parsed && parsed.ok) {
        setIsProxyMode(enableProxy);
        setProxyStatus(`${t('statusSuccess')}: Swapped model source!`);
      } else {
        throw new Error(parsed.error || 'Failed to toggle proxy.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to toggle proxy.');
    } finally {
      setTimeout(() => setProxyStatus(''), 3000);
    }
  }, [toggleLayerProxy, getProxyAndOriginalPaths, t]);

  const importTaskToAe = useCallback(async (task: TripoTask, label: string) => {
    if (importedTaskIds.current.has(task.task_id)) return;
    importedTaskIds.current.add(task.task_id);
    try {
      const api = new TripoApiService(apiKey!);
      const modelUrl = api.getModelUrl(task.output ?? {});
      if (!modelUrl) return;

      const saveDir = TripoApiService.getModelSaveDir();
      const localPath = await api.downloadTaskResult(task, saveDir);

      await csInterface.importModel(localPath);

      const ext = localPath.split('.').pop()?.toUpperCase();
      const format = (ext === 'FBX' || ext === 'OBJ' || ext === 'GLTF') ? ext : 'GLB';

      const model: ModelRecord = {
        id: task.task_id,
        taskId: task.task_id,
        name: label,
        thumbnailUrl: task.output?.rendered_image,
        thumbnailPath: TripoApiService.getLocalThumbnailPath(task.task_id),
        modelPath: localPath,
        format,
        createdAt: Date.now(),
        pipelineSteps: [...useStore.getState().pipeline],
      };
      addModel(model);
    } catch {
      // Non-blocking
    }
  }, [apiKey, csInterface, addModel]);



  // Task execution
  const taskIdxRef = useRef(-1);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTaskType, setActiveTaskType] = useState<string | null>(null);
  const isRunningRef = useRef(false);

  // Clean up pollers on unmount
  React.useEffect(() => {
    return () => {
      if (pollerRef.current) {
        pollerRef.current.abort();
      }
    };
  }, []);

  const getModelTaskId = useCallback(() => {
    return modelSteps[modelStepIdx]?.taskId ?? null;
  }, [modelStepIdx, modelSteps]);

  const runTask = useCallback(async (
    type: string,
    params: Record<string, unknown>,
  ) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    const taskId = getModelTaskId();
    if (!taskId) { setError(t('selectModelWarning')); return; }

    setError(null);
    setResult(null);
    setIsRunning(true);
    setActiveTaskType(type);
    setProgress(0);
    setStatusText(t('starting'));

    try {
      if (!apiKey) throw new Error(t('failedToConnect'));
      const api = new TripoApiService(apiKey);

      const step: PipelineStep = {
        type: type as any,
        taskId: null,
        status: 'pending',
        params: params as any,
      };
      addPipelineStep(step);
      const stepIdx = useStore.getState().pipeline.length - 1;
      taskIdxRef.current = stepIdx;

      const newTaskId = await api.createTask(params as any);
      updatePipelineStep(taskIdxRef.current, { taskId: newTaskId, status: 'running' });

      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      pollerRef.current = poller;
      const res = await poller.pollUntilDone(newTaskId, {
        onProgress: (task) => {
          setProgress(task.progress);
          setStatusText(`${t(type)}... ${task.progress}%`);
          if (taskIdxRef.current >= 0) {
            updatePipelineStep(taskIdxRef.current, {
              status: task.status,
              output: task.output,
            });
          }
        },
      });

      setResult(res);
      setProgress(100);
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'success', output: res.output });
      }

      // E2E: auto-download → import AE → persist Library
      setStatusText(t('statusImportingAE'));
      await importTaskToAe(res, `${t(type)} result`);
      setStatusText(t('statusSuccess'));
    } catch (err: any) {
      if (err instanceof CancelledError) {
        return;
      }
      setError(err.message || t('statusFailed'));
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'failed' });
      }
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
      setActiveTaskType(null);
      pollerRef.current = null;
    }
  }, [apiKey, pipeline, getModelTaskId, addPipelineStep, updatePipelineStep, importTaskToAe, t]);

  // Stylize
  const [stylizeStyle, setStylizeStyle] = useState<StylizeStyle>('lego');
  const [blockSize, setBlockSize] = useState(1);

  const handleStylize = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError(t('selectModelWarning')); return; }
    runTask('stylize_model', {
      type: 'stylize_model',
      original_model_task_id: taskId,
      style: stylizeStyle,
      block_size: stylizeStyle === 'minecraft' ? blockSize : undefined,
    });
  }, [stylizeStyle, blockSize, getModelTaskId, runTask, t]);

  // Mesh editing
  const [segResult, setSegResult] = useState<TripoTask | null>(null);
  const [completePartNames, setCompletePartNames] = useState('');
  const [simplifyQuad, setSimplifyQuad] = useState(false);
  const [simplifyFaceLimit, setSimplifyFaceLimit] = useState(10000);
  const [simplifyHighpoly, setSimplifyHighpoly] = useState(false);

  const handleSegment = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    const taskId = getModelTaskId();
    if (!taskId) { setError(t('selectModelWarning')); return; }

    setError(null);
    setSegResult(null);
    setIsRunning(true);
    setActiveTaskType('mesh_segmentation');
    setProgress(0);
    setStatusText(t('statusSegmenting'));

    try {
      if (!apiKey) throw new Error(t('failedToConnect'));
      const api = new TripoApiService(apiKey);

      const step: PipelineStep = {
        type: 'mesh_segmentation',
        taskId: null,
        status: 'pending',
        params: { type: 'mesh_segmentation', original_model_task_id: taskId },
      };
      addPipelineStep(step);
      const stepIdx = useStore.getState().pipeline.length - 1;
      taskIdxRef.current = stepIdx;

      const newTaskId = await api.createTask({
        type: 'mesh_segmentation',
        original_model_task_id: taskId,
      });
      updatePipelineStep(taskIdxRef.current, { taskId: newTaskId, status: 'running' });

      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      pollerRef.current = poller;
      const res = await poller.pollUntilDone(newTaskId, {
        onProgress: (task) => {
          setProgress(task.progress);
          setStatusText(`${t('statusSegmenting')} ${task.progress}%`);
          if (taskIdxRef.current >= 0) {
            updatePipelineStep(taskIdxRef.current, { status: task.status, output: task.output });
          }
        },
      });

      setSegResult(res);
      setProgress(100);
      setStatusText(t('statusSuccess'));
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'success', output: res.output });
      }

      // E2E: auto-download → import AE → persist Library
      setStatusText(t('statusImportingAE'));
      await importTaskToAe(res, 'Segmented Model');
      setStatusText(t('statusSuccess'));
    } catch (err: any) {
      if (err instanceof CancelledError) {
        // User cancelled — do not treat as error
        return;
      }
      setError(err.message || t('statusFailed'));
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'failed' });
      }
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
      setActiveTaskType(null);
      pollerRef.current = null;
    }
  }, [apiKey, pipeline, getModelTaskId, addPipelineStep, updatePipelineStep, importTaskToAe, t]);

  const handleComplete = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError(t('selectModelWarning')); return; }
    runTask('mesh_completion', {
      type: 'mesh_completion',
      original_model_task_id: taskId,
      part_names: completePartNames.trim()
        ? completePartNames.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    });
  }, [completePartNames, getModelTaskId, runTask, t]);

  const handleSimplify = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError(t('selectModelWarning')); return; }
    runTask('highpoly_to_lowpoly', {
      type: 'highpoly_to_lowpoly',
      original_model_task_id: taskId,
      quad: simplifyQuad,
      face_limit: simplifyFaceLimit,
    });
  }, [simplifyQuad, simplifyFaceLimit, getModelTaskId, runTask, t]);

  // Convert
  const [convertFormat, setConvertFormat] = useState<ConvertFormat>('FBX');
  const [convertQuad, setConvertQuad] = useState(false);
  const [convertFaceLimit, setConvertFaceLimit] = useState<number | undefined>(undefined);
  const [convertTexSize, setConvertTexSize] = useState(2048);
  const [convertFbxPreset, setConvertFbxPreset] = useState<FbxPreset>('blender');
  const [convertWithAnim, setConvertWithAnim] = useState(false);

  const handleConvert = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError(t('selectModelWarning')); return; }
    runTask('convert_model', {
      type: 'convert_model',
      original_model_task_id: taskId,
      format: convertFormat,
      quad: convertQuad,
      face_limit: convertFaceLimit,
      texture_size: convertTexSize,
      fbx_preset: convertFormat === 'FBX' ? convertFbxPreset : undefined,
      with_animation: convertWithAnim,
    });
  }, [convertFormat, convertQuad, convertFaceLimit, convertTexSize,
    convertFbxPreset, convertWithAnim, getModelTaskId, runTask, t]);

  return (
    <div style={styles.container}>
      {/* Model Selector */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('sourceModelLabel')}</div>
        <ModelSelector
          steps={modelSteps}
          selectedIdx={modelStepIdx}
          onSelect={setModelStepIdx}
          emptyText={t('selectModelOption')}
        />
      </div>

      {/* Compositing & Matchmoving */}
      <div style={styles.sectionBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#ccc' }}>{t('matchmovingHeader')}</div>
          <button onClick={refreshTrackers} style={styles.refreshBtn}>
            🔄
          </button>
        </div>

        <label style={styles.fieldLabel}>
          {t('trackerLayerLabel')}
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={selectedTrackerIdx}
              onChange={(e) => setSelectedTrackerIdx(Number(e.target.value))}
              style={{ ...styles.select, flex: 1 }}
            >
              {trackerLayers.length === 0 ? (
                <option value="-1">{t('noTrackerLayersFound')}</option>
              ) : (
                trackerLayers.map((l) => (
                  <option key={l.index} value={l.index}>
                    {l.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </label>

        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button
            onClick={handleBindToTracker}
            disabled={selectedTrackerIdx === -1}
            style={{ ...styles.actionBtn, flex: 1 }}
          >
            {t('alignToTrackerBtn')}
          </button>
          <button
            onClick={handleCreateShadowCatcher}
            disabled={selectedTrackerIdx === -1}
            style={{ ...styles.actionBtn, flex: 1, backgroundColor: '#2e7d32' }}
          >
            {t('createShadowCatcherBtn')}
          </button>
        </div>
        {compositingStatus && (
          <div style={{ fontSize: 9, color: '#4a9eff', marginTop: 2 }}>
            {compositingStatus}
          </div>
        )}
      </div>

      {/* Intelligent Lighting Match */}
      <div style={styles.sectionBox}>
        <div style={{ ...styles.sectionTitle, color: '#ffb300', fontWeight: 'bold' }}>
          💡 {t('lightingMatchHeader')}
        </div>
        <div style={styles.hint}>
          {t('lightingMatchDesc')}
        </div>
        <button
          onClick={handleMatchLighting}
          style={{ ...styles.actionBtn, backgroundColor: '#ffb300', color: '#000', fontWeight: 'bold', marginTop: 6 }}
        >
          ✨ {t('matchLightingBtn')}
        </button>
        {matchingStatus && (
          <div style={{ fontSize: 9, color: '#ffb300', marginTop: 4 }}>
            {matchingStatus}
          </div>
        )}
      </div>

      {/* Viewport Performance Proxy */}
      <div style={styles.sectionBox}>
        <div style={{ ...styles.sectionTitle, color: '#00e676', fontWeight: 'bold' }}>
          🖥️ {t('proxyHeader')}
        </div>
        <div style={styles.hint}>
          {t('proxyDesc')}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            onClick={() => handleToggleProxy(true)}
            disabled={modelStepIdx < 0 || !getProxyAndOriginalPaths()?.proxyPath}
            style={{
              ...styles.actionBtn,
              flex: 1,
              backgroundColor: isProxyMode ? '#1b5e20' : '#2e7d32',
              opacity: (modelStepIdx < 0 || !getProxyAndOriginalPaths()?.proxyPath) ? 0.5 : 1,
            }}
          >
            {t('toggleProxyBtn')}
          </button>
          <button
            onClick={() => handleToggleProxy(false)}
            disabled={modelStepIdx < 0}
            style={{
              ...styles.actionBtn,
              flex: 1,
              backgroundColor: !isProxyMode ? '#b71c1c' : '#d32f2f',
              opacity: modelStepIdx < 0 ? 0.5 : 1,
            }}
          >
            {t('restoreOriginalBtn')}
          </button>
        </div>
        
        {proxyStatus && (
          <div style={{ fontSize: 9, color: '#00e676', marginTop: 4 }}>
            {proxyStatus}
          </div>
        )}
      </div>

      {/* Stylize */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('stylizeHeader')}</div>
        <label style={styles.fieldLabel}>
          {t('styleLabel')}
          <select value={stylizeStyle} onChange={(e) => setStylizeStyle(e.target.value as StylizeStyle)} style={styles.select}>
            {STYLIZE_STYLES.map((s) => <option key={s.value} value={s.value}>{t(s.value)}</option>)}
          </select>
        </label>
        {stylizeStyle === 'minecraft' && (
          <label style={styles.fieldLabel}>
            {t('voxelSizeLabel')}
            <input type="number" value={blockSize} onChange={(e) => setBlockSize(Number(e.target.value))} style={styles.input} min={1} />
          </label>
        )}
        <button onClick={handleStylize} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          {activeTaskType === 'stylize_model' ? t('stylize_model') : t('stylizeHeader')}
        </button>
      </div>

      {/* Mesh Editing */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('meshEditHeader')}</div>
        <button onClick={handleSegment} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          {activeTaskType === 'mesh_segmentation' ? t('mesh_segmentation') : t('segmentMeshBtn')}
        </button>

        <label style={styles.fieldLabel}>
          {t('partNamesLabel')}
          <input
            type="text" value={completePartNames} onChange={(e) => setCompletePartNames(e.target.value)}
            placeholder={t('partNamesPlaceholder')} style={styles.input}
          />
        </label>
        <button onClick={handleComplete} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          {activeTaskType === 'mesh_completion' ? t('mesh_completion') : t('completeMeshBtn')}
        </button>

        <div style={styles.subSection}>
          <div style={styles.catLabel}>{t('highpolyToLowpoly')}</div>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={simplifyQuad} onChange={(e) => setSimplifyQuad(e.target.checked)} />
            {t('quadLabel')}
          </label>
          <label style={styles.fieldLabel}>
            {t('faceLimitLabel')}
            <input type="number" value={simplifyFaceLimit} onChange={(e) => setSimplifyFaceLimit(Number(e.target.value))} style={styles.input} />
          </label>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={simplifyHighpoly} onChange={(e) => setSimplifyHighpoly(e.target.checked)} />
            {t('highpolyToLowpoly')}
          </label>
          <button onClick={handleSimplify} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
            {activeTaskType === 'highpoly_to_lowpoly' ? t('highpoly_to_lowpoly') : t('simplifyBtn')}
          </button>
        </div>
      </div>

      {/* Convert */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('convertHeader')}</div>
        <label style={styles.fieldLabel}>
          {t('formatLabel')}
          <select value={convertFormat} onChange={(e) => setConvertFormat(e.target.value as ConvertFormat)} style={styles.select}>
            {CONVERT_FORMATS.map((f) => <option key={f.value} value={f.value}>{t(f.value)}</option>)}
          </select>
        </label>

        <div style={styles.row}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={convertQuad} onChange={(e) => setConvertQuad(e.target.checked)} />
            {t('quadLabel')}
          </label>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={convertWithAnim} onChange={(e) => setConvertWithAnim(e.target.checked)} />
            {t('withAnimation')}
          </label>
        </div>

        <label style={styles.fieldLabel}>
          {t('faceLimitLabel')}
          <input
            type="number" value={convertFaceLimit ?? ''}
            onChange={(e) => setConvertFaceLimit(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={t('none')} style={styles.input}
          />
        </label>

        <label style={styles.fieldLabel}>
          {t('textureSizeLabel')}
          <input type="number" value={convertTexSize} onChange={(e) => setConvertTexSize(Number(e.target.value))} style={styles.input} />
        </label>

        {convertFormat === 'FBX' && (
          <label style={styles.fieldLabel}>
            {t('fbxPresetLabel')}
            <select value={convertFbxPreset} onChange={(e) => setConvertFbxPreset(e.target.value as FbxPreset)} style={styles.select}>
              <option value="blender">Blender</option>
              <option value="3dsmax">3ds Max</option>
              <option value="mixamo">Mixamo</option>
              <option value="bake_scale">Bake Scale</option>
            </select>
          </label>
        )}

        <button onClick={handleConvert} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          {activeTaskType === 'convert_model' ? t('convert_model') : t('convertBtn')}
        </button>
      </div>

      {/* Progress */}
      {isRunning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ProgressBar progress={progress} status={statusText} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                if (pollerRef.current) {
                  pollerRef.current.abort();
                  pollerRef.current = null;
                }
                setIsRunning(false);
                setProgress(0);
                setStatusText('');
              }}
              style={styles.cancelBtn}
            >
              {t('cancelBtn')}
            </button>
          </div>
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}

      {/* Result */}
      {result && (
        <div style={styles.resultBox}>
          <span style={styles.resultLabel}>{t('statusSuccess')}: {result.task_id.slice(0, 8)}</span>
          {result.output?.rendered_image && (
            <img src={result.output?.rendered_image} style={styles.previewImg} alt="Result" />
          )}
        </div>
      )}
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
  input: {
    padding: '3px 4px', fontSize: 10, backgroundColor: '#2a2a2a',
    border: '1px solid #444', borderRadius: 3, color: '#e0e0e0', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
  },
  actionBtn: {
    padding: '6px 0', border: 'none', borderRadius: 3,
    backgroundColor: '#4a9eff', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer',
  },
  checkLabel: {
    display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#ccc', cursor: 'pointer',
  },
  row: { display: 'flex', gap: 12 },
  catLabel: { fontSize: 9, color: '#888', fontWeight: 600, marginBottom: 2 },
  subSection: {
    display: 'flex', flexDirection: 'column', gap: 4,
    paddingTop: 6, borderTop: '1px solid #333', marginTop: 4,
  },
  error: {
    padding: '4px 6px', backgroundColor: '#3a1a1a',
    border: '1px solid #662222', borderRadius: 3, color: '#ff6b6b', fontSize: 10,
  },
  resultBox: { display: 'flex', flexDirection: 'column', gap: 4 },
  resultLabel: { fontSize: 10, color: '#4a9eff' },
  previewImg: {
    width: '100%', maxHeight: 120, objectFit: 'contain' as const,
    borderRadius: 4, border: '1px solid #444',
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
  refreshBtn: {
    padding: '2px 4px',
    backgroundColor: '#333',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 8,
  },
};
