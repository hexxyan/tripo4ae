/**
 * importModel.ts — ExtendScript host module
 * Runs inside After Effects ExtendScript engine.
 * Imports a 3D model file into the AE project and optionally adds to active comp.
 */

declare const app: any;
declare const CompItem: any;
declare const ImportOptions: any;
declare const File: any;

export function importModelToProject(modelPath: string): string {
  try {
    const file = new File(modelPath);
    if (!file.exists) {
      return JSON.stringify({ ok: false, error: 'File not found: ' + modelPath });
    }

    const io = new ImportOptions(file);
    const footage = app.project.importFile(io);

    // Attempt to add to active comp if one exists
    const comp = app.project.activeItem;
    let addedToComp = false;
    if (comp && comp instanceof CompItem) {
      const layer = comp.layers.add(footage);
      addedToComp = true;
      // Center the layer in the comp
      if (layer.position) {
        layer.position.setValue([comp.width / 2, comp.height / 2]);
      }
    }

    return JSON.stringify({
      ok: true,
      data: {
        name: footage.name,
        addedToComp,
      },
    });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e) });
  }
}
