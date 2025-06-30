import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs/promises';

const cliPath = path.resolve(
  __dirname,
  '../dist/cli/index.js',
);
const dbPath = path.resolve(
  __dirname,
  '../src/example/test.db',
);

async function createTestDb() {
  const sqlite3 = await import('sqlite3');
  const { open } = await import('sqlite');

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT
    );
  `);

  await db.close();
}

describe('Seedly CLI', () => {
  beforeAll(async () => {
    try {
      await fs.unlink(dbPath);
    } catch {
      /* empty */
    }
    await createTestDb();
  });

  afterAll(async () => {
    try {
      await fs.unlink(dbPath);
    } catch {
      /* empty */
    }
  });

  it('should run CLI with SQLite config and natural prompt', async () => {
    const result = await execa('node', [
      cliPath,
      'start',
      'Seed the users table with 2 records',
      '--dialect',
      'sqlite',
      '--file',
      dbPath,
    ]);

    expect(result.stdout).toContain('Agent Response:');
  }, 30_000);

  it('should fail if config is missing required fields', async () => {
    try {
      await execa('node', [
        cliPath,
        'start',
        'Seed without config',
      ]);
    } catch (e: unknown) {
      expect((e as Error).message).toContain('Error');
    }
  });
});
