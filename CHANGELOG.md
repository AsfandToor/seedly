# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-06-30

### 🚀 Added

- Initial release of `Seedly` — AI-based seeding agent for databases.
- CLI support with `seedly start "<prompt>" --dialect ...` usage.
- Support for multiple dialects:
  - ✅ SQLite
  - ✅ PostgreSQL
  - ✅ MySQL
  - ✅ MongoDB (with Mongoose models or schema inference)
- Intelligent schema parsing using:
  - `getColumns`, `listTables`, and `getSchema` abstraction per dialect
  - LLM-based prompt interpretation and fake data generation
- Support for both:
  - `--models-dir` (Mongoose schema directory)
  - `--single-schema` (Mongoose `.js` file path for new collections)
- SDK usage: `new Seedly({...}).seedTool(...)`
- Agent can seed, query, and describe schema with natural language
- Express.js integration example provided
- CLI auto-exits after successful run (`process.exit(0)`)
- Unit tests for SDK and CLI (using Vitest + SQLite memory or disk)
- Support for both `OPENAI_API_KEY` and `GOOGLE_API_KEY` via `.env`

---

## Upcoming

### 🔧 Planned

- Add export/import of schema and templates
- Add record deletion/reset CLI command
- Add rds support
- Add anthropic support
