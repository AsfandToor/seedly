import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { generateValueWithLLM } from '../core/data-generator';
import { getDialect } from '../core/utils/db/dialects';

const server = new McpServer({
  name: 'seeder',
  version: '1.0.0',
});

// const getDb = () => {
//   const db = new sqlite3.Database('database.db');
//   return {
//     all: promisify<string, any[]>(db.all.bind(db)),
//     run: (...args: Parameters<typeof db.run>) =>
//       new Promise<void>((resolve, reject) => {
//         db.run(...args, function (err: any) {
//           if (err) reject(err);
//           else resolve();
//         });
//       }),

//     close: promisify(db.close.bind(db)),
//   };
// };
const dialect = getDialect({
  type: 'sqlite',
  file: 'database.db',
});
// server.tool(
//   'query',
//   { sql: z.string() },
//   async ({ sql }) => {
//     const db = getDb();
//     try {
//       const results = await db.all(sql);
//       return {
//         content: [
//           {
//             type: 'text',
//             text: JSON.stringify(results, null, 2),
//           },
//         ],
//       };
//     } catch (err: unknown) {
//       const error = err as Error;
//       return {
//         content: [
//           {
//             type: 'text',
//             text: `Error: ${error.message}`,
//           },
//         ],
//         isError: true,
//       };
//     } finally {
//       await db.close();
//     }
//   },
// );

server.resource('schema', 'schema://main', async (uri) => {
  const schema = await dialect.getSchema();
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
      const columns = await dialect.getColumns(tableName);

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
      // const placeholders = colNames
      //   .map(() => '?')
      //   .join(', ');
      // const insertSQL = `INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`;
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

      // for (let i = 0; i < count; i++) {
      //   const rowValues = valueMatrix.map(
      //     (colVals) => colVals[i],
      //   );
      //   await db.run(insertSQL, rowValues);
      // }
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
