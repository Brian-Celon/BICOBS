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
- [x] **Express Server Configuration (`back-end/server.js`)**
  - [x] Initialize Express app with CORS, JSON body parser, and urlencoded middlewares.
  - [x] Serve frontend static assets: `app.use('/frontend', express.static(...))` and `app.use('/assets', express.static(...))`.
  - [x] Configure root URL redirect (`/` ➔ `/frontend/pages/POS/POS-home.html`).
- [x] **Dependencies & Scripts (`back-end/package.json`)**
  - [x] Add `"dev": "nodemon server.js"` and `"start": "node server.js"`.
  - [x] Add `pg` (node-postgres) and `bcryptjs` dependencies.
- [x] **Environment Configuration (`back-end/.env`)**
  - [x] Set `PORT=5000` (or dedicated POS port).
  - [x] Configure Supabase PostgreSQL connection string `DATABASE_URL`.
  - [x] Create sanitized template `.env.example`.
- [x] **Database Connection Pool (`back-end/config/db.js`)**
  - [x] Create robust PostgreSQL connection pool with SSL rejectUnauthorized handling.
  - [x] Test live database connectivity.

---

### 🧹 Phase 2: Legacy File Cleanup
- [x] **Remove Obsolete Admin Files**
  - [x] Delete `frontend/pages/POS/admin/` (`admin-accmanage.html`, `admin-inventory.html`, `admin-main.html`, `admin-report.html`).
- [x] **Asset Path Verification**
  - [x] Verify all image references (`/frontend/Pictures/logo.png`, `bike-*.svg`) resolve with HTTP 200.

---

### 🛒 Phase 3: Dynamic Catalog & Inventory Sync (`POS-main.html` & `POS.js`)
- [x] **Live Product Loading from Database**
  - [x] Mount `/api/products` route returning 150 live Taurus items from PostgreSQL.
  - [x] Dynamically populate `#pos_product_grid` on page load.
  - [x] Display product card: thumbnail, SKU, product title, category tag, price in PHP (₱), and real-time stock.
  - [x] Add loading skeleton / spinner while products are fetching from the database.
- [x] **Stock Health & Availability Rules**
  - [x] Display stock status pill: `In Stock`, `Low Stock (< 5 left)`, or `Out of Stock`.
  - [x] Automatically disable `+ Add to Cart` button when `stock_quantity <= 0`.
  - [x] Prevent adding more units than available stock.
- [x] **Real-time Filter & Search Engine**
  - [x] Category pill filtering: dynamically filter cards by category (`drivetrain`, `brakes`, `tires`, `cockpit`, `accessories`, `safety`, `maintenance`).
  - [x] Instant search input filtering across product names, SKUs, and categories.
  - [x] Dynamic counter label: `ALL PRODUCTS — X ITEMS` / `FILTERED — Y ITEMS`.

---

### 💳 Phase 4: Live Walk-in Order Processing & Stock Deduction (`POST /api/orders`)
- [x] **Backend Walk-in Order Endpoint**
  - [x] Mount `POST /api/orders/pos` to handle in-store walk-in POS sales.
  - [x] Validate requested items against PostgreSQL stock inside an ACID transaction (`BEGIN` / `COMMIT`).
  - [x] Deduct sold quantities from `products.stock_quantity`.
  - [x] Insert order record with `order_type: 'walk_in'`, `delivery_type: 'pickup'`, `order_status: 'completed'`, `payment_status: 'paid'`.
  - [x] Automatically create sequential invoice record (`INV-...`) in `billings` table marked as `paid`.
- [x] **Payment & Cash Calculator Modal**
  - [x] On clicking **"Charge ₱..."**, open payment settlement modal:
    - [x] **Cash:** Enter Amount Tendered (₱), calculate Change Due automatically. Quick cash shortcut buttons (+₱100, +₱500, +₱1,000, Exact).
    - [x] **GCash / Maya:** Input payment reference number.
- [x] **Custom Cashier Discount Control (Client Requirement - Interview 1)**
  - [x] Support flexible custom discount inputs: cashier can input arbitrary percentage (`%`) or direct Peso amount (`₱`), honoring store owner's requested flexibility.
- [x] **Integrated Repair Ticket Dispatch (Document Section 1.1)**
  - [x] When an order includes a Bike Maintenance item, separate **In-Store Parts Cost** (deducted from inventory) and **Labor Fee** (disbursed to mechanic).
  - [x] Dispatch `POST /api/repairs` recording customer name, contact number, bike details, assigned mechanic, labor fee, and status (`In Progress`).
- [x] **Official Digital Receipt Generation (Replacing Manual Paper Receipts)**
  - [x] Populate `#receipt_modal_overlay` with real database Order ID (`ORD-...`), timestamp, itemized breakdown, and cashier name.
  - [x] Include official Taurus store policy disclaimer on receipt footer: *"Items non-refundable. 7-day replacement for factory defective items with receipt upon supplier return."* (per Interview 1 & Doc 1.1).
  - [x] Support printing receipt via `window.print()` or thermal printer mode.
  - [x] Automatically clear cart on clicking "Done & New Transaction".

---

### 📊 Phase 5: Transaction History & Digital Columnar Logbook (`POS-history.html`)
- [x] **Digital Sales Ledger (Replacing Physical Columnar Notebook - Doc 1.1)**
  - [x] Fetch walk-in orders from `GET /api/orders/pos`.
  - [x] Dynamically render `#history_tbody` table rows with real transaction numbers, dates, items count, total, payment method, and status.
  - [x] Support daily columnar-style summary view for BIR tax preparation (3-5% tax breakdown per Interview 1).
- [x] **Instant Search & Running Total**
  - [x] Filter rows in real time by Transaction ID, product name, or payment method.
  - [x] Dynamically update **Filtered Total** badge (`#filtered_total_value`) based on displayed rows.
- [x] **Reprint Historical Receipts**
  - [x] Add "View Receipt" button to each history row.
  - [x] Fetch order item breakdown and re-open `#receipt_modal_overlay` to reprint past receipts.

---

### 🏠 Phase 6: Daily Summary & Cashier Management (`POS-home.html`)
- [x] **Real-Time Home Screen Metrics**
  - [x] Connect **Daily Summary** card to today's cumulative sales sum from database (`GET /api/orders/pos/summary`).
  - [x] Connect **Recent Transactions** table to show the 5 latest completed sales.
- [x] **Active Cashier Session Sync**
  - [x] Display active logged-in cashier name (defaulting to co-owner Russel Lu Caisido per Doc 1.1) across all POS headers.
  - [x] Provide staff login / switch cashier modal if session expires.

---

### 🖨️ Phase 7: Hardware & Thermal Printer Readiness
- [x] **Thermal Receipt Print Styling**
  - [x] Add `@media print` CSS rules tailored for standard 58mm and 80mm POS receipt roll printers.
  - [x] Suppress browser URL headers, footers, and margins during printing.
- [x] **Zero Floating Tables & Database Relational Integrity**
  - [x] Verified all 7 PostgreSQL tables (`users`, `categories`, `products`, `orders`, `order_items`, `billings`, `repairs`) have explicit foreign keys with 0 floating tables.

---

### 🔐 Phase 8: Cashier Authentication & Shift Session Gate (Eliminating Pre-filled Accounts)
- [x] **Remove Pre-filled / Hardcoded Cashier Identity**
  - [x] Strip hardcoded `"Russel Lu Caisido"` from initial HTML navigation bars in `POS-home.html`, `POS-main.html`, and `POS-history.html`.
  - [x] Remove automatic hardcoded fallback in `POS.js`; replace with dynamic session lookup from `sessionStorage` / `localStorage`.
- [x] **Dedicated Cashier Login Gate (`POS-login.html` / Lock Screen Modal)**
  - [x] Create dedicated `frontend/pages/POS/POS-login.html` (or modal terminal lock).
  - [x] Cashier sign-in form: Email / Staff ID and Password (or quick 4-digit Cashier PIN).
  - [x] Connect to `POST /api/auth/login` to authenticate staff against the database `users` table.
  - [x] Restrict POS access strictly to authorized store personnel (`role IN ('admin', 'staff')`).
- [x] **Session Protection & Route Guard**
  - [x] Add client-side route guard: if no active cashier session exists when opening `POS-home.html` or `POS-main.html`, redirect immediately to `POS-login.html`.
  - [x] Store active session object (`cashierId`, `cashierName`, `role`, `token`) in browser storage.
  - [x] Dynamically render active cashier name and staff role badge in navbar on every POS page.
- [x] **Shift Management & Cashier Clock-Out**
  - [x] Add **"Switch Cashier / Clock Out"** button to navbar header.
  - [x] Terminate cashier session, clear storage, and return to login screen.
  - [x] Tie orders and audit receipts to the logged-in staff member's real account ID in database.

---

## 🔌 API Endpoint Reference for POS Integration

| Resource | HTTP Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Catalog** | `GET` | `/api/products` | Fetch all products with live stock, SKU, and prices |
| **Categories** | `GET` | `/api/categories` | Reference list of 16 store product categories |
| **POS Checkout** | `POST` | `/api/orders/pos` | Process walk-in order, deduct stock, create billing invoice |
| **POS History** | `GET` | `/api/orders/pos` | Fetch walk-in transaction history for columnar ledger |
| **POS Summary** | `GET` | `/api/orders/pos/summary` | Fetch today's sales volume and transaction count |
| **Repairs** | `POST` | `/api/repairs` | Log repair ticket when maintenance service is sold |
| **Cashier Auth** | `POST` | `/api/auth/login` | Authenticate staff/cashier credentials |
| **Staff List** | `GET` | `/api/users` | List staff & mechanics for technician assignments |
