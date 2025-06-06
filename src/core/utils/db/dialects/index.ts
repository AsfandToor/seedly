import { DialectConfig } from './types';
import { SQLiteDialect } from './sqlite';
import { PostgresDialect } from './postgres';
import { MysqlDialect } from './mysql';

export function getDialect(config: DialectConfig) {
  if (config.type === 'sqlite') {
    return new SQLiteDialect(config.file);
  } else if (config.type === 'postgres') {
    return new PostgresDialect({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  } else if (config.type === 'mysql') {
    return new MysqlDialect({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  }

  throw new Error(`Unsupported dialect: ${config.type}`);
}
