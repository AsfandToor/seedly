import { Column } from '../dialects/types.js';

function inferType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const type = typeof value;
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return Number.isInteger(value) ? 'int' : 'float';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    default:
      return 'unknown';
  }
}

export function inferSchemaFromDocs(
  docs: object[],
): Column[] {
  const fieldTypes: Record<string, Set<string>> = {};

  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldTypes[key]) fieldTypes[key] = new Set();
      fieldTypes[key].add(inferType(value));
    }
  }

  const result: Column[] = [];

  for (const [field, types] of Object.entries(fieldTypes)) {
    const typeArray = Array.from(types);
    let finalType: string;

    if (typeArray.length === 1) {
      finalType = typeArray[0];
    } else {
      finalType = typeArray.join('|');
    }

    result.push({
      name: field,
      type: finalType,
      pk: field === '_id',
      enumValues: undefined,
    });
  }

  return result;
}
