# Seedly 🌱

An intelligent NPM package that leverages AI to automatically understand your database schema and generate meaningful fake data for development and testing purposes.

## Features 🚀

- **AI-Powered Schema Analysis**: Automatically understands your database structure using MCP (Model-Controller-Persistence) server concepts
- **Smart Data Generation**: Creates contextually relevant fake data based on field names and relationships
- **Multiple Database Support**: Works with popular databases like PostgreSQL, MySQL, MongoDB, and more
- **Relationship Awareness**: Maintains referential integrity and complex relationships between tables/collections
- **Customizable Templates**: Define your own seeding templates and rules
- **CLI Support**: Easy-to-use command line interface for quick seeding operations

## Installation 📦

```bash
npm install @codeacme/seedly
# or
yarn add @codeacme/seedly
```

## Quick Start 🏃‍♂️

1. Initialize Seedly in your project:

```ts
import { Seedly } from '@codeacme/seedly';

const agent = new Seedly({
  type: 'postgres', // or 'mysql', 'sqlite'
  host: 'localhost',
  port: 5432,
  user: 'your_username',
  password: 'your_password',
  database: 'your_database',
});
//OR
const mongoDBAgent = new Seedly({
  type: 'mongodb',
  uri: 'mongodb://whole_uri',
  database: 'your_database',
  modelsDir: './path-to-modelDIR', //use for a whole models folder
  singleSchemaPath: './path-to-single-schema-file', //provide the schema of only the collection that you are going to seed in the next step
});
```

2. Seed a table:

```ts
await agent.seedTool('users', 100);
```

3. Example with Express:

```ts
import express from 'express';
import { Seedly } from '@codeacme/seedly';

const app = express();
const port = 3000;

app.get('/seed', async (req, res) => {
  const agent = new Seedly({
    type: 'sqlite',
    file: './database.db',
  });

  try {
    await agent.seedTool('orders', 10);
  } catch (error) {
    console.error('Error during seeding:', error);
  }

  res.send('Seeding started!');
});

app.listen(port, () => {
  console.log(
    `Test app listening at http://localhost:${port}`,
  );
});
```

## CLI Usage 💻

```bash
# SQLite
node dist/cli/index.js start "Seed the users table with 5 records" \
  --dialect sqlite \
  --file ./database.db

# PostgreSQL
node dist/cli/index.js start "Seed the users table with 10 rows" \
  --dialect postgres \
  --host localhost \
  --port 5432 \
  --user postgres \
  --password your_password \
  --database my_database

# MongoDB (with model directory)
node dist/cli/index.js start "Seed the users collection with 10 documents" \
  --dialect mongodb \
  --uri mongodb://localhost:27017 \
  --database test \
  --models-dir ./models

# MongoDB (with single schema file)
node dist/cli/index.js start "Seed the logs collection with 5 entries" \
  --dialect mongodb \
  --uri mongodb://localhost:27017 \
  --database test \
  --single-schema ./models/logs.js
```

> 📌 **Note:** If you're using MongoDB, your Mongoose model files must be JavaScript (`.js`) files, not TypeScript (`.ts`) unless they're compiled before use.

> 🧠 **When to use what**:
>
> - Use `--models-dir` if you have multiple `.js` model files in a directory.
> - Use `--single-schema` if you want to provide one `.js` model file manually.
> - If neither is provided, Seedly will attempt to infer the schema from existing MongoDB documents.

## Environment Variable 🔑

You must set either `GOOGLE_API_KEY` or `OPENAI_API_KEY` in your environment for AI-powered data generation:

```bash
export GOOGLE_API_KEY=your-google-api-key
# or
export OPENAI_API_KEY=your-openai-api-key
```

## License 📄

MIT License © CodeAcme
