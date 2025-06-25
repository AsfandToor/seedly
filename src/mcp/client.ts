import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { HumanMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import logger from '../logger.js';
import { DialectConfig } from '../core/db/dialects/types.js';
import 'dotenv/config';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { DynamicStructuredTool } from '@langchain/core/tools';
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error(
    'GOOGLE_API_KEY environment variable not found.',
  );
}
interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}
export enum LLMProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
}

interface SeedlyConfig {
  dbConfig: DialectConfig;
  modelProvider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export class Seedly {
  private agent?: ReturnType<typeof createReactAgent>;
  private model: ChatGoogleGenerativeAI;
  private tools: any[] = [];
  private mcpClient?: Client;
  private transport?: StdioClientTransport;
  private dbConfig: DialectConfig;
  private modelProvider: LLMProvider;
  private modelName: string;
  private temperature: number;

  constructor({
    dbConfig,
    modelProvider = LLMProvider.GEMINI,
    model = 'gemini-2.0-flash',
    temperature = 0,
  }: SeedlyConfig) {
    this.dbConfig = dbConfig;
    this.modelProvider = modelProvider;
    this.modelName = model;
    this.temperature = temperature;
    // Only Gemini supported for now
    this.model = new ChatGoogleGenerativeAI({
      temperature: this.temperature,
      model: this.modelName,
      apiKey: apiKey,
    });
  }

  // Connects to MCP server and initializes tools
  async initialize() {
    const dbConfigString = JSON.stringify(this.dbConfig);
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [
        './dist/mcp/server.js',
        '--db-config',
        dbConfigString,
      ],
    });
    this.mcpClient = new Client({
      name: 'gemini-mcp-client',
      version: '1.0.0',
    });
    logger.debug('initialized the client with gemini');
    try {
      await this.mcpClient.connect(this.transport);
      logger.debug('connected to the transport');
      await this.setupTools();
      logger.debug('setup all the tools');
      logger.info('Tools:');
      logger.info(this.tools);
      this.agent = createReactAgent({
        llm: this.model,
        tools: this.tools,
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  // Dynamically fetches tools from MCP server and wraps them as LangChain tools
  private async setupTools() {
    if (!this.mcpClient)
      throw new Error('MCP client not initialized');

    const listedTools = await this.mcpClient.listTools();
    logger.info(
      `MCP Server listed tools: ${JSON.stringify(listedTools, null, 2)}`,
    );
    logger.info(
      `Available tools: ${listedTools.tools.map((t: any) => t.name).join(', ')}`,
    );
    this.tools = listedTools.tools.map(
      (toolDefinition: McpToolDefinition) => {
        const description =
          toolDefinition.description ||
          `Tool for ${toolDefinition.name}`;
        return new DynamicStructuredTool({
          name: toolDefinition.name,
          description: description,
          schema: toolDefinition.inputSchema,
          func: async (
            input: Record<string, any>,
          ): Promise<any> => {
            logger.info(
              `🔧 MCP tool invoked: ${toolDefinition.name}`,
            );
            logger.info(
              `📥 Args: ${JSON.stringify(input)}`,
            );

            if (!this.mcpClient) {
              throw new Error(
                'MCP client not initialized during tool execution',
              );
            }

            try {
              const result = await this.mcpClient.callTool({
                name: toolDefinition.name,
                arguments: input,
              });

              if (
                result &&
                Array.isArray(result.content) &&
                result.content.length > 0
              ) {
                const textBlock = result.content.find(
                  (block: any) => block.type === 'text',
                );
                if (
                  textBlock &&
                  typeof textBlock.text === 'string'
                ) {
                  return textBlock.text;
                }
                return JSON.stringify(result.content);
              }
              return `Tool "${toolDefinition.name}" executed successfully, but returned no content.`;
            } catch (error: any) {
              logger.error(
                `❌ Error calling MCP tool "${toolDefinition.name}":`,
                error.message,
              );
              throw new Error(
                `Failed to execute tool "${toolDefinition.name}": ${error.message}`,
              );
            }
          },
        });
      },
    );
  }

  // Helper to fetch DB schema and return as system context
  private async getSchemaContext() {
    if (!this.mcpClient)
      throw new Error('MCP client not initialized');
    const schemaResult = await this.mcpClient.readResource({
      uri: 'schema://main',
    });
    const schemaText =
      schemaResult.contents &&
      Array.isArray(schemaResult.contents) &&
      schemaResult.contents[0] &&
      typeof schemaResult.contents[0].text === 'string'
        ? schemaResult.contents[0].text
        : '';
    return (
      'The following is the schema of the SQL database you are interacting with:\n\n' +
      schemaText
    );
  }

  // Main invoke method (single-turn)
  async invoke(
    message: string,
    threadId: string = 'default',
  ): Promise<string> {
    if (!this.agent)
      throw new Error(
        'Agent not initialized. Call initialize() first.',
      );
    try {
      const systemContext = await this.getSchemaContext();
      const agentFinalState = await this.agent.invoke(
        {
          messages: [
            new HumanMessage(systemContext),
            new HumanMessage(message),
          ],
        },
        { configurable: { thread_id: threadId } },
      );
      const lastMessage =
        agentFinalState.messages[
          agentFinalState.messages.length - 1
        ];
      return lastMessage.content as string;
    } catch (error) {
      logger.error('Error invoking MCP agent:', error);
      throw error;
    }
  }

  // Streaming response (multi-turn)
  async *streamResponse(
    message: string,
    threadId: string = 'default',
  ): AsyncGenerator<string> {
    if (!this.agent)
      throw new Error(
        'Agent not initialized. Call initialize() first.',
      );
    try {
      const systemContext = await this.getSchemaContext();
      const agentFinalState = await this.agent.invoke(
        {
          messages: [
            new HumanMessage(systemContext),
            new HumanMessage(message),
          ],
        },
        { configurable: { thread_id: threadId } },
      );
      for (const message of agentFinalState.messages) {
        yield message.content as string;
      }
    } catch (error) {
      logger.error(
        'Error streaming MCP agent response:',
        error,
      );
      throw error;
    }
  }

  // Add a new tool at runtime
  addTool(tool: any) {
    this.tools.push(tool);
    if (this.agent) {
      this.agent = createReactAgent({
        llm: this.model,
        tools: this.tools,
      });
    }
  }

  // Get the current configuration
  getConfig() {
    return {
      model: this.model.model,
      temperature: this.model.temperature,
      modelProvider: this.modelProvider,
      dbConfig: this.dbConfig,
    };
  }

  // Graceful shutdown
  async close() {
    if (this.transport) {
      await this.transport.close();
      logger.info('👋 Closed MCP transport');
    }
  }
}

// Remove old function-based export
// export default geminiWithFunctionCalling;
