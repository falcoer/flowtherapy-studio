import {
  parseProject,
  parseCatalog,
  type Project,
  type Preset,
  type Surface,
  type Catalog,
} from "./model.js";
export type Workspace = {
  project: Project;
  palette: Catalog<Preset>;
  surfaces: Catalog<Surface>;
};
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("ft-graphic-prototype", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("workspace");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function loadWorkspace(): Promise<Workspace | undefined> {
  const db = await open();
  try {
    const data = await new Promise<Workspace | undefined>((resolve, reject) => {
      const r = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("current");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    if (!data) return;
    return {
      project: parseProject(JSON.stringify(data.project)),
      palette: parseCatalog(JSON.stringify(data.palette), "ft-renderers"),
      surfaces: parseCatalog(JSON.stringify(data.surfaces), "ft-surfaces"),
    };
  } finally {
    db.close();
  }
}
export async function saveWorkspace(data: Workspace) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(data, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
