# 🧾 Taurus POS: Full Point of Sale Roadmap & Implementation Plan

This roadmap tracks the complete development, backend infrastructure, live database integration, and operational workflows for the **Taurus Point of Sale (POS Terminal)** system.

---

## 🏗️ System Overview & Architecture

* **Branch:** `drafting-branch-niCap`
* **Architecture:** Dedicated in-store Point of Sale terminal designed for high-speed counter checkout, walk-in sales, bike service dispatch, and receipt auditing.
* **Database:** Connects to the store's central PostgreSQL (Supabase) database to share real-time product inventory, customer records, repair tickets, and billing ledgers.
* **Core Files:**
  * [`frontend/pages/POS/POS-home.html`](file:///d:/BICOBS/frontend/pages/POS/POS-home.html) — POS Terminal Dashboard, daily metrics, and recent sales
  * [`frontend/pages/POS/POS-main.html`](file:///d:/BICOBS/frontend/pages/POS/POS-main.html) — Counter Checkout, product catalog, maintenance builder, order side-panel cart
  * [`frontend/pages/POS/POS-history.html`](file:///d:/BICOBS/frontend/pages/POS/POS-history.html) — Receipt history ledger, transaction search, and reprint
  * [`frontend/css/POS.css`](file:///d:/BICOBS/frontend/css/POS.css) — Unified POS styling system
  * [`frontend/js/POS.js`](file:///d:/BICOBS/frontend/js/POS.js) — Cart engine, promo code validator, and receipt generator

---

## 🎯 Current Status: What is Already Built

### 1. Terminal Frontend Interface
- [x] **`POS-home.html` (Terminal Hub)**
  - [x] Top navigation bar with live digital clock (`#clock_display`).
  - [x] Quick action tiles: *New Transaction*, *Transaction History*, *Daily Summary*.
  - [x] Recent transactions overview table with payment method badges.
- [x] **`POS-main.html` (Counter Checkout & Sales Screen)**
  - [x] Split-screen layout: Product catalog on the left, order side-panel cart on the right.
  - [x] Category pill filter buttons (`All`, `Maintenance`, `Drivetrain`, `Brakes`, `Tires`, `Cockpit`, etc.).
  - [x] Fast text search across product names, SKUs, and categories.
  - [x] Dedicated Bike Maintenance & Repair builder form (mechanic assignment, labor cost, bike model, notes).
  - [x] Real-time order cart calculations: subtotal, item counts, discount promo codes, and grand total.
  - [x] Discount code modal (`TAURUS10`, `VIP50`, `SAVE100`, custom promo codes).
  - [x] Full customer receipt modal with thermal/sheet print preview (`window.print()`).
- [x] **`POS-history.html` (Receipt Audit & History)**
  - [x] Detailed receipt transaction ledger (Date, Items, Subtotal, Discount, Total, Method, Status).
  - [x] Real-time client-side filter and instant running total calculation (`#filtered_total_value`).
  - [x] Search by Transaction ID or product name.
- [x] **Styling & Assets**
  - [x] Unified stylesheet in `frontend/css/POS.css`.
  - [x] Component SVG illustrations (`bike-frame.svg`, `bike-pedal.svg`, `bike-tire.svg`).

---

## 🚀 Complete Implementation Roadmap

---

### 📦 Phase 1: Backend Infrastructure & Server Setup
- [ ] **Express Server Configuration (`back-end/server.js`)**
  - [ ] Initialize Express app with CORS, JSON body parser, and urlencoded middlewares.
  - [ ] Serve frontend static assets: `app.use('/frontend', express.static(...))` and `app.use('/assets', express.static(...))`.
  - [ ] Configure root URL redirect (`/` ➔ `/frontend/pages/POS/POS-home.html`).
- [ ] **Dependencies & Scripts (`back-end/package.json`)**
  - [ ] Add `"dev": "nodemon server.js"` and `"start": "node server.js"`.
  - [ ] Add `pg` (node-postgres) and `bcryptjs` dependencies.
- [ ] **Environment Configuration (`back-end/.env`)**
  - [ ] Set `PORT=5000` (or dedicated POS port).
  - [ ] Configure Supabase PostgreSQL connection string `DATABASE_URL`.
  - [ ] Create sanitized template `.env.example`.
- [ ] **Database Connection Pool (`back-end/config/db.js`)**
  - [ ] Create robust PostgreSQL connection pool with SSL rejectUnauthorized handling.
  - [ ] Test live database connectivity.

---

### 🧹 Phase 2: Legacy File Cleanup
- [ ] **Remove Obsolete Admin Files**
  - [ ] Delete `frontend/pages/POS/admin/` (`admin-accmanage.html`, `admin-inventory.html`, `admin-main.html`, `admin-report.html`).
- [ ] **Asset Path Verification**
  - [ ] Verify all image references (`/frontend/Pictures/logo.png`, `bike-*.svg`) resolve with HTTP 200.

---

### 🛒 Phase 3: Dynamic Catalog & Inventory Sync (`POS-main.html` & `POS.js`)
- [ ] **Live Product Loading from Database**
  - [ ] Mount `/api/products` route returning 150 live Taurus items from PostgreSQL.
  - [ ] Dynamically populate `#pos_product_grid` on page load.
  - [ ] Display product card: thumbnail, SKU, product title, category tag, price in PHP (₱), and real-time stock.
  - [ ] Add loading skeleton / spinner while products are fetching from the database.
- [ ] **Stock Health & Availability Rules**
  - [ ] Display stock status pill: `In Stock`, `Low Stock (< 5 left)`, or `Out of Stock`.
  - [ ] Automatically disable `+ Add to Cart` button when `stock_quantity <= 0`.
  - [ ] Prevent adding more units than available stock.
- [ ] **Real-time Filter & Search Engine**
  - [ ] Category pill filtering: dynamically filter cards by category (`drivetrain`, `brakes`, `tires`, `cockpit`, `accessories`, `safety`, `maintenance`).
  - [ ] Instant search input filtering across product names, SKUs, and categories.
  - [ ] Dynamic counter label: `ALL PRODUCTS — X ITEMS` / `FILTERED — Y ITEMS`.

---

### 💳 Phase 4: Live Walk-in Order Processing & Stock Deduction (`POST /api/orders`)
- [ ] **Backend Walk-in Order Endpoint**
  - [ ] Mount `POST /api/orders` to handle walk-in POS sales.
  - [ ] Validate requested items against PostgreSQL stock inside an ACID transaction (`BEGIN` / `COMMIT`).
  - [ ] Deduct sold quantities from `products.stock_quantity`.
  - [ ] Insert order record with `order_type: 'walk_in'`, `delivery_type: 'pickup'`, `order_status: 'completed'`, `payment_status: 'paid'`.
  - [ ] Automatically create sequential invoice record (`INV-...`) in `billings` table marked as `paid`.
- [ ] **Payment & Change Calculation Modal**
  - [ ] On clicking **"Charge ₱..."**, open payment settlement modal:
    - [ ] **Cash:** Enter Amount Tendered (₱), calculate Change Due automatically. Quick cash shortcut buttons (+₱100, +₱500, +₱1,000, Exact).
    - [ ] **GCash / Maya:** Input 6-8 digit payment reference number.
- [ ] **Integrated Repair Ticket Dispatch**
  - [ ] When an order includes a Bike Maintenance item, dispatch `POST /api/repairs`.
  - [ ] Record customer name, bike details, assigned mechanic, labor fee, and status (`In Progress`).
- [ ] **Live Receipt Generation**
  - [ ] Populate `#receipt_modal_overlay` with real database Order ID (`ORD-...`), timestamp, itemized breakdown, and cashier name.
  - [ ] Support printing receipt via `window.print()` or thermal printer mode.
  - [ ] Automatically clear cart on clicking "Done & New Transaction".

---

### 📊 Phase 5: Transaction History & Receipt Audit (`POS-history.html`)
- [ ] **Live Historical Sales Ledger**
  - [ ] Fetch walk-in orders from `GET /api/orders`.
  - [ ] Dynamically render `#history_tbody` table rows with real transaction numbers, dates, items count, total, payment method, and status.
- [ ] **Instant Search & Running Total**
  - [ ] Filter rows in real time by Transaction ID, product name, or payment method.
  - [ ] Dynamically update **Filtered Total** badge (`#filtered_total_value`) based on displayed rows.
- [ ] **Reprint Historical Receipts**
  - [ ] Add "View Receipt" button to each history row.
  - [ ] Fetch order item breakdown and re-open `#receipt_modal_overlay` to reprint past receipts.

---

### 🏠 Phase 6: Daily Summary & Cashier Management (`POS-home.html`)
- [ ] **Real-Time Home Screen Metrics**
  - [ ] Connect **Daily Summary** card to today's cumulative sales sum from database.
  - [ ] Connect **Recent Transactions** table to show the 5 latest completed sales.
- [ ] **Active Cashier Session Sync**
  - [ ] Display active logged-in cashier / staff member name across all POS headers.
  - [ ] Provide staff login / switch cashier modal if session expires.

---

### 🖨️ Phase 7: Hardware & Thermal Printer Readiness
- [ ] **Thermal Receipt Print Styling**
  - [ ] Add `@media print` CSS rules tailored for standard 58mm and 80mm POS receipt roll printers.
  - [ ] Suppress browser URL headers, footers, and margins during printing.
- [ ] **Barcode / Scanner Input Listener (Bonus Enhancement)**
  - [ ] Listen for barcode scanner keystrokes to instantly add scanned SKU items directly into the cart.

---

## 🔌 API Endpoint Reference for POS Integration

| Resource | HTTP Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Catalog** | `GET` | `/api/products` | Fetch all products with live stock, SKU, and prices |
| **Categories** | `GET` | `/api/categories` | Reference list of 16 store product categories |
| **Checkout** | `POST` | `/api/orders` | Process walk-in order, deduct stock, create billing invoice |
| **Repairs** | `POST` | `/api/repairs` | Log repair ticket when maintenance service is sold |
| **History** | `GET` | `/api/orders` | Fetch walk-in transaction history |
| **Summary** | `GET` | `/api/dashboard/summary` | Fetch today's sales volume and transaction count |
| **Staff** | `GET` | `/api/users` | List staff & mechanics for technician assignments |
