import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import 'dotenv/config';

interface AgentConfig {
  model?: string;
  temperature?: number;
  maxResults?: number;
}

export class SeedingAgent {
  private agent: ReturnType<typeof createReactAgent>;
  private model: ChatGoogleGenerativeAI;
  private tools: TavilySearchResults[];

  constructor(config: AgentConfig = {}) {
    const {
      model = 'gemini-2.0-flash',
      temperature = 0,
      maxResults = 3,
    } = config;

    this.model = new ChatGoogleGenerativeAI({
      temperature,
      model,
    });

    this.tools = [new TavilySearchResults({ maxResults })];

    this.agent = createReactAgent({
      llm: this.model,
      tools: this.tools,
    });
  }

  async invoke(
    message: string,
    threadId: string = 'default',
  ): Promise<string> {
    try {
      const agentFinalState = await this.agent.invoke(
        {
          messages: [new HumanMessage(message)],
        },
        { configurable: { thread_id: threadId } },
      );

      const lastMessage =
        agentFinalState.messages[
          agentFinalState.messages.length - 1
        ];
      return lastMessage.content as string;
    } catch (error) {
      console.error('Error invoking agent:', error);
      throw error;
    }
  }

  async *streamResponse(
    message: string,
    threadId: string = 'default',
  ): AsyncGenerator<string> {
    try {
      const agentFinalState = await this.agent.invoke(
        {
          messages: [new HumanMessage(message)],
        },
        { configurable: { thread_id: threadId } },
      );

      for (const message of agentFinalState.messages) {
        yield message.content as string;
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      throw error;
    }
  }

  // Add more tools to the agent
  addTool(tool: any) {
    this.tools.push(tool);
    // Recreate agent with updated tools
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.tools,
    });
  }

  // Get the current configuration
  getConfig(): AgentConfig {
    return {
      model: this.model.model,
      temperature: this.model.temperature,
      maxResults: 3, // Return default value since we can't access protected property
    };
  }
}

// Example usage:
// const agent = new SeedingAgent({
//   model: 'gemini-2.0-flash',
//   temperature: 0,
//   maxResults: 3,
// });
// agent
//   .invoke('what is the current weather in sf')
//   .then((response) => {
//     console.log(response);
//   });
// Stream response
// for await (const chunk of agent.streamResponse('what is the current weather in sf')) {
//   console.log(chunk);
// }
