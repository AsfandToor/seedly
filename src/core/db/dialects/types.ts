export type Column = {
  name: string;
  type: string;
  pk?: boolean;
  enumValues?: string[];
};

export interface Dialect {
  listTables(): Promise<string[]>;
  getSchema(): Promise<string>;
  getColumns(tableName: string): Promise<Column[]>;
  insertRows(
    tableName: string,
    columns: string[],
    rows: any[][],
  ): Promise<void>;
  close(): Promise<void>;
}

export type DialectConfig =
  | {
      type: 'sqlite';
      file: string;
    }
  | {
      type: 'postgres' | 'mysql';
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
