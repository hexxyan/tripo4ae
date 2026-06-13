import { useCallback, useRef } from 'react';
import { TripoApiService } from '../services/tripoApi';
import { TaskPoller } from '../services/taskPoller';
import { useStore } from '../stores/useStore';
import type {
  RigType, TripoTask, ModelRecord,
  RigCheckResult, AnimationExecutionState,
} from '../../shared/types';

interface ExecuteChainParams {
  modelTaskId: string;
  rigType: RigType;
  animations: Array<{ id: string; name: string }>;
  onProgress?: (states: AnimationExecutionState[]) => void;
}

interface ExecuteChainResult {
  rigTaskId: string | null;
  states: AnimationExecutionState[];
}

interface PrerigCheckParams {
  modelTaskId: string;
}

export function useRigChain() {
  const apiKey = useStore((s) => s.apiKey);
  const upsertModel = useStore((s) => s.upsertModel);
  const apiRef = useRef<TripoApiService | null>(null);

  if (apiKey && !apiRef.current) {
    apiRef.current = new TripoApiService(apiKey);
  }
  if (!apiKey && apiRef.current) {
    apiRef.current = null;
  }

  const runPrerigCheck = useCallback(async (
    params: PrerigCheckParams,
  ): Promise<RigCheckResult> => {
    const api = apiRef.current;
    if (!api) throw new Error('API key not configured');

    const taskId = await api.createTask({
      type: 'animate_prerigcheck',
      original_model_task_id: params.modelTaskId,
    });

    const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
    const task = await poller.pollUntilDone(taskId, { onProgress: () => {} });

    const riggable = task.output?.riggable !== false;
    const rigType = (task.output?.rig_type as RigType) || 'biped';
    return {
      riggable,
      rigType,
      message: riggable
        ? undefined
        : (task.error_msg || 'Model is not riggable.'),
    };
  }, []);

  const executeChain = useCallback(async (
    params: ExecuteChainParams,
  ): Promise<ExecuteChainResult> => {
    const api = apiRef.current;
    if (!api) throw new Error('API key not configured');

    const states: AnimationExecutionState[] = params.animations.map((a) => ({
      animationId: a.id,
      animationName: a.name,
      status: 'queued',
      progress: 0,
    }));
    params.onProgress?.([...states]);

    for (const s of states) {
      s.status = 'rigging';
      s.progress = 5;
      params.onProgress?.([...states]);
    }

    const rigTaskId = await api.createTask({
      type: 'animate_rig',
      original_model_task_id: params.modelTaskId,
      rig_type: params.rigType,
      out_format: 'glb',
    });

    const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
    const rigTask = await poller.pollUntilDone(rigTaskId, {
      onProgress: (task) => {
        const scaled = 5 + Math.floor((task.progress / 100) * 20);
        for (const s of states) {
          if (s.status === 'rigging') s.progress = scaled;
        }
        params.onProgress?.([...states]);
      },
    });

    if (rigTask.status !== 'success') {
      throw new Error(`Rig task failed: ${rigTask.error_msg || 'unknown error'}`);
    }

    const saveDir = TripoApiService.getModelSaveDir();

    for (let i = 0; i < params.animations.length; i++) {
      const anim = params.animations[i];
      const state = states[i];
      try {
        state.status = 'retargeting';
        state.progress = 25;
        params.onProgress?.([...states]);

        const retargetTaskId = await api.createTask({
          type: 'animate_retarget',
          original_model_task_id: rigTaskId,
          animations: [anim.id],
          out_format: 'glb',
          bake_animation: true,
          export_with_geometry: true,
        });

        const retargetTask: TripoTask = await poller.pollUntilDone(retargetTaskId, {
          onProgress: (task) => {
            state.progress = 25 + Math.floor((task.progress / 100) * 50);
            params.onProgress?.([...states]);
          },
        });

        if (retargetTask.status !== 'success') {
          throw new Error(retargetTask.error_msg || 'Retarget failed');
        }

        state.status = 'downloading';
        state.progress = 80;
        state.resultTaskId = retargetTaskId;
        params.onProgress?.([...states]);

        const modelPath = await api.downloadTaskResult(retargetTask, saveDir, (bytes, total) => {
          if (total > 0) state.progress = 80 + Math.floor((bytes / total) * 15);
          params.onProgress?.([...states]);
        });

        state.status = 'importing';
        state.progress = 95;
        state.resultModelPath = modelPath;
        params.onProgress?.([...states]);

        const newModel: ModelRecord = {
          id: retargetTaskId,
          taskId: retargetTaskId,
          name: anim.name,
          modelPath,
          thumbnailUrl: retargetTask.output?.rendered_image,
          thumbnailPath: TripoApiService.getLocalThumbnailPath(retargetTaskId),
          format: 'GLB',
          workflow: 'advanced3d',
          createdAt: Date.now(),
          pipelineSteps: [
            { type: 'animate_rig', taskId: rigTaskId, status: 'success', params: { type: 'animate_rig', original_model_task_id: params.modelTaskId } },
            { type: 'animate_retarget', taskId: retargetTaskId, status: 'success', params: { type: 'animate_retarget', original_model_task_id: rigTaskId, animations: [anim.id] } },
          ],
        };
        upsertModel(newModel);

        state.status = 'done';
        state.progress = 100;
        params.onProgress?.([...states]);
      } catch (err: any) {
        console.error(`[Tripo4AE] Chain failed for ${anim.id}:`, err);
        state.status = 'failed';
        state.error = err.message || String(err);
        params.onProgress?.([...states]);
      }
    }

    return { rigTaskId, states };
  }, [upsertModel]);

  return { runPrerigCheck, executeChain };
}
