import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  SchemaType,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import logger from '../logger';
import { DialectConfig } from '@/core/db/dialects/types';
import 'dotenv/config';
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error(
    'GOOGLE_API_KEY environment variable not found.',
  );
}
// Init Google Gemini
const googleGenAi = new GoogleGenerativeAI(apiKey);

// MCP Client Setup
async function createMcpClient(dbConfig: DialectConfig) {
  const dbConfigString = JSON.stringify(dbConfig);
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      './dist/src/mcp/server.js',
      '--db-config',
      dbConfigString,
    ], // points to your Seeder MCP server
  });

  const client = new Client(
    { name: 'gemini-mcp-client', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  await client.connect(transport);
  return { client, transport };
}

// Gemini Function-Calling Demo
async function geminiWithFunctionCalling(
  prompt: string,
  dbConfig: any,
) {
  logger.info(
    '🤖 Gemini AI with Seeder MCP Tool Function Calling',
  );

  const { client, transport } =
    await createMcpClient(dbConfig);

  try {
    // Register tools
    const { tools } = await client.listTools();
    logger.info(
      `Available tools: ${tools.map((t) => t.name).join(', ')}`,
    );

    // Configure Gemini with MCP tools
    const model = googleGenAi.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [
        {
          functionDeclarations: [
            {
              name: 'seed-table',
              description:
                'Insert fake rows into a table based on its schema',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  tableName: { type: SchemaType.STRING },
                  count: { type: SchemaType.NUMBER },
                },
                required: ['tableName', 'count'],
              },
            },
            {
              name: 'query',
              description:
                'Run an SQL query on the database.',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  sql: {
                    type: SchemaType.STRING,
                    description: 'The SQL query to run.',
                  },
                },
                required: ['sql'],
              },
            },
          ],
        },
      ],
    });

    // Handles Gemini's function call requests
    async function handleFunctionCall(functionCall: any) {
      const { name, args } = functionCall;
      logger.info(`🔧 Gemini requested: ${name}`);
      logger.info(`📥 Args: ${JSON.stringify(args)}`);

      const result = await client.callTool({
        name,
        arguments: args,
      });

      return (result as any).content[0].text;
    }

    // Process a user query
    async function processQuery(userQuery: string) {
      logger.info(`\n🧠 User: "${userQuery}"`);
      const schemaResult = await client.readResource({
        uri: 'schema://main',
      });
      const schemaText = schemaResult.contents[0].text;
      const systemContext = [
        {
          role: 'user',
          parts: [
            {
              text:
                'The following is the schema of the SQLite database you are interacting with:\n\n' +
                schemaText,
            },
          ],
        },
      ];

      const result = await model.generateContent({
        contents: [
          ...systemContext,
          { role: 'user', parts: [{ text: userQuery }] },
        ],
      });

      const response = result.response;
      const part =
        response?.candidates?.[0]?.content?.parts?.[0];

      if (part?.functionCall) {
        const functionCall = part.functionCall;
        const toolResult =
          await handleFunctionCall(functionCall);

        const finalResult = await model.generateContent({
          contents: [
            { role: 'user', parts: [{ text: userQuery }] },
            { role: 'model', parts: [{ functionCall }] },
            { role: 'user', parts: [{ text: toolResult }] },
          ],
        });

        return finalResult.response.text();
      }

      return response.text();
    }

    // Run a few demo queries
    // const queries = [
    //   prompt
    // ];

    // for (const [i, query] of queries.entries()) {
    //   logger.info(`\n▶️ Demo #${i + 1}`);
    //   const response = await processQuery(query);
    //   logger.info('\n💬 Gemini says:\n' + '-'.repeat(40));
    //   logger.info(response);
    //   logger.info('-'.repeat(40));
    //   await new Promise((res) => setTimeout(res, 1500));
    // }
    const response = await processQuery(prompt);
    logger.info(response);
  } catch (err) {
    logger.error(err);
  } finally {
    await transport.close();
    logger.info('👋 Closed transport');
  }
}
export default geminiWithFunctionCalling;
