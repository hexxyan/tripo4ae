/**
 * projectInfo.ts — ExtendScript host module
 * Runs inside After Effects ExtendScript engine.
 * Provides active composition info.
 */

declare const app: any;
declare const CompItem: any;
declare const alert: (msg: string) => void;

export function getActiveCompInfo(): string {
  try {
    const comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      return JSON.stringify({ ok: true, data: null });
    }

    const info = {
      name: comp.name,
      width: comp.width,
      height: comp.height,
      frameRate: comp.frameRate,
      duration: comp.duration,
      durationFrames: Math.round(comp.duration * comp.frameRate),
    };

    return JSON.stringify({ ok: true, data: info });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
