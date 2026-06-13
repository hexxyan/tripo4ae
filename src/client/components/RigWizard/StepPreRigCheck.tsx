import React, { useEffect, useState } from 'react';
import { useRigChain } from '../../hooks/useRigChain';
import { useTranslation } from '../../hooks/useTranslation';
import type { ModelRecord, RigCheckResult } from '../../../shared/types';

interface Props {
  model: ModelRecord;
  onComplete: (result: RigCheckResult) => void;
  onBack: () => void;
}

export function StepPreRigCheck({ model, onComplete, onBack }: Props) {
  const { runPrerigCheck } = useRigChain();
  const { t } = useTranslation();
  const [state, setState] = useState<'running' | 'success' | 'failed'>('running');
  const [result, setResult] = useState<RigCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await runPrerigCheck({ modelTaskId: model.taskId });
        if (!active) return;
        setResult(r);
        setState(r.riggable ? 'success' : 'failed');
      } catch (err: any) {
        if (!active) return;
        setError(err.message || String(err));
        setState('failed');
      }
    })();
    return () => { active = false; };
  }, [model.taskId, runPrerigCheck]);

  return (
    <div style={styles.container}>
      <div style={styles.modelName}>{model.name}</div>

      {state === 'running' && (
        <div style={styles.row}>
          <span style={styles.spinner}>⏳</span>
          <span style={styles.text}>{t('rigCheckRunning')}</span>
        </div>
      )}

      {state === 'success' && result && (
        <>
          <div style={styles.row}>
            <span style={{ ...styles.badge, ...styles.badgeOk }}>✓</span>
            <span style={styles.text}>
              {t('rigCheckRiggable')} <b>{result.rigType}</b>
            </span>
          </div>
          <button onClick={() => onComplete(result)} style={styles.primaryBtn}>
            {t('nextBtn')} →
          </button>
        </>
      )}

      {state === 'failed' && (
        <>
          <div style={styles.row}>
            <span style={{ ...styles.badge, ...styles.badgeFail }}>✗</span>
            <span style={styles.text}>
              {result && !result.riggable ? t('rigCheckNotRiggable') : t('rigCheckError')}
            </span>
          </div>
          {result?.message && <div style={styles.message}>{result.message}</div>}
          {error && <div style={styles.message}>{error}</div>}
          <button onClick={onBack} style={styles.secondaryBtn}>{t('backBtn')}</button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 12, padding: 12, minHeight: 200 },
  modelName: { fontSize: 11, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  spinner: { fontSize: 16 },
  text: { fontSize: 11, color: '#ccc' },
  badge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 18, height: 18, borderRadius: 9, fontSize: 11, fontWeight: 700,
  },
  badgeOk: { backgroundColor: '#1b321b', color: '#4caf50' },
  badgeFail: { backgroundColor: '#3a1a1a', color: '#ff6b6b' },
  message: {
    padding: '6px 8px', fontSize: 10, color: '#ff6b6b',
    backgroundColor: '#3a1a1a', border: '1px solid #662222', borderRadius: 3,
  },
  primaryBtn: {
    padding: '6px 14px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 3,
    color: '#4a9eff', fontWeight: 600, alignSelf: 'flex-start',
  },
  secondaryBtn: {
    padding: '6px 14px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2b2b2b', border: '1px solid #555', borderRadius: 3,
    color: '#ccc', alignSelf: 'flex-start',
  },
};
