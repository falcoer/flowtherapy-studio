import TJS from 'typescript-json-schema';
import { readFileSync, writeFileSync } from 'node:fs';

const program = TJS.getProgramFromFiles(['src/domain/model.ts'], {
  strictNullChecks: true,
});
const schema = TJS.generateSchema(program, '*', {
  required: true,
  noExtraProps: true,
  ref: true,
});
// The persistence adapter is executable API, not a serialized contract.
delete schema.definitions.CampaignStore;
schema.$ref = '#/definitions/Campaign';
schema.$id = 'https://flowtherapymusic.com/studio/schemas/domain-v2.json';

const text = JSON.stringify(schema, null, 2) + '\n';
const path = 'schemas/domain.schema.json';
const canonical = (value, key = '') =>
  Array.isArray(value)
    ? (key === 'required' ? [...value].sort() : value).map((item) => canonical(item))
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([childKey, item]) => [childKey, canonical(item, childKey)]),
        )
      : value;
const firstDiff = (actual, expected, at = '$') => {
  if (actual === expected) return null;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length)
      return `${at}: array length ${actual.length} !== ${expected.length}`;
    for (let i = 0; i < actual.length; i++) {
      const difference = firstDiff(actual[i], expected[i], `${at}[${i}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (
    actual &&
    expected &&
    typeof actual === 'object' &&
    typeof expected === 'object'
  ) {
    const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])].sort();
    for (const key of keys) {
      if (!Object.hasOwn(actual, key))
        return `${at}.${key}: missing in committed schema`;
      if (!Object.hasOwn(expected, key))
        return `${at}.${key}: unexpected in committed schema`;
      const difference = firstDiff(actual[key], expected[key], `${at}.${key}`);
      if (difference) return difference;
    }
    return null;
  }
  return `${at}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`;
};

if (process.argv.includes('--check')) {
  const actual = canonical(JSON.parse(readFileSync(path, 'utf8')));
  const expected = canonical(schema);
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`Schemas differ from TypeScript: ${firstDiff(actual, expected)}`);
} else {
  writeFileSync(path, text);
}
