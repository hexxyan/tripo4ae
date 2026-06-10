import { useStore } from '../../src/client/stores/useStore';
import type { PipelineStep, ModelRecord, CompInfo } from '../../src/shared/types';

// Helper to reset store between tests
beforeEach(() => {
  useStore.getState().reset();
});

describe('useStore', () => {
  const sampleCompInfo: CompInfo = {
    name: 'Main Comp',
    width: 1920,
    height: 1080,
    frameRate: 30,
    duration: 10,
    durationFrames: 300,
  };

  const samplePipelineStep: PipelineStep = {
    type: 'text_to_model',
    taskId: 'task-001',
    status: 'success',
    params: {
      type: 'text_to_model',
      prompt: 'a cat',
    },
  };

  const sampleModel: ModelRecord = {
    id: 'model-001',
    taskId: 'task-001',
    name: 'Test Model',
    prompt: 'a cat',
    thumbnailUrl: 'https://example.com/thumb.png',
    modelPath: '/tmp/model.glb',
    format: 'GLTF',
    faceCount: 5000,
    createdAt: Date.now(),
    pipelineSteps: [samplePipelineStep],
  };

  // --- setApiKey ---
  it('should set and clear API key', () => {
    expect(useStore.getState().apiKey).toBeNull();
    useStore.getState().setApiKey('sk-test-key');
    expect(useStore.getState().apiKey).toBe('sk-test-key');
    useStore.getState().setApiKey(null);
    expect(useStore.getState().apiKey).toBeNull();
  });

  // --- setBalance ---
  it('should set balance', () => {
    expect(useStore.getState().balance).toBe(0);
    useStore.getState().setBalance(42.5);
    expect(useStore.getState().balance).toBe(42.5);
  });

  // --- addPipelineStep ---
  it('should add a pipeline step', () => {
    expect(useStore.getState().pipeline).toEqual([]);
    useStore.getState().addPipelineStep(samplePipelineStep);
    expect(useStore.getState().pipeline).toHaveLength(1);
    expect(useStore.getState().pipeline[0]).toEqual(samplePipelineStep);
  });

  // --- updatePipelineStep ---
  it('should update a pipeline step by index', () => {
    useStore.getState().addPipelineStep(samplePipelineStep);
    useStore.getState().updatePipelineStep(0, { status: 'failed' });
    expect(useStore.getState().pipeline[0].status).toBe('failed');
    // Other fields should remain unchanged
    expect(useStore.getState().pipeline[0].type).toBe('text_to_model');
    expect(useStore.getState().pipeline[0].taskId).toBe('task-001');
  });

  it('should not throw when updating an out-of-bounds index', () => {
    useStore.getState().addPipelineStep(samplePipelineStep);
    expect(() => {
      useStore.getState().updatePipelineStep(5, { status: 'failed' });
    }).not.toThrow();
  });

  // --- clearPipeline ---
  it('should clear pipeline', () => {
    useStore.getState().addPipelineStep(samplePipelineStep);
    useStore.getState().clearPipeline();
    expect(useStore.getState().pipeline).toEqual([]);
  });

  // --- addModel / removeModel ---
  it('should add and remove models', () => {
    expect(useStore.getState().models).toEqual([]);
    useStore.getState().addModel(sampleModel);
    expect(useStore.getState().models).toHaveLength(1);
    expect(useStore.getState().models[0].id).toBe('model-001');

    useStore.getState().removeModel('model-001');
    expect(useStore.getState().models).toEqual([]);
  });

  it('should not throw when removing a non-existent model', () => {
    useStore.getState().addModel(sampleModel);
    expect(() => {
      useStore.getState().removeModel('nonexistent');
    }).not.toThrow();
    expect(useStore.getState().models).toHaveLength(1);
  });

  // --- setCompInfo ---
  it('should set and clear comp info', () => {
    expect(useStore.getState().activeComp).toBeNull();
    useStore.getState().setCompInfo(sampleCompInfo);
    expect(useStore.getState().activeComp).toEqual(sampleCompInfo);
    useStore.getState().setCompInfo(null);
    expect(useStore.getState().activeComp).toBeNull();
  });

  // --- reset ---
  it('should reset all state to initial values', () => {
    useStore.getState().setApiKey('key');
    useStore.getState().setBalance(100);
    useStore.getState().addPipelineStep(samplePipelineStep);
    useStore.getState().addModel(sampleModel);
    useStore.getState().setCompInfo(sampleCompInfo);

    useStore.getState().reset();

    const state = useStore.getState();
    expect(state.apiKey).toBeNull();
    expect(state.balance).toBe(0);
    expect(state.pipeline).toEqual([]);
    expect(state.models).toEqual([]);
    expect(state.activeComp).toBeNull();
  });
});
