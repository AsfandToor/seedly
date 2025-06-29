// db/dialects/mongodb.ts

import { MongoClient } from 'mongodb';
import { Dialect, Column } from './types.js';
import logger from '../../../logger.js';
import { loadSchemaFromMongoose } from '../helpers/loadMongooseSchema';
import { inferSchemaFromDocs } from '../helpers/inferSchemaFromDocs';
import 'mcps-logger';
import path from 'path';
import fs from 'fs/promises';
export class MongoDBDialect implements Dialect {
  private client: MongoClient;
  private isConnected: boolean = false;

  constructor(
    private uri: string,
    private dbName: string,
    private modelPath?: string,
    private singleSchemaPath?: string,
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
      const {
        collection,
        action,
        filter = {},
        update = {},
        options = {},
      } = parsed;

      switch (action) {
        case 'find':
          return await db
            .collection(collection)
            .find(filter, options)
            .toArray();

        case 'insertOne':
          return await db
            .collection(collection)
            .insertOne(filter);

        case 'updateOne':
          return await db
            .collection(collection)
            .updateOne(filter, update);

        case 'deleteOne':
          return await db
            .collection(collection)
            .deleteOne(filter);

        default:
          throw new Error(
            `Unsupported MongoDB action: ${action}`,
          );
      }
    } catch (err) {
      throw new Error(
        `Invalid MongoDB runQuery input. Expected JSON string. Error: ${
          (err as Error).message
        }`,
      );
    }
  }

  async close(): Promise<void> {
    await this.client.close();
    logger.info('MongoDB connection closed');
  }

  async listTables(): Promise<string[]> {
    await this.ensureConnected();
    const db = this.client.db(this.dbName);
    const collections = await db
      .listCollections()
      .toArray();
    return collections.map((col) => col.name);
  }

  async getSchema(): Promise<string> {
    /**
     * here there are two options.
     * when we get collections, we will only get filled collections
     * if for instance, we pass model-path option as well and that collection is not in the database
     * then we have to provide some context to the LLM on how to seed. Otther wise the llm will simply
     * reply with "there is no such table."
     */
    await this.ensureConnected();

    const schemaParts: string[] = [];

    const dbCollections = new Set(await this.listTables());

    const modelCollections = new Set<string>();
    if (this.modelPath) {
      console.warn('the model path is ', this.modelPath);
      try {
        const files = await fs.readdir(this.modelPath);
        for (const file of files) {
          console.log('Raw file:', JSON.stringify(file)); // show exact string
          if (
            file.endsWith('.js') ||
            file.endsWith('.ts')
          ) {
            const name = file.replace(/\.(js|ts)$/, '');
            console.log(
              'Adding to modelCollections:',
              name,
            );
            modelCollections.add(name);
            console.log(
              'model collecttions just after assignign',
              [...modelCollections],
            );
          }
        }
      } catch (err) {
        console.warn(
          `Failed to read model path: ${
            (err as Error).message
          }`,
        );
      }
    }
    console.log('the model collections are ', [
      ...modelCollections,
    ]);
    const allCollections = new Set([
      ...dbCollections,
      ...modelCollections,
    ]);

    for (const name of allCollections) {
      try {
        const columns = await this.getColumns(name);
        const colLines = columns.map(
          (col) => `  ${col.name}: ${col.type}`,
        );
        schemaParts.push(
          `Collection ${name} {\n${colLines.join('\n')}\n}`,
        );
      } catch (err) {
        console.log(
          `Skipping "${name}" in schema due to error: ${
            (err as Error).message
          }`,
        );
        logger.warn(
          `Skipping "${name}" in schema due to error: ${
            (err as Error).message
          }`,
        );
      }
    }
    console.warn(
      'teh schema parts are ',
      schemaParts.join('\n\n'),
    );
    return schemaParts.join('\n\n');
  }

  async getColumns(
    collectionName: string,
  ): Promise<Column[]> {
    await this.ensureConnected();
    const db = this.client.db(this.dbName);
    if (this.modelPath) {
      try {
        const schema = await loadSchemaFromMongoose(
          this.modelPath,
          collectionName,
        );
        logger.info(
          `Loaded Mongoose schema for ${collectionName}`,
        );
        console.log(
          `Loaded Mongoose schema for ${collectionName}`,
        );
        return schema;
      } catch (err) {
        logger.warn(
          `Mongoose load failed for ${collectionName}: ${
            (err as Error).message
          }`,
        );
        console.warn(
          `Mongoose load failed for ${collectionName}: ${
            (err as Error).message
          }`,
        );
      }
    }
    if (this.singleSchemaPath) {
      try {
        const schema = await loadSchemaFromMongoose(
          this.singleSchemaPath,
          collectionName,
        );
        logger.info(
          `Loaded Mongoose schema for ${collectionName} from singleSchemaFile`,
        );
        return schema;
      } catch (err) {
        logger.warn(
          `No schema found for ${collectionName} in singleSchemaFile: ${
            (err as Error).message
          }`,
        );
        throw err;
      }
    }

    //Fallback to sampling
    const docs = await db
      .collection(collectionName)
      .find()
      .limit(5)
      .toArray();
    if (!docs.length) {
      throw new Error(
        `Cannot infer schema for empty collection: ${collectionName}`,
      );
    }

    const inferred = inferSchemaFromDocs(docs);
    logger.info(
      `Inferred schema from ${docs.length} documents`,
    );
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
    logger.info(
      `Inserted ${docs.length} docs into "${collectionName}"`,
    );
  }
}
