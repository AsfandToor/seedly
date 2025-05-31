"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _commander = require("commander");
const _server = /*#__PURE__*/ _interop_require_default(require("../core/server"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const program = new _commander.Command();
program.name('seedly').description('An AI based Seeding Agent, that will use MCP protocols to understand your DB schema and seed fake data according to it.').version('1.0.0').option('-h, --help', 'Show help');
program.option('-s, --start', 'Start the MCP server');
program.parse(process.argv);
const options = program.opts();
if (options.start) {
    console.log('Starting MCP server...');
    const server = new _server.default();
    server.start();
}

//# sourceMappingURL=index.js.map