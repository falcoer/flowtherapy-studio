import { DomainError, requireThat, validateCampaign } from "../domain/core.js";
import type { Campaign } from "../domain/model.js";

export const MAX_JSON_BYTES = 2 * 1024 * 1024;
export const CURRENT_SCHEMA_VERSION = 2;

export interface Migration {
  from: number;
  to: number;
  migrate: (document: unknown) => unknown;
}

const v1ToV2: Migration = {
  from: 1,
  to: 2,
  migrate(input) {
    requireThat(
      input && typeof input === "object" && !Array.isArray(input),
      "$",
      "Expected campaign object",
      "VERSION",
    );
    const candidate = structuredClone(input) as Record<string, unknown>;
    candidate.schemaVersion = 2;
    const brand = candidate.brand;
    if (brand && typeof brand === "object" && !Array.isArray(brand))
      candidate.brand = { ...brand, schemaVersion: 2 };
    return candidate;
  },
};

/** Explicit document migrations; the input and every migration result are copied. */
export const campaignMigrations: readonly Migration[] = [v1ToV2];

export function migrateCampaign(
  input: unknown,
  migrations: readonly Migration[] = campaignMigrations,
) {
  const original = structuredClone(input);
  let candidate: unknown = structuredClone(input);
  const steps: Array<{ from: number; to: number }> = [];
  const version = (value: unknown): number => {
    requireThat(
      value &&
        typeof value === "object" &&
        "schemaVersion" in value &&
        Number.isSafeInteger(value.schemaVersion),
      "$.schemaVersion",
      "Missing schema version",
      "VERSION",
    );
    return value.schemaVersion as number;
  };
  let current = version(candidate);
  requireThat(
    current >= 0 && current <= CURRENT_SCHEMA_VERSION,
    "$.schemaVersion",
    `Unsupported version ${current}`,
    "VERSION",
  );
  while (current < CURRENT_SCHEMA_VERSION) {
    const candidates = migrations.filter((migration) => migration.from === current);
    requireThat(
      candidates.length === 1,
      "$.schemaVersion",
      `No unique explicit migration from ${current}`,
      "VERSION",
    );
    const migration = candidates[0];
    requireThat(
      Number.isSafeInteger(migration.to) &&
        migration.to > current &&
        migration.to <= CURRENT_SCHEMA_VERSION,
      "$.schemaVersion",
      "Invalid migration target",
      "VERSION",
    );
    candidate = migration.migrate(structuredClone(candidate));
    requireThat(
      version(candidate) === migration.to,
      "$.schemaVersion",
      "Migration did not produce its target version",
      "VERSION",
    );
    steps.push({ from: current, to: migration.to });
    current = migration.to;
  }
  validateCampaign(candidate);
  return { campaign: structuredClone(candidate), original, steps };
}

export function parseJSON(text: string): unknown {
  requireThat(
    new TextEncoder().encode(text).byteLength <= MAX_JSON_BYTES,
    "$",
    "JSON exceeds 2 MiB",
    "SIZE",
  );
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError("JSON", "$", "Malformed JSON");
  }
}

export function importJSON(
  text: string,
  migrations: readonly Migration[] = campaignMigrations,
): Campaign {
  return migrateCampaign(parseJSON(text), migrations).campaign;
}

export function exportJSON(campaign: Campaign): string {
  const canonical = migrateCampaign(campaign).campaign;
  const text = JSON.stringify(canonical, null, 2) + "\n";
  requireThat(
    new TextEncoder().encode(text).byteLength <= MAX_JSON_BYTES,
    "$",
    "JSON exceeds 2 MiB",
    "SIZE",
  );
  return text;
}
