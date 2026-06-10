import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
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

export function TransformTab() {
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

  const modelSteps = pipeline.filter((s) => s.status === 'success' && s.taskId);
  const [modelStepIdx, setModelStepIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TripoTask | null>(null);

  // Task execution
  const taskIdxRef = useRef(-1);
  const nextStepIdx = useRef(pipeline.length);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const getModelTaskId = useCallback(() => {
    return modelSteps[modelStepIdx]?.taskId ?? null;
  }, [modelStepIdx, modelSteps]);

  const runTask = useCallback(async (
    type: string,
    params: Record<string, unknown>,
  ) => {
    const taskId = getModelTaskId();
    if (!taskId) { setError('Select a model'); return; }

    setError(null);
    setResult(null);
    setIsRunning(true);
    setProgress(0);
    setStatusText('Starting...');

    try {
      if (!apiKey) throw new Error('API key not set');
      const api = new TripoApiService(apiKey);

      const step: PipelineStep = {
        type: type as any,
        taskId: null,
        status: 'pending',
        params: params as any,
      };
      taskIdxRef.current = nextStepIdx.current++;
      addPipelineStep(step);

      const newTaskId = await api.createTask(params as any);
      updatePipelineStep(taskIdxRef.current, { taskId: newTaskId, status: 'running' });

      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      const res = await poller.pollUntilDone(newTaskId, {
        onProgress: (task) => {
          setProgress(task.progress);
          setStatusText(`${type}... ${task.progress}%`);
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
      setStatusText('Importing to AE...');
      await importTaskToAe(res, `${type} result`);
      setStatusText('Complete');
    } catch (err: any) {
      setError(err.message || 'Task failed');
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'failed' });
      }
    } finally {
      setIsRunning(false);
    }
  }, [apiKey, pipeline, getModelTaskId, addPipelineStep, updatePipelineStep, importTaskToAe]);

  // Stylize
  const [stylizeStyle, setStylizeStyle] = useState<StylizeStyle>('lego');
  const [blockSize, setBlockSize] = useState(1);

  const handleStylize = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError('Select a model'); return; }
    runTask('stylize_model', {
      type: 'stylize_model',
      original_model_task_id: taskId,
      style: stylizeStyle,
      block_size: stylizeStyle === 'minecraft' ? blockSize : undefined,
    });
  }, [stylizeStyle, blockSize, getModelTaskId, runTask]);

  // Mesh editing
  const [segResult, setSegResult] = useState<TripoTask | null>(null);
  const [completePartNames, setCompletePartNames] = useState('');
  const [simplifyQuad, setSimplifyQuad] = useState(false);
  const [simplifyFaceLimit, setSimplifyFaceLimit] = useState(10000);
  const [simplifyHighpoly, setSimplifyHighpoly] = useState(false);

  const handleSegment = useCallback(async () => {
    const taskId = getModelTaskId();
    if (!taskId) { setError('Select a model'); return; }

    setError(null);
    setSegResult(null);
    setIsRunning(true);
    setProgress(0);
    setStatusText('Segmenting...');

    try {
      if (!apiKey) throw new Error('API key not set');
      const api = new TripoApiService(apiKey);

      const step: PipelineStep = {
        type: 'mesh_segmentation',
        taskId: null,
        status: 'pending',
        params: { type: 'mesh_segmentation', original_model_task_id: taskId },
      };
      taskIdxRef.current = nextStepIdx.current++;
      addPipelineStep(step);

      const newTaskId = await api.createTask({
        type: 'mesh_segmentation',
        original_model_task_id: taskId,
      });
      updatePipelineStep(taskIdxRef.current, { taskId: newTaskId, status: 'running' });

      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      const res = await poller.pollUntilDone(newTaskId, {
        onProgress: (task) => {
          setProgress(task.progress);
          setStatusText(`Segmenting... ${task.progress}%`);
          if (taskIdxRef.current >= 0) {
            updatePipelineStep(taskIdxRef.current, { status: task.status, output: task.output });
          }
        },
      });

      setSegResult(res);
      setProgress(100);
      setStatusText('Segmentation complete');
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'success', output: res.output });
      }

      // E2E: auto-download → import AE → persist Library
      setStatusText('Importing to AE...');
      await importTaskToAe(res, 'Segmented Model');
      setStatusText('Segmentation complete');
    } catch (err: any) {
      setError(err.message);
      if (taskIdxRef.current >= 0) {
        updatePipelineStep(taskIdxRef.current, { status: 'failed' });
      }
    } finally {
      setIsRunning(false);
    }
  }, [apiKey, pipeline, getModelTaskId, addPipelineStep, updatePipelineStep]);

  const handleComplete = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError('Select a model'); return; }
    runTask('mesh_completion', {
      type: 'mesh_completion',
      original_model_task_id: taskId,
      part_names: completePartNames.trim()
        ? completePartNames.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    });
  }, [completePartNames, getModelTaskId, runTask]);

  const handleSimplify = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError('Select a model'); return; }
    if (simplifyHighpoly) {
      runTask('highpoly_to_lowpoly', {
        type: 'highpoly_to_lowpoly',
        original_model_task_id: taskId,
        quad: simplifyQuad,
        face_limit: simplifyFaceLimit,
      });
    } else {
      runTask('convert_model', {
        type: 'convert_model',
        original_model_task_id: taskId,
        format: 'GLTF',
        quad: simplifyQuad,
        face_limit: simplifyFaceLimit,
      });
    }
  }, [simplifyQuad, simplifyFaceLimit, simplifyHighpoly, getModelTaskId, runTask]);

  // Convert
  const [convertFormat, setConvertFormat] = useState<ConvertFormat>('FBX');
  const [convertQuad, setConvertQuad] = useState(false);
  const [convertFaceLimit, setConvertFaceLimit] = useState<number | undefined>(undefined);
  const [convertTexSize, setConvertTexSize] = useState(2048);
  const [convertFbxPreset, setConvertFbxPreset] = useState<FbxPreset>('blender');
  const [convertWithAnim, setConvertWithAnim] = useState(false);

  const handleConvert = useCallback(() => {
    const taskId = getModelTaskId();
    if (!taskId) { setError('Select a model'); return; }
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
    convertFbxPreset, convertWithAnim, getModelTaskId, runTask]);

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

      {/* Stylize */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>Stylize</div>
        <label style={styles.fieldLabel}>
          Style
          <select value={stylizeStyle} onChange={(e) => setStylizeStyle(e.target.value as StylizeStyle)} style={styles.select}>
            {STYLIZE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        {stylizeStyle === 'minecraft' && (
          <label style={styles.fieldLabel}>
            Block Size
            <input type="number" value={blockSize} onChange={(e) => setBlockSize(Number(e.target.value))} style={styles.input} min={1} />
          </label>
        )}
        <button onClick={handleStylize} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          Stylize
        </button>
      </div>

      {/* Mesh Editing */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>Mesh Editing</div>
        <button onClick={handleSegment} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          Segment Mesh
        </button>

        <label style={styles.fieldLabel}>
          Complete Part Names (optional, comma-separated)
          <input
            type="text" value={completePartNames} onChange={(e) => setCompletePartNames(e.target.value)}
            placeholder="body, head..." style={styles.input}
          />
        </label>
        <button onClick={handleComplete} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          Complete Mesh
        </button>

        <div style={styles.subSection}>
          <div style={styles.catLabel}>Simplify / High-to-Low Poly</div>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={simplifyQuad} onChange={(e) => setSimplifyQuad(e.target.checked)} />
            Quad
          </label>
          <label style={styles.fieldLabel}>
            Face Limit
            <input type="number" value={simplifyFaceLimit} onChange={(e) => setSimplifyFaceLimit(Number(e.target.value))} style={styles.input} />
          </label>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={simplifyHighpoly} onChange={(e) => setSimplifyHighpoly(e.target.checked)} />
            High-Poly to Low-Poly
          </label>
          <button onClick={handleSimplify} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
            Simplify
          </button>
        </div>
      </div>

      {/* Convert */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>Convert Format</div>
        <label style={styles.fieldLabel}>
          Format
          <select value={convertFormat} onChange={(e) => setConvertFormat(e.target.value as ConvertFormat)} style={styles.select}>
            {CONVERT_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>

        <div style={styles.row}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={convertQuad} onChange={(e) => setConvertQuad(e.target.checked)} />
            Quad
          </label>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={convertWithAnim} onChange={(e) => setConvertWithAnim(e.target.checked)} />
            With Animation
          </label>
        </div>

        <label style={styles.fieldLabel}>
          Face Limit (optional)
          <input
            type="number" value={convertFaceLimit ?? ''}
            onChange={(e) => setConvertFaceLimit(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Auto" style={styles.input}
          />
        </label>

        <label style={styles.fieldLabel}>
          Texture Size
          <input type="number" value={convertTexSize} onChange={(e) => setConvertTexSize(Number(e.target.value))} style={styles.input} />
        </label>

        {convertFormat === 'FBX' && (
          <label style={styles.fieldLabel}>
            FBX Preset
            <select value={convertFbxPreset} onChange={(e) => setConvertFbxPreset(e.target.value as FbxPreset)} style={styles.select}>
              <option value="blender">Blender</option>
              <option value="3dsmax">3ds Max</option>
              <option value="mixamo">Mixamo</option>
              <option value="bake_scale">Bake Scale</option>
            </select>
          </label>
        )}

        <button onClick={handleConvert} disabled={isRunning || modelStepIdx < 0} style={styles.actionBtn}>
          Convert
        </button>
      </div>

      {/* Progress */}
      {isRunning && <ProgressBar progress={progress} status={statusText} />}
      {error && <div style={styles.error}>{error}</div>}

      {/* Result */}
      {result && (
        <div style={styles.resultBox}>
          <span style={styles.resultLabel}>Task complete: {result.task_id.slice(0, 8)}</span>
          {result.output?.rendered_image && (
            <img src={result.output.rendered_image} style={styles.previewImg} alt="Result" />
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
};
