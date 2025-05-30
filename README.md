# Seedly 🌱

An intelligent NPM package that leverages AI to automatically understand your database schema and generate meaningful fake data for development and testing purposes.

[![npm version](https://img.shields.io/npm/v/seeding-agent.svg)](https://www.npmjs.com/package/seeding-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features 🚀

- **AI-Powered Schema Analysis**: Automatically understands your database structure using MCP (Model-Controller-Persistence) server concepts
- **Smart Data Generation**: Creates contextually relevant fake data based on field names and relationships
- **Multiple Database Support**: Works with popular databases like PostgreSQL, MySQL, MongoDB, and more
- **Relationship Awareness**: Maintains referential integrity and complex relationships between tables/collections
- **Customizable Templates**: Define your own seeding templates and rules
- **CLI Support**: Easy-to-use command line interface for quick seeding operations

## Installation 📦

```bash
npm install seeding-agent
# or
yarn add seeding-agent
```

## Quick Start 🏃‍♂️

1. Initialize Seedly in your project:

```javascript
const Seedly = require('@codeacme/seedly');

const agent = new Seedly({
  database: {
    type: 'postgres', // or 'mysql', 'mongodb'
    host: 'localhost',
    port: 5432,
    username: 'your_username',
    password: 'your_password',
    database: 'your_database'
  }
});
```

2. Let the agent analyze your schema:

```javascript
await agent.analyzeSchema();
```

3. Generate and seed data:

```javascript
await agent.seed({
  recordsPerTable: 100, // number of records to generate per table
  customRules: {} // optional custom rules for specific fields
});
```

## CLI Usage 💻

```bash
# Initialize seedly configuration
npx seedly init

# Analyze schema and generate seed data
npx seedly seed --records 100

# Generate data for specific tables
npx seedly seed --tables users,products --records 50
```

## Configuration ⚙️

Create a `seedly.config.js` file in your project root:

```javascript
module.exports = {
  database: {
    type: 'postgres',
    connection: {
      // your database connection details
    }
  },
  seeding: {
    defaultRecordsPerTable: 50,
    customRules: {
      // Define custom rules for specific fields
      'users.email': 'email',
      'products.price': 'price.between(10,1000)'
    }
  }
};
```

## Custom Data Rules 📝

You can define custom rules for specific fields:

```javascript
await agent.seed({
  customRules: {
    'users.age': () => Math.floor(Math.random() * 50) + 18,
    'products.category': ['Electronics', 'Books', 'Clothing'],
    'orders.status': {
      type: 'enum',
      values: ['pending', 'processing', 'completed']
    }
  }
});
```

## API Reference 📚

### Seedly Class

- `constructor(config)`: Initialize the agent with configuration
- `analyzeSchema()`: Analyze database schema
- `seed(options)`: Generate and insert seed data
- `exportSchema()`: Export the analyzed schema
- `importSchema(schema)`: Import a previously analyzed schema

### Configuration Options

- `database`: Database connection details
- `seeding`: Seeding configuration and rules
- `templates`: Custom templates for data generation
- `logging`: Logging configuration

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💪

If you find this package helpful, please consider giving it a star ⭐️ on GitHub!

For issues, feature requests, or questions, please use the [GitHub Issues](https://github.com/yourusername/seeding-agent/issues) page.
