# BICOBS Database Documentation

This directory contains the database schemas, seed configurations, and relational architectural designs for the **BICOBS (Bike Shop Ordering and Billing System)**.

---

## 🗄️ Database Technology
* **Database Engine:** PostgreSQL 15+ (Hosted on Supabase)
* **Client Library:** `pg` (node-postgres with Connection Pooling)
* **Access Mode:** IPv4 Session Pooler (port 5432 / 6543)

---

## 📋 Schema Architecture (`database/schema.sql`)

The database consists of 5 normalized relational tables:

1. **`users`**
   * Stores customer, staff, and admin accounts.
   * Secure password hashing with `bcryptjs`.
   * Role-based access control (`role IN ('customer', 'staff', 'admin')`).

2. **`products`**
   * Stores 150 bike shop inventory items (Bicycles, Components, Gear, Accessories).
   * Tracks stock levels (`stock_quantity`), pricing, SKUs, and Cloudinary media links.

3. **`orders`**
   * Records customer purchases with transaction codes (`ORD-YYYYMMDD-XXXX`).
   * Handles delivery type (`delivery` or `pickup`), shipping addresses, and status progressions.

4. **`order_items`**
   * Relational line items associated with each order (Foreign Key to `orders.id` with `ON DELETE CASCADE`).
   * Captures snapshot pricing and quantity at the time of purchase.

5. **`billings`**
   * Digital invoicing and receipt generation (`INV-YYYYMMDD-XXXX`).
   * Manages payment methods (*GCash, COD, Card*) and payment statuses (*pending, paid, refunded*).

---

## 🚀 How to Run / Recreate the Database

### Option 1: Via Supabase SQL Editor (Recommended)
1. Open the **SQL Editor** tab in your Supabase dashboard.
2. Copy the entire contents of [`schema.sql`](file:///d:/BICOBS/database/schema.sql).
3. Click **Run**.
4. Run `npm run migrate` in the `back-end/` folder to automatically populate the 150 products.

### Option 2: Via Command Line (`psql`)
```bash
psql -U postgres -d <database_name> -f database/schema.sql
```
