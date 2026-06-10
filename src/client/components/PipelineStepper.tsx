import React from 'react';
import type { PipelineStep, TaskStatus } from '../../shared/types';

interface PipelineStepperProps {
  pipeline: PipelineStep[];
  onStepClick: (index: number) => void;
}

const STEP_LABELS: Record<string, string> = {
  text_to_model: 'Generate',
  image_to_model: 'Generate',
  multiview_to_model: 'Generate',
  generate_image: 'Image',
  text_to_image: 'Image',
  generate_multiview_image: 'MultiView',
  edit_multiview_image: 'MultiView',
  refine_model: 'Refine',
  texture_model: 'Texture',
  animate_prerigcheck: 'PreRig',
  animate_rig: 'Rig',
  animate_retarget: 'Retarget',
  convert_model: 'Convert',
  stylize_model: 'Stylize',
  mesh_segmentation: 'Segment',
  mesh_completion: 'Complete',
  highpoly_to_lowpoly: 'Hi2Lo',
  import_model: 'Import',
};

function stepIcon(status: TaskStatus | 'pending'): string {
  switch (status) {
    case 'success':
      return '✓';
    case 'running':
      return '⟳';
    case 'failed':
    case 'cancelled':
    case 'banned':
    case 'expired':
      return '✗';
    default:
      return '○';
  }
}

function stepColor(status: TaskStatus | 'pending'): string {
  switch (status) {
    case 'success':
      return '#4caf50';
    case 'running':
      return '#4a9eff';
    case 'failed':
    case 'cancelled':
    case 'banned':
    case 'expired':
      return '#f44336';
    default:
      return '#666';
  }
}

export function PipelineStepper({ pipeline, onStepClick }: PipelineStepperProps) {
  if (pipeline.length === 0) return null;

  return (
    <div style={styles.container}>
      {pipeline.map((step, i) => {
        const icon = stepIcon(step.status);
        const color = stepColor(step.status);
        const label = STEP_LABELS[step.type] || step.type;
        const isLast = i === pipeline.length - 1;

        return (
          <React.Fragment key={i}>
            <button
              onClick={() => onStepClick(i)}
              style={styles.step}
              title={`${label}: ${step.status}`}
            >
              <span style={{ ...styles.icon, color }}>{icon}</span>
              <span style={styles.label}>{label}</span>
            </button>
            {!isLast && <span style={styles.arrow}>{'→'}</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 8px',
    borderBottom: '1px solid #333',
    overflowX: 'auto',
    flexShrink: 0,
    gap: 2,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderRadius: 3,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  icon: {
    fontSize: 11,
    lineHeight: 1,
  },
  label: {
    fontSize: 9,
    color: '#aaa',
  },
  arrow: {
    color: '#555',
    fontSize: 10,
    flexShrink: 0,
  },
};
