import React, { useState, useEffect } from 'react';
import { useStore } from '../../stores/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { StepSelectModel } from './StepSelectModel';
import { StepPreRigCheck } from './StepPreRigCheck';
import { StepSelectAnimation } from './StepSelectAnimation';
import { StepExecute } from './StepExecute';
import type { ModelRecord, RigType, RigCheckResult, RigWizardStep } from '../../../shared/types';

interface SelectedAnim {
  id: string;
  name: string;
}

interface Props {
  initialModelId?: string | null;
  onClose: () => void;
}

const STEP_ORDER: RigWizardStep[] = ['select-model', 'pre-rig-check', 'select-animation', 'execute'];
const STEP_LABELS = ['rigWizardStep1', 'rigWizardStep2', 'rigWizardStep3', 'rigWizardStep4'];

export function RigWizard({ initialModelId, onClose }: Props) {
  const { t } = useTranslation();
  const apiKey = useStore((s) => s.apiKey);
  const models = useStore((s) => s.models);

  const [step, setStep] = useState<RigWizardStep>('select-model');
  const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(
    initialModelId ? models.find((m) => m.id === initialModelId || m.taskId === initialModelId) ?? null : null,
  );
  const [rigCheck, setRigCheck] = useState<RigCheckResult | null>(null);
  const [selectedAnims, setSelectedAnims] = useState<SelectedAnim[]>([]);

  useEffect(() => {
    if (initialModelId && selectedModel && step === 'select-model') {
      setStep('pre-rig-check');
    }
  }, [initialModelId, selectedModel, step]);

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>{t('rigWizardTitle')}</span>
          <button aria-label="close" onClick={onClose} style={styles.closeX}>✕</button>
        </div>

        <div style={styles.steps}>
          {STEP_ORDER.map((s, i) => {
            const isCurrent = s === step;
            const isDone = i < stepIndex;
            return (
              <div key={s} style={isCurrent ? styles.stepActive : (isDone ? styles.stepDone : styles.step)}>
                <span>{t(STEP_LABELS[i])}</span>
              </div>
            );
          })}
        </div>

        <div style={styles.body}>
          {step === 'select-model' && (
            <StepSelectModel
              apiKey={apiKey}
              selectedModelId={selectedModel?.id ?? null}
              onSelect={(m) => {
                setSelectedModel(m);
                setStep('pre-rig-check');
              }}
            />
          )}

          {step === 'pre-rig-check' && selectedModel && (
            <StepPreRigCheck
              model={selectedModel}
              onComplete={(result) => {
                setRigCheck(result);
                setStep('select-animation');
              }}
              onBack={() => setStep('select-model')}
            />
          )}

          {step === 'select-animation' && rigCheck && (
            <StepSelectAnimation
              rigType={(rigCheck.rigType as RigType) || 'biped'}
              selected={selectedAnims}
              onSelectionChange={setSelectedAnims}
              onComplete={() => setStep('execute')}
              onBack={() => setStep('pre-rig-check')}
            />
          )}

          {step === 'execute' && selectedModel && rigCheck && (
            <StepExecute
              model={selectedModel}
              rigType={rigCheck.rigType}
              animations={selectedAnims}
              onClose={onClose}
            />
          )}
        </div>

        {step !== 'execute' && (
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.cancelBtn}>{t('cancelBtn')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    width: '94%', maxWidth: 560, maxHeight: '90vh',
    backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: 6,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', borderBottom: '1px solid #333', backgroundColor: '#252525',
  },
  title: { fontSize: 11, fontWeight: 600, color: '#e0e0e0' },
  closeX: {
    padding: '2px 8px', fontSize: 11, cursor: 'pointer',
    backgroundColor: 'transparent', border: 'none', color: '#888',
  },
  steps: {
    display: 'flex', gap: 2, padding: '6px 8px',
    borderBottom: '1px solid #333', backgroundColor: '#1a1a1a',
  },
  step: {
    flex: 1, padding: '4px 6px', fontSize: 9, color: '#666',
    textAlign: 'center' as const, borderBottom: '2px solid transparent',
  },
  stepActive: {
    flex: 1, padding: '4px 6px', fontSize: 9, color: '#4a9eff', fontWeight: 600,
    textAlign: 'center' as const, borderBottom: '2px solid #4a9eff',
  },
  stepDone: {
    flex: 1, padding: '4px 6px', fontSize: 9, color: '#4caf50',
    textAlign: 'center' as const, borderBottom: '2px solid #2e7d32',
  },
  body: { flex: 1, overflowY: 'auto' as const },
  footer: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '8px 12px', borderTop: '1px solid #333', backgroundColor: '#252525',
  },
  cancelBtn: {
    padding: '5px 12px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2b2b2b', border: '1px solid #555', borderRadius: 3,
    color: '#ccc',
  },
};
