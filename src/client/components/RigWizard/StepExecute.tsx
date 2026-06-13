import React, { useEffect, useState, useRef } from 'react';
import { useRigChain } from '../../hooks/useRigChain';
import { useTranslation } from '../../hooks/useTranslation';
import type { ModelRecord, RigType, AnimationExecutionState } from '../../../shared/types';

interface SelectedAnim {
  id: string;
  name: string;
}

interface Props {
  model: ModelRecord;
  rigType: RigType;
  animations: SelectedAnim[];
  onClose: () => void;
}

const STATUS_ICON: Record<AnimationExecutionState['status'], string> = {
  queued: '·',
  rigging: '🦴',
  retargeting: '🎬',
  downloading: '⬇',
  importing: '📥',
  done: '✓',
  failed: '✗',
};

export function StepExecute({ model, rigType, animations, onClose }: Props) {
  const { executeChain } = useRigChain();
  const { t } = useTranslation();
  const [states, setStates] = useState<AnimationExecutionState[]>(
    animations.map((a) => ({ animationId: a.id, animationName: a.name, status: 'queued', progress: 0 })),
  );
  const [chainError, setChainError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        await executeChain({
          modelTaskId: model.taskId,
          rigType,
          animations,
          onProgress: (s) => setStates(s),
        });
      } catch (err: any) {
        setChainError(err.message || String(err));
      }
    })();
  }, [model.taskId, rigType, animations, executeChain]);

  const allDone = states.every((s) => s.status === 'done' || s.status === 'failed');
  const anyFailed = states.some((s) => s.status === 'failed');
  const successCount = states.filter((s) => s.status === 'done').length;

  return (
    <div style={styles.container}>
      <div style={styles.modelName}>{model.name}</div>
      <div style={styles.rows}>
        {states.map((s) => (
          <div key={s.animationId} style={styles.row}>
            <span style={styles.statusIcon}>{STATUS_ICON[s.status]}</span>
            <div style={styles.rowInfo}>
              <div style={styles.rowName}>{s.animationName}</div>
              <div style={styles.rowStatus}>
                {t('status' + s.status.charAt(0).toUpperCase() + s.status.slice(1))}
                {s.error ? ' · ' + s.error : ''}
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${s.progress}%`,
                    backgroundColor: s.status === 'failed' ? '#ff6b6b' : '#4a9eff',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {chainError && (
        <div style={styles.chainError}>{chainError}</div>
      )}

      {allDone && (
        <div style={styles.summary}>
          {successCount}/{states.length} {t('statusDone').toLowerCase()}
          {anyFailed && ' · ' + states.filter((s) => s.status === 'failed').length + ' ' + t('statusFailed').toLowerCase()}
        </div>
      )}

      <div style={styles.footer}>
        <button
          onClick={onClose}
          disabled={!allDone}
          style={allDone ? styles.primaryBtn : styles.primaryBtnDisabled}
        >
          {t('closeBtn')}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, minHeight: 360 },
  modelName: { fontSize: 11, fontWeight: 600, color: '#e0e0e0' },
  rows: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' as const },
  row: { display: 'flex', gap: 8, padding: 6, backgroundColor: '#252525', border: '1px solid #333', borderRadius: 3 },
  statusIcon: { fontSize: 14, width: 18, textAlign: 'center' as const },
  rowInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  rowName: { fontSize: 10, fontWeight: 600, color: '#e0e0e0' },
  rowStatus: { fontSize: 9, color: '#888' },
  progressTrack: {
    height: 3, backgroundColor: '#333', borderRadius: 2, marginTop: 2, overflow: 'hidden',
  },
  progressBar: { height: '100%', transition: 'width 0.3s' },
  chainError: {
    padding: '6px 8px', fontSize: 10, color: '#ff6b6b',
    backgroundColor: '#3a1a1a', border: '1px solid #662222', borderRadius: 3,
  },
  summary: {
    padding: '6px 8px', fontSize: 10, color: '#4caf50',
    backgroundColor: '#1b321b', border: '1px solid #2e7d32', borderRadius: 3,
  },
  footer: { display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid #333' },
  primaryBtn: {
    padding: '6px 14px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 3,
    color: '#4a9eff', fontWeight: 600,
  },
  primaryBtnDisabled: {
    padding: '6px 14px', fontSize: 10, cursor: 'not-allowed',
    backgroundColor: '#2b2b2b', border: '1px solid #444', borderRadius: 3,
    color: '#666',
  },
};
