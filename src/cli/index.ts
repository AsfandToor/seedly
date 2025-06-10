import { Command } from 'commander';
import geminiWithFunctionCalling from '../mcp/client';

const program = new Command();

program
  .name('seedly')
  .description(
    'An AI based Seeding Agent, that will use MCP protocols to understand your DB schema and seed fake data according to it.',
  )
  .version('1.0.0')
  .option('-h, --help', 'Show help');

function attachDbOptions(cmd: Command) {
  return cmd
    .option(
      '--dialect <dialect>',
      'Database dialect (sqlite, postgres, mysql)',
      'sqlite',
    )
    .option('--file <path>', 'SQLite file path')
    .option('--host <host>', 'DB host')
    .option('--port <port>', 'DB port')
    .option('--user <user>', 'DB user')
    .option('--password <password>', 'DB password')
    .option('--database <name>', 'Database name')
    .argument('<prompt>', 'Your natural language query');
}

function extractDbConfig(options: any) {
  return {
    type: options.dialect,
    file: options.file,
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
  };
}

attachDbOptions(program.command('start'))
  .description(
    'Start the MCP server to listen for seeding and query tasks',
  )
  .action(async (prompt, options) => {
    const dbConfig = extractDbConfig(options);

    await geminiWithFunctionCalling(prompt, dbConfig);
  });
program.parse(process.argv);
// Start MCP Server
// program.option('-s, --start', 'Start the MCP server');

// program.parse(process.argv);

// const options = program.opts();

// if (options.start) {
//   console.log('Starting MCP server...');
//   const server = new SeederMCPServer();
//   server.start();
// }
