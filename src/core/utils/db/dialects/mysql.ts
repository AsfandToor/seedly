import mysql from 'mysql2/promise';
import { Column, Dialect } from './types';

export class MysqlDialect implements Dialect {
  private pool: mysql.Pool;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    this.pool = mysql.createPool(config);
  }

  async listTables(): Promise<string[]> {
    const [rows] = await this.pool.query<
      mysql.RowDataPacket[]
    >(`
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
    `);
    return rows.map((r: any) => r.TABLE_NAME);
  }

  async getSchema(): Promise<string> {
    const tables = await this.listTables();
    let schema = '';

    for (const table of tables) {
      const [columns] = await this.pool.query<
        mysql.RowDataPacket[]
      >(`SHOW COLUMNS FROM \`${table}\``);
      const defs = columns.map(
        (col: any) =>
          `  ${col.Field} ${col.Type}${col.Key === 'PRI' ? ' PRIMARY KEY' : ''}`,
      );
      schema += `CREATE TABLE ${table} (\n${defs.join(',\n')}\n);\n\n`;
    }

    return schema.trim();
  }

  async getColumns(tableName: string): Promise<Column[]> {
    const [columns] = await this.pool.query<
      mysql.RowDataPacket[]
    >(`SHOW COLUMNS FROM \`${tableName}\``);
    return columns.map((col: any) => ({
      name: col.Field,
      type: col.Type,
      pk: col.Key === 'PRI',
    }));
  }

  async insertRows(
    tableName: string,
    columns: string[],
    rows: any[][],
  ): Promise<void> {
    const colList = columns
      .map((c) => `\`${c}\``)
      .join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`;

    for (const row of rows) {
      await this.pool.query(sql, row);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
