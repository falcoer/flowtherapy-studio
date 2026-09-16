import type {
  BrandConfiguration,
  BrandDraft,
  BrandObject,
  BrandRelation,
  BrandRelease,
} from "../domain/brand-configuration.js";

const request = <T>(input: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    input.onsuccess = () => resolve(input.result);
    input.onerror = () => reject(input.error);
  });
const complete = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Transaction annulée."));
    transaction.onerror = () => reject(transaction.error);
  });

export class BrandConfigurationConflict extends Error {
  constructor() {
    super(
      "La configuration de marque a été modifiée dans un autre onglet. Rechargez-la avant de continuer.",
    );
    this.name = "BrandConfigurationConflict";
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Configuration de marque invalide.");
  return value as Record<string, unknown>;
}
function integer(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1)
    throw new Error(`${label} invalide.`);
  return Number(value);
}
function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} invalide.`);
  return value;
}
function validateObject(input: unknown): BrandObject {
  const value = record(input);
  text(value.id, "Identifiant d’objet");
  text(value.type, "Type d’objet");
  text(value.role, "Rôle d’objet");
  text(value.label, "Libellé d’objet");
  integer(value.revision, "Révision d’objet");
  if (!Object.hasOwn(value, "value")) throw new Error("Valeur d’objet absente.");
  if (!['published', 'draft'].includes(String(value.status)))
    throw new Error("Statut d’objet invalide.");
  return structuredClone(value as unknown as BrandObject);
}
function validateRelation(input: unknown): BrandRelation {
  const value = record(input);
  text(value.id, "Identifiant de relation");
  text(value.sourceId, "Source de relation");
  text(value.targetId, "Cible de relation");
  text(value.type, "Type de relation");
  return structuredClone(value as unknown as BrandRelation);
}
function validateRelease(input: unknown): BrandRelease {
  const value = record(input);
  if (value.schemaVersion !== 1) throw new Error("Version de release invalide.");
  text(value.id, "Identifiant de release");
  text(value.brandId, "Identifiant de marque");
  integer(value.version, "Version de release");
  text(value.createdAt, "Date de release");
  text(value.fingerprint, "Empreinte de release");
  if (!Array.isArray(value.objects) || !Array.isArray(value.relations) || !Array.isArray(value.findings))
    throw new Error("Contenu de release invalide.");
  const objects = value.objects.map(validateObject),
    ids = new Set(objects.map((object) => object.id));
  if (ids.size !== objects.length) throw new Error("Identifiant d’objet dupliqué.");
  const relations = value.relations.map(validateRelation);
  for (const relation of relations) {
    if (!ids.has(relation.sourceId) || !ids.has(relation.targetId))
      throw new Error(`Relation orpheline : ${relation.id}.`);
  }
  return structuredClone(value as unknown as BrandRelease);
}
function validateDraft(input: unknown, releases: BrandRelease[]): BrandDraft {
  const value = record(input);
  if (value.schemaVersion !== 1) throw new Error("Version de brouillon invalide.");
  text(value.brandId, "Identifiant de marque du brouillon");
  const baseReleaseId = text(value.baseReleaseId, "Release de base");
  if (!releases.some((release) => release.id === baseReleaseId))
    throw new Error("Release de base du brouillon absente.");
  if (!Array.isArray(value.objects) || !Array.isArray(value.relations))
    throw new Error("Contenu de brouillon invalide.");
  value.objects.map(validateObject);
  value.relations.map(validateRelation);
  const changeSet = record(value.changeSet);
  if (!Array.isArray(changeSet.operations))
    throw new Error("Lot de changements invalide.");
  return structuredClone(value as unknown as BrandDraft);
}
export function validateBrandConfiguration(input: unknown): BrandConfiguration {
  const value = record(input);
  if (value.schemaVersion !== 1)
    throw new Error("Version de configuration de marque invalide.");
  const brandId = text(value.brandId, "Identifiant de marque"),
    name = text(value.name, "Nom de marque"),
    revision = integer(value.revision, "Révision de configuration");
  if (!Array.isArray(value.releases) || !value.releases.length)
    throw new Error("Une configuration doit contenir au moins une release.");
  const releases = value.releases.map(validateRelease);
  if (releases.some((release) => release.brandId !== brandId))
    throw new Error("Une release appartient à une autre marque.");
  const result: BrandConfiguration = {
    schemaVersion: 1,
    brandId,
    name,
    revision,
    releases,
  };
  if (value.draft !== undefined) result.draft = validateDraft(value.draft, releases);
  return result;
}
export function exportBrandConfiguration(configuration: BrandConfiguration): string {
  return JSON.stringify(validateBrandConfiguration(configuration), null, 2);
}
export function importBrandConfiguration(textValue: string): BrandConfiguration {
  if (new TextEncoder().encode(textValue).length > 4 * 1024 * 1024)
    throw new Error("Configuration de marque limitée à 4 Mio.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(textValue);
  } catch {
    throw new Error("JSON de configuration invalide.");
  }
  return validateBrandConfiguration(parsed);
}

export class BrandConfigurationStore {
  private readonly db: Promise<IDBDatabase>;
  constructor(
    name = "flowtherapy-studio-brand-configuration",
    factory: IDBFactory = indexedDB,
  ) {
    this.db = new Promise((resolve, reject) => {
      const open = factory.open(name, 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains("configurations"))
          open.result.createObjectStore("configurations", { keyPath: "brandId" });
      };
      open.onsuccess = () => {
        open.result.onversionchange = () => open.result.close();
        resolve(open.result);
      };
      open.onerror = () => reject(open.error);
      open.onblocked = () =>
        reject(new Error("Fermez les autres onglets pour ouvrir la configuration de marque."));
    });
  }
  async load(brandId: string): Promise<BrandConfiguration | null> {
    const db = await this.db;
    const value = await request(
      db.transaction("configurations").objectStore("configurations").get(brandId),
    );
    return value ? validateBrandConfiguration(value) : null;
  }
  async save(
    input: BrandConfiguration,
    expectedRevision: number | null,
  ): Promise<BrandConfiguration> {
    const candidate = validateBrandConfiguration(input);
    const db = await this.db,
      tx = db.transaction("configurations", "readwrite"),
      done = complete(tx),
      table = tx.objectStore("configurations");
    let conflict = false;
    const read = table.get(candidate.brandId);
    read.onsuccess = () => {
      const current = read.result as BrandConfiguration | undefined;
      if (
        expectedRevision === null
          ? !!current
          : !current || current.revision !== expectedRevision
      ) {
        conflict = true;
        tx.abort();
        return;
      }
      candidate.revision = (current?.revision ?? 0) + 1;
      table.put(candidate);
    };
    try {
      await done;
    } catch (error) {
      if (conflict) throw new BrandConfigurationConflict();
      throw error;
    }
    return structuredClone(candidate);
  }
  async replaceImported(input: BrandConfiguration): Promise<BrandConfiguration> {
    const candidate = validateBrandConfiguration(input),
      db = await this.db,
      tx = db.transaction("configurations", "readwrite"),
      done = complete(tx);
    candidate.revision += 1;
    tx.objectStore("configurations").put(candidate);
    await done;
    return structuredClone(candidate);
  }
  async close() {
    (await this.db).close();
  }
}
