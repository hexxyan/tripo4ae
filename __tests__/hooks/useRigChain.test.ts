/**
 * @jest-environment jsdom
 */
jest.mock('../../src/client/services/tripoApi', () => ({
  TripoApiService: jest.fn(),
  __esModule: true,
}));

// Static methods live on the class itself, not instances. Attach them after mock creation.
const { TripoApiService: TripoApiServiceCtor } = jest.requireMock('../../src/client/services/tripoApi');
(TripoApiServiceCtor as any).getModelSaveDir = jest.fn().mockReturnValue('/tmp/models');
(TripoApiServiceCtor as any).getLocalThumbnailPath = jest.fn().mockReturnValue('/tmp/thumb.png');

import { renderHook, act } from '@testing-library/react';
import { useRigChain } from '../../src/client/hooks/useRigChain';
import { useStore } from '../../src/client/stores/useStore';
import type { TripoTask } from '../../src/shared/types';

const { TripoApiService } = jest.requireMock('../../src/client/services/tripoApi');

const apiMock: any = {
  createTask: jest.fn(),
  getTask: jest.fn(),
  downloadTaskResult: jest.fn(),
  getModelUrl: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (TripoApiService as jest.Mock).mockImplementation(() => apiMock);
  useStore.getState().reset();
  useStore.getState().setApiKey('test-key');
});

function makeTask(overrides: Partial<TripoTask> = {}): TripoTask {
  return {
    task_id: 'task-' + Math.random().toString(36).slice(2, 8),
    type: 'animate_retarget',
    status: 'success',
    input: {},
    output: { model: 'https://example.com/model.glb', consumed_credit: 1 },
    progress: 100,
    create_time: Date.now(),
    ...overrides,
  };
}

describe('useRigChain', () => {
  it('runs rig once for multiple animations', async () => {
    const rigTask = makeTask({ task_id: 'rig-001', type: 'animate_rig' });
    const retargetTask1 = makeTask({ task_id: 'retarget-001' });
    const retargetTask2 = makeTask({ task_id: 'retarget-002' });

    let rigCallCount = 0;
    apiMock.createTask.mockImplementation(async (req: any) => {
      if (req.type === 'animate_rig') {
        rigCallCount++;
        return 'rig-001';
      }
      if (req.type === 'animate_retarget') {
        return req.animations?.[0]?.includes('walk') ? 'retarget-001' : 'retarget-002';
      }
      throw new Error('Unexpected task type: ' + req.type);
    });

    apiMock.getTask.mockImplementation(async (id: string) => {
      if (id === 'rig-001') return rigTask;
      if (id === 'retarget-001') return retargetTask1;
      if (id === 'retarget-002') return retargetTask2;
      throw new Error('Unknown task: ' + id);
    });

    apiMock.downloadTaskResult.mockResolvedValue('/tmp/model.glb');

    const { result } = renderHook(() => useRigChain());

    await act(async () => {
      await result.current.executeChain({
        modelTaskId: 'model-001',
        rigType: 'biped',
        animations: [
          { id: 'preset:biped:walk', name: 'Walk' },
          { id: 'preset:biped:run', name: 'Run' },
        ],
        onProgress: () => {},
      });
    });

    expect(rigCallCount).toBe(1);
    expect(apiMock.createTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animate_rig',
      original_model_task_id: 'model-001',
      rig_type: 'biped',
    }));
    expect(apiMock.createTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animate_retarget',
      original_model_task_id: 'rig-001',
      animations: ['preset:biped:walk'],
    }));
    expect(apiMock.createTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animate_retarget',
      original_model_task_id: 'rig-001',
      animations: ['preset:biped:run'],
    }));
  });

  it('adds each successful retarget to the Library store', async () => {
    apiMock.createTask.mockImplementation(async (req: any) => {
      if (req.type === 'animate_rig') return 'rig-001';
      if (req.type === 'animate_retarget') return 'retarget-' + req.animations[0];
      throw new Error('Unexpected');
    });
    apiMock.getTask.mockResolvedValue(makeTask());
    apiMock.downloadTaskResult.mockResolvedValue('/tmp/anim.glb');

    const { result } = renderHook(() => useRigChain());

    await act(async () => {
      await result.current.executeChain({
        modelTaskId: 'model-001',
        rigType: 'biped',
        animations: [{ id: 'preset:biped:walk', name: 'Walk' }],
        onProgress: () => {},
      });
    });

    const models = useStore.getState().models;
    expect(models.length).toBe(1);
    expect(models[0].name).toBe('Walk');
    expect(models[0].modelPath).toBe('/tmp/anim.glb');
  });

  it('continues other animations when one retarget fails', async () => {
    apiMock.createTask.mockImplementation(async (req: any) => {
      if (req.type === 'animate_rig') return 'rig-001';
      if (req.type === 'animate_retarget') {
        return req.animations[0] === 'preset:biped:walk' ? 'fail-task' : 'ok-task';
      }
      throw new Error('Unexpected');
    });
    apiMock.getTask.mockImplementation(async (id: string) => {
      if (id === 'fail-task') return makeTask({ task_id: id, status: 'failed', error_msg: 'nope' });
      return makeTask({ task_id: id });
    });
    apiMock.downloadTaskResult.mockResolvedValue('/tmp/anim.glb');

    const { result } = renderHook(() => useRigChain());
    const finalStates: any[] = [];

    await act(async () => {
      await result.current.executeChain({
        modelTaskId: 'model-001',
        rigType: 'biped',
        animations: [
          { id: 'preset:biped:walk', name: 'Walk' },
          { id: 'preset:biped:run', name: 'Run' },
        ],
        onProgress: (s) => finalStates.push(s.map((x: any) => ({ id: x.animationId, status: x.status }))),
      });
    });

    const finalState = finalStates[finalStates.length - 1];
    const walk = finalState.find((s: any) => s.id === 'preset:biped:walk');
    const run = finalState.find((s: any) => s.id === 'preset:biped:run');
    expect(walk.status).toBe('failed');
    expect(run.status).toBe('done');

    const models = useStore.getState().models;
    expect(models.length).toBe(1);
    expect(models[0].name).toBe('Run');
  });

  it('runPrerigCheck returns riggable=true when API confirms', async () => {
    apiMock.createTask.mockResolvedValue('prerig-001');
    apiMock.getTask.mockResolvedValue(makeTask({
      task_id: 'prerig-001',
      type: 'animate_prerigcheck',
      output: { riggable: true, rig_type: 'biped' },
    }));

    const { result } = renderHook(() => useRigChain());

    let checkResult: any;
    await act(async () => {
      checkResult = await result.current.runPrerigCheck({ modelTaskId: 'model-001' });
    });

    expect(checkResult.riggable).toBe(true);
    expect(checkResult.rigType).toBe('biped');
  });

  it('runPrerigCheck returns riggable=false with message when not riggable', async () => {
    apiMock.createTask.mockResolvedValue('prerig-002');
    apiMock.getTask.mockResolvedValue(makeTask({
      task_id: 'prerig-002',
      type: 'animate_prerigcheck',
      output: { riggable: false, rig_type: 'biped' },
      error_msg: 'Model has disconnected parts',
    }));

    const { result } = renderHook(() => useRigChain());

    let checkResult: any;
    await act(async () => {
      checkResult = await result.current.runPrerigCheck({ modelTaskId: 'model-001' });
    });

    expect(checkResult.riggable).toBe(false);
    expect(checkResult.message).toContain('disconnected');
  });
});
