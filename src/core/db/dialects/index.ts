import { DialectConfig } from './types.js';
import { SQLiteDialect } from './sqlite.js';
import { PostgresDialect } from './postgres.js';
import { MysqlDialect } from './mysql.js';
import logger from '../../../logger.js';

export function getDialect(config: DialectConfig) {
  logger.warn('The file is coming up next');
  if (config.type === 'sqlite') {
    logger.info(config.file);
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
