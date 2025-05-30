import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


export default class SeederMCPServer {
    private server: McpServer;

    constructor() {
        this.server = new McpServer({
            name: "seeder",
            version: "1.0.0",
        });
    }
    

    public async addTool() {
        this.server.tool("list-tables",
            { all: z.boolean() },
            async ({ all }) => ({
              content: [{ type: "text", text: String(all) }]
            })
        );
    }

    public async addResource() {
        this.server.resource(
            "tables",
            new ResourceTemplate("tables://{name}", { list: undefined }),
            async (uri, { name }) => ({
              contents: [{
                uri: uri.href,
                text: `Tables: ${name}`
              }]
            })
        );
    }

    public async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}