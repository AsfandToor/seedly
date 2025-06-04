import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { faker } from '@faker-js/faker';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
const googleGenAi = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY!,
);
const model = googleGenAi.getGenerativeModel({
  model: 'gemini-1.5-flash',
});
const server = new McpServer({
  name: 'seeder',
  version: '1.0.0',
});

const columnPromptCache = new Map();

async function generateValueWithLLM(
  column: {
    name: string;
    type: string;
  },
  count: number,
) {
  const key = `${column.name}:${column.type}:${count}`;
  if (columnPromptCache.has(key))
    return columnPromptCache.get(key);

  const prompt = `Generate ${count} fake values for a SQL column named "${column.name}" of type "${column.type}". Return the data as a JSON array, nothing else. Each value should be realistic.`;

  const res = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const response = res.response.text().trim();
  try {
    const clean = response
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      throw new Error('Not an array');
    }
    columnPromptCache.set(key, parsed);
    return parsed;
  } catch (err) {
    console.error(
      `Failed to parse LLM response: ${response}`,
    );
    throw new Error(
      `Invalid LLM response for column ${column.name}`,
    );
  }
}

const getDb = () => {
  const db = new sqlite3.Database('database.db');
  return {
    all: promisify<string, any[]>(db.all.bind(db)),
    run: (...args: Parameters<typeof db.run>) =>
      new Promise<void>((resolve, reject) => {
        db.run(...args, function (err: any) {
          if (err) reject(err);
          else resolve();
        });
      }),

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
server.tool(
  'seed-table',
  {
    tableName: z.string(),
    count: z.number().min(1).max(100),
  },
  async ({ tableName, count }) => {
    const db = getDb();

    const generateValue = (column: any) => {
      const name = column.name.toLowerCase();
      const type = column.type.toLowerCase();

      if (type.includes('int')) {
        if (name.includes('age'))
          return faker.number.int({ min: 10, max: 104 });
        return faker.number.int({ min: 1, max: 10000 });
      }

      if (
        type.includes('real') ||
        type.includes('float') ||
        type.includes('double')
      )
        return faker.number.float({ min: 0, max: 1000 });

      if (type.includes('char') || type.includes('text')) {
        if (name.includes('name'))
          return faker.person.fullName();
        if (name.includes('email'))
          return faker.internet.email();
        if (name.includes('username'))
          return faker.internet.userName();
        if (name.includes('phone'))
          return faker.phone.number();
        if (name.includes('city'))
          return faker.location.city();
        if (name.includes('country'))
          return faker.location.country();
        if (name.includes('address'))
          return faker.location.streetAddress();
        if (name.includes('bio'))
          return faker.lorem.sentence();
        return faker.word.words();
      }

      if (type.includes('bool'))
        return faker.datatype.boolean() ? 1 : 0;

      if (type.includes('date') || name.includes('date'))
        return faker.date
          .past()
          .toISOString()
          .split('T')[0];

      return null;
    };

    try {
      const columns = await db.all(
        `PRAGMA table_info(${tableName})`,
      );
      if (columns.length === 0)
        throw new Error(
          `Table "${tableName}" does not exist.`,
        );

      const insertableColumns = columns.filter(
        (col) =>
          !col.pk && !col.name.toLowerCase().includes('id'),
      );
      const colNames = insertableColumns.map((c) => c.name);
      const placeholders = colNames
        .map(() => '?')
        .join(', ');
      const insertSQL = `INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`;
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

      for (let i = 0; i < count; i++) {
        // const values = insertableColumns.map(generateValue); //if condition implementation
        const rowValues = valueMatrix.map(
          (colVals) => colVals[i],
        );
        await db.run(insertSQL, rowValues);
      }

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
    } finally {
      await db.close();
    }
  },
);
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
