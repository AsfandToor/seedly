"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return SeederMCPServer;
    }
});
const _mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
const _stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
const _zod = require("zod");
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
class SeederMCPServer {
    async addTool() {
        this.server.tool('list-tables', {
            all: _zod.z.boolean()
        }, async ({ all })=>({
                content: [
                    {
                        type: 'text',
                        text: String(all)
                    }
                ]
            }));
    }
    async addResource() {
        this.server.resource('tables', new _mcp.ResourceTemplate('tables://{name}', {
            list: undefined
        }), async (uri, { name })=>({
                contents: [
                    {
                        uri: uri.href,
                        text: `Tables: ${name}`
                    }
                ]
            }));
    }
    async start() {
        const transport = new _stdio.StdioServerTransport();
        await this.addTool();
        await this.addResource();
        await this.server.connect(transport);
    }
    constructor(){
        _define_property(this, "server", void 0);
        this.server = new _mcp.McpServer({
            name: 'seeder',
            version: '1.0.0'
        });
    }
}

//# sourceMappingURL=server.js.map