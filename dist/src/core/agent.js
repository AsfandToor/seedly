"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SeedingAgent", {
    enumerable: true,
    get: function() {
        return SeedingAgent;
    }
});
const _tavily_search = require("@langchain/community/tools/tavily_search");
const _googlegenai = require("@langchain/google-genai");
const _messages = require("@langchain/core/messages");
const _prebuilt = require("@langchain/langgraph/prebuilt");
require("dotenv/config");
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class SeedingAgent {
    async invoke(message, threadId = 'default') {
        try {
            const agentFinalState = await this.agent.invoke({
                messages: [
                    new _messages.HumanMessage(message)
                ]
            }, {
                configurable: {
                    thread_id: threadId
                }
            });
            const lastMessage = agentFinalState.messages[agentFinalState.messages.length - 1];
            return lastMessage.content;
        } catch (error) {
            console.error('Error invoking agent:', error);
            throw error;
        }
    }
    async *streamResponse(message, threadId = 'default') {
        try {
            const agentFinalState = await this.agent.invoke({
                messages: [
                    new _messages.HumanMessage(message)
                ]
            }, {
                configurable: {
                    thread_id: threadId
                }
            });
            for (const message of agentFinalState.messages){
                yield message.content;
            }
        } catch (error) {
            console.error('Error streaming response:', error);
            throw error;
        }
    }
    addTool(tool) {
        this.tools.push(tool);
        this.agent = (0, _prebuilt.createReactAgent)({
            llm: this.model,
            tools: this.tools
        });
    }
    getConfig() {
        return {
            model: this.model.model,
            temperature: this.model.temperature,
            maxResults: 3
        };
    }
    constructor(config = {}){
        _define_property(this, "agent", void 0);
        _define_property(this, "model", void 0);
        _define_property(this, "tools", void 0);
        const { model = 'gemini-2.0-flash', temperature = 0, maxResults = 3 } = config;
        this.model = new _googlegenai.ChatGoogleGenerativeAI({
            temperature,
            model
        });
        this.tools = [
            new _tavily_search.TavilySearchResults({
                maxResults
            })
        ];
        this.agent = (0, _prebuilt.createReactAgent)({
            llm: this.model,
            tools: this.tools
        });
    }
}

//# sourceMappingURL=agent.js.map