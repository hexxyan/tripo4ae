import React, { useState } from 'react';
import {
  MODEL_VERSIONS,
  FACE_LIMIT_PRESETS,
} from '../../../shared/constants';
import type { ModelVersion, TextureQuality, GeometryQuality } from '../../../shared/types';

export interface GenerationParams {
  modelVersion: ModelVersion;
  faceLimit: number | undefined;
  pbr: boolean;
  quad: boolean;
  textureQuality: TextureQuality;
  geometryQuality: GeometryQuality;
  modelSeed: number | undefined;
  textureSeed: number | undefined;
}

interface ParameterPanelProps {
  params: GenerationParams;
  onChange: (params: Partial<GenerationParams>) => void;
}

export function ParameterPanel({ params, onChange }: ParameterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={styles.container}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={styles.header}
      >
        <span>{collapsed ? '▶' : '▼'} Parameters</span>
      </button>

      {!collapsed && (
        <div style={styles.body}>
          {/* Model Version */}
          <label style={styles.label}>
            Model Version
            <select
              value={params.modelVersion}
              onChange={(e) =>
                onChange({ modelVersion: e.target.value as ModelVersion })
              }
              style={styles.select}
            >
              {MODEL_VERSIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} — {v.description}
                </option>
              ))}
            </select>
          </label>

          {/* Face Limit */}
          <label style={styles.label}>
            Face Limit
            <div style={styles.buttonRow}>
              {FACE_LIMIT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onChange({ faceLimit: preset.value })}
                  style={
                    params.faceLimit === preset.value
                      ? styles.presetBtnActive
                      : styles.presetBtn
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </label>

          {/* Toggles row */}
          <div style={styles.toggleRow}>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={params.pbr}
                onChange={(e) => onChange({ pbr: e.target.checked })}
              />
              PBR
            </label>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={params.quad}
                onChange={(e) => onChange({ quad: e.target.checked })}
              />
              Quad
            </label>
          </div>

          {/* Texture Quality */}
          <label style={styles.label}>
            Texture Quality
            <select
              value={params.textureQuality}
              onChange={(e) =>
                onChange({ textureQuality: e.target.value as TextureQuality })
              }
              style={styles.select}
            >
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
              <option value="extreme">Extreme</option>
            </select>
          </label>

          {/* Geometry Quality */}
          <label style={styles.label}>
            Geometry Quality
            <select
              value={params.geometryQuality}
              onChange={(e) =>
                onChange({ geometryQuality: e.target.value as GeometryQuality })
              }
              style={styles.select}
            >
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>

          {/* Seeds */}
          <div style={styles.seedRow}>
            <label style={styles.seedLabel}>
              Model Seed
              <input
                type="number"
                value={params.modelSeed ?? ''}
                onChange={(e) =>
                  onChange({
                    modelSeed: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                style={styles.seedInput}
                placeholder="Random"
              />
            </label>
            <label style={styles.seedLabel}>
              Texture Seed
              <input
                type="number"
                value={params.textureSeed ?? ''}
                onChange={(e) =>
                  onChange({
                    textureSeed: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                style={styles.seedInput}
                placeholder="Random"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: '1px solid #333',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '6px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ccc',
    fontSize: 11,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontWeight: 600,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingBottom: 8,
  },
  label: {
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
  buttonRow: {
    display: 'flex',
    gap: 4,
  },
  presetBtn: {
    padding: '3px 6px',
    fontSize: 9,
    backgroundColor: '#333',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#aaa',
    cursor: 'pointer',
  },
  presetBtnActive: {
    padding: '3px 6px',
    fontSize: 9,
    backgroundColor: '#4a9eff',
    border: '1px solid #4a9eff',
    borderRadius: 3,
    color: '#fff',
    cursor: 'pointer',
  },
  toggleRow: {
    display: 'flex',
    gap: 12,
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#ccc',
    cursor: 'pointer',
  },
  seedRow: {
    display: 'flex',
    gap: 8,
  },
  seedLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
    fontSize: 10,
    color: '#aaa',
  },
  seedInput: {
    padding: '3px 4px',
    fontSize: 10,
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#e0e0e0',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
};
