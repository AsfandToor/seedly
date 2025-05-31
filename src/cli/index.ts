import { Command } from 'commander';
import SeederMCPServer from '../core/server';

const program = new Command();

program
  .name('seedly')
  .description(
    'An AI based Seeding Agent, that will use MCP protocols to understand your DB schema and seed fake data according to it.',
  )
  .version('1.0.0')
  .option('-h, --help', 'Show help');

// Start MCP Server
program.option('-s, --start', 'Start the MCP server');

program.parse(process.argv);

const options = program.opts();

if (options.start) {
  console.log('Starting MCP server...');
  const server = new SeederMCPServer();
  server.start();
}
