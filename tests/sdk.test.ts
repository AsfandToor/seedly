// tests/sdk.test.ts

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import { Seedly } from '../src/mcp/tools.js'; // Adjust path as needed
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.resolve(
  __dirname,
  '../src/example/test.db',
);
// async function createTestDb() {
//   const sqlite3 = await import('sqlite3');
//   const { open } = await import('sqlite');

//   const db = await open({
//     filename: dbPath,
//     driver: sqlite3.Database,
//   });

//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT,
//       email TEXT
//     );
//   `);

//   await db.close();
// }
describe('Seedly SDK', () => {
  let agent: Seedly;

  beforeAll(async () => {
    // Clean up the test DB if it exists
    try {
      await fs.unlink(dbPath);
    } catch {
      /* empty */
    }
    // await createTestDb();
    agent = new Seedly({
      type: 'sqlite',
      file: dbPath,
    });

    // Create the users table manually
    await agent['dialect'].runQuery(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT
      );
    `);
  }, 10000);

  afterAll(async () => {
    // Clean up
    await fs.unlink(dbPath);
  });

  it('should seed the users table with fake data', async () => {
    const result = await agent.seedTool('users', 1);
    expect(result.content[0].text).toContain(
      'Successfully inserted',
    );
  }, 100000);

  it('should run query tool and return seeded data', async () => {
    const result = await agent.query('SELECT * FROM users');
    const text = result.content[0].text;

    expect(text).toMatch(/"name":\s*".+"/); // Check if name exists
  });
});
