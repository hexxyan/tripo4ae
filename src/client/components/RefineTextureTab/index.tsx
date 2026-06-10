import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import { useTranslation } from '../../hooks/useTranslation';
import type {
  RefineModelRequest,
  TextureModelRequest,
  TextureQuality,
  TextureAlignment,
  TripoTask,
  PipelineStep,
  ModelRecord,
} from '../../../shared/types';
import { ProgressBar } from '../common/ProgressBar';
import { ImageUpload } from '../common/ImageUpload';
import { ModelSelector } from '../common/ModelSelector';

type TextureInputMode = 'text' | 'image' | 'style_image';

export function RefineTextureTab() {
  const apiKey = useStore((s) => s.apiKey);
  const pipeline = useStore((s) => s.pipeline);
  const addPipelineStep = useStore((s) => s.addPipelineStep);
  const updatePipelineStep = useStore((s) => s.updatePipelineStep);
  const addModel = useStore((s) => s.addModel);
  const csInterface = useCsInterface();
  const { t } = useTranslation();

  const importedTaskIds = useRef(new Set<string>());

  // Auto-import completed task: download → import AE → persist Library
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
      // Non-blocking: result is still visible in pipeline
    }
  }, [apiKey, csInterface, addModel, pipeline]);

  // Refine state
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(-1);
  const [refineProgress, setRefineProgress] = useState(0);
  const [refineStatus, setRefineStatus] = useState('');
  const [refineResult, setRefineResult] = useState<TripoTask | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const refineIdxRef = useRef<number>(-1);
  const nextStepIdx = useRef(pipeline.length);

  // Texture state
  const [texInputMode, setTexInputMode] = useState<TextureInputMode>('text');
  const [texPrompt, setTexPrompt] = useState('');
  const [texImageToken, setTexImageToken] = useState<string | null>(null);
  const [texStyleToken, setTexStyleToken] = useState<string | null>(null);
  const [texQuality, setTexQuality] = useState<TextureQuality>('standard');
  const [texPbr, setTexPbr] = useState(true);
  const [texAlignment, setTexAlignment] = useState<TextureAlignment>('geometry');
  const [texBake, setTexBake] = useState(false);
  const [texPartNames, setTexPartNames] = useState('');
  const [texModelStepIdx, setTexModelStepIdx] = useState<number>(-1);
  const [texProgress, setTexProgress] = useState(0);
  const [texStatus, setTexStatus] = useState('');
  const [texResult, setTexResult] = useState<TripoTask | null>(null);
  const [texError, setTexError] = useState<string | null>(null);
  const [isTexturing, setIsTexturing] = useState(false);
  const texIdxRef = useRef<number>(-1);

  const getApi = useCallback(() => {
    if (!apiKey) throw new Error(t('failedToConnect'));
    return new TripoApiService(apiKey);
  }, [apiKey, t]);

  const getPoller = useCallback(() => {
    const api = getApi();
    return new TaskPoller({ getTask: (id) => api.getTask(id) });
  }, [getApi]);

  // Completed model steps from pipeline
  const modelSteps = pipeline.filter(
    (s) => s.status === 'success' && s.taskId,
  );

  const getModelTaskId = (idx: number) => {
    if (idx < 0) return null;
    const filteredSteps = modelSteps;
    const step = filteredSteps[idx];
    return step?.taskId ?? null;
  };

  // --- Refine ---
  const handleRefine = useCallback(async () => {
    const taskId = getModelTaskId(selectedStepIdx);
    if (!taskId) {
      setRefineError(t('selectModelWarning'));
      return;
    }

    setRefineError(null);
    setRefineResult(null);
    setIsRefining(true);
    setRefineProgress(0);
    setRefineStatus(t('starting'));

    try {
      const api = getApi();
      const req: RefineModelRequest = {
        type: 'refine_model',
        draft_model_task_id: taskId,
      };

      const step: PipelineStep = {
        type: 'refine_model',
        taskId: null,
        status: 'pending',
        params: req,
      };
      refineIdxRef.current = nextStepIdx.current++;
      addPipelineStep(step);

      const newTaskId = await api.createTask(req);
      updatePipelineStep(refineIdxRef.current, {
        taskId: newTaskId,
        status: 'running',
      });

      const poller = getPoller();
      const result = await poller.pollUntilDone(newTaskId, {
        onProgress: (task) => {
          setRefineProgress(task.progress);
          setRefineStatus(`${t('refiningStatus')} ${task.progress}%`);
          if (refineIdxRef.current >= 0) {
            updatePipelineStep(refineIdxRef.current, {
              status: task.status,
              output: task.output,
            });
          }
        },
      });

      setRefineResult(result);
      setRefineProgress(100);
      setRefineStatus(t('statusSuccess'));
      if (refineIdxRef.current >= 0) {
        updatePipelineStep(refineIdxRef.current, {
          status: 'success',
          output: result.output,
        });
      }

      // E2E: auto-download → import AE → persist Library
      setRefineStatus(t('statusImportingAE'));
      await importTaskToAe(result, 'Refined Model');
      setRefineStatus(t('statusSuccess'));
    } catch (err: any) {
      setRefineError(err.message || t('statusFailed'));
      if (refineIdxRef.current >= 0) {
        updatePipelineStep(refineIdxRef.current, { status: 'failed' });
      }
    } finally {
      setIsRefining(false);
    }
  }, [selectedStepIdx, modelSteps, getApi, getPoller, addPipelineStep, updatePipelineStep, pipeline, importTaskToAe, t]);

  // --- Texture ---
  const handleTexture = useCallback(async () => {
    const taskId = getModelTaskId(texModelStepIdx);
    if (!taskId) {
      setTexError(t('selectModelWarning'));
      return;
    }

    setTexError(null);
    setTexResult(null);
    setIsTexturing(true);
    setTexProgress(0);
    setTexStatus(t('starting'));

    try {
      const api = getApi();
      const req: TextureModelRequest = {
        type: 'texture_model',
        original_model_task_id: taskId,
        texture: true,
        pbr: texPbr,
        texture_quality: texQuality,
        texture_alignment: texAlignment,
        bake: texBake,
        part_names: texPartNames.trim()
          ? texPartNames.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      };

      if (texInputMode === 'text' && texPrompt.trim()) {
        req.texture_prompt = { text: texPrompt.trim() };
      } else if (texInputMode === 'image' && texImageToken) {
        req.texture_prompt = { image: { type: 'image_token', file_token: texImageToken } };
      } else if (texInputMode === 'style_image' && texStyleToken) {
        req.texture_prompt = { style_image: { type: 'image_token', file_token: texStyleToken } };
      }

      const step: PipelineStep = {
        type: 'texture_model',
        taskId: null,
        status: 'pending',
        params: req,
      };
      addPipelineStep(step);
      texIdxRef.current = nextStepIdx.current++;

      const newTaskId = await api.createTask(req);
      updatePipelineStep(texIdxRef.current, {
        taskId: newTaskId,
        status: 'running',
      });

      const poller = getPoller();
      const result = await poller.pollUntilDone(newTaskId, {
        onProgress: (task) => {
          setTexProgress(task.progress);
          setTexStatus(`${t('texturingStatus')} ${task.progress}%`);
          if (texIdxRef.current >= 0) {
            updatePipelineStep(texIdxRef.current, {
              status: task.status,
              output: task.output,
            });
          }
        },
      });

      setTexResult(result);
      setTexProgress(100);
      setTexStatus(t('statusSuccess'));
      if (texIdxRef.current >= 0) {
        updatePipelineStep(texIdxRef.current, {
          status: 'success',
          output: result.output,
        });
      }

      // E2E: auto-download → import AE → persist Library
      setTexStatus(t('statusImportingAE'));
      await importTaskToAe(result, 'Textured Model');
      setTexStatus(t('statusSuccess'));
    } catch (err: any) {
      setTexError(err.message || t('statusFailed'));
      if (texIdxRef.current >= 0) {
        updatePipelineStep(texIdxRef.current, { status: 'failed' });
      }
    } finally {
      setIsTexturing(false);
    }
  }, [texModelStepIdx, texInputMode, texPrompt, texImageToken, texStyleToken,
    texQuality, texPbr, texAlignment, texBake, texPartNames,
    getApi, getPoller, addPipelineStep, updatePipelineStep, pipeline, importTaskToAe, t]);

  const renderModelSelector = (
    label: string,
    value: number,
    onChange: (idx: number) => void,
  ) => (
    <div>
      <div style={styles.fieldLabel}>{label}</div>
      <ModelSelector
        steps={modelSteps}
        selectedIdx={value}
        onSelect={onChange}
        emptyText={t('selectModelOption')}
      />
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Refine Section */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('refineBtn')}</div>
        {renderModelSelector(t('sourceModelLabel'), selectedStepIdx, setSelectedStepIdx)}
        <button
          onClick={handleRefine}
          disabled={isRefining || !apiKey || selectedStepIdx < 0}
          style={styles.actionBtn}
        >
          {isRefining ? t('refiningStatus') : t('refineBtn')}
        </button>
        {refineError && <div style={styles.error}>{refineError}</div>}
        {isRefining && <ProgressBar progress={refineProgress} status={refineStatus} />}
        {refineResult && (
          <div style={styles.resultBox}>
            <span style={styles.resultLabel}>{t('refinedReady')}</span>
            {refineResult.output?.rendered_image && (
              <img src={refineResult.output.rendered_image} style={styles.previewImg} alt="Refined" />
            )}
          </div>
        )}
      </div>

      {/* Texture Section */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionTitle}>{t('applyTextureBtn')}</div>
        {renderModelSelector(t('sourceModelLabel'), texModelStepIdx, setTexModelStepIdx)}

        {/* Texture Input Mode */}
        <div style={styles.toggleRow}>
          {(['text', 'image', 'style_image'] as TextureInputMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTexInputMode(mode)}
              style={texInputMode === mode ? styles.toggleBtnActive : styles.toggleBtn}
            >
              {mode === 'text' ? t('text') : mode === 'image' ? t('image') : t('style')}
            </button>
          ))}
        </div>

        {texInputMode === 'text' && (
          <textarea
            value={texPrompt}
            onChange={(e) => setTexPrompt(e.target.value)}
            placeholder={t('texturePromptPlaceholder')}
            style={styles.textarea}
            rows={2}
          />
        )}
        {texInputMode === 'image' && (
          <ImageUpload
            onFileSelected={async (file) => {
              try {
                const api = getApi();
                const token = await api.uploadImage(file);
                setTexImageToken(token);
              } catch (err: any) { setTexError(err.message); }
            }}
          />
        )}
        {texInputMode === 'style_image' && (
          <ImageUpload
            onFileSelected={async (file) => {
              try {
                const api = getApi();
                const token = await api.uploadImage(file);
                setTexStyleToken(token);
              } catch (err: any) { setTexError(err.message); }
            }}
          />
        )}

        {/* Texture Options */}
        <label style={styles.fieldLabel}>
          {t('textureQuality')}
          <select value={texQuality} onChange={(e) => setTexQuality(e.target.value as TextureQuality)} style={styles.select}>
            <option value="standard">{t('standard')}</option>
            <option value="detailed">{t('detailed')}</option>
            <option value="extreme">{t('extreme')}</option>
          </select>
        </label>

        <div style={styles.toggleRow}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={texPbr} onChange={(e) => setTexPbr(e.target.checked)} />
            {t('pbrLabel')}
          </label>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={texBake} onChange={(e) => setTexBake(e.target.checked)} />
            {t('bakeLabel')}
          </label>
        </div>

        <label style={styles.fieldLabel}>
          {t('alignmentLabel')}
          <select value={texAlignment} onChange={(e) => setTexAlignment(e.target.value as TextureAlignment)} style={styles.select}>
            <option value="geometry">{t('geometry')}</option>
            <option value="original_image">{t('originalImage')}</option>
          </select>
        </label>

        <label style={styles.fieldLabel}>
          {t('partNamesLabel')}
          <input
            type="text"
            value={texPartNames}
            onChange={(e) => setTexPartNames(e.target.value)}
            placeholder={t('partNamesPlaceholder')}
            style={styles.input}
          />
        </label>

        <button
          onClick={handleTexture}
          disabled={isTexturing || !apiKey || texModelStepIdx < 0}
          style={styles.actionBtn}
        >
          {isTexturing ? t('texturingStatus') : t('applyTextureBtn')}
        </button>
        {texError && <div style={styles.error}>{texError}</div>}
        {isTexturing && <ProgressBar progress={texProgress} status={texStatus} />}
        {texResult && (
          <div style={styles.resultBox}>
            <span style={styles.resultLabel}>{t('texturedReady')}</span>
            {texResult.output?.rendered_image && (
              <img src={texResult.output.rendered_image} style={styles.previewImg} alt="Textured" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 10,
  },
  sectionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 8,
    border: '1px solid #333',
    borderRadius: 4,
    backgroundColor: '#252525',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#ccc',
    paddingBottom: 4,
    borderBottom: '1px solid #333',
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    fontSize: 10,
    color: '#aaa',
  },
  select: {
    padding: '3px 4px',
    fontSize: 10,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    outline: 'none',
  },
  input: {
    padding: '3px 4px',
    fontSize: 10,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
  },
  textarea: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 11,
    lineHeight: 1.4,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  toggleRow: {
    display: 'flex',
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    padding: '4px 0',
    border: '1px solid #444',
    borderRadius: 3,
    backgroundColor: '#3d3d3d',
    color: '#aaa',
    fontSize: 9,
    cursor: 'pointer',
  },
  toggleBtnActive: {
    flex: 1,
    padding: '4px 0',
    border: '1px solid #4a9eff',
    borderRadius: 3,
    backgroundColor: '#2a3a4f',
    color: '#4a9eff',
    fontSize: 9,
    cursor: 'pointer',
    fontWeight: 600,
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#ccc',
    cursor: 'pointer',
  },
  actionBtn: {
    padding: '6px 0',
    border: 'none',
    borderRadius: 3,
    backgroundColor: '#4a9eff',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    padding: '4px 6px',
    backgroundColor: '#3a1a1a',
    border: '1px solid #662222',
    borderRadius: 3,
    color: '#ff6b6b',
    fontSize: 10,
  },
  resultBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultLabel: {
    fontSize: 10,
    color: '#4a9eff',
  },
  previewImg: {
    width: '100%',
    maxHeight: 120,
    objectFit: 'contain' as const,
    borderRadius: 4,
    border: '1px solid #444',
  },
};
