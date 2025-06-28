// db/dialects/mongodb.ts

import { MongoClient } from 'mongodb';
import { Dialect, Column } from './types.js';
import logger from '../../../logger.js';
import { loadSchemaFromMongoose } from '../helpers/loadMongooseSchema';
import { inferSchemaFromDocs } from '../helpers/inferSchemaFromDocs';

export class MongoDBDialect implements Dialect {
  private client: MongoClient;
  private isConnected: boolean = false;

  constructor(
    private uri: string,
    private dbName: string,
    private modelPath?: string,
  ) {
    this.client = new MongoClient(this.uri);
  }

  private async ensureConnected() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      logger.info(`Connected to MongoDB: ${this.uri}`);
    }
  }
  async runQuery(query: string): Promise<any> {
  await this.ensureConnected();
  const db = this.client.db(this.dbName);

  try {
    const parsed = JSON.parse(query); // query must be JSON
    const { collection, action, filter = {}, update = {}, options = {} } = parsed;

    switch (action) {
      case 'find':
        return await db.collection(collection).find(filter, options).toArray();

      case 'insertOne':
        return await db.collection(collection).insertOne(filter);

      case 'updateOne':
        return await db.collection(collection).updateOne(filter, update);

      case 'deleteOne':
        return await db.collection(collection).deleteOne(filter);

      default:
        throw new Error(`Unsupported MongoDB action: ${action}`);
    }
  } catch (err) {
    throw new Error(`Invalid MongoDB runQuery input. Expected JSON string. Error: ${(err as Error).message}`);
  }
}

  async close(): Promise<void> {
    await this.client.close();
    logger.info('MongoDB connection closed');
  }

  async listTables(): Promise<string[]> {
    await this.ensureConnected();
    const db = this.client.db(this.dbName);
    const collections = await db.listCollections().toArray();
    return collections.map((col) => col.name);
  }

  async getSchema(): Promise<string> {
    await this.ensureConnected();
    const collections = await this.listTables();
    const schemaParts: string[] = [];

    for (const name of collections) {
      try {
        const columns = await this.getColumns(name);
        const colLines = columns.map(
          (col) => `  ${col.name}: ${col.type}`,
        );
        schemaParts.push(
          `Collection ${name} {\n${colLines.join('\n')}\n}`,
        );
      } catch (err) {
        logger.warn(`Skipping "${name}" in schema due to error: ${(err as Error).message}`);
      }
    }

    return schemaParts.join('\n\n');
  }

  async getColumns(collectionName: string): Promise<Column[]> {
    await this.ensureConnected();
    const db = this.client.db(this.dbName);

    // 1. Try Mongoose schema
    if (this.modelPath) {
      try {
        const schema = await loadSchemaFromMongoose(this.modelPath, collectionName);
        logger.info(`Loaded Mongoose schema for ${collectionName}`);
        return schema;
      } catch (err) {
        logger.warn(`Mongoose load failed for ${collectionName}: ${(err as Error).message}`);
      }
    }

    // 2. Fallback to sampling
    const docs = await db.collection(collectionName).find().limit(5).toArray();
    if (!docs.length) {
      throw new Error(`Cannot infer schema for empty collection: ${collectionName}`);
    }

    const inferred = inferSchemaFromDocs(docs);
    logger.info(`Inferred schema from ${docs.length} documents`);
    return inferred;
  }

  async insertRows(
    collectionName: string,
    columns: string[],
    rows: any[][],
  ): Promise<void> {
    await this.ensureConnected();
    const db = this.client.db(this.dbName);
    const docs = rows.map((row) => {
      const doc: any = {};
      columns.forEach((col, i) => {
        doc[col] = row[i];
      });
      return doc;
    });

    await db.collection(collectionName).insertMany(docs);
    logger.info(`Inserted ${docs.length} docs into "${collectionName}"`);
  }
}
