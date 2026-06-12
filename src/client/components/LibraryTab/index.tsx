import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import { useTranslation } from '../../hooks/useTranslation';
import { IMPORT_WORKFLOWS } from '../../../shared/constants';
import type { ModelRecord, AnimTemplate } from '../../../shared/types';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThumbnailImage } from '../common/ThumbnailImage';

export function LibraryTab() {
  const models = useStore((s) => s.models);
  const removeModel = useStore((s) => s.removeModel);
  const upsertModel = useStore((s) => s.upsertModel);
  const apiKey = useStore((s) => s.apiKey);
  const templates = useStore((s) => s.templates);
  const pipeline = useStore((s) => s.pipeline);
  const updatePipelineStep = useStore((s) => s.updatePipelineStep);
  const csInterface = useCsInterface();
  const { t } = useTranslation();

  const api = React.useMemo(() => apiKey ? new TripoApiService(apiKey) : null, [apiKey]);

  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [previewModel, setPreviewModel] = useState<ModelRecord | null>(null);

  // External import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'imported' | 'animated' | 'stylized'>('all');

  const filteredModels = models.filter((model) => {
    // 1. Search Query filter
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (model.prompt && model.prompt.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Tab Filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'imported') {
      return model.workflow !== 'project_only';
    }
    if (activeFilter === 'animated') {
      const isAnimatedName = model.name.toLowerCase().includes('animate') || model.name.toLowerCase().includes('rig');
      const hasAnimSteps = model.pipelineSteps?.some((s) => s.type.includes('animate')) || false;
      return isAnimatedName || hasAnimSteps || model.format === 'FBX';
    }
    if (activeFilter === 'stylized') {
      const isStylizedName = model.name.toLowerCase().includes('styl') || model.name.toLowerCase().includes('lego') || model.name.toLowerCase().includes('voxel');
      const hasStylSteps = model.pipelineSteps?.some((s) => s.type.includes('stylize') || s.type.includes('voxel') || s.type.includes('lego')) || false;
      return isStylizedName || hasStylSteps;
    }
    return true;
  });

  const handleReimport = useCallback(async (model: ModelRecord) => {
    if (!model.modelPath) {
      setError(t('noModelPathWarning'));
      return;
    }
    setImportingId(model.id);
    setError(null);
    console.log(`[Tripo4AE] Reimport model: path=${model.modelPath} workflow=${model.workflow}`);
    try {
      if (model.workflow === 'element3d') {
        await csInterface.setupE3D(model.modelPath);
      } else {
        const result = await csInterface.importModel(model.modelPath, {
          addToComp: model.workflow !== 'project_only',
          centerInComp: model.workflow !== 'project_only',
          enableTimeRemap: true,
          selectEmbeddedAnim: 1,
          loopAnimation: true,
        });
        console.log('[Tripo4AE] importModel result:', result);

        // Auto-configure embedded animation if present
        if (result && result.layerIndex !== undefined) {
          try {
            await csInterface.selectEmbeddedAnimation({
              layerIndex: result.layerIndex,
              animationIndex: 1,
              enableTimeRemap: true,
              loopAnimation: true,
            });
            console.log('[Tripo4AE] Auto-configured animation loop for:', model.name);
          } catch (animErr: any) {
            console.warn('[Tripo4AE] Auto-animation config skipped:', animErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error('[Tripo4AE] Reimport failed:', err);
      setError(err.message || t('statusFailed'));
    } finally {
      setImportingId(null);
    }
  }, [csInterface, t]);

  const handleDelete = useCallback((id: string) => {
    removeModel(id);
  }, [removeModel]);

  const handleImportExternal = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      if (!apiKey) throw new Error(t('failedToConnect'));
      const api = new TripoApiService(apiKey);
      const token = await api.uploadImage(file);

      const taskId = await api.createTask({
        type: 'import_model',
        file: { type: 'file_token', file_token: token },
      });

      // Poll until import_model task completes
      const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
      const task = await poller.pollUntilDone(taskId, {
        onProgress: () => {},
      });

      const modelUrl = api.getModelUrl(task.output);
      if (!modelUrl) throw new Error(t('noModelUrlError'));

      // Download to local first so the asset is preserved even if AE import fails.
      const saveDir = TripoApiService.getModelSaveDir();
      const localPath = await api.downloadTaskResult(task, saveDir);

      const newModel: ModelRecord = {
        id: taskId,
        taskId,
        name: file.name.replace(/\.[^.]+$/, ''),
        format: 'GLB',
        modelPath: localPath,
        thumbnailUrl: task.output?.rendered_image,
        thumbnailPath: TripoApiService.getLocalThumbnailPath(taskId),
        workflow: 'advanced3d',
        createdAt: Date.now(),
        pipelineSteps: [],
      };
      upsertModel(newModel);
      await csInterface.importModel(localPath, {
        enableTimeRemap: true,
        selectEmbeddedAnim: 1,
        loopAnimation: true,
      });
    } catch (err: any) {
      setError(err.message || t('externalImportFailed'));
    } finally {
      setIsImporting(false);
    }
  }, [apiKey, csInterface, t, upsertModel]);

  const getStepName = useCallback((step: any) => {
    if (step.params?.prompt) return step.params.prompt;
    const names: Record<string, string> = {
      text_to_model: 'Text to 3D',
      image_to_model: 'Image to 3D',
      multiview_to_model: 'Multiview to 3D',
      refine_model: 'Refine',
      texture_model: 'Texture',
      animate_prerigcheck: 'Rig Check',
      animate_rig: 'Rig',
      animate_retarget: 'Animate',
      convert_model: 'Convert',
      stylize_model: 'Stylize',
      generate_image: 'Gen Image',
      text_to_image: 'Text to Image',
      generate_multiview_image: 'Multiview Img',
      edit_multiview_image: 'Edit Multiview',
      mesh_segmentation: 'Segment',
      mesh_completion: 'Mesh Complete',
      highpoly_to_lowpoly: 'LOD Reduce',
      import_model: 'Import',
    };
    return names[step.type] || step.type;
  }, []);

  const handleImportTask = useCallback(async (step: any) => {
    if (!apiKey) {
      setError(t('failedToConnect'));
      return;
    }
    if (!step.taskId) return;

    setImportingId(step.taskId);
    setError(null);
    try {
      const api = new TripoApiService(apiKey);
      const task = await api.getTask(step.taskId);

      if (task.status === 'failed') {
        throw new Error(t('statusFailed'));
      }
      if (task.status !== 'success') {
        throw new Error(t('generating') || 'Model is still generating');
      }

      const workflow = step.workflow || 'advanced3d';
      const saveDir = TripoApiService.getModelSaveDir();

      setDownloadProgress(0);
      const localPath = await api.downloadTaskResult(task, saveDir, (bytes, total) => {
        if (total > 0) {
          const pct = Math.floor((bytes / total) * 100);
          setDownloadProgress(pct);
        }
      });

      const model: ModelRecord = {
        id: step.taskId,
        taskId: step.taskId,
        name: getStepName(step),
        prompt: step.params?.prompt || '',
        thumbnailUrl: task.output?.rendered_image,
        thumbnailPath: TripoApiService.getLocalThumbnailPath(step.taskId),
        modelPath: localPath,
        format: workflow === 'element3d' ? 'OBJ' : 'GLB',
        workflow,
        createdAt: Date.now(),
        pipelineSteps: [],
      };
      upsertModel(model);

      if (workflow === 'element3d') {
        await csInterface.setupE3D(localPath);
      } else {
        const importResult = await csInterface.importModel(localPath, {
          addToComp: workflow !== 'project_only',
          centerInComp: workflow !== 'project_only',
          enableTimeRemap: true,
          selectEmbeddedAnim: 1,
          loopAnimation: true,
        });

        // Auto-configure embedded animation if present
        try {
          await csInterface.selectEmbeddedAnimation({
            layerIndex: importResult?.layerIndex,
            animationIndex: 1,
            enableTimeRemap: true,
            loopAnimation: true,
          });
        } catch (animErr: any) {
          console.warn('[Tripo4AE] Auto-animation config skipped:', animErr.message);
        }
      }
    } catch (err: any) {
      setError(err.message || t('statusFailed'));
    } finally {
      setImportingId(null);
      setDownloadProgress(null);
    }
  }, [apiKey, csInterface, getStepName, t, upsertModel]);

  const loadTemplate = useCallback(async (tmpl: AnimTemplate) => {
    setError(null);
    try {
      await csInterface.applyAnimation(tmpl.config);
    } catch (err: any) {
      setError(err.message || t('statusFailed'));
    }
  }, [csInterface, t]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Pipeline step dots
  const renderPipelineDots = (steps: ModelRecord['pipelineSteps']) => {
    if (!steps || steps.length === 0) return null;
    return (
      <div style={styles.dotRow}>
        {steps.map((step, i) => {
          let color = '#666';
          if (step.status === 'success') color = '#4aff6b';
          else if (step.status === 'running') color = '#ffaa00';
          else if (step.status === 'failed') color = '#ff6b6b';
          return (
            <div
              key={i}
              style={{ ...styles.dot, backgroundColor: color }}
              title={`${t(step.type)}: ${t(step.status as any)}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>{t('libraryHeader')} ({models.length})</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting || !apiKey}
          style={styles.importBtn}
        >
          {isImporting ? t('importing') : t('importExternalBtn')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf,.fbx,.obj,.zip"
          style={{ display: 'none' }}
          onChange={handleImportExternal}
        />
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Search & Filters */}
      <div style={styles.filterSection}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          style={styles.searchInput}
        />
        <div style={styles.chipRow}>
          {(['all', 'imported', 'animated', 'stylized'] as const).map((filter) => {
            const labelKey = `filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`;
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={isActive ? styles.chipActive : styles.chip}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model List */}
      {filteredModels.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>-</span>
          <span style={styles.emptyText}>
            {searchQuery || activeFilter !== 'all'
              ? (t('language') === 'zh' ? '没有匹配的资产' : 'No matching assets found')
              : t('noModels')}
          </span>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredModels.map((model) => (
            <div key={model.id} style={styles.modelCard}>
              {/* Thumbnail */}
              <div style={styles.thumbnail}>
                <ThumbnailImage
                  taskId={model.taskId}
                  thumbnailUrl={model.thumbnailUrl}
                  thumbnailPath={model.thumbnailPath}
                  api={new TripoApiService(apiKey!)}
                  onUpdate={(newUrl, newLocalPath) => {
                    upsertModel({
                      ...model,
                      thumbnailUrl: newUrl,
                      thumbnailPath: newLocalPath,
                    });
                  }}
                  style={styles.thumbImg}
                />
              </div>

              {/* Info */}
              <div style={styles.modelInfo}>
                <div style={styles.modelName}>{model.name}</div>
                <div style={styles.modelMeta}>
                  <span>{model.taskId?.slice(0, 8)}</span>
                  <span>{model.format}</span>
                  <span>{t(model.workflow || '')}</span>
                  <span>{formatDate(model.createdAt)}</span>
                </div>
                {renderPipelineDots(model.pipelineSteps)}
              </div>

              {/* Actions */}
              <div style={styles.modelActions}>
                {model.modelPath && (
                  <button
                    onClick={() => setPreviewModel(model)}
                    style={styles.previewBtn}
                    title={t('previewBtn')}
                  >
                    👁️
                  </button>
                )}
                <button
                  onClick={() => handleReimport(model)}
                  disabled={importingId === model.id}
                  style={styles.reimportBtn}
                  title={t('importBtn')}
                >
                  {importingId === model.id ? '...' : t('importBtn')}
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  style={styles.deleteBtn}
                  title={t('deleteBtn')}
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Animation Templates */}
      <div style={styles.templateSection}>
        <div style={styles.sectionTitle}>{t('templatesSection')}</div>
        {templates.length === 0 ? (
          <span style={styles.emptyText}>{t('noTemplates')}</span>
        ) : (
          templates.map((tmpl) => (
            <div key={tmpl.id} style={styles.templateCard} onClick={() => loadTemplate(tmpl)}>
              <span style={styles.templateName}>{tmpl.name}</span>
              <span style={styles.templateMeta}>
                {t(tmpl.config.modelPreset || '')} / {tmpl.config.duration}s / {t(tmpl.config.easing || '')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Cloud Generation History */}
      <div style={styles.templateSection}>
        <div style={styles.sectionTitle}>{t('taskHistoryHeader')}</div>
        {(() => {
          const historyTasks = pipeline.filter(
            (step): step is typeof step & { taskId: string } =>
              !!step.taskId && step.status !== 'pending'
          );
          const reversedHistoryTasks = [...historyTasks].reverse();

          if (reversedHistoryTasks.length === 0) {
            return <span style={styles.emptyText}>{t('noModels')}</span>;
          }

          return (
            <div style={styles.historyList}>
              {reversedHistoryTasks.map((step) => {
                const isDownloaded = models.some((m) => m.taskId === step.taskId);
                const isDownloading = importingId === step.taskId;

                const thumbIcon: Record<string, string> = {
                  animate_rig: '🦴', animate_retarget: '🎬', animate_prerigcheck: '🔍',
                  convert_model: '📦', stylize_model: '🎨', texture_model: '🖌',
                  generate_image: '🖼', text_to_image: '🖼',
                };

                return (
                  <div key={step.taskId} style={styles.historyCard}>
                    {/* Thumbnail */}
                    <div style={styles.historyThumbnail}>
                      {step.taskId && api ? (
                        <ThumbnailImage
                          taskId={step.taskId}
                          thumbnailUrl={step.output?.rendered_image}
                          thumbnailPath={step.thumbnailPath}
                          api={api}
                          onUpdate={(newUrl, newLocalPath) => {
                            const globalPipeline = useStore.getState().pipeline;
                            const globalIndex = globalPipeline.findIndex((s) => s.taskId === step.taskId);
                            if (globalIndex !== -1) {
                              updatePipelineStep(globalIndex, {
                                output: {
                                  ...globalPipeline[globalIndex].output,
                                  rendered_image: newUrl,
                                },
                                thumbnailPath: newLocalPath,
                              });
                            }
                          }}
                          style={styles.thumbImg}
                          fallbackText={thumbIcon[step.type] || '3D'}
                        />
                      ) : step.output?.rendered_image ? (
                        <img src={step.output.rendered_image} style={styles.thumbImg} alt="Thumbnail" />
                      ) : (
                        <span style={{ fontSize: 9, color: '#888' }}>{thumbIcon[step.type] || '3D'}</span>
                      )}
                    </div>

                    {/* Details */}
                    <div style={styles.historyInfo}>
                      <div style={styles.historyName}>{getStepName(step)}</div>
                      <div style={styles.historyMeta}>
                        <span>{step.type}</span>
                        <span>{step.taskId.slice(0, 8)}...</span>
                        <span>{t(step.status || '') || step.status}</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div style={styles.historyActions}>
                      {step.status === 'success' ? (
                        isDownloaded ? (
                          <span style={styles.importedBadge}>{t('taskStatusImported')}</span>
                        ) : (
                          <button
                            onClick={() => handleImportTask(step)}
                            disabled={isDownloading}
                            style={styles.downloadBtn}
                          >
                            {isDownloading
                              ? downloadProgress !== null
                                ? `${downloadProgress}%`
                                : '...'
                              : t('taskStatusNotImported')}
                          </button>
                        )
                      ) : (
                        <span style={styles.runningBadge}>
                          {step.status === 'failed' ? t('statusFailed') : t('generating')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {previewModel && (
        <GltfPreviewModal
          modelPath={previewModel.modelPath!}
          modelName={previewModel.name}
          onClose={() => setPreviewModel(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 8, padding: 10 },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 6, borderBottom: '1px solid #333',
  },
  headerTitle: { fontSize: 11, fontWeight: 600, color: '#ccc' },
  importBtn: {
    padding: '4px 8px', fontSize: 9,
    backgroundColor: '#3d3d3d', border: '1px solid #444', borderRadius: 3,
    color: '#4a9eff', cursor: 'pointer',
  },
  error: {
    padding: '4px 6px', backgroundColor: '#3a1a1a',
    border: '1px solid #662222', borderRadius: 3, color: '#ff6b6b', fontSize: 10,
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, padding: 24, color: '#666',
  },
  emptyIcon: { fontSize: 24 },
  emptyText: { fontSize: 10, color: '#888' },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  modelCard: {
    display: 'flex', gap: 8, padding: 6,
    border: '1px solid #333', borderRadius: 4, backgroundColor: '#252525',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48, height: 48, flexShrink: 0,
    backgroundColor: '#333', borderRadius: 3, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  thumbPlaceholder: { fontSize: 14, color: '#555', fontWeight: 600 },
  modelInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  modelName: {
    fontSize: 10, fontWeight: 600, color: '#e0e0e0',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  modelMeta: { display: 'flex', gap: 6, fontSize: 9, color: '#777' },
  dotRow: { display: 'flex', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  modelActions: { display: 'flex', gap: 4, flexShrink: 0 },
  reimportBtn: {
    padding: '3px 6px', fontSize: 9,
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 3,
    color: '#4a9eff', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '3px 6px', fontSize: 9,
    backgroundColor: '#3d1a1a', border: '1px solid #662222', borderRadius: 3,
    color: '#ff6b6b', cursor: 'pointer',
  },
  templateSection: {
    borderTop: '1px solid #333', paddingTop: 8, marginTop: 4,
  },
  sectionTitle: { fontSize: 11, fontWeight: 600, color: '#ccc', marginBottom: 6 },
  templateCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 6px', backgroundColor: '#252525',
    border: '1px solid #333', borderRadius: 3, cursor: 'pointer', marginBottom: 3,
  },
  templateName: { fontSize: 10, color: '#e0e0e0' },
  templateMeta: { fontSize: 9, color: '#777' },
  historyList: { display: 'flex', flexDirection: 'column', gap: 4 },
  historyCard: {
    display: 'flex', gap: 8, padding: '4px 6px',
    border: '1px solid #333', borderRadius: 3, backgroundColor: '#252525',
    alignItems: 'center',
  },
  historyThumbnail: {
    width: 28, height: 28, flexShrink: 0,
    backgroundColor: '#333', borderRadius: 2, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  historyInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
  historyName: {
    fontSize: 9, fontWeight: 600, color: '#ccc',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  historyMeta: { display: 'flex', gap: 4, fontSize: 8, color: '#666' },
  historyActions: { display: 'flex', gap: 4, flexShrink: 0 },
  importedBadge: {
    fontSize: 8, color: '#4caf50', padding: '1px 4px',
    border: '1px solid #2e7d32', borderRadius: 2, backgroundColor: '#1b321b',
  },
  runningBadge: {
    fontSize: 8, color: '#ffaa00', padding: '1px 4px',
    border: '1px solid #332313', borderRadius: 2, backgroundColor: '#26190a',
  },
  downloadBtn: {
    padding: '2px 5px', fontSize: 8,
    backgroundColor: '#1b321b', border: '1px solid #2e7d32', borderRadius: 3,
    color: '#4caf50', cursor: 'pointer',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    marginBottom: 8,
  },
  searchInput: {
    padding: '4px 6px',
    fontSize: 10,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  chipRow: {
    display: 'flex',
    gap: 4,
  },
  chip: {
    padding: '3px 6px',
    fontSize: 9,
    backgroundColor: '#2b2b2b',
    border: '1px solid #444',
    borderRadius: 12,
    color: '#999',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s, background-color 0.15s',
  },
  chipActive: {
    padding: '3px 6px',
    fontSize: 9,
    backgroundColor: '#2a3a4f',
    border: '1px solid #4a9eff',
    borderRadius: 12,
    color: '#4a9eff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  previewBtn: {
    padding: '3px 6px',
    fontSize: 9,
    backgroundColor: '#2b2b2b',
    border: '1px solid #555',
    borderRadius: 3,
    color: '#ccc',
    cursor: 'pointer',
  },
};

interface GltfPreviewModalProps {
  modelPath: string;
  modelName: string;
  onClose: () => void;
}

export function GltfPreviewModal({ modelPath, modelName, onClose }: GltfPreviewModalProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let controls: OrbitControls | null = null;
    let animationFrameId: number | null = null;
    let blobUrl: string | null = null;

    const init = async () => {
      try {
        const fs = (typeof window !== 'undefined' && (window as any).cep)
          ? (globalThis as any).require('fs')
          : null;
        if (!fs) {
          throw new Error('Node.js fs is not available for loading local GLB files.');
        }

        if (!fs.existsSync(modelPath)) {
          throw new Error(`File does not exist: ${modelPath}`);
        }

        const buffer = fs.readFileSync(modelPath);
        const blob = new Blob([buffer], { type: 'model/gltf-binary' });
        blobUrl = URL.createObjectURL(blob);

        if (!active) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color('#1a1a1a');

        const width = mountRef.current?.clientWidth || 400;
        const height = mountRef.current?.clientHeight || 300;
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 5);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        
        if (mountRef.current) {
          mountRef.current.appendChild(renderer.domElement);
        }

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 50;
        controls.minDistance = 0.5;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const loader = new GLTFLoader();
        loader.load(
          blobUrl,
          (gltf) => {
            if (!active || !scene) return;
            const model = gltf.scene;

            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            scene.add(model);

            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);

            model.position.sub(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera!.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.5;
            camera!.position.set(0, 0, cameraZ);
            camera!.lookAt(0, 0, 0);

            if (controls) {
              controls.target.set(0, 0, 0);
              controls.update();
            }

            setLoading(false);
          },
          undefined,
          (err: any) => {
            console.error('[Tripo4AE] Loader error:', err);
            setError('GLTF loader failed: ' + (err.message || String(err)));
            setLoading(false);
          }
        );

        const animate = () => {
          if (!active) return;
          animationFrameId = requestAnimationFrame(animate);

          if (controls) controls.update();
          if (renderer && scene && camera) {
            renderer.render(scene, camera);
          }
        };
        animate();

        const handleResize = () => {
          if (!mountRef.current || !renderer || !camera) return;
          const w = mountRef.current.clientWidth;
          const h = mountRef.current.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (err: any) {
        console.error('[Tripo4AE] WebGL init error:', err);
        setError(err.message || String(err));
        setLoading(false);
      }
    };

    init();

    return () => {
      active = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      if (scene) {
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => mat.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          }
        });
      }

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }

      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [modelPath]);

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <span style={modalStyles.title}>{modelName}</span>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            {t('closeBtn')}
          </button>
        </div>
        <div style={modalStyles.viewportContainer}>
          {loading && (
            <div style={modalStyles.infoOverlay}>
              <span style={{ fontSize: 13, color: '#e0e0e0', fontWeight: 'bold' }}>⚡</span>
              <span>{t('loadingModel')}</span>
            </div>
          )}
          {error && (
            <div style={modalStyles.infoOverlay}>
              <span style={{ color: '#ff6b6b', fontSize: 11 }}>{error}</span>
            </div>
          )}
          <div ref={mountRef} style={modalStyles.viewport} />
        </div>
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 6,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #333',
    backgroundColor: '#252525',
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 320,
  },
  closeBtn: {
    padding: '4px 10px',
    fontSize: 9,
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
  },
  viewportContainer: {
    position: 'relative',
    width: '100%',
    height: 350,
    backgroundColor: '#1a1a1a',
  },
  viewport: {
    width: '100%',
    height: '100%',
  },
  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26,26,26,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    color: '#888',
    fontSize: 11,
    zIndex: 10,
  },
};
