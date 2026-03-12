# Database Design Report: order_items

## Overview
The `order_items` table has been designed to store line-item details for orders, capturing the state of the product (specifically the price) at the exact moment the order was placed.

## Column Definitions
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **id** | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for each item line. |
| **order_id** | INTEGER | NOT NULL, FOREIGN KEY | Link to the parent order. |
| **product_id** | INTEGER | NOT NULL, FOREIGN KEY | Link to the product being purchased. |
| **quantity** | INTEGER | NOT NULL, CHECK > 0 | Number of units purchased. |
| **price_at_order** | DECIMAL | NOT NULL | The unit price of the product at the time of order. |
| **created_at** | TIMESTAMP | DEFAULT NOW | Timestamp for record creation. |

## Relationship Logic
- **Belongs To Order**: Linked via `order_id`. CASCADE delete is applied; if an order is deleted, its items are removed.
- **Reference Product**: Linked via `product_id`. RESTRICT delete is applied to prevent product deletion if it has order history.

## Verification Result
SQL execution was successful. The verified table schema is:
```sql
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_order DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```
