import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PipelineStep, ModelRecord, CompInfo } from '../../shared/types';

interface TripoState {
  apiKey: string | null;
  balance: number;
  pipeline: PipelineStep[];
  models: ModelRecord[];
  activeComp: CompInfo | null;

  setApiKey: (key: string | null) => void;
  setBalance: (balance: number) => void;
  addPipelineStep: (step: PipelineStep) => void;
  updatePipelineStep: (index: number, update: Partial<PipelineStep>) => void;
  clearPipeline: () => void;
  addModel: (model: ModelRecord) => void;
  removeModel: (id: string) => void;
  setCompInfo: (info: CompInfo | null) => void;
  reset: () => void;
}

const initialState = {
  apiKey: null as string | null,
  balance: 0,
  pipeline: [] as PipelineStep[],
  models: [] as ModelRecord[],
  activeComp: null as CompInfo | null,
};

const STORE_KEY = 'tripo4ae-store';

export const useStore = create<TripoState>()(
  persist(
    (set) => ({
      ...initialState,

      setApiKey: (key) => set({ apiKey: key }),

      setBalance: (balance) => set({ balance }),

      addPipelineStep: (step) =>
        set((state) => ({ pipeline: [...state.pipeline, step] })),

      updatePipelineStep: (index, update) =>
        set((state) => {
          if (index < 0 || index >= state.pipeline.length) return state;
          const pipeline = [...state.pipeline];
          pipeline[index] = { ...pipeline[index], ...update };
          return { pipeline };
        }),

      clearPipeline: () => set({ pipeline: [] }),

      addModel: (model) =>
        set((state) => ({ models: [...state.models, model] })),

      removeModel: (id) =>
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
        })),

      setCompInfo: (info) => set({ activeComp: info }),

      reset: () => set(initialState),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        balance: state.balance,
        pipeline: state.pipeline,
        models: state.models,
      }),
    },
  ),
);
