# Database Schema Design: Categories
Date: Sat Mar  7 10:30:05 CST 2026
Database: SQLite (menu_system.db)

## Table Definition
```sql
-- Categories Table Definition
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to automatically update updated_at on change
CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
```

## Verification Status
- [x] Table 'categories' created successfully.

### Columns Detail
```
0|id|INTEGER|0||1
1|name|TEXT|1||0
2|description|TEXT|0||0
3|created_at|DATETIME|0|CURRENT_TIMESTAMP|0
4|updated_at|DATETIME|0|CURRENT_TIMESTAMP|0
```

### Index/Unique Constraints
```
0|sqlite_autoindex_categories_1|1|u|0
```
