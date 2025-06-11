"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _commander = require("commander");
const _client = /*#__PURE__*/ _interop_require_default(require("../mcp/client"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const program = new _commander.Command();
program.name('seedly').description('An AI based Seeding Agent, that will use MCP protocols to understand your DB schema and seed fake data according to it.').version('1.0.0').option('-h, --help', 'Show help');
function attachDbOptions(cmd) {
    return cmd.option('--dialect <dialect>', 'Database dialect (sqlite, postgres, mysql)', 'sqlite').option('--file <path>', 'SQLite file path').option('--host <host>', 'DB host').option('--port <port>', 'DB port').option('--user <user>', 'DB user').option('--password <password>', 'DB password').option('--database <name>', 'Database name').argument('<prompt>', 'Your natural language query');
}
function extractDbConfig(options) {
    return {
        type: options.dialect,
        file: options.file,
        host: options.host,
        port: options.port,
        user: options.user,
        password: options.password,
        database: options.database
    };
}
attachDbOptions(program.command('start')).description('Start the MCP server to listen for seeding and query tasks').action(async (prompt, options)=>{
    const dbConfig = extractDbConfig(options);
    await (0, _client.default)(prompt, dbConfig);
});
program.parse(process.argv);

//# sourceMappingURL=index.js.map