import 'esbuild-register/dist/node';
import { Command } from 'commander';
import { Seedly } from '../mcp/client';

// Usage examples:
/**
 * Postgres:
 * node dist/cli/index.js start \
 *   --dialect postgres \
 *   --host localhost \
 *   --port 5432 \
 *   --user postgres \
 *   --password "" \
 *   --database gen_backend_v2_development \
 *   "seed the users table with 5 records"
 *
 * MongoDB (with optional model dir):
 * node dist/cli/index.js start "Seed the users collection with 10 records" \
 *   --dialect mongodb \
 *   --uri mongodb://localhost:27017 \
 *   --database test \
 *   --models-dir ./models
 *
 * MongoDB (with --single-schema for new collections):
 * node dist/cli/index.js start "Seed the logs collection with 5 entries" \
 *   --dialect mongodb \
 *   --uri mongodb://localhost:27017 \
 *   --database test \
 *   --single-schema ./schemas/logs.js
 *
 * SQLite:
 * node dist/cli/index.js start "seed the users table with 5 records" \
 *   --dialect sqlite \
 *   --file database.db
 */

const program = new Command();

program
  .name('seedly')
  .description(
    'An AI-based Seeding Agent that uses MCP to understand DB schemas and seed fake data.',
  )
  .version('1.0.0');

function attachDbOptions(cmd: Command) {
  return cmd
    .option(
      '--dialect <dialect>',
      'Database dialect (sqlite, postgres, mysql, mongodb)',
      'sqlite',
    )
    .option('--file <path>', 'SQLite file path')
    .option('--host <host>', 'DB host')
    .option('--port <port>', 'DB port')
    .option('--user <user>', 'DB user')
    .option('--password <password>', 'DB password')
    .option('--database <name>', 'Database name')
    .option(
      '--uri <uri>',
      'MongoDB connection string (e.g., mongodb://localhost:27017)',
    )
    .option(
      '--models-dir <path>',
      'Path to Mongoose models directory (for enhancing existing collections)',
    )
    .option(
      '--single-schema <path>',
      'Path to a single schema file for a new collection',
    )
    .argument('<prompt>', 'Your natural language query');
}

function extractDbConfig(options: any) {
  return {
    type: options.dialect,
    file: options.file,
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
    uri: options.uri,
    modelPath: options.modelsDir,
    singleSchemaPath: options.singleSchema,
  };
}

attachDbOptions(program.command('start'))
  .description(
    'Start the MCP seeding agent and run the prompt',
  )
  .action(async (prompt, options) => {
    const dbConfig = extractDbConfig(options);
    const seedingAgent = new Seedly({ dbConfig });
    await seedingAgent.initialize();
    await seedingAgent.invoke(prompt);
    await seedingAgent.close();
    process.exit(0);
  });

program.parse(process.argv);
