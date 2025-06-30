 
import { generateValueWithLLM } from '../core/data-generator.js';
import { getDialect } from '../core/db/dialects/index.js';
import { DialectConfig } from '../core/db/dialects/types.js';
import logger from '../logger.js';

export class Seedly {
  private dialect;
  private dialectType: string;

  constructor(config: DialectConfig) {
    this.dialect = getDialect(config);
    this.dialectType = config.type;
  }
  //query tool
  async schemaResource(uri: any): Promise<any> {
    try {
      console.log(
        'SERVER: >>> Schema resource handler ENTERED',
      ); // TEMPORARY
      logger.debug('Schema resource requested.');
      const schema = await this.dialect.getSchema();
      logger.debug(schema);
      return {
        contents: [
          {
            uri: uri.href,
            text: schema,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
  async query(queryString: string): Promise<any> {
    try {
      logger.info(`Tool 'query' called`);
      const response =
        await this.dialect.runQuery(queryString);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
  async seedTool(
    tableName: string,
    count: number,
  ): Promise<any> {
    try {
      logger.info(
        `Tool 'seed-table' called for table: ${tableName}, count: ${count}`,
      );
      const columns =
        await this.dialect.getColumns(tableName);
      logger.warn(columns);
      if (columns.length === 0) {
        throw new Error(
          `Table "${tableName}" does not exist.`,
        );
      }

      const insertableColumns = columns.filter(
        (col) =>
          !col.pk && !col.name.toLowerCase().includes('id'),
      );
      const colNames = insertableColumns.map((c) => c.name);

      const valueMatrix: any[][] = []; // [row][col]
      for (const col of insertableColumns) {
        const values = await generateValueWithLLM(
          col,
          count,
          this.dialectType === 'mongodb' ? 'nosql' : 'sql',
        );
        if (values.length < count) {
          throw new Error(
            `LLM returned insufficient values for ${col.name}`,
          );
        }
        valueMatrix.push(values);
      }
      const rows = Array.from({ length: count }, (_, i) =>
        valueMatrix.map((colVals) => colVals[i]),
      );
      await this.dialect.insertRows(
        tableName,
        colNames,
        rows,
      );
      return {
        content: [
          {
            type: 'text',
            text: `Successfully inserted ${count} fake rows into "${tableName}"`,
          },
        ],
      };
    } catch (err) {
      console.log(
        'the error from the tools file is ',
        (err as Error).message,
      );
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
