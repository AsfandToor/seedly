import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { generateValueWithLLM } from '../core/data-generator';
import { getDialect } from '../core/utils/db/dialects';
import { DialectConfig } from '@/core/utils/db/dialects/types';
import logger from '../logger';
//add the line below to turn on debug mode and send logs to mcps-logger
// import 'mcps-logger/console';
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

const dialect = getDialect(dbConfig);

server.resource('schema', 'schema://main', async (uri) => {
  console.log(
    'SERVER: >>> Schema resource handler ENTERED',
  ); // TEMPORARY
  logger.debug('Schema resource requested.');
  const schema = await dialect.getSchema();
  logger.debug(schema);
  return {
    contents: [
      {
        uri: uri.href,
        text: schema,
      },
    ],
  };
});

server.tool(
  'seed-table',
  {
    tableName: z.string(),
    count: z.number().min(1).max(100),
  },
  async ({ tableName, count }) => {
    try {
      console.log(
        `SERVER_DEBUG: Entering 'seed-table' tool for table: ${tableName}, count: ${count}`,
      );
      logger.info(
        `Tool 'seed-table' called for table: ${tableName}, count: ${count}`,
      );
      const columns = await dialect.getColumns(tableName);
      logger.warn(columns);
      if (columns.length === 0) {
        throw new Error(
          `Table "${tableName}" does not exist.`,
        );
      }

      const insertableColumns = columns.filter(
        (col) =>
          !col.pk && !col.name.toLowerCase().includes('id'),
      );
      const colNames = insertableColumns.map((c) => c.name);

      const valueMatrix: any[][] = []; // [row][col]
      for (const col of insertableColumns) {
        const values = await generateValueWithLLM(
          col,
          count,
        );
        if (values.length < count) {
          throw new Error(
            `LLM returned insufficient values for ${col.name}`,
          );
        }
        valueMatrix.push(values);
      }
      const rows = Array.from({ length: count }, (_, i) =>
        valueMatrix.map((colVals) => colVals[i]),
      );

      await dialect.insertRows(tableName, colNames, rows);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully inserted ${count} fake rows into "${tableName}"`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
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
  console.error(
    'Fatal error in Airweave MCP server:',
    error,
  );
  process.exit(1);
});
