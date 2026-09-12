import type {
  Asset,
  Campaign,
  CampaignStore,
  EditorialDocument,
} from "../domain/model.js";
import { validateCampaign, validateEditorial } from "../domain/core.js";
import { exportZIP } from "./archive.js";
import { migrateCampaign, exportJSON } from "./json.js";

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
interface RecordValue {
  campaign: Campaign;
  assetHashes: Map<string, string>;
}
function resourceDocument(assets: Asset[]): Campaign {
  return {
    schemaVersion: 3,
    id: "resources",
    revision: 1,
    name: "Resources",
    locale: "fr",
    content: {},
    supports: [],
    assets,
  };
}
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
/** Documents reference content-addressed binaries; writes remain atomic. */
export class IndexedDBCampaignStore implements CampaignStore {
  private db: Promise<IDBDatabase>;
  constructor(name = "flowtherapy-studio", factory: IDBFactory = indexedDB) {
    this.db = new Promise((resolve, reject) => {
      const open = factory.open(name, 3);
      open.onupgradeneeded = (event) => {
        const db = open.result,
          tx = open.transaction!;
        if (!db.objectStoreNames.contains("campaigns"))
          db.createObjectStore("campaigns", { keyPath: "campaign.id" });
        if (event.oldVersion < 2) {
          db.createObjectStore("brands", { keyPath: "campaign.id" });
          const blobs = db.createObjectStore("blobs");
          const resources = db.createObjectStore("resources", {
            keyPath: "sha256",
          });
          const cursor = tx.objectStore("campaigns").openCursor();
          cursor.onsuccess = () => {
            const row = cursor.result;
            if (!row) return;
            try {
              const old = row.value as CampaignBundle;
              const campaign = migrateCampaign(old.campaign).campaign;
              const assetHashes = new Map<string, string>();
              for (const asset of campaign.assets) {
                const bytes = old.assets.get(asset.path);
                if (bytes) {
                  blobs.put(bytes, asset.sha256);
                  resources.put(asset);
                  assetHashes.set(asset.path, asset.sha256);
                }
              }
              row.update({ campaign, assetHashes });
              row.continue();
            } catch {
              tx.abort();
            }
          };
        } else {
          // v2 → v3: migrate documents only. Preserve revisions, missing files,
          // resource metadata and all content-addressed blobs in the same transaction.
          for (const table of ["campaigns", "brands"]) {
            const cursor = tx.objectStore(table).openCursor();
            cursor.onsuccess = () => {
              const row = cursor.result;
              if (!row) return;
              try {
                const record = row.value as RecordValue;
                row.update({
                  ...record,
                  campaign: migrateCampaign(record.campaign).campaign,
                });
                row.continue();
              } catch {
                tx.abort();
              }
            };
          }
        }
        db.createObjectStore("editorial", { keyPath: "id" });
      };
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
  private async readBundle(
    id: string,
    table: "campaigns" | "brands",
  ): Promise<CampaignBundle> {
    const db = await this.db;
    const tx = db.transaction([table, "blobs"]);
    const record = (await request(tx.objectStore(table).get(id))) as
      RecordValue | undefined;
    if (!record) throw new Error("Document introuvable.");
    validateCampaign(record.campaign);
    const assets = new Map<string, Uint8Array>();
    await Promise.all(
      [...record.assetHashes].map(async ([path, hash]) => {
        const bytes = (await request(tx.objectStore("blobs").get(hash))) as
          Uint8Array | undefined;
        if (!bytes) throw new Error("Fichier référencé absent du stockage.");
        assets.set(path, bytes);
      }),
    );
    return structuredClone({ campaign: record.campaign, assets });
  }
  async loadBundle(id: string) {
    return this.readBundle(id, "campaigns");
  }
  async loadBrand() {
    const db = await this.db;
    const keys = await request(
      db.transaction("brands").objectStore("brands").getAllKeys(),
    );
    return keys.length ? this.readBundle(String(keys[0]), "brands") : null;
  }
  async saveBrand(bundle: CampaignBundle, expected: number | null) {
    if (!bundle.campaign.brand) throw new Error("Identité absente.");
    return this.saveChecked(bundle, expected, "brands");
  }
  async listResources(): Promise<Asset[]> {
    const db = await this.db;
    return request(
      db.transaction("resources").objectStore("resources").getAll(),
    );
  }
  async loadResource(
    hash: string,
  ): Promise<{ asset: Asset; bytes: Uint8Array }> {
    const db = await this.db,
      tx = db.transaction(["resources", "blobs"]);
    const [asset, bytes] = await Promise.all([
      request(tx.objectStore("resources").get(hash)),
      request(tx.objectStore("blobs").get(hash)),
    ]);
    if (!asset || !bytes) throw new Error("Ressource introuvable.");
    return { asset, bytes };
  }
  async importResource(input: Asset, data: Uint8Array): Promise<Asset> {
    const asset = structuredClone(input),
      bytes = new Uint8Array(data);
    await exportZIP(resourceDocument([asset]), new Map([[asset.path, bytes]]));
    const db = await this.db,
      tx = db.transaction(["resources", "blobs"], "readwrite"),
      done = complete(tx);
    const resources = tx.objectStore("resources"),
      read = resources.get(asset.sha256);
    let result = asset;
    read.onsuccess = () => {
      if (read.result) result = read.result;
      else resources.put(asset);
      tx.objectStore("blobs").put(bytes, asset.sha256);
    };
    await done;
    return structuredClone(result);
  }
  async load(id: string) {
    return (await this.loadBundle(id)).campaign;
  }
  async save(campaign: Campaign, expectedRevision: number | null) {
    return this.write(campaign, expectedRevision);
  }
  async saveBundle(bundle: CampaignBundle, expectedRevision: number | null) {
    return this.saveChecked(bundle, expectedRevision, "campaigns");
  }
  private async saveChecked(
    bundle: CampaignBundle,
    expectedRevision: number | null,
    table: "campaigns" | "brands",
  ) {
    // Own all inputs before asynchronous validation. Missing binaries remain explicit (JSON import).
    const copy = structuredClone(bundle);
    validateCampaign(copy.campaign);
    const present = copy.campaign.assets.filter((a) => copy.assets.has(a.path));
    if (present.length !== copy.assets.size)
      throw new Error("Ressource non déclarée.");
    // Reuse v1 MIME, signature, size and integrity controls for the supplied subset.
    await exportZIP(
      {
        schemaVersion: 3,
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
    return this.write(copy.campaign, expectedRevision, copy.assets, table);
  }
  private async write(
    input: Campaign,
    expected: number | null,
    binaries?: Map<string, Uint8Array>,
    table: "campaigns" | "brands" = "campaigns",
  ): Promise<Campaign> {
    const campaign = structuredClone(input);
    validateCampaign(campaign);
    exportJSON(campaign);
    if (expected !== null && (!Number.isSafeInteger(expected) || expected < 1))
      throw new Error("Révision attendue invalide.");
    const db = await this.db;
    const tx = db.transaction([table, "blobs", "resources"], "readwrite"),
      done = complete(tx);
    const records = tx.objectStore(table);
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
      if (table === "brands" && campaign.brand)
        campaign.brand.revision = campaign.revision;
      const assetHashes = new Map<string, string>();
      for (const asset of campaign.assets) {
        const bytes = binaries?.get(asset.path);
        if (bytes) {
          tx.objectStore("blobs").put(bytes, asset.sha256);
          const resources = tx.objectStore("resources"),
            readAsset = resources.get(asset.sha256);
          readAsset.onsuccess = () => {
            if (!readAsset.result) resources.put(asset);
          };
          assetHashes.set(asset.path, asset.sha256);
        } else if (
          !binaries &&
          current?.assetHashes.get(asset.path) === asset.sha256
        ) {
          assetHashes.set(asset.path, asset.sha256);
        }
      }
      records.put({ campaign, assetHashes });
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
  async listEditorial(): Promise<EditorialDocument[]> {
    const db = await this.db;
    const records = (await request(
      db.transaction("editorial").objectStore("editorial").getAll(),
    )) as EditorialDocument[];
    records.forEach(validateEditorial);
    return records.sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }
  async loadEditorial(id: string): Promise<EditorialDocument> {
    const db = await this.db;
    const document = await request(
      db.transaction("editorial").objectStore("editorial").get(id),
    );
    if (!document) throw new Error("Contenu éditorial introuvable.");
    validateEditorial(document);
    return document;
  }
  async saveEditorial(
    input: EditorialDocument,
    expected: number | null,
  ): Promise<EditorialDocument> {
    const document = structuredClone(input);
    validateEditorial(document);
    if (expected !== null && (!Number.isSafeInteger(expected) || expected < 1))
      throw new Error("Révision attendue invalide.");
    const db = await this.db,
      tx = db.transaction(["editorial", "resources", "blobs"], "readwrite"),
      done = complete(tx);
    let failure: Error | undefined;
    const fail = (message: string) => {
      if (!failure) {
        failure = new Error(message);
        tx.abort();
      }
    };
    const records = tx.objectStore("editorial"),
      read = records.get(document.id);
    read.onsuccess = () => {
      const current = read.result as EditorialDocument | undefined;
      if (
        expected === null
          ? !!current
          : !current || current.revision !== expected
      ) {
        fail(
          "Ce contenu a été modifié dans un autre onglet. Rechargez-le ou enregistrez une copie.",
        );
        return;
      }
      document.revision = (current?.revision ?? 0) + 1;
      records.put(document);
      for (const asset of document.assets) {
        const metadata = tx.objectStore("resources").get(asset.sha256);
        metadata.onsuccess = () => {
          if (!metadata.result || metadata.result.mimeType !== asset.mimeType)
            fail("Ressource associée absente du catalogue.");
        };
        const blob = tx.objectStore("blobs").getKey(asset.sha256);
        blob.onsuccess = () => {
          if (blob.result === undefined)
            fail("Fichier associé absent du stockage.");
        };
      }
    };
    try {
      await done;
    } catch (error) {
      throw failure ?? error;
    }
    return structuredClone(document);
  }
  /** Update common metadata only; campaign/editorial snapshots are left untouched. */
  async updateResource(
    expected: Asset,
    changes: Pick<Asset, "source" | "rights"> & { credit?: string },
  ): Promise<Asset> {
    const original = structuredClone(expected),
      next = { ...original, ...structuredClone(changes) };
    if (next.credit === undefined) delete next.credit;
    validateCampaign(resourceDocument([next]));
    const db = await this.db,
      tx = db.transaction("resources", "readwrite"),
      done = complete(tx);
    let conflict = false;
    const table = tx.objectStore("resources"),
      read = table.get(original.sha256);
    read.onsuccess = () => {
      if (JSON.stringify(read.result) !== JSON.stringify(original)) {
        conflict = true;
        tx.abort();
      } else table.put(next);
    };
    try {
      await done;
    } catch (error) {
      if (conflict)
        throw new Error(
          "Métadonnées modifiées dans un autre onglet. Actualisez la médiathèque.",
        );
      throw error;
    }
    return next;
  }
  async close() {
    (await this.db).close();
  }
}
