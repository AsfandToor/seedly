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
const _sqlite3 = /*#__PURE__*/ _interop_require_default(require("sqlite3"));
const _util = require("util");
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
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
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
        this.server.tool('query', {
            sql: _zod.z.string()
        }, async ({ sql })=>{
            const db = this.getDb();
            try {
                const results = await db.all(sql);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(results, null, 2)
                        }
                    ]
                };
            } catch (err) {
                const error = err;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`
                        }
                    ],
                    isError: true
                };
            } finally{
                await db.close();
            }
        });
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
        this.server.resource('schema', 'schema://main', async (uri)=>{
            const db = this.getDb();
            try {
                const tables = await db.all("SELECT sql FROM sqlite_master WHERE type='table'");
                return {
                    contents: [
                        {
                            uri: uri.href,
                            text: tables.map((t)=>t.sql).join('\n')
                        }
                    ]
                };
            } finally{
                await db.close();
            }
        });
    }
    async start() {
        const transport = new _stdio.StdioServerTransport();
        await this.addTool();
        await this.addResource();
        await this.server.connect(transport);
    }
    constructor(){
        _define_property(this, "server", void 0);
        _define_property(this, "getDb", ()=>{
            const db = new _sqlite3.default.Database('database.db');
            return {
                all: (0, _util.promisify)(db.all.bind(db)),
                close: (0, _util.promisify)(db.close.bind(db))
            };
        });
        this.server = new _mcp.McpServer({
            name: 'seeder',
            version: '1.0.0'
        });
    }
}

//# sourceMappingURL=server.js.map