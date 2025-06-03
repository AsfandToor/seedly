import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const server = new McpServer({
  name: 'seeder',
  version: '1.0.0',
});

const getDb = () => {
  const db = new sqlite3.Database('database.db');
  return {
    all: promisify<string, any[]>(db.all.bind(db)),
    close: promisify(db.close.bind(db)),
  };
};

server.tool(
  'list-tables',
  { all: z.boolean() },
  async ({ all }) => ({
    content: [{ type: 'text', text: String(all) }],
  }),
);

server.tool(
  'query',
  { sql: z.string() },
  async ({ sql }) => {
    const db = getDb();
    try {
      const results = await db.all(sql);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      await db.close();
    }
  },
);

server.resource(
  'tables',
  new ResourceTemplate('tables://{name}', {
    list: undefined,
  }),
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Tables: ${name}`,
      },
    ],
  }),
);

server.resource('schema', 'schema://main', async (uri) => {
  const db = getDb();
  try {
    const tables = await db.all(
      "SELECT sql FROM sqlite_master WHERE type='table'",
    );
    return {
      contents: [
        {
          uri: uri.href,
          text: tables
            .map((t: { sql: string }) => t.sql)
            .join('\n'),
        },
      ],
    };
  } finally {
    await db.close();
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down Airweave MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down Airweave MCP server...');
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
