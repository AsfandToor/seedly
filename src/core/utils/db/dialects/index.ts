import { SQLiteDialect } from './sqlite';
import type { Dialect } from './types';

export function getDialect(config: {
  type: 'sqlite';
  file: string;
}): Dialect {
  switch (config.type) {
    case 'sqlite':
      return new SQLiteDialect(config.file);
    // case 'postgres':
    //   return new PostgresDialect(config.connection);

    default:
      throw new Error(
        `Unsupported DB type: ${config.type}`,
      );
  }
}
