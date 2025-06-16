import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { Dialect, Column } from './types';

export class SQLiteDialect implements Dialect {
  private db: sqlite3.Database;
  private all: any;
  private run: any;
  private closeFn: any;

  constructor(filename: string) {
    this.db = new sqlite3.Database(filename);
    this.all = promisify(this.db.all.bind(this.db));
    this.run = (...args: Parameters<typeof this.db.run>) =>
      new Promise<void>((resolve, reject) => {
        this.db.run(...args, function (err: any) {
          if (err) reject(err);
          else resolve();
        });
      });
    this.closeFn = promisify(this.db.close.bind(this.db));
  }

  async listTables(): Promise<string[]> {
    const rows = await this.all(
      `SELECT name FROM sqlite_master WHERE type='table'`,
    );
    return rows.map((row: any) => row.name);
  }

  async getSchema(): Promise<string> {
    const tables = await this.all(
      "SELECT sql FROM sqlite_master WHERE type='table'",
    );
    return tables
      .map((t: { sql: string }) => t.sql)
      .join('\n');
  }
  async runQuery(sql: string): Promise<string> {
    const rows = await this.all(sql);
    return rows;
  }
  async getColumns(tableName: string): Promise<Column[]> {
    return await this.all(
      `PRAGMA table_info(${tableName})`,
    );
  }

  async insertRows(
    tableName: string,
    colNames: string[],
    rows: any[][],
  ): Promise<void> {
    const placeholders = colNames.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`;
    for (const row of rows) {
      await this.run(sql, row);
    }
  }

  async close() {
    await this.closeFn();
  }
}
