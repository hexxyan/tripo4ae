import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import { GENERATE_STYLES, IMPORT_WORKFLOWS } from '../../../shared/constants';
import { useTranslation } from '../../hooks/useTranslation';
import type {
  ConvertModelRequest,
  TextToModelRequest,
  ImageToModelRequest,
  MultiviewToModelRequest,
  GenerateStyle,
  ImportWorkflow,
  ModelVersion,
  TextureQuality,
  GeometryQuality,
  TripoTask,
  PipelineStep,
  ModelRecord,
} from '../../../shared/types';
import { PromptInput } from '../common/PromptInput';
import { ProgressBar } from '../common/ProgressBar';
import { ParameterPanel } from '../common/ParameterPanel';
import { ImageUpload } from '../common/ImageUpload';

type InputMode = 'text' | 'image' | 'multiview';

// P1 version doesn't support quad, geometry_quality, texture_quality, style
const P1_VERSION = 'P1-20260311';
const RESUMABLE_GENERATE_TYPES = new Set([
  'text_to_model',
  'image_to_model',
  'multiview_to_model',
]);

function isP1(version: ModelVersion): boolean {
  return version === P1_VERSION;
}

// Strip unsupported params for P1
function filterParamsForVersion(
  params: Record<string, any>,
  version: ModelVersion,
): Record<string, any> {
  if (!isP1(version)) return params;
  const { quad, geometry_quality, texture_quality, style, ...rest } = params;
  return rest;
}

export function GenerateTab() {
  const apiKey = useStore((s) => s.apiKey);
  const addPipelineStep = useStore((s) => s.addPipelineStep);
  const updatePipelineStep = useStore((s) => s.updatePipelineStep);
  const models = useStore((s) => s.models);
  const upsertModel = useStore((s) => s.upsertModel);
  const pipeline = useStore((s) => s.pipeline);
  const setBalance = useStore((s) => s.setBalance);
  const csInterface = useCsInterface();
  const { t } = useTranslation();

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('text');

  // Text mode state
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState<GenerateStyle | ''>('');

  // Image mode state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageToken, setImageToken] = useState<string | null>(null);

  // Multiview mode state
  const [mvFiles, setMvFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [mvTokens, setMvTokens] = useState<(string | null)[]>([null, null, null, null]);

  // Generation params
  const [params, setParams] = useState({
    modelVersion: 'v3.1-20260211' as ModelVersion,
    faceLimit: undefined as number | undefined,
    pbr: true,
    quad: false,
    textureQuality: 'standard' as TextureQuality,
    geometryQuality: 'standard' as GeometryQuality,
    modelSeed: undefined as number | undefined,
    textureSeed: undefined as number | undefined,
  });
  const [importWorkflow, setImportWorkflow] = useState<ImportWorkflow>('advanced3d');

  // Task state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [resultTask, setResultTask] = useState<TripoTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const pipelineIdxRef = useRef<number>(-1);
  const nextStepIdx = useRef(pipeline.length);
  const resumedTaskRef = useRef<string | null>(null);
  const recoveringTaskRef = useRef<string | null>(null);
  const attemptedImportsRef = useRef<Set<string>>(new Set());

  const handleCancel = useCallback(() => {
    setIsGenerating(false);
    setIsImporting(false);
    setProgress(0);
    setStatusText('');
    setError(null);
    if (currentTaskId) {
      attemptedImportsRef.current.add(currentTaskId);
    }
    recoveringTaskRef.current = null;
    resumedTaskRef.current = null;
  }, [currentTaskId]);

  const getApi = useCallback(() => {
    if (!apiKey) throw new Error(t('failedToConnect'));
    return new TripoApiService(apiKey);
  }, [apiKey, t]);

  const getPoller = useCallback(() => {
    const api = getApi();
    return new TaskPoller({ getTask: (id) => api.getTask(id) });
  }, [getApi]);

  const getTaskPrompt = useCallback((task: TripoTask): string => {
    const taskPrompt = task.input?.prompt;
    if (typeof taskPrompt === 'string' && taskPrompt.trim()) return taskPrompt.trim();
    return prompt.trim() || 'Generated Model';
  }, [prompt]);

  const importTaskWithWorkflow = useCallback(async (
    task: TripoTask,
    workflow: ImportWorkflow,
    _pipelineIndex: number,
    forceDownload = false,
  ) => {
    setIsImporting(true);
    try {
      const api = getApi();
      let taskToDownload = task;
      let format = 'GLB';

      if (workflow === 'element3d') {
        const convertReq: ConvertModelRequest = {
          type: 'convert_model',
          original_model_task_id: task.task_id,
          format: 'OBJ',
        };
        const convertStep: PipelineStep = {
          type: 'convert_model',
          taskId: null,
          status: 'pending',
          params: convertReq,
          workflow,
        };
        const convertStepIndex = nextStepIdx.current++;
        addPipelineStep(convertStep);
        setStatusText(t('statusConverting'));
        const convertTaskId = await api.createTask(convertReq);
        updatePipelineStep(convertStepIndex, {
          taskId: convertTaskId,
          status: 'running',
          workflow,
        });
        const convertPoller = getPoller();
        taskToDownload = await convertPoller.pollUntilDone(convertTaskId, {
          interval: 2000,
          maxInterval: 5000,
          timeout: 15 * 60 * 1000,
          onProgress: (progressTask) => {
            setStatusText(`${t('statusConverting')} ${progressTask.progress}%`);
            updatePipelineStep(convertStepIndex, {
              status: progressTask.status,
              output: progressTask.output,
              workflow,
            });
          },
        });
        updatePipelineStep(convertStepIndex, {
          status: 'success',
          output: taskToDownload.output,
          workflow,
        });
        format = 'OBJ';
      } else if (workflow === 'project_only') {
        format = 'GLB';
      }

      const existingModel = models.find((model) => model.taskId === task.task_id && model.workflow === workflow);
      let localPath = existingModel?.modelPath;

      if (!localPath || forceDownload) {
        setProgress(0);
        setStatusText(workflow === 'element3d' ? `${t('statusDownloading')} (OBJ)...` : t('statusDownloading'));
        localPath = await api.downloadTaskResult(
          taskToDownload,
          TripoApiService.getModelSaveDir(),
          (bytes, total) => {
            if (total > 0) {
              const pct = Math.floor((bytes / total) * 100);
              setProgress(pct);
              setStatusText(workflow === 'element3d' ? `${t('statusDownloading')} (OBJ) ${pct}%` : `${t('statusDownloading')} ${pct}%`);
            } else {
              const mb = (bytes / 1048576).toFixed(1);
              setStatusText(workflow === 'element3d' ? `${t('statusDownloading')} (OBJ) (${mb} MB)` : `${t('statusDownloading')} (${mb} MB)`);
            }
          }
        );
      }

      const model: ModelRecord = {
        id: existingModel?.id || task.task_id,
        taskId: task.task_id,
        name: existingModel?.name || getTaskPrompt(task),
        prompt: getTaskPrompt(task),
        thumbnailUrl: task.output.rendered_image,
        modelPath: localPath,
        format,
        workflow,
        createdAt: existingModel?.createdAt || Date.now(),
        pipelineSteps: [...useStore.getState().pipeline],
      };
      upsertModel(model);

      if (workflow === 'element3d') {
        setStatusText(t('statusCreatingE3D'));
        console.log(`[Tripo4AE] setupE3D: ${localPath}`);
        await csInterface.setupE3D(localPath);
      } else {
        setStatusText(workflow === 'project_only' ? t('statusImportingProject') : t('statusImportingAE'));
        console.log(`[Tripo4AE] importModel: ${localPath} workflow=${workflow}`);
        const importResult = await csInterface.importModel(localPath, {
          addToComp: workflow !== 'project_only',
          centerInComp: workflow === 'advanced3d',
          enableTimeRemap: workflow === 'advanced3d',
        });
        console.log('[Tripo4AE] importModel result:', importResult);
      }
      setStatusText(
        workflow === 'project_only'
          ? t('importedToProject')
          : workflow === 'element3d'
            ? t('element3dReady')
            : t('importedToAe')
      );
    } // wait, handle catch block? No, try block is closed here, wait, finally is next. Let's make sure try-finally matches original
    finally {
      setIsImporting(false);
    }
  }, [addPipelineStep, csInterface, getApi, getPoller, getTaskPrompt, models, upsertModel, updatePipelineStep, t]);

  const pollGenerationTask = useCallback(async (
    taskId: string,
    pipelineIndex: number,
    resume = false,
  ) => {
    pipelineIdxRef.current = pipelineIndex;
    setCurrentTaskId(taskId);
    setError(null);
    setResultTask(null);
    setIsGenerating(true);
    setStatusText(resume ? t('generating') : t('generating'));

    try {
      const poller = getPoller();
      const result = await poller.pollUntilDone(taskId, {
        interval: 2000,
        maxInterval: 5000,
        timeout: 15 * 60 * 1000,
        onProgress: (task) => {
          setProgress(task.progress);
          setStatusText(`${t('generating')} ${task.progress}%`);
          updatePipelineStep(pipelineIndex, {
            status: task.status,
            output: task.output,
            workflow: useStore.getState().pipeline[pipelineIndex]?.workflow,
          });
        },
      });

      setResultTask(result);
      setProgress(100);
      setStatusText(t('statusSuccess'));

      try {
        const api = getApi();
        const balRes = await api.getBalance();
        setBalance(balRes.balance);
      } catch (e) {}

      updatePipelineStep(pipelineIndex, {
        status: 'success',
        output: result.output,
        workflow: useStore.getState().pipeline[pipelineIndex]?.workflow,
      });
      const workflow = useStore.getState().pipeline[pipelineIndex]?.workflow || importWorkflow;
      const existingModel = useStore.getState().models.find(
        (model) => model.taskId === result.task_id && model.workflow === workflow,
      );
      if (!existingModel) {
        try {
          await importTaskWithWorkflow(result, workflow, pipelineIndex);
        } catch (importErr: any) {
          setError(`${t('statusSuccess')}, but import failed: ${importErr.message || 'Unknown error'}`);
          setStatusText(t('statusFailed'));
        }
      }
    } catch (err: any) {
      setError(err.message || t('statusFailed'));
      setStatusText(t('statusFailed'));
      updatePipelineStep(pipelineIndex, { status: 'failed' });
    } finally {
      setIsGenerating(false);
      if (resumedTaskRef.current === taskId) {
        resumedTaskRef.current = null;
      }
    }
  }, [getApi, getPoller, importTaskWithWorkflow, importWorkflow, setBalance, updatePipelineStep, t]);

  useEffect(() => {
    if (!apiKey || isGenerating || isImporting) return;

    let index = -1;
    for (let i = pipeline.length - 1; i >= 0; i--) {
      const step = pipeline[i];
      if (
        step.taskId &&
        RESUMABLE_GENERATE_TYPES.has(step.type) &&
        (step.status === 'pending' ||
          step.status === 'queued' ||
          step.status === 'running')
      ) {
        index = i;
        break;
      }
    }
    if (index < 0) return;

    const taskId = pipeline[index].taskId;
    if (!taskId || resumedTaskRef.current === taskId) return;

    resumedTaskRef.current = taskId;
    setCurrentTaskId(taskId);
    setProgress(0);
    void pollGenerationTask(taskId, index, true);
  }, [apiKey, isGenerating, isImporting, pipeline, pollGenerationTask]);

  useEffect(() => {
    if (!apiKey || isGenerating || isImporting) return;

    let index = -1;
    for (let i = pipeline.length - 1; i >= 0; i--) {
      const step = pipeline[i];
      const workflow = step.workflow || importWorkflow;
      const existingModel = models.find(
        (model) => model.taskId === step.taskId && model.workflow === workflow,
      );
      if (
        step.taskId &&
        RESUMABLE_GENERATE_TYPES.has(step.type) &&
        step.status === 'success' &&
        !existingModel &&
        !attemptedImportsRef.current.has(step.taskId)
      ) {
        index = i;
        break;
      }
    }
    if (index < 0) return;

    const step = pipeline[index];
    const taskId = step.taskId;
    if (!taskId || recoveringTaskRef.current === taskId) return;

    attemptedImportsRef.current.add(taskId);
    recoveringTaskRef.current = taskId;
    setCurrentTaskId(taskId);
    setStatusText(t('importing'));
    void (async () => {
      try {
        const task = await getApi().getTask(taskId);
        setResultTask(task);
        await importTaskWithWorkflow(task, step.workflow || importWorkflow, index);
      } catch (recoverErr: any) {
        setError(`${t('recoveryFailed')}: ${recoverErr.message || 'Unknown error'}`);
        setStatusText(t('statusFailed'));
      } finally {
        recoveringTaskRef.current = null;
      }
    })();
  }, [apiKey, getApi, importTaskWithWorkflow, importWorkflow, isGenerating, isImporting, models, pipeline, t]);

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setError(t('failedToConnect'));
      return;
    }

    setError(null);
    setResultTask(null);
    setIsGenerating(true);
    setProgress(0);
    setStatusText(t('starting'));
    pipelineIdxRef.current = -1;

    try {
      const api = getApi();
      let taskId: string;

      // Base params — filter per version
      const baseParams = filterParamsForVersion({
        model_version: params.modelVersion,
        face_limit: params.faceLimit,
        pbr: params.pbr,
        quad: params.quad,
        texture_quality: params.textureQuality,
        geometry_quality: params.geometryQuality,
        model_seed: params.modelSeed,
        texture_seed: params.textureSeed,
        style: style || undefined,
        render_image: true,
      }, params.modelVersion);

      if (inputMode === 'text') {
        if (!prompt.trim()) {
          setError(t('promptRequired'));
          setIsGenerating(false);
          return;
        }
        const req: TextToModelRequest = {
          type: 'text_to_model',
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          ...baseParams,
        };

        const step: PipelineStep = {
          type: 'text_to_model',
          taskId: null,
          status: 'pending',
          params: req,
          workflow: importWorkflow,
        };
        pipelineIdxRef.current = nextStepIdx.current++;
        addPipelineStep(step);

        taskId = await api.createTask(req);
        updatePipelineStep(pipelineIdxRef.current, {
          taskId,
          status: 'running',
          workflow: importWorkflow,
        });
      } else if (inputMode === 'image') {
        if (!imageToken) {
          setError(t('uploadImageRequired'));
          setIsGenerating(false);
          return;
        }
        const req: ImageToModelRequest = {
          type: 'image_to_model',
          file: { type: 'image_token', file_token: imageToken },
          ...baseParams,
        };

        const step: PipelineStep = {
          type: 'image_to_model',
          taskId: null,
          status: 'pending',
          params: req,
          workflow: importWorkflow,
        };
        pipelineIdxRef.current = nextStepIdx.current++;
        addPipelineStep(step);

        taskId = await api.createTask(req);
        updatePipelineStep(pipelineIdxRef.current, {
          taskId,
          status: 'running',
          workflow: importWorkflow,
        });
      } else {
        // multiview
        const fileTokens = mvTokens.filter((t) => t !== null) as string[];
        if (fileTokens.length < 1) {
          setError(t('uploadMvRequired'));
          setIsGenerating(false);
          return;
        }
        const req: MultiviewToModelRequest = {
          type: 'multiview_to_model',
          files: fileTokens.map((t) => ({ type: 'image_token', file_token: t })),
          ...baseParams,
        };

        const step: PipelineStep = {
          type: 'multiview_to_model',
          taskId: null,
          status: 'pending',
          params: req,
          workflow: importWorkflow,
        };
        pipelineIdxRef.current = nextStepIdx.current++;
        addPipelineStep(step);

        taskId = await api.createTask(req);
        updatePipelineStep(pipelineIdxRef.current, {
          taskId,
          status: 'running',
          workflow: importWorkflow,
        });
      }

      await pollGenerationTask(taskId, pipelineIdxRef.current);
    } catch (err: any) {
      setError(err.message || t('statusFailed'));
      setStatusText(t('statusFailed'));
      if (pipelineIdxRef.current >= 0) {
        updatePipelineStep(pipelineIdxRef.current, { status: 'failed' });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    apiKey, inputMode, prompt, negativePrompt, style, imageToken, mvTokens,
    importWorkflow, params, getApi, addPipelineStep, updatePipelineStep, pollGenerationTask, t,
  ]);

  // Download model to local disk then import to AE
  const handleImport = useCallback(async () => {
    if (!resultTask) return;
    try {
      let pipelineIndex = pipelineIdxRef.current;
      if (pipelineIndex < 0) {
        pipelineIndex = pipeline.findIndex((step) => step.taskId === resultTask.task_id);
      }
      await importTaskWithWorkflow(resultTask, importWorkflow, pipelineIndex);
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setStatusText('');
    }
  }, [resultTask, importWorkflow, importTaskWithWorkflow, pipeline]);

  // Download model to local disk then import to AE with a specific workflow
  const handleImportWithSpecificWorkflow = useCallback(async (workflow: ImportWorkflow) => {
    if (!resultTask) return;
    try {
      let pipelineIndex = pipelineIdxRef.current;
      if (pipelineIndex < 0) {
        pipelineIndex = pipeline.findIndex((step) => step.taskId === resultTask.task_id);
      }
      setImportWorkflow(workflow);
      await importTaskWithWorkflow(resultTask, workflow, pipelineIndex);
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setStatusText('');
    }
  }, [resultTask, importTaskWithWorkflow, pipeline, setImportWorkflow]);

  // Upload File object via arrayBuffer — not file.name
  const handleImageUpload = useCallback(async (file: File) => {
    setImageFile(file);
    try {
      const api = getApi();
      const token = await api.uploadImage(file);
      setImageToken(token);
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    }
  }, [getApi]);

  const handleMvUpload = useCallback((index: number, file: File) => {
    const newFiles = [...mvFiles];
    newFiles[index] = file;
    setMvFiles(newFiles);

    if (apiKey) {
      const api = new TripoApiService(apiKey);
      api.uploadImage(file).then((token) => {
        const newTokens = [...mvTokens];
        newTokens[index] = token;
        setMvTokens(newTokens);
      }).catch((err) => {
        setError(err.message || 'Image upload failed');
      });
    }
  }, [apiKey, mvFiles, mvTokens]);

  const mvLabels = [t('front'), t('left'), t('back'), t('right')];

  return (
    <div style={styles.container}>
      {/* Mode Toggle */}
      <div style={styles.modeToggle}>
        {(['text', 'image', 'multiview'] as InputMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setInputMode(mode)}
            style={inputMode === mode ? styles.modeBtnActive : styles.modeBtn}
          >
            {mode === 'text' ? t('modeText') : mode === 'image' ? t('modeImage') : t('modeMultiview')}
          </button>
        ))}
      </div>

      {/* Text Mode */}
      {inputMode === 'text' && (
        <div style={styles.section}>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            negativeValue={negativePrompt}
            onNegativeChange={setNegativePrompt}
          />
          {!isP1(params.modelVersion) && (
            <label style={styles.fieldLabel}>
              {t('styleLabel')}
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as GenerateStyle | '')}
                style={styles.select}
              >
                <option value="">{t('none')}</option>
                {GENERATE_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{t(s.value) || s.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Image Mode */}
      {inputMode === 'image' && (
        <div style={styles.section}>
          <ImageUpload onFileSelected={handleImageUpload} />
        </div>
      )}

      {/* Multiview Mode */}
      {inputMode === 'multiview' && (
        <div style={styles.section}>
          <div style={styles.mvGrid}>
            {mvLabels.map((label, i) => (
              <div key={label} style={styles.mvSlot}>
                <span style={styles.mvLabel}>{label}</span>
                <ImageUpload
                  compact
                  onFileSelected={(file) => handleMvUpload(i, file)}
                />
              </div>
            ))}
          </div>
          <div style={styles.buttonRow}>
            <button
              onClick={() => {
                setError('Multiview image generation requires a source image');
              }}
              style={styles.secondaryBtn}
              disabled
            >
              {t('generateViews')}
            </button>
            <button
              onClick={() => {
                setError('Multiview image editing requires an existing task');
              }}
              style={styles.secondaryBtn}
              disabled
            >
              {t('editViews')}
            </button>
          </div>
        </div>
      )}

      {/* Parameters */}
      <ParameterPanel params={params} onChange={(p) => setParams((prev) => ({ ...prev, ...p }))} />

      <label style={styles.fieldLabel}>
        {t('importWorkflowLabel')}
        <select
          value={importWorkflow}
          onChange={(e) => setImportWorkflow(e.target.value as ImportWorkflow)}
          style={styles.select}
        >
          {IMPORT_WORKFLOWS.map((workflow) => (
            <option key={workflow.value} value={workflow.value}>
              {t(workflow.value)} — {t(workflow.value + 'Desc', workflow.description)}
            </option>
          ))}
        </select>
      </label>

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Progress */}
      {(isGenerating || isImporting) && (
        <div style={styles.section}>
          <ProgressBar progress={progress} status={statusText} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            {currentTaskId ? (
              <div style={styles.taskMeta}>{t('task')}: {currentTaskId.slice(0, 8)}...</div>
            ) : <div />}
            <button
              onClick={handleCancel}
              style={styles.cancelBtn}
            >
              {t('cancelBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Result Preview */}
      {resultTask && (
        <div style={styles.section}>
          <div style={styles.previewHeader}>{t('resultHeader')}</div>
          {resultTask.output?.rendered_image && (
            <img
              src={resultTask.output.rendered_image}
              style={styles.previewImg}
              alt="Generated model preview"
            />
          )}
          <div style={styles.modelInfo}>
            <span>{t('task')}: {resultTask.task_id.slice(0, 8)}...</span>
            <span>{t('current')}: {t(importWorkflow)}</span>
          </div>
          <div style={styles.importActions}>
            <span style={{ fontSize: 9, color: '#aaa', margin: '2px 0' }}>{t('reImportTitle')}</span>
            <div style={styles.importSubRow}>
              <button
                onClick={() => handleImportWithSpecificWorkflow('advanced3d')}
                disabled={isImporting}
                style={importWorkflow === 'advanced3d' ? styles.activeImportSubBtn : styles.importSubBtn}
                title={t('advanced3dDesc')}
              >
                {t('aeNative')}
              </button>
              <button
                onClick={() => handleImportWithSpecificWorkflow('project_only')}
                disabled={isImporting}
                style={importWorkflow === 'project_only' ? styles.activeImportSubBtn : styles.importSubBtn}
                title={t('project_onlyDesc')}
              >
                {t('projectOnly')}
              </button>
              <button
                onClick={() => handleImportWithSpecificWorkflow('element3d')}
                disabled={isImporting}
                style={importWorkflow === 'element3d' ? styles.activeImportSubBtn : styles.importSubBtn}
                title={t('element3dDesc')}
              >
                {t('element3d')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div style={styles.bottomBar}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isImporting || !apiKey}
          style={
            isGenerating || isImporting || !apiKey
              ? styles.generateBtnDisabled
              : styles.generateBtn
          }
        >
          {isGenerating ? t('generating') : t('generateBtn')}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 10,
  },
  modeToggle: {
    display: 'flex',
    gap: 4,
    paddingBottom: 6,
    borderBottom: '1px solid #333',
  },
  modeBtn: {
    flex: 1,
    padding: '5px 0',
    border: '1px solid #444',
    borderRadius: 3,
    backgroundColor: '#3d3d3d',
    color: '#aaa',
    fontSize: 10,
    cursor: 'pointer',
  },
  modeBtnActive: {
    flex: 1,
    padding: '5px 0',
    border: '1px solid #4a9eff',
    borderRadius: 3,
    backgroundColor: '#2a3a4f',
    color: '#4a9eff',
    fontSize: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    fontSize: 10,
    color: '#aaa',
  },
  select: {
    padding: '4px 6px',
    fontSize: 10,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    outline: 'none',
  },
  mvGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  mvSlot: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  mvLabel: {
    fontSize: 9,
    color: '#888',
  },
  buttonRow: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    padding: '5px 0',
    border: '1px solid #444',
    borderRadius: 3,
    backgroundColor: '#3d3d3d',
    color: '#666',
    fontSize: 9,
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  error: {
    padding: '6px 8px',
    backgroundColor: '#3a1a1a',
    border: '1px solid #662222',
    borderRadius: 3,
    color: '#ff6b6b',
    fontSize: 10,
  },
  previewHeader: {
    fontSize: 11,
    fontWeight: 600,
    color: '#ccc',
    marginTop: 4,
  },
  previewImg: {
    width: '100%',
    maxHeight: 140,
    objectFit: 'contain' as const,
    borderRadius: 4,
    border: '1px solid #444',
  },
  modelInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#888',
  },
  taskMeta: {
    fontSize: 9,
    color: '#888',
    wordBreak: 'break-all',
  },
  importBtn: {
    padding: '6px 0',
    border: '1px solid #4a9eff',
    borderRadius: 3,
    backgroundColor: '#2a3a4f',
    color: '#4a9eff',
    fontSize: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  importActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 4,
  },
  importSubRow: {
    display: 'flex',
    gap: 4,
  },
  importSubBtn: {
    flex: 1,
    padding: '5px 0',
    border: '1px solid #444',
    borderRadius: 3,
    backgroundColor: '#3d3d3d',
    color: '#aaa',
    fontSize: 9,
    cursor: 'pointer',
    textAlign: 'center',
  },
  activeImportSubBtn: {
    flex: 1,
    padding: '5px 0',
    border: '1px solid #4a9eff',
    borderRadius: 3,
    backgroundColor: '#2a3a4f',
    color: '#4a9eff',
    fontSize: 9,
    cursor: 'pointer',
    fontWeight: 600,
    textAlign: 'center',
  },
  bottomBar: {
    paddingTop: 6,
    borderTop: '1px solid #333',
    marginTop: 4,
  },
  generateBtn: {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    borderRadius: 4,
    backgroundColor: '#4a9eff',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  generateBtnDisabled: {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    borderRadius: 4,
    backgroundColor: '#333',
    color: '#666',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'not-allowed',
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
};
