import { useCallback, useRef } from 'react';
import type { CompInfo, AnimationConfig, MaterialProperties, ImportConfig, EnvironmentLightConfig, EmbeddedAnimationConfig } from '../../shared/types';

import CSInterface from '../../js/lib/cep/csinterface';

function escapeForEval(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let csInstance: any = null;

function getCSInterfaceCtor(): any {
  if (typeof CSInterface === 'function') return CSInterface;
  if (typeof window !== 'undefined' && typeof (window as any).CSInterface === 'function') {
    return (window as any).CSInterface;
  }
  return null;
}

function getCSInterface(): any {
  if (typeof window === 'undefined' || typeof (window as any).__adobe_cep__ === 'undefined') {
    throw new Error(
      'After Effects CEP bridge unavailable (__adobe_cep__ missing). This is a host/panel issue, not a Tripo API issue. Reopen the panel inside After Effects.',
    );
  }
  const CSInterfaceCtor = getCSInterfaceCtor();
  if (!CSInterfaceCtor) {
    throw new Error(
      'CSInterface bridge unavailable in the current panel build. Rebuild the extension and reopen the After Effects panel.',
    );
  }
  if (!csInstance) {
    csInstance = new CSInterfaceCtor();
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
    let cs: any;
    try {
      cs = getCS();
    } catch (err) {
      return Promise.reject(err);
    }
    const callId = Math.random().toString(36).slice(2, 8);
    console.log(`[Tripo4AE] evalScript[${callId}]`, script.substring(0, 120) + (script.length > 120 ? '...' : ''));
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('evalScript timeout after 30s'));
      }, 30000);
      cs.evalScript(script, (result: string) => {
        clearTimeout(timer);
        if (result === 'EvalScript error.' || result === 'EvalScript error') {
          console.error(`[Tripo4AE] evalScript[${callId}] EvalScript error — function not found or syntax error`);
          reject(new Error('ExtendScript evaluation failed. The JSX host script may not be loaded. Try restarting AE.'));
          return;
        }
        if (result === undefined || result === null || result === '' || result === 'undefined') {
          resolve(null as T);
          return;
        }
        console.log(`[Tripo4AE] evalScript[${callId}] OK:`, result.substring(0, 200));
        try {
          const parsed = JSON.parse(result);
          if (parsed && parsed.ok === false) {
            console.error(`[Tripo4AE] evalScript[${callId}] ExtendScript error:`, parsed.error);
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
        const json = escapeForEval(JSON.stringify(config));
        return evalScript(`tripo4ae.importModel('${escapeForEval(filePath)}', '${json}')`);
      }
      return evalScript(`tripo4ae.importModel('${escapeForEval(filePath)}')`);
    },
    [evalScript],
  );

  const applyAnimation = useCallback(
    (config: AnimationConfig): Promise<any> => {
      const json = escapeForEval(JSON.stringify(config));
      return evalScript(`tripo4ae.applyAnimation('${json}')`);
    },
    [evalScript],
  );

  const selectEmbeddedAnimation = useCallback(
    (config: EmbeddedAnimationConfig): Promise<any> => {
      const json = escapeForEval(JSON.stringify(config));
      return evalScript(`tripo4ae.selectEmbeddedAnimation('${json}')`);
    },
    [evalScript],
  );

  const createCamera = useCallback(
    (config: any): Promise<any> => {
      const json = escapeForEval(JSON.stringify(config));
      return evalScript(`tripo4ae.createCamera('${json}')`);
    },
    [evalScript],
  );

  const createLights = useCallback(
    (config: any): Promise<any> => {
      const json = escapeForEval(JSON.stringify(config));
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
      const json = escapeForEval(JSON.stringify(config));
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
        const json = escapeForEval(JSON.stringify(config));
        return evalScript(`tripo4ae.createEnvironmentLight('${json}')`);
      }
      return evalScript('tripo4ae.createEnvironmentLight()');
    },
    [evalScript],
  );

  const applyMaterialPreset = useCallback(
    (config: { layerIndex?: number; preset: string; overrides?: Record<string, number> }): Promise<any> => {
      const json = escapeForEval(JSON.stringify(config));
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
        const json = escapeForEval(JSON.stringify(config));
        return evalScript(`tripo4ae.setupScene('${json}')`);
      }
      return evalScript('tripo4ae.setupScene()');
    },
    [evalScript],
  );

  const updateSceneProperties = useCallback(
    (config: Record<string, any>): Promise<any> => {
      const json = escapeForEval(JSON.stringify(config));
      return evalScript(`tripo4ae.updateSceneProperties('${json}')`);
    },
    [evalScript],
  );

  const createParametricMesh = useCallback(
    (config: { meshType: string; color?: number[]; materialPreset?: string; curvature?: number; segments?: number; extrusionDepth?: number; bevelDepth?: number }): Promise<any> => {
      const json = escapeForEval(JSON.stringify(config));
      return evalScript(`tripo4ae.createParametricMesh('${json}')`);
    },
    [evalScript],
  );

  const alignModelToGround = useCallback(
    (): Promise<any> => evalScript('tripo4ae.alignModelToGround()'),
    [evalScript],
  );

  const alignGroundToModel = useCallback(
    (): Promise<any> => evalScript('tripo4ae.alignGroundToModel()'),
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
    updateSceneProperties,
    createParametricMesh,
    alignModelToGround,
    alignGroundToModel,
  };
}
