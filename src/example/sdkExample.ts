import { Seedly } from '../mcp/tools';

(async () => {
  const seedingAgent = new Seedly({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'test_user',
    password: 'test_password',
    database: 'test_db',
  });

  try {
    await seedingAgent.seedTool('Orders', 5);
  } catch (error) {
    console.error('Error during seeding:', error);
  }
})();
//to check if this works compile it then use the command node ./dist/src/example/sdkExample.js
