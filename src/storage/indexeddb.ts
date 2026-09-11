import type { Campaign, CampaignStore } from "../domain/model.js";
import { validateCampaign } from "../domain/core.js";
import { exportZIP } from "./archive.js";

export interface CampaignBundle {
  campaign: Campaign;
  assets: Map<string, Uint8Array>;
}
export class RevisionConflict extends Error {
  constructor() {
    super(
      "Cette campagne a été modifiée dans un autre onglet. Rechargez la version enregistrée ou sauvegardez une copie.",
    );
    this.name = "RevisionConflict";
  }
}
interface RecordValue extends CampaignBundle {}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const complete = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Transaction annulée"));
    tx.onerror = () => reject(tx.error);
  });
/** Document and binaries share a single record and read/write transaction. */
export class IndexedDBCampaignStore implements CampaignStore {
  private db: Promise<IDBDatabase>;
  constructor(name = "flowtherapy-studio", factory: IDBFactory = indexedDB) {
    this.db = new Promise((resolve, reject) => {
      const open = factory.open(name, 1);
      open.onupgradeneeded = () =>
        open.result.createObjectStore("campaigns", { keyPath: "campaign.id" });
      open.onsuccess = () => {
        open.result.onversionchange = () => open.result.close();
        resolve(open.result);
      };
      open.onerror = () => reject(open.error);
      open.onblocked = () =>
        reject(new Error("Fermez les autres onglets pour ouvrir le stockage."));
    });
  }
  async list() {
    const db = await this.db;
    const records = (await request(
      db.transaction("campaigns").objectStore("campaigns").getAll(),
    )) as RecordValue[];
    return records.map(({ campaign: { id, name, revision } }) => ({
      id,
      name,
      revision,
    }));
  }
  async loadBundle(id: string): Promise<CampaignBundle> {
    const db = await this.db;
    const record = (await request(
      db.transaction("campaigns").objectStore("campaigns").get(id),
    )) as RecordValue | undefined;
    if (!record) throw new Error("Campagne introuvable.");
    validateCampaign(record.campaign);
    return structuredClone(record);
  }
  async load(id: string) {
    return (await this.loadBundle(id)).campaign;
  }
  async save(campaign: Campaign, expectedRevision: number | null) {
    return this.write(campaign, expectedRevision);
  }
  async saveBundle(bundle: CampaignBundle, expectedRevision: number | null) {
    // Own all inputs before asynchronous validation. Missing binaries remain explicit (JSON import).
    const copy = structuredClone(bundle);
    validateCampaign(copy.campaign);
    const present = copy.campaign.assets.filter((a) => copy.assets.has(a.path));
    if (present.length !== copy.assets.size)
      throw new Error("Ressource non déclarée.");
    // Reuse v1 MIME, signature, size and integrity controls for the supplied subset.
    await exportZIP(
      {
        schemaVersion: 1,
        id: "asset-check",
        revision: 1,
        name: "Asset check",
        locale: "fr",
        content: {},
        supports: [],
        assets: present,
      },
      copy.assets,
    );
    return this.write(copy.campaign, expectedRevision, copy.assets);
  }
  private async write(
    input: Campaign,
    expected: number | null,
    binaries?: Map<string, Uint8Array>,
  ): Promise<Campaign> {
    const campaign = structuredClone(input);
    validateCampaign(campaign);
    if (expected !== null && (!Number.isSafeInteger(expected) || expected < 1))
      throw new Error("Révision attendue invalide.");
    const db = await this.db;
    const tx = db.transaction("campaigns", "readwrite"),
      done = complete(tx);
    const records = tx.objectStore("campaigns");
    let conflict = false;
    const read = records.get(campaign.id);
    read.onsuccess = () => {
      const current = read.result as RecordValue | undefined;
      if (
        expected === null
          ? !!current
          : !current || current.campaign.revision !== expected
      ) {
        conflict = true;
        tx.abort();
        return;
      }
      campaign.revision = (current?.campaign.revision ?? 0) + 1;
      const assets =
        binaries ??
        new Map(
          campaign.assets.flatMap((a) => {
            const old = current?.campaign.assets.find(
              (b) => b.path === a.path && b.sha256 === a.sha256,
            );
            const bytes = old && current?.assets.get(a.path);
            return bytes ? [[a.path, bytes] as const] : [];
          }),
        );
      records.put({ campaign, assets });
    };
    try {
      await done;
    } catch (error) {
      if (conflict) throw new RevisionConflict();
      throw error;
    }
    return structuredClone(campaign);
  }
  async delete(id: string, expectedRevision: number) {
    const db = await this.db;
    const tx = db.transaction("campaigns", "readwrite"),
      done = complete(tx),
      records = tx.objectStore("campaigns");
    let conflict = false;
    const read = records.get(id);
    read.onsuccess = () => {
      if (read.result?.campaign.revision !== expectedRevision) {
        conflict = true;
        tx.abort();
      } else records.delete(id);
    };
    try {
      await done;
    } catch (error) {
      if (conflict) throw new RevisionConflict();
      throw error;
    }
  }
  async close() {
    (await this.db).close();
  }
}
