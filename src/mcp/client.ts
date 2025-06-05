import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  SchemaType,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Init Google Gemini
const googleGenAi = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY!,
);

// MCP Client Setup
async function createMcpClient() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/src/mcp/server.js'], // points to your Seeder MCP server
  });

  const client = new Client(
    { name: 'gemini-mcp-client', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  await client.connect(transport);
  return { client, transport };
}

// Gemini Function-Calling Demo
async function geminiWithFunctionCalling() {
  console.log(
    '🤖 Gemini AI with Seeder MCP Tool Function Calling',
  );

  const { client, transport } = await createMcpClient();

  try {
    // Register tools
    const { tools } = await client.listTools();
    console.log(
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
                'Run an SQL query on the SQLite database.',
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
      console.log(`🔧 Gemini requested: ${name}`);
      console.log(`📥 Args: ${JSON.stringify(args)}`);

      const result = await client.callTool({
        name,
        arguments: args,
      });

      return (result as any).content[0].text;
    }

    // Process a user query
    async function processQuery(userQuery: string) {
      console.log(`\n🧠 User: "${userQuery}"`);
      const schemaResult = await client.readResource({
        uri: 'schema://main',
      });
      const schemaText = schemaResult.contents[0].text;
      console.log('the schema is ', schemaText);
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
    const queries = [
      'seed order tables in the database with 10 records',
      'find out how many rows are in the table test',
    ];

    for (const [i, query] of queries.entries()) {
      console.log(`\n▶️ Demo #${i + 1}`);
      const response = await processQuery(query);
      console.log('\n💬 Gemini says:\n' + '-'.repeat(40));
      console.log(response);
      console.log('-'.repeat(40));
      await new Promise((res) => setTimeout(res, 1500));
    }
  } catch (err) {
    console.error('🚨 Error:', err);
  } finally {
    await transport.close();
    console.log('👋 Closed transport');
  }
}

geminiWithFunctionCalling().catch(console.error);
