import { useCallback, useRef } from 'react';
import type { CompInfo, AnimationConfig, MaterialProperties, ImportConfig, EnvironmentLightConfig, EmbeddedAnimationConfig } from '../../shared/types';

declare const CSInterface: any;

function escapeForEval(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

let csInstance: any = null;

function getCSInterface(): any {
  if (!csInstance) {
    csInstance = new CSInterface();
  }
  return csInstance;
}

export function useCsInterface() {
  const csRef = useRef<any>(null);

  const getCS = useCallback(() => {
    if (!csRef.current) {
      csRef.current = getCSInterface();
    }
    return csRef.current;
  }, []);

  const evalScript = useCallback(<T = any,>(script: string): Promise<T> => {
    const cs = getCS();
    return new Promise<T>((resolve, reject) => {
      cs.evalScript(script, (result: string) => {
        if (result === 'undefined' || result === undefined || result === null) {
          resolve(undefined as T);
          return;
        }
        try {
          const parsed = JSON.parse(result);
          if (parsed && parsed.ok === false) {
            reject(new Error(parsed.error || 'ExtendScript error'));
          } else if (parsed && parsed.ok === true) {
            resolve(parsed.data as T);
          } else {
            resolve(parsed as T);
          }
        } catch {
          resolve(result as T);
        }
      });
    });
  }, [getCS]);

  const getActiveCompInfo = useCallback(
    (): Promise<CompInfo | null> =>
      evalScript('tripo4ae.getActiveCompInfo()'),
    [evalScript],
  );

  const importModel = useCallback(
    (filePath: string, config?: ImportConfig): Promise<any> => {
      if (config) {
        const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return evalScript(`tripo4ae.importModel('${escapeForEval(filePath)}', '${json}')`);
      }
      return evalScript(`tripo4ae.importModel('${escapeForEval(filePath)}')`);
    },
    [evalScript],
  );

  const applyAnimation = useCallback(
    (config: AnimationConfig): Promise<any> => {
      const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return evalScript(`tripo4ae.applyAnimation('${json}')`);
    },
    [evalScript],
  );

  const selectEmbeddedAnimation = useCallback(
    (config: EmbeddedAnimationConfig): Promise<any> => {
      const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return evalScript(`tripo4ae.selectEmbeddedAnimation('${json}')`);
    },
    [evalScript],
  );

  const createCamera = useCallback(
    (config: any): Promise<any> => {
      const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return evalScript(`tripo4ae.createCamera('${json}')`);
    },
    [evalScript],
  );

  const createLights = useCallback(
    (config: any): Promise<any> => {
      const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return evalScript(`tripo4ae.createLights('${json}')`);
    },
    [evalScript],
  );

  const setupE3D = useCallback(
    (filePath: string): Promise<any> =>
      evalScript(`tripo4ae.setupE3D('${escapeForEval(filePath)}')`),
    [evalScript],
  );

  const setMaterialProperties = useCallback(
    (config: { layerIndex?: number; material: MaterialProperties }): Promise<any> => {
      const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return evalScript(`tripo4ae.setMaterialProperties('${json}')`);
    },
    [evalScript],
  );

  const getMaterialProperties = useCallback(
    (layerIndex?: number): Promise<any> => {
      if (layerIndex !== undefined) {
        return evalScript(`tripo4ae.getMaterialProperties('${layerIndex}')`);
      }
      return evalScript('tripo4ae.getMaterialProperties()');
    },
    [evalScript],
  );

  const createEnvironmentLight = useCallback(
    (config?: EnvironmentLightConfig): Promise<any> => {
      if (config) {
        const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return evalScript(`tripo4ae.createEnvironmentLight('${json}')`);
      }
      return evalScript('tripo4ae.createEnvironmentLight()');
    },
    [evalScript],
  );

  const applyMaterialPreset = useCallback(
    (config: { layerIndex?: number; preset: string; overrides?: Record<string, number> }): Promise<any> => {
      const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return evalScript(`tripo4ae.applyMaterialPreset('${json}')`);
    },
    [evalScript],
  );

  const getMaterialPresets = useCallback(
    (): Promise<any> => evalScript('tripo4ae.getMaterialPresets()'),
    [evalScript],
  );

  const setupScene = useCallback(
    (config?: Record<string, any>): Promise<any> => {
      if (config) {
        const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return evalScript(`tripo4ae.setupScene('${json}')`);
      }
      return evalScript('tripo4ae.setupScene()');
    },
    [evalScript],
  );

  const createParametricMesh = useCallback(
    (config: { meshType: string; color?: number[]; materialPreset?: string; curvature?: number; segments?: number; extrusionDepth?: number; bevelDepth?: number }): Promise<any> => {
      const json = JSON.stringify(config).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return evalScript(`tripo4ae.createParametricMesh('${json}')`);
    },
    [evalScript],
  );

  return {
    evalScript,
    getActiveCompInfo,
    importModel,
    applyAnimation,
    selectEmbeddedAnimation,
    createCamera,
    createLights,
    setupE3D,
    setMaterialProperties,
    getMaterialProperties,
    createEnvironmentLight,
    applyMaterialPreset,
    getMaterialPresets,
    setupScene,
    createParametricMesh,
  };
}
