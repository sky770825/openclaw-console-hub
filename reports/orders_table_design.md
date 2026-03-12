# Technical Design: Orders Data Structure

## Overview
Design and implementation of the `orders` table to support purchase management and workflow tracking.

## Column Specification
| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| **id** | SERIAL | PK | Unique identifier for each order. |
| **user_id** | INTEGER | FK (users.id) | Link to the customer who placed the order. |
| **total_amount** | DECIMAL(12,2) | NOT NULL | Monetary value of the order. |
| **status** | ENUM | NOT NULL | State tracking: pending, preparing, ready, completed, cancelled. |
| **created_at** | TIMESTAMP | DEFAULT NOW | Creation audit timestamp. |
| **updated_at** | TIMESTAMP | DEFAULT NOW | Last modification audit timestamp. |

## Integrity Logic
- **FK Constraint**: Uses `ON DELETE CASCADE` to maintain database cleanliness.
- **State Machine**: Restricted via `order_status` ENUM to prevent invalid states.
- **Automation**: Database-level trigger ensures `updated_at` reflects the latest change.

## Artifacts
- **SQL DDL**: `/Users/caijunchang/.openclaw/workspace/sandbox/output/001_create_orders_table.sql`
- **Prisma Schema**: `/Users/caijunchang/.openclaw/workspace/sandbox/output/orders_schema.prisma`
- **Deployment Script**: `/Users/caijunchang/.openclaw/workspace/scripts/deploy_orders_schema.sh`
