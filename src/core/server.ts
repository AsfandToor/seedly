import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
export default class SeederMCPServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'seeder',
      version: '1.0.0',
    });
  }
  getDb = () => {
    const db = new sqlite3.Database('database.db');
    return {
      all: promisify<string, any[]>(db.all.bind(db)),
      close: promisify(db.close.bind(db)),
    };
  };
  public async addTool() {
    this.server.tool(
      'list-tables',
      { all: z.boolean() },
      async ({ all }) => ({
        content: [{ type: 'text', text: String(all) }],
      }),
    );
    this.server.tool(
      'query',
      { sql: z.string() },
      async ({ sql }) => {
        const db = this.getDb();
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
  }

  public async addResource() {
    this.server.resource(
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
    this.server.resource(
      'schema',
      'schema://main',
      async (uri) => {
        const db = this.getDb();
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
      },
    );
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this.addTool();
    await this.addResource();
    await this.server.connect(transport);
  }
}
