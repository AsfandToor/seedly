export type Column = {
  name: string;
  type: string;
  pk?: boolean;
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
