/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RigWizard } from '../../../src/client/components/RigWizard';
import { useStore } from '../../../src/client/stores/useStore';
import type { ModelRecord } from '../../../src/shared/types';

jest.mock('../../../src/client/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        rigWizardTitle: 'Rig Wizard',
        rigWizardStep1: 'Step 1',
        rigWizardStep2: 'Step 2',
        rigWizardStep3: 'Step 3',
        rigWizardStep4: 'Step 4',
        cancelBtn: 'Cancel',
        emptyLibrary: 'No models',
        closeBtn: 'Close',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('../../../src/client/hooks/useRigChain', () => ({
  useRigChain: () => ({
    runPrerigCheck: jest.fn().mockResolvedValue({ riggable: true, rigType: 'biped' }),
    executeChain: jest.fn().mockResolvedValue({ rigTaskId: 'rig-001', states: [] }),
  }),
}));

jest.mock('../../../src/client/services/tripoApi', () => ({
  TripoApiService: jest.fn().mockImplementation(() => ({
    getModelUrl: jest.fn(),
  })),
}));

const sampleModel: ModelRecord = {
  id: 'm1', taskId: 't1', name: 'Test Model',
  format: 'GLB', createdAt: Date.now(), pipelineSteps: [],
};

describe('RigWizard', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('renders all 4 step labels in header', () => {
    render(<RigWizard onClose={() => {}} />);
    expect(screen.getByText('Step 1')).toBeTruthy();
    expect(screen.getByText('Step 2')).toBeTruthy();
    expect(screen.getByText('Step 3')).toBeTruthy();
    expect(screen.getByText('Step 4')).toBeTruthy();
  });

  it('shows Cancel button that calls onClose', () => {
    const onClose = jest.fn();
    render(<RigWizard onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when no models and no initialModelId', () => {
    render(<RigWizard onClose={() => {}} />);
    expect(screen.getByText('No models')).toBeTruthy();
  });

  it('close button in header X also closes', () => {
    const onClose = jest.fn();
    render(<RigWizard onClose={onClose} />);
    const closeX = screen.getByLabelText('close');
    fireEvent.click(closeX);
    expect(onClose).toHaveBeenCalled();
  });

  it('skips to Step 2 when initialModelId matches a Library model', () => {
    useStore.getState().addModel(sampleModel);
    render(<RigWizard initialModelId="m1" onClose={() => {}} />);
    expect(screen.queryByText('No models')).toBeNull();
  });
});
