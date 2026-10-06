# 📊 BICOBS: System Progress Report

**Project Name:** Bike Shop Ordering and Billing System (BICOBS)  
**Client:** Taurus Bike Shop (Marilao, Bulacan)  
**Date:** October 6, 2026  
**Repository Branch:** `maula-backend`  

---

## 📈 Executive Summary

| Module | Status | Completion | Primary Focus |
| :--- | :---: | :---: | :--- |
| **Customer Side** | 🟢 High | **88%** | Online Ordering, Catalog, Auth, OTP, Cart, & Tracking |
| **Admin Side** | 🟡 Moderate | **50%** | Backend APIs & Data complete; UI Integration pending |
| **POS (Point of Sale)** | 🟠 In Progress | **25%** | Database & Billing contracts ready; Cashier UI pending |

```
Customer Side : [=======================>.....] 88%
Admin Side    : [=============>...............] 50%
POS Side      : [======>......................] 25%
```

---

## 🛒 1. Customer Side (88% Completed)

The customer journey covers browsing products, account verification, cart operations, multi-channel checkout, and live order tracking.

### ✅ Completed Features
* **Catalog Browsing & Category Filtering:**
  * 150 seeded Taurus Bike Shop products with high-resolution image links.
  * Standardized 16-category taxonomy with group collapsible navigation (`shop.html` / `shop.js`).
  * Live client-side product search and category item count badges.
* **Authentication, Session & Email OTP Verification:**
  * User registration and login forms with `bcryptjs` password hashing and JWT token issuance.
  * Live Gmail SMTP email dispatch (`nodemailer`) with 6-digit OTP verification and 10-minute expiry.
  * Unverified account guard intercepting unauthenticated access.
  * Guest checkout prompt preserving cart items across login.
* **Shopping Cart & Checkout Engine (`mycart.html` / `cart_view.js`):**
  * Persistent local shopping cart (`bicobs_cart`) across all shop and dashboard pages.
  * Transparent order summary breakdown (Subtotal, Delivery Fee, Discount, and Total Amount).
  * Fulfillment selector:
    * 🚚 **Home Delivery:** Courier delivery handling with prefilled profile address.
    * 🏬 **Store Pick-Up:** ₱0 delivery fee with scheduled pickup date & time window (8:00 AM – 6:00 PM).
  * Enforced payment policy: In-store pickup supports Cash on Pick-Up, GCash, and BPI; Delivery requires advance GCash or BPI (COD disabled per store policy).
* **Saved Payments & Billing:**
  * Wallet storage (`payments.html`) supporting GCash, Maya, and Card payment methods.
  * Mandatory saved wallet rule before checkout submission.
  * Automatic invoice issuance (`INV-YYYYMMDD-XXXX`) upon order creation.
* **Order History & Timeline (`myorders.html`):**
  * 4-stage visual progress timeline (`Placed` ➔ `Processing` ➔ `Shipped / Ready for Pickup` ➔ `Completed`).
  * Itemized breakdown of purchases, payment status badges, and public tracking via order number (`/api/orders/track/:orderNumber`).

### ⏳ Remaining Customer Tasks
* [ ] **Live Inventory Stock Badges:** Add badges on product cards (`In Stock`, `Low Stock`, `Out of Stock`) and client-side cart limits matching database stock.
* [ ] **Self-Service Order Cancellation:** Allow customers to cancel orders that are still in `pending` status.
* [ ] **Profile Address Synchronization:** Auto-fill updated profile address to checkout forms seamlessly.

---

## 🛠️ 2. Admin Side (50% Completed)

The Admin module is architected with complete backend API contracts and database transaction logic, awaiting full integration with the dedicated Admin Web UI.

### ✅ Completed Features (Backend & Data Layer: ~95%)
* **Role-Based Access Control (RBAC):**
  * JWT verification and role authorization middleware (`protect`, `authorize('admin', 'staff')`).
* **Order Lifecycle & Management Endpoints:**
  * `GET /api/orders` – Administrative list of customer orders with status filtering.
  * `PUT /api/orders/:id/status` – Update order lifecycle (`pending`, `processing`, `ready_for_pickup`, `shipped`, `completed`).
  * **Automated Stock Rollback:** Cancelling an order automatically restores product stock in PostgreSQL via ACID transactions.
* **Invoicing & Billing Auditing:**
  * `GET /api/billing` – Central billing records auditing.
  * `PUT /api/billing/:id/payment` – Update payment status for over-the-counter payments.
* **Analytics & Alerts:**
  * `GET /api/dashboard/summary` – Real-time sales revenue, order status breakdown, and customer counts.
  * `GET /api/dashboard/low-stock` – Inventory threshold alert for stock replenishments (<= 5 units).
* **Product Catalog CRUD:**
  * `POST`, `PUT`, `DELETE /api/products` endpoints for adding, editing, and archiving products and prices.

### ⏳ Remaining Admin Tasks (Frontend Integration: ~15%)
* [ ] Connect dedicated Admin Web frontend pages to the backend REST endpoints.
* [ ] Admin dashboard charts (sales trends, revenue metrics).
* [ ] Order queue management table with direct status action buttons.
* [ ] Catalog management UI for updating stock and adding new products.

---

## 📟 3. POS (Point of Sale) Side (25% Completed)

The POS system facilitates physical walk-in store transactions, over-the-counter ordering, and instant receipt generation.

### ✅ Completed Features (Transaction & Billing Layer: ~50%)
* **Database & Schema Alignment:**
  * Schema support for walk-in orders (`delivery_type = 'pickup'`, `payment_method = 'cash'`, OTC settlements).
  * Relational links between orders, order items, and billing invoices.
* **Atomic Stock Deduction:**
  * Real-time inventory deduction ensuring in-store purchases immediately sync with online stock levels.
* **Receipt & Invoice Generation:**
  * Instant invoice record creation (`billings` table) formatted for clean print output.

### ⏳ Remaining POS Tasks (Cashier Terminal Interface: ~0%)
* [ ] Dedicated cashier POS terminal screen for walk-in counter operations.
* [ ] Rapid product lookup (SKU search, category quick-grid, barcode input).
* [ ] Fast walk-in guest cart checkout without requiring customer account registration.
* [ ] Cash tender and change calculation module.
* [ ] Printable thermal receipt layout.

---

## 📅 Roadmap Next Steps

1. **Phase 1 (Immediate):** Add live inventory stock badges on customer product cards (`shop.html`).
2. **Phase 2 (Upcoming):** Integrate the Admin Dashboard frontend interface with existing backend summary & order management endpoints.
3. **Phase 3 (Next Sprint):** Build the lightweight in-store Cashier POS terminal for walk-in transactions.
