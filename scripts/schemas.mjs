import TJS from 'typescript-json-schema';
import { readFileSync, writeFileSync } from 'node:fs';
const program = TJS.getProgramFromFiles(['src/domain/model.ts'], { strictNullChecks: true });
const schema = TJS.generateSchema(program, '*', { required: true, noExtraProps: true, ref: true });
// The persistence adapter is executable API, not a serialized contract.
delete schema.definitions.CampaignStore;
schema.$ref = '#/definitions/Campaign';
schema.$id = 'https://flowtherapymusic.com/studio/schemas/domain-v1.json';
const text = JSON.stringify(schema, null, 2) + '\n';
const path = 'schemas/domain.schema.json';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== text) throw new Error('Schemas differ from TypeScript: npm run schemas');
} else writeFileSync(path, text);
