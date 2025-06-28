import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import logger from '../logger.js';
import { Seedly } from './tools.js';
//add the line below to turn on debug mode and send logs to mcps-logger
import 'mcps-logger/console';
const server = new McpServer({
  name: 'seeder',
  version: '1.0.0',
  //turn on and use with  npx mcps-logger  to see server logs with the inspector
  // capabilities: {
  //   logging: {},
  // },
});
const args = process.argv.slice(2); // The first two elements are 'node' and the script path

let dbConfig: any = {};
const dbConfigArgIndex = args.indexOf('--db-config');

if (dbConfigArgIndex !== -1 && args[dbConfigArgIndex + 1]) {
  try {
    dbConfig = JSON.parse(args[dbConfigArgIndex + 1]);
  } catch (e: any) {
    logger.error(
      { error: e.message, arg: args[dbConfigArgIndex + 1] },
      'Failed to parse --db-config argument as JSON.',
    );
    process.exit(1); // Exit if config is malformed
  }
} else {
  logger.warn(
    'No --db-config argument found or it was empty. Proceeding without DB configuration.',
  );
  process.exit(1); // Exit if config is malformed
}
const seedly = new Seedly(dbConfig);
// const dialect = getDialect(dbConfig);

server.resource('schema', 'schema://main', async (uri) => {
  const result = await seedly.schemaResource(uri);
  return result;
});
server.tool(
  'query',
  'Executes a SQL query against the database and returns the result.',
  {
    queryString: z
      .string()
      .describe('The SQL query string to execute.'),
  },
  async ({ queryString }) => {
    const result = await seedly.query(queryString);
    return result;
  },
);
server.tool(
  'seed-table',
  'Generates and inserts fake data into a specified database table.',
  {
    tableName: z
      .string()
      .describe('The name of the table to seed data into.'),
    count: z
      .number()
      .min(1)
      .max(100)
      .describe(
        'The number of fake rows to generate and insert (between 1 and 100).',
      ),
  },

  async ({ tableName, count }) => {
    const result = await seedly.seedTool(tableName, count);
    logger.info('JUST BEFORE RETURNING THE RESULT');
    logger.info(result);
    return result;
  },
);
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down MCP server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
