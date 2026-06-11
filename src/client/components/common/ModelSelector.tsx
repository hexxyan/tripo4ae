import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { PipelineStep } from '../../../shared/types';

interface ModelSelectorProps {
  steps: PipelineStep[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  emptyText?: string;
}

const TASK_LABELS: Record<string, string> = {
  text_to_model: 'Text to 3D',
  image_to_model: 'Image to 3D',
  multiview_to_model: 'Multiview to 3D',
  refine_model: 'Refine',
  texture_model: 'Texture',
  animate_rig: 'Rig',
  animate_retarget: 'Animate',
  convert_model: 'Convert',
  stylize_model: 'Stylize',
  import_model: 'Import',
};

const SafeImage = ({ src, style, alt }: { src: string; style?: React.CSSProperties; alt?: string }) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <span style={{ fontSize: 9, color: '#666' }}>3D</span>;
  return <img src={src} onError={() => setFailed(true)} style={style} alt={alt} />;
};

export function ModelSelector({ steps, selectedIdx, onSelect, emptyText }: ModelSelectorProps) {
  const { t } = useTranslation();

  if (steps.length === 0) {
    return <span style={styles.empty}>{emptyText || t('noModels')}</span>;
  }

  return (
    <div style={styles.list}>
      {steps.map((step, i) => {
        const prompt = (step.params as any)?.prompt || '';
        const name = prompt
          ? (prompt.length > 28 ? prompt.substring(0, 28) + '...' : prompt)
          : TASK_LABELS[step.type] || t(step.type) || step.type;
        const thumb = step.output?.rendered_image;

        return (
          <button
            key={step.taskId || i}
            onClick={() => onSelect(i)}
            style={selectedIdx === i ? styles.itemActive : styles.item}
          >
            <div style={styles.row}>
              <div style={styles.thumb}>
                {thumb ? (
                  <SafeImage src={thumb} style={styles.thumbImg} alt="" />
                ) : (
                  <span style={styles.thumbPlaceholder}>3D</span>
                )}
              </div>
              <div style={styles.info}>
                <div style={styles.name}>{name}</div>
                <div style={styles.meta}>
                  <span>{step.taskId?.slice(0, 8)}</span>
                  <span>{TASK_LABELS[step.type] || step.type}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: { fontSize: 9, color: '#666' },
  list: {
    display: 'flex', flexDirection: 'column', gap: 3,
    maxHeight: 150, overflowY: 'auto' as const,
  },
  item: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 6px', border: '1px solid #333', borderRadius: 3,
    backgroundColor: '#252525', cursor: 'pointer', textAlign: 'left' as const,
    width: '100%',
  },
  itemActive: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 6px', border: '1px solid #4a9eff', borderRadius: 3,
    backgroundColor: '#2a3a4f', cursor: 'pointer', textAlign: 'left' as const,
    width: '100%',
  },
  row: { display: 'flex', alignItems: 'center', gap: 6, width: '100%' },
  thumb: {
    width: 28, height: 28, borderRadius: 2, flexShrink: 0,
    backgroundColor: '#333', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  thumbPlaceholder: { fontSize: 9, color: '#666' },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 10, fontWeight: 600, color: '#e0e0e0',
    whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
  },
  meta: { display: 'flex', gap: 6, fontSize: 8, color: '#777' },
};
