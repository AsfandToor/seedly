import path from 'path';
import { Column } from '../dialects/types.js';
import mongoose, { SchemaType } from 'mongoose';

export async function loadSchemaFromMongoose(
  modelPath: string,
  collectionName: string,
): Promise<Column[]> {
  const absPath = path.resolve(modelPath);
  const imported = await import(absPath);
  const modelExport =
    imported.default || imported[collectionName];

  if (!modelExport || !modelExport.schema) {
    throw new Error(
      `Could not find Mongoose schema for "${collectionName}" in "${modelPath}"`,
    );
  }

  const schemaPaths = modelExport.schema.paths as Record<
    string,
    SchemaType
  >;
  const columns: Column[] = [];

  for (const [field, descriptor] of Object.entries(
    schemaPaths,
  )) {
    const typeName =
      descriptor.instance?.toLowerCase?.() || 'unknown';

    columns.push({
      name: field,
      type: typeName,
      pk: field === '_id',
      enumValues:
        Array.isArray((descriptor as any).enumValues) &&
        (descriptor as any).enumValues.length > 0
          ? (descriptor as any).enumValues
          : undefined,
    });
  }

  return columns;
}
