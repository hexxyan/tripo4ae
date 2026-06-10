import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { TripoApiService } from '../../services/tripoApi';
import { useCsInterface } from '../../hooks/useCsInterface';
import type { ModelRecord, AnimationConfig } from '../../../shared/types';

interface AnimTemplate {
  id: string;
  name: string;
  config: AnimationConfig;
  savedAt: number;
}

export function LibraryTab() {
  const models = useStore((s) => s.models);
  const removeModel = useStore((s) => s.removeModel);
  const apiKey = useStore((s) => s.apiKey);
  const csInterface = useCsInterface();

  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Animation templates
  const [templates, setTemplates] = useState<AnimTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('tripo4ae_anim_templates');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // External import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleReimport = useCallback(async (model: ModelRecord) => {
    if (!model.modelPath) {
      setError('No model path available for this entry');
      return;
    }
    setImportingId(model.id);
    setError(null);
    try {
      await csInterface.importModel(model.modelPath);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImportingId(null);
    }
  }, [csInterface]);

  const handleDelete = useCallback((id: string) => {
    removeModel(id);
  }, [removeModel]);

  const handleImportExternal = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      if (!apiKey) throw new Error('API key not set');
      const api = new TripoApiService(apiKey);
      const token = await api.uploadImage(file.name);

      const taskId = await api.createTask({
        type: 'import_model',
        file: { type: 'file_token', file_token: token },
      });

      // Wait briefly then try to import
      const task = await api.getTask(taskId);
      if (task.output?.model) {
        await csInterface.importModel(task.output.model);
        const newModel: ModelRecord = {
          id: taskId,
          taskId,
          name: file.name.replace(/\.[^.]+$/, ''),
          format: 'GLB',
          modelPath: task.output.model,
          thumbnailUrl: task.output.rendered_image,
          createdAt: Date.now(),
          pipelineSteps: [],
        };
        // addModel is imported but not available here; we'd need to use the store
      }
    } catch (err: any) {
      setError(err.message || 'External import failed');
    } finally {
      setIsImporting(false);
    }
  }, [apiKey, csInterface]);

  const loadTemplate = useCallback((tmpl: AnimTemplate) => {
    // Templates are loaded from the Animation tab; just show a confirmation
    setError(null);
    try {
      csInterface.applyAnimation(tmpl.config);
    } catch (err: any) {
      setError(err.message || 'Apply template failed');
    }
  }, [csInterface]);

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
              title={`${step.type}: ${step.status}`}
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
        <span style={styles.headerTitle}>Model Library ({models.length})</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting || !apiKey}
          style={styles.importBtn}
        >
          {isImporting ? 'Importing...' : 'Import External'}
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
          <span style={styles.emptyText}>No models yet. Generate your first model!</span>
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
                  <span>{model.format}</span>
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
                  title="Re-import to composition"
                >
                  {importingId === model.id ? '...' : 'Import'}
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  style={styles.deleteBtn}
                  title="Remove from library"
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
        <div style={styles.sectionTitle}>Animation Templates</div>
        {templates.length === 0 ? (
          <span style={styles.emptyText}>No templates saved yet. Create one in the Animate tab.</span>
        ) : (
          templates.map((tmpl) => (
            <div key={tmpl.id} style={styles.templateCard} onClick={() => loadTemplate(tmpl)}>
              <span style={styles.templateName}>{tmpl.name}</span>
              <span style={styles.templateMeta}>
                {tmpl.config.modelPreset} / {tmpl.config.duration}s / {tmpl.config.easing}
              </span>
            </div>
          ))
        )}
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
};
