import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import { GENERATE_STYLES } from '../../../shared/constants';
import type {
  TextToModelRequest,
  ImageToModelRequest,
  MultiviewToModelRequest,
  GenerateStyle,
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
  const addModel = useStore((s) => s.addModel);
  const pipeline = useStore((s) => s.pipeline);
  const csInterface = useCsInterface();

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

  // Task state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [resultTask, setResultTask] = useState<TripoTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pipelineIdxRef = useRef<number>(-1);

  const getApi = useCallback(() => {
    if (!apiKey) throw new Error('API key not set');
    return new TripoApiService(apiKey);
  }, [apiKey]);

  const getPoller = useCallback(() => {
    const api = getApi();
    return new TaskPoller({ getTask: (id) => api.getTask(id) });
  }, [getApi]);

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setError('Please set your API key first');
      return;
    }

    setError(null);
    setResultTask(null);
    setIsGenerating(true);
    setProgress(0);
    setStatusText('Starting...');
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
          setError('Prompt is required');
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
        };
        addPipelineStep(step);
        pipelineIdxRef.current = pipeline.length;

        taskId = await api.createTask(req);
        updatePipelineStep(pipelineIdxRef.current, {
          taskId,
          status: 'running',
        });
      } else if (inputMode === 'image') {
        if (!imageToken) {
          setError('Please upload an image');
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
        };
        addPipelineStep(step);
        pipelineIdxRef.current = pipeline.length;

        taskId = await api.createTask(req);
        updatePipelineStep(pipelineIdxRef.current, {
          taskId,
          status: 'running',
        });
      } else {
        // multiview
        const fileTokens = mvTokens.filter((t) => t !== null) as string[];
        if (fileTokens.length < 1) {
          setError('Please upload at least one view image');
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
        };
        addPipelineStep(step);
        pipelineIdxRef.current = pipeline.length;

        taskId = await api.createTask(req);
        updatePipelineStep(pipelineIdxRef.current, {
          taskId,
          status: 'running',
        });
      }

      setStatusText('Generating...');

      const poller = getPoller();
      const result = await poller.pollUntilDone(taskId, {
        onProgress: (task) => {
          setProgress(task.progress);
          setStatusText(`Generating... ${task.progress}%`);
          if (pipelineIdxRef.current >= 0) {
            updatePipelineStep(pipelineIdxRef.current, {
              status: task.status,
              output: task.output,
            });
          }
        },
      });

      setResultTask(result);
      setProgress(100);
      setStatusText('Complete');

      if (pipelineIdxRef.current >= 0) {
        updatePipelineStep(pipelineIdxRef.current, {
          status: 'success',
          output: result.output,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed');
      setStatusText('Failed');
      if (pipelineIdxRef.current >= 0) {
        updatePipelineStep(pipelineIdxRef.current, { status: 'failed' });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    apiKey, inputMode, prompt, negativePrompt, style, imageToken, mvTokens,
    params, getApi, getPoller, addPipelineStep, updatePipelineStep, pipeline,
  ]);

  // Download model to local disk then import to AE
  const handleImport = useCallback(async () => {
    if (!resultTask) return;
    try {
      const api = getApi();
      const modelUrl = api.getModelUrl(resultTask.output);
      if (!modelUrl) {
        setError('No model URL in task result');
        return;
      }

      setStatusText('Downloading model...');
      const saveDir = TripoApiService.getModelSaveDir();
      const localPath = await api.downloadTaskResult(resultTask, saveDir);

      setStatusText('Importing to AE...');
      await csInterface.importModel(localPath);

      const model: ModelRecord = {
        id: resultTask.task_id,
        taskId: resultTask.task_id,
        name: prompt || 'Generated Model',
        prompt: prompt,
        thumbnailUrl: resultTask.output.rendered_image,
        modelPath: localPath,
        format: 'GLB',
        createdAt: Date.now(),
        pipelineSteps: [...pipeline],
      };
      addModel(model);
      setStatusText('Complete');
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setStatusText('');
    }
  }, [resultTask, prompt, getApi, csInterface, addModel, pipeline]);

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

  const mvLabels = ['Front', 'Left', 'Back', 'Right'];

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
            {mode === 'text' ? 'Text' : mode === 'image' ? 'Image' : 'Multiview'}
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
              Style
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as GenerateStyle | '')}
                style={styles.select}
              >
                <option value="">None</option>
                {GENERATE_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
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
              Generate Views
            </button>
            <button
              onClick={() => {
                setError('Multiview image editing requires an existing task');
              }}
              style={styles.secondaryBtn}
              disabled
            >
              Edit Views
            </button>
          </div>
        </div>
      )}

      {/* Parameters */}
      <ParameterPanel params={params} onChange={(p) => setParams((prev) => ({ ...prev, ...p }))} />

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Progress */}
      {isGenerating && (
        <div style={styles.section}>
          <ProgressBar progress={progress} status={statusText} />
        </div>
      )}

      {/* Result Preview */}
      {resultTask && (
        <div style={styles.section}>
          <div style={styles.previewHeader}>Result</div>
          {resultTask.output?.rendered_image && (
            <img
              src={resultTask.output.rendered_image}
              style={styles.previewImg}
              alt="Generated model preview"
            />
          )}
          <div style={styles.modelInfo}>
            <span>Task: {resultTask.task_id.slice(0, 8)}...</span>
            <span>Credit: {resultTask.output?.consumed_credit ?? '-'}</span>
          </div>
          <button onClick={handleImport} style={styles.importBtn}>
            Import to AE
          </button>
        </div>
      )}

      {/* Generate Button */}
      <div style={styles.bottomBar}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !apiKey}
          style={
            isGenerating || !apiKey
              ? styles.generateBtnDisabled
              : styles.generateBtn
          }
        >
          {isGenerating ? 'Generating...' : 'Generate'}
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
};
