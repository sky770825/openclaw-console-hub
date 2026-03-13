# Database Design Document: Users Table

## Schema Specification
Implemented a robust `users` table structure in PostgreSQL.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default: v4 | Unique identifier |
| `name` | TEXT | NOT NULL | Full name of user |
| `email` | TEXT | UNIQUE, NOT NULL | Primary contact / Login |
| `password_hash` | TEXT | NOT NULL | Hashed password credentials |
| `role` | ENUM | Default: 'customer' | One of: customer, staff, admin |
| `created_at` | TIMESTAMPTZ | Default: NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Default: NOW() | Auto-updating timestamp |

## Security Implementation
### Row Level Security (RLS)
Security is enforced at the database level:
- **Self-Service**: Users can read and update their own records.
- **Staff Access**: Staff members can view all user profiles for operational support.
- **Administrative Access**: Admin users have full CRUD permissions on the entire table.

## Deployment Instructions
1. Execute the SQL script located at `/Users/sky770825/.openclaw/workspace/scripts/setup_users_table.sql`.
2. Ensure the `auth.uid()` helper is available (standard in Supabase) or configure the session variable in standard PostgreSQL.

