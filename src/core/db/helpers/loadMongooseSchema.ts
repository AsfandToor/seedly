import path from 'path';
import { Column } from '../dialects/types.js';
import fs from 'fs/promises';
import { SchemaType } from 'mongoose';
import logger from '../../../logger.js';
export async function loadSchemaFromMongoose(
  modelPath: string,
  collectionName: string,
): Promise<Column[]> {
  let absPath = path.resolve(modelPath);

  // If it's a directory, resolve to <collectionName>.js/.ts
  const stat = await fs.stat(absPath);
  if (stat.isDirectory()) {
    let found = false;
    const jsPath = path.join(
      absPath,
      `${collectionName}.js`,
    );
    const tsPath = path.join(
      absPath,
      `${collectionName}.ts`,
    );
    try {
      await fs.access(jsPath);
      absPath = jsPath;
      found = true;
    } catch (e: any) {
      logger.error(e.message);
    }
    if (!found) {
      try {
        await fs.access(tsPath);
        absPath = tsPath;
        found = true;
      } catch (e: any) {
        logger.error(e.message);
      }
    }
    if (!found) {
      throw new Error(
        `No schema file found for collection "${collectionName}" in "${modelPath}"`,
      );
    }
  }
  if (absPath.endsWith('.ts')) {
    throw new Error(
      `Cannot import TypeScript file at runtime: "${absPath}".\n` +
        `Please compile it to .js using tsc or a build tool first.`,
    );
  }

  const imported = await import(absPath);

  type MaybeMongooseModel = {
    schema?: {
      paths?: Record<string, SchemaType>;
    };
  };

  const possibleExports = Object.values(
    imported,
  ) as MaybeMongooseModel[];

  const matched = possibleExports.find(
    (exp) => exp?.schema?.paths,
  );

  if (!matched || !matched.schema) {
    throw new Error(
      `Could not find Mongoose schema for "${collectionName}" in "${absPath}"`,
    );
  }

  const schemaPaths = matched.schema.paths as Record<
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
