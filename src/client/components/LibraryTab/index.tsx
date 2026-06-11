import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { TaskPoller } from '../../services/taskPoller';
import { useCsInterface } from '../../hooks/useCsInterface';
import { useTranslation } from '../../hooks/useTranslation';
import { IMPORT_WORKFLOWS } from '../../../shared/constants';
import type { ModelRecord, AnimTemplate } from '../../../shared/types';

export function LibraryTab() {
  const models = useStore((s) => s.models);
  const removeModel = useStore((s) => s.removeModel);
  const upsertModel = useStore((s) => s.upsertModel);
  const apiKey = useStore((s) => s.apiKey);
  const templates = useStore((s) => s.templates);
  const pipeline = useStore((s) => s.pipeline);
  const csInterface = useCsInterface();
  const { t } = useTranslation();

  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // External import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

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

      {/* Model List */}
      {models.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>-</span>
          <span style={styles.emptyText}>{t('noModels')}</span>
        </div>
      ) : (
        <div style={styles.list}>
          {models.map((model) => (
            <div key={model.id} style={styles.modelCard}>
              {/* Thumbnail */}
              <div style={styles.thumbnail}>
                {model.thumbnailUrl ? (
                  <img src={model.thumbnailUrl} style={styles.thumbImg} alt={model.name} />
                ) : (
                  <span style={styles.thumbPlaceholder}>3D</span>
                )}
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
                      {step.output?.rendered_image ? (
                        <img src={step.output?.rendered_image} style={styles.thumbImg} alt="Thumbnail" />
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
};
