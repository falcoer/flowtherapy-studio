import { DomainError, requireThat, validateCampaign } from '../domain/core.js';
import type { Campaign } from '../domain/model.js';

export const MAX_JSON_BYTES = 2 * 1024 * 1024;
export const CURRENT_SCHEMA_VERSION = 1;
export interface Migration { from: number; to: number; migrate: (document: unknown) => unknown }
/** No historical schema predates v1 in this repository: no implicit migration. */
export function migrateCampaign(input: unknown, migrations: readonly Migration[] = []) {
  const original = structuredClone(input);
  let candidate: unknown = structuredClone(input);
  const steps: Array<{ from: number; to: number }> = [];
  const version = (v: unknown): number => {
    requireThat(v && typeof v === 'object' && 'schemaVersion' in v && Number.isSafeInteger(v.schemaVersion), '$.schemaVersion', 'Missing schema version', 'VERSION');
    return v.schemaVersion as number;
  };
  let current = version(candidate);
  requireThat(current >= 0 && current <= CURRENT_SCHEMA_VERSION, '$.schemaVersion', `Unsupported version ${current}`, 'VERSION');
  while (current < CURRENT_SCHEMA_VERSION) {
    const candidates = migrations.filter(m => m.from === current);
    requireThat(candidates.length === 1, '$.schemaVersion', `No unique explicit migration from ${current}`, 'VERSION');
    const migration = candidates[0];
    requireThat(Number.isSafeInteger(migration.to) && migration.to > current && migration.to <= CURRENT_SCHEMA_VERSION, '$.schemaVersion', 'Invalid migration target', 'VERSION');
    candidate = migration.migrate(structuredClone(candidate));
    requireThat(version(candidate) === migration.to, '$.schemaVersion', 'Migration did not produce its target version', 'VERSION');
    steps.push({ from: current, to: migration.to }); current = migration.to;
  }
  validateCampaign(candidate);
  return { campaign: structuredClone(candidate), original, steps };
}
export function parseJSON(text: string): unknown {
  requireThat(new TextEncoder().encode(text).byteLength <= MAX_JSON_BYTES, '$', 'JSON exceeds 2 MiB', 'SIZE');
  try { return JSON.parse(text); } catch { throw new DomainError('JSON', '$', 'Malformed JSON'); }
}
export function importJSON(text: string, migrations: readonly Migration[] = []): Campaign {
  return migrateCampaign(parseJSON(text), migrations).campaign;
}
export function exportJSON(campaign: Campaign): string {
  validateCampaign(campaign);
  const text = JSON.stringify(campaign, null, 2) + '\n';
  requireThat(new TextEncoder().encode(text).byteLength <= MAX_JSON_BYTES, '$', 'JSON exceeds 2 MiB', 'SIZE');
  return text;
}
