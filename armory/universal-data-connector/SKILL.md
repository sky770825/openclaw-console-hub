# Skill: Universal Data Connector

## Description
A modular skill for interacting with various databases.

## Usage
- `db <module> query "<sql_query>"`: Executes a query using the specified module.
- `db <module> list-tables`: Lists all tables in the database using the specified module.
- `db <module> get-schema <table_name>`: Gets the schema for a specific table using the specified module.
- `db list-modules`: Lists all available connector modules.

## Example
`db sqlite query "SELECT * FROM users LIMIT 10;"`
`db postgres list-tables`