import TJS from 'typescript-json-schema';
import { readFileSync, writeFileSync } from 'node:fs';
const program = TJS.getProgramFromFiles(['src/domain/model.ts'], { strictNullChecks: true });
const schema = TJS.generateSchema(program, '*', { required: true, noExtraProps: true, ref: true });
// The persistence adapter is executable API, not a serialized contract.
delete schema.definitions.CampaignStore;
schema.$ref = '#/definitions/Campaign';
schema.$id = 'https://flowtherapymusic.com/studio/schemas/domain-v2.json';
const text = JSON.stringify(schema, null, 2) + '\n';
const path = 'schemas/domain.schema.json';
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
    : value;
if (process.argv.includes('--check')) {
  if (JSON.stringify(canonical(JSON.parse(readFileSync(path, 'utf8')))) !== JSON.stringify(canonical(schema)))
    throw new Error('Schemas differ from TypeScript: npm run schemas');
} else writeFileSync(path, text);
