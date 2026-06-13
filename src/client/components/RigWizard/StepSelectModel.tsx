import React from 'react';
import { useStore } from '../../stores/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { ThumbnailImage } from '../common/ThumbnailImage';
import { TripoApiService } from '../../services/tripoApi';
import type { ModelRecord } from '../../../shared/types';

interface Props {
  apiKey: string | null;
  selectedModelId: string | null;
  onSelect: (model: ModelRecord) => void;
}

export function StepSelectModel({ apiKey, selectedModelId, onSelect }: Props) {
  const models = useStore((s) => s.models);
  const { t } = useTranslation();

  if (models.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 11, color: '#888' }}>{t('emptyLibrary')}</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {models.map((model) => {
        const isSelected = model.id === selectedModelId;
        return (
          <button
            key={model.id}
            onClick={() => onSelect(model)}
            style={isSelected ? styles.cardSelected : styles.card}
          >
            <div style={styles.thumb}>
              {apiKey ? (
                <ThumbnailImage
                  taskId={model.taskId}
                  thumbnailUrl={model.thumbnailUrl}
                  thumbnailPath={model.thumbnailPath}
                  api={new TripoApiService(apiKey)}
                  style={styles.thumbImg}
                  fallbackText="3D"
                />
              ) : (
                <span style={styles.thumbPlaceholder}>3D</span>
              )}
            </div>
            <div style={styles.info}>
              <div style={styles.name}>{model.name}</div>
              <div style={styles.meta}>{model.format} · {model.taskId?.slice(0, 8)}</div>
            </div>
            {isSelected && <span style={styles.check}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, minHeight: 200,
  },
  container: {
    display: 'flex', flexDirection: 'column', gap: 6,
    maxHeight: 360, overflowY: 'auto', padding: 4,
  },
  card: {
    display: 'flex', gap: 8, padding: 6, alignItems: 'center',
    border: '1px solid #333', borderRadius: 4,
    backgroundColor: '#252525', cursor: 'pointer',
    textAlign: 'left' as const,
  },
  cardSelected: {
    display: 'flex', gap: 8, padding: 6, alignItems: 'center',
    border: '1px solid #4a9eff', borderRadius: 4,
    backgroundColor: '#2a3a4f', cursor: 'pointer',
    textAlign: 'left' as const,
  },
  thumb: {
    width: 36, height: 36, flexShrink: 0,
    backgroundColor: '#333', borderRadius: 3, overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  info: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  name: {
    fontSize: 10, fontWeight: 600, color: '#e0e0e0',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meta: { fontSize: 9, color: '#777' },
  check: { color: '#4a9eff', fontSize: 14, fontWeight: 700 },
  thumbPlaceholder: { fontSize: 10, color: '#666', fontWeight: 600 },
};
