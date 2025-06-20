import pg from 'pg';
import { Column, Dialect } from './types';
import { unknown } from 'zod';
import logger from '../../../logger';

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
      logger.info('before querying the table');
      console.log('before querying the table'); // Corrected typo here

      const res = await client.query(
        `
        SELECT
            a.attname AS column_name,
            -- format_type returns the full type name, like 'character varying(255)' or 'plantype'
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
            -- Check for primary key constraint
            EXISTS (
                SELECT 1
                FROM pg_constraint pc
                JOIN pg_index pi ON pc.conindid = pi.indexrelid
                WHERE pc.conrelid = a.attrelid
                  AND a.attnum = ANY(pi.indkey)
                  AND pc.contype = 'p'
            ) AS is_primary,
            a.attnum AS ordinal_position,
            -- Get enum values if type is an enum ('e')
            CASE WHEN t.typtype = 'e' THEN array_agg(e.enumlabel ORDER BY e.enumsortorder) ELSE NULL END AS enum_values
        FROM
            pg_catalog.pg_attribute a -- Columns
        JOIN
            pg_catalog.pg_class c ON a.attrelid = c.oid -- Tables
        JOIN
            pg_catalog.pg_namespace n ON c.relnamespace = n.oid -- Schemas
        LEFT JOIN
            pg_catalog.pg_type t ON a.atttypid = t.oid -- Types
        LEFT JOIN
            pg_catalog.pg_enum e ON t.oid = e.enumtypid -- Enum labels
        WHERE
            c.relname = $1 -- Table name
            AND n.nspname = 'public' -- Schema name
            AND a.attnum > 0 -- Exclude system columns
            AND NOT a.attisdropped -- Exclude dropped columns
        GROUP BY
            a.attname,
            pg_catalog.format_type(a.atttypid, a.atttypmod), -- Group by the formatted type
            is_primary, -- Group by boolean expression
            a.attnum,
            t.typtype
        ORDER BY
            a.attnum;
        `,
        [tableName],
      );

      const columns = res.rows.map((r) => {
        let parsedEnumValues: string[] | undefined;

        if (
          typeof r.enum_values === 'string' &&
          r.enum_values.startsWith('{') &&
          r.enum_values.endsWith('}')
        ) {
          parsedEnumValues = r.enum_values
            .substring(1, r.enum_values.length - 1)
            .split(',')
            .map((s: string) =>
              s.trim().replace(/^"|"$/g, ''),
            ); // <-- Fix: Explicitly type 's' as string

          if (parsedEnumValues!.length === 0) {
            parsedEnumValues = undefined;
          }
        } else if (Array.isArray(r.enum_values)) {
          parsedEnumValues = r.enum_values;
        }

        return {
          name: r.column_name,
          type: r.data_type,
          pk: r.is_primary,
          enumValues: parsedEnumValues,
        };
      });

      // --- ENHANCED CONSOLE.LOG FOR ENUM VALUES CHECK ---
      console.log(
        '--- Fetched Columns Details (PostgresDialect) ---',
      );
      columns.forEach((col) => {
        let details = `- Name: ${col.name}, Type: ${col.type}, PK: ${col.pk}`;
        if (
          col.enumValues !== undefined &&
          col.enumValues !== null
        ) {
          // More explicit check
          console.log(
            `DEBUG: col.name=${col.name}, col.enumValues type=${typeof col.enumValues}, col.enumValues value=`,
            col.enumValues,
          ); // <-- NEW DEBUG LINE
          if (Array.isArray(col.enumValues)) {
            // <-- Check if it's actually an array
            details += `, Enum Values: [${col.enumValues.join(', ')}]`;
          } else {
            // If it's not an array, log what it actually is
            details += `, Enum Values: (Not an array! Actual Type: ${typeof col.enumValues}, Value: ${JSON.stringify(col.enumValues)})`;
          }
        } else {
          details += `, Enum Values: ${col.enumValues === null ? 'null' : 'undefined'}`; // For clarity if null/undefined
        }
        console.log(details);
      });
      console.log(
        '--------------------------------------------------',
      );
      // --- END ENHANCED CONSOLE.LOG ---

      return columns;
    } catch (err: any) {
      logger.error(
        {
          error: err.message,
          code: err.code,
          stack: err.stack,
        },
        'Error in getColumns query.',
      );
      console.error(
        'after querying the table (catch block): ',
        err,
      );
      throw err; // Re-throw the original error for upstream handling
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
