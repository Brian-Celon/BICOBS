# 🧾 Taurus POS: Core Point of Sale Roadmap & Task Tracker

This roadmap tracks the essential, software-only functionality for the **Taurus Point of Sale (POS Terminal)**. It focuses exclusively on the necessary in-store operations required by Taurus Bike Shop, eliminating any external hardware dependencies.

---

## 🎯 Scope Definition: Software-Only Core System

> [!IMPORTANT]
> **No Specialized Hardware Required:**
> * ❌ **No Thermal Roll Printers:** Uses standard browser printing (`window.print()`) with a clean, printer-friendly CSS layout.
> * ❌ **No Physical Barcode Scanners:** Uses fast client-side text/SKU search filtering across the product catalog.
> * ❌ **No Electronic Cash Drawer Kickers:** Uses clean on-screen cash tender and change calculation.
> * ❌ **No Automated Gateway Webhooks:** In-store payments use Cash or manual Over-The-Counter GCash/Maya reference codes.

---

## 🏗️ System Overview & Architecture

* **Repository Branch:** `drafting-branch-niCap`
* **Target Environment:** Standard Web Browser (Chrome/Edge/Firefox) on desktop or laptop counter
* **Database:** Central PostgreSQL (Supabase) database sharing real-time product inventory, customer records, repair tickets, and billing ledgers
* **Key Files:**
  * [`frontend/pages/POS/POS-login.html`](file:///d:/BICOBS/frontend/pages/POS/POS-login.html) — Cashier Authentication & Shift Gate
  * [`frontend/pages/POS/POS-home.html`](file:///d:/BICOBS/frontend/pages/POS/POS-home.html) — Terminal Dashboard & Shift Summary
  * [`frontend/pages/POS/POS-main.html`](file:///d:/BICOBS/frontend/pages/POS/POS-main.html) — Counter Checkout & Live Product Catalog
  * [`frontend/pages/POS/POS-repairs.html`](file:///d:/BICOBS/frontend/pages/POS/POS-repairs.html) — Workshop & Repair Service Intake
  * [`frontend/pages/POS/POS-history.html`](file:///d:/BICOBS/frontend/pages/POS/POS-history.html) — Sales Ledger & Receipt History
  * [`frontend/css/POS.css`](file:///d:/BICOBS/frontend/css/POS.css) — Unified POS Styling
  * [`frontend/js/POS.js`](file:///d:/BICOBS/frontend/js/POS.js) — Cart Engine, Cash Calculator & Receipt Logic

---

## 📋 Core Functionality Checklist

### 🔐 1. Cashier Authentication & Shift Gate
*Goal: Ensure only authorized store staff/owner operate the counter and tag transactions to active personnel.*
- [x] **Staff Login Screen ([`POS-login.html`](file:///d:/BICOBS/frontend/pages/POS/POS-login.html)):**
  - [x] Authenticate cashier credentials (Email & Password) via `POST /api/auth/login`.
  - [x] Role validation: Allow only `admin` and `staff` accounts (reject `customer` logins).
  - [x] Password visibility reveal toggle.
  - [x] Session persistence in browser `localStorage` (`pos_cashier_session`).
- [x] **Route Protection & Header Sync:**
  - [x] Redirect unauthenticated visits from terminal pages back to `POS-login.html`.
  - [x] Dynamically display active cashier name and role badge in the navigation bar.
- [x] **Shift End / Clock Out:**
  - [x] "Clock Out" button to clear session and lock terminal for the next shift.

---

### 🛒 2. Counter Sales & Inventory Management
*Goal: Allow the cashier to quickly look up items, check stock, build orders, and immediately deduct inventory.*
- [x] **Live Catalog Integration ([`POS-main.html`](file:///d:/BICOBS/frontend/pages/POS/POS-main.html)):**
  - [x] Fetch all products dynamically from PostgreSQL via `GET /api/products`.
  - [x] Category pill navigation (`Bicycles`, `Frames`, `Forks`, `Drivetrain`, `Chains`, `Pedals`, `Rims`, `Hubs`, `Tires`, `Cockpit`, `Saddles`, `Upgrade Kits`).
  - [x] Fast instant text search by product title or SKU.
- [x] **Stock Availability Rules:**
  - [x] Display real-time stock pills: `In Stock`, `Low Stock (< 5 left)`, or `Out of Stock`.
  - [x] Disable "+ Add to Order" button when `stock_quantity <= 0`.
  - [x] Prevent cart quantity from exceeding available warehouse stock.
- [x] **Cart Side-Panel & Calculations:**
  - [x] Real-time calculations: Subtotal, item count, and grand total.
  - [x] Increment (`+`), decrement (`-`), and individual item remove controls.
  - [x] "Clear Cart" confirmation action.
  - [x] Shared cart state between Products and Repairs tabs via `sessionStorage`.

---

### 💵 3. In-Store Payment & Settlement
*Goal: Support the store's actual counter payment options (Cash and Over-The-Counter GCash/Maya) with atomic stock deduction.*
- [x] **Flexible Discount Controls (Client Interview Requirement):**
  - [x] Store promo codes (`TAURUS10`, `VIP50`, `SAVE100`).
  - [x] Arbitrary custom cashier discount (percentage `%` or direct Peso `₱` discount).
- [x] **Payment Settlement Modal:**
  - [x] **Cash Settlement:** Enter Amount Tendered (₱), automatic real-time Change Due calculation, and quick-cash shortcut buttons (+₱100, +₱500, +₱1,000, Exact).
  - [x] **Tender Guard Validation:** Disallow payment submission if Amount Tendered is less than Grand Total (prevents negative change).
  - [x] **Customer Name Fallback:** Defaults empty customer input to `"Walk-in Customer"`.
  - [x] **Digital Wallet (GCash / Maya):** Input payment reference number for OTC transfers.
- [x] **ACID Database Processing (`POST /api/orders/pos`):**
  - [x] Run inside a PostgreSQL transaction (`BEGIN` / `COMMIT`).
  - [x] Atomic stock deduction from `products.stock_quantity`.
  - [x] Create order record (`orders` table) marked as `pickup`, `completed`, and `paid`.
  - [x] Create corresponding invoice record in `billings` table (`INV-POS-YYYYMMDD-XXXX`).

---

### 🔧 4. Bike Workshop & Repair Service Intake
*Goal: Support walk-in repair customers by generating repair tickets and recording mechanic labor fees.*
- [x] **Dedicated Repairs Station ([`POS-repairs.html`](file:///d:/BICOBS/frontend/pages/POS/POS-repairs.html)):**
  - [x] Standard service package cards (Tune-Up, Overhaul, Brake Bleed, Wheel Truing, Assembly, Tubeless Setup, Tube Replacement).
  - [x] Custom labor fee input for non-standard repairs.
- [x] **Intake Details Capture:**
  - [x] Customer name and contact phone number.
  - [x] Bicycle model and description of mechanical problem.
  - [x] Mechanic assignment (default: Reynaldo).
- [x] **Database Ticket Logging:**
  - [x] Insert sequential repair ticket (`#R...`) into Supabase `repairs` table.
  - [x] Add labor fee into the active checkout cart so parts and repair labor can be billed together.

---

### 📄 5. Digital Receipts & Invoicing (Standard Browser Print)
*Goal: Replace handwritten columnar notes and paper receipts with organized digital records.*
- [x] **Official Receipt Modal:**
  - [x] Display Order ID (`ORD-POS-...`), Invoice ID (`INV-POS-...`), date/time, and cashier name.
  - [x] Itemized purchase list (parts and repair labor).
  - [x] Subtotal, discount applied, and final total.
  - [x] Payment breakdown (Method, Amount Tendered, Change Due, or Reference Code).
  - [x] Store policy footer: *"Items non-refundable. 7-day replacement for factory defective items with receipt upon supplier return."*
- [x] **Standard Browser Print (`window.print()`):**
  - [x] Clean print stylesheet (`@media print`) hiding backgrounds, navbars, and modal chrome for clean paper/PDF output using any standard desktop printer or browser "Save as PDF".

---

### 📊 6. Sales History Ledger & Digital Columnar Logbook
*Goal: Provide a digital replacement for the store's physical columnar logbook for BIR accounting.*
- [x] **Sales Ledger Table ([`POS-history.html`](file:///d:/BICOBS/frontend/pages/POS/POS-history.html)):**
  - [x] Fetch completed transactions from `GET /api/orders/pos`.
  - [x] Display columns: Order #, Date & Time, Customer, Items Summary, Total, Payment Method, and Status.
- [x] **Instant Filter & Running Total:**
  - [x] Search by Order/Invoice Number, Customer Name, or Product Name.
  - [x] Real-time filtered sales total (`#filtered_total_value`) dynamically calculating the sum of displayed transactions.
- [x] **Receipt Reprinting:**
  - [x] "View / Print Receipt" action on each history row to re-open the receipt modal for past orders.

---

### 🏠 7. Shift Dashboard & Daily Overview
*Goal: Give the cashier a quick summary of the current day's business.*
- [x] **Daily Metrics ([`POS-home.html`](file:///d:/BICOBS/frontend/pages/POS/POS-home.html)):**
  - [x] Connect daily summary card to `GET /api/orders/pos/summary` (Today's Total Sales & Order Count).
  - [x] Real-time digital clock display.
  - [x] Recent 5 transactions table with quick navigation to History.

---

## 🧪 Current Verification & Readiness

- [x] **Backend Security Hardening (verified):**
  - [x] `POST/GET /api/orders/pos` and `/pos/summary` now require a staff/admin JWT (unauthenticated calls return `401`).
  - [x] Orders and repair tickets are tied to the real logged-in cashier (`req.user.id`), not the first admin account.
  - [x] Frontend sends the cashier token on every POS call via `posFetch()`; expired sessions return to `POS-login.html`.
- [x] **API-level End-to-End Test (passed, test data cleaned up):**
  - [x] Staff login ➔ cash sale with product + repair labor ➔ `201` with invoice `INV-POS-...` and 1 repair ticket.
  - [x] Stock deducted correctly (8 ➔ 6) and blank customer name saved as `Walk-in Customer`.
- [ ] **Manual Browser Walkthrough (remaining):**
  - [ ] Click through `POS-login.html` ➔ `POS-main.html` sale ➔ receipt print preview.
  - [ ] Submit a repair from `POS-repairs.html` and confirm it appears in `POS-history.html`.

