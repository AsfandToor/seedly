import pg from 'pg';
import { Dialect } from './types';
import { unknown } from 'zod';

interface Column {
  name: string;
  type: string;
  pk: boolean;
}

export class PostgresDialect implements Dialect {
  private pool: pg.Pool;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    this.pool = new pg.Pool(config);
  }

  async listTables(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
      `);
      return res.rows.map((r: any) => r.table_name);
    } finally {
      client.release();
    }
  }

  async getSchema(): Promise<string> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);

      const grouped: Record<string, string[]> = {};

      for (const row of res.rows) {
        if (!grouped[row.table_name]) {
          grouped[row.table_name] = [];
        }
        grouped[row.table_name].push(
          `${row.column_name} ${row.data_type}`,
        );
      }

      return Object.entries(grouped)
        .map(
          ([table, columns]: [string, string[]]) =>
            `CREATE TABLE ${table} (\n  ${columns.join(',\n  ')}\n);`,
        )
        .join('\n\n');
    } finally {
      client.release();
    }
  }

  async getColumns(tableName: string): Promise<Column[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `
        SELECT 
          c.column_name,
          c.data_type,
          (tc.constraint_type = 'PRIMARY KEY') AS is_primary
        FROM 
          information_schema.columns c
        LEFT JOIN 
          information_schema.key_column_usage kcu
          ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
        LEFT JOIN 
          information_schema.table_constraints tc
          ON tc.constraint_name = kcu.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
        WHERE 
          c.table_name = $1
      `,
        [tableName],
      );

      return res.rows.map((r) => ({
        name: r.column_name,
        type: r.data_type,
        pk: r.is_primary,
      }));
    } finally {
      client.release();
    }
  }

  async insertRows(
    tableName: string,
    columns: string[],
    rows: any[][],
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const colList = columns
        .map((c) => `"${c}"`)
        .join(', ');
      for (const row of rows) {
        const placeholders = row
          .map((_, i) => `$${i + 1}`)
          .join(', ');
        await client.query(
          `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`,
          row,
        );
      }
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
