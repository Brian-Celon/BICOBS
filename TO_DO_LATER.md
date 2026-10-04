# BICOBS: Core Functions & Backend Roadmap

This document outlines the core functional architecture and backend development roadmap for the **BICOBS (Bike Shop Ordering and Billing System)**. It focuses strictly on system operations, data integrity, and backend APIs—excluding third-party payment gateways, external verification services, and cosmetic extras.

---

## 🎯 Current Status (Completed Foundations)

- [x] **PostgreSQL Database on Supabase**
  - [x] Relational schema: `users`, `products`, `orders`, `order_items`, `billings`.
  - [x] ACID transaction support (`BEGIN`, `COMMIT`, `ROLLBACK`) for order placement and stock deduction.
  - [x] 150 verified Taurus Bike Shop products seeded across 13 distinct shop categories.
- [x] **Catalog & Shopping Cart Engine**
  - [x] Multi-select checkbox category filtering and price sorting (`shop.html` & `shop.js`).
  - [x] Isolated client-side cart storage (`bicobs_cart`) with stock-capped quantity controls.
  - [x] Customer checkout form (`mycart.html`) passing delivery details and item arrays.
- [x] **Authentication Core**
  - [x] User registration & login with `bcryptjs` password hashing and JWT token issuance.
  - [x] JWT verification middleware (`authMiddleware.js`) with role support (`customer`, `staff`, `admin`).

---

## 🛠️ Prioritized Backend & Functional Tasks

### 1. Order Lifecycle & Status Management (Backend)
- [ ] **Order Status Transitions API (`PUT /api/orders/:id/status`)**
  - [ ] Implement backend endpoint for staff/admin to transition order statuses:
    - `pending` ➔ `processing` ➔ `ready_for_pickup` / `shipped` ➔ `completed`
  - [ ] **Stock Rollback on Cancellation:** Automatically restore product `stock_quantity` in PostgreSQL if an order is marked `cancelled`.
  - [ ] Validate permissible state transitions (e.g. cannot cancel an already `completed` order).

### 2. Customer Order Tracking & History (Functionality)
- [ ] **Complete `myorders.html` Data Integration**
  - [ ] Connect `orders_view.js` to `GET /api/orders/myorders` to render real customer orders.
  - [ ] Display ordered items breakdown (product name, quantity, unit price, item subtotal).
  - [ ] Order status tracker pill reflecting real database state (`pending`, `processing`, `shipped`, `delivered`, `cancelled`).
  - [ ] Link each order to its corresponding billing invoice number.

### 3. Automated Billing & Invoicing Engine (Backend)
- [ ] **Billing Records & Retrieval (`/api/billing`)**
  - [ ] Automatic billing record creation upon order submission with unique invoice numbers (`INV-YYYYMMDD-XXXX`).
  - [ ] Customer invoice retrieval endpoint (`GET /api/billing/mybilling` & `GET /api/billing/order/:orderId`).
  - [ ] Payment status tracking: record method (*Cash on Delivery*, *GCash OTC*, *Store Pickup Cash*) and flag status as `unpaid` or `paid`.
  - [ ] Staff endpoint to toggle invoice payment status when cash or OTC payment is received.

### 4. Admin Order Processing & Inventory Controls (Dashboard Backend)
- [ ] **Admin Orders Queue (`dashboard.html` / `dashboardController.js`)**
  - [ ] Live incoming orders list with customer contact info, delivery address, and order items.
  - [ ] Status update action buttons directly in the dashboard table.
  - [ ] Real-time sales aggregation query (`SUM(total_amount)`, count of completed orders).
- [ ] **Inventory & Stock Management (`products.html` / `productController.js`)**
  - [ ] Admin product list with live stock levels and availability toggles (`is_available`).
  - [ ] Update product price and stock quantity endpoint (`PUT /api/products/:id`).
  - [ ] Create new product endpoint (`POST /api/products`) with SKU and category assignment.
  - [ ] Low stock alert query (`stock_quantity <= 3`).

### 5. User Profile & Account Data (Functionality)
- [ ] **Customer Profile Endpoint (`GET /api/auth/me` & `PUT /api/auth/profile`)**
  - [ ] Fetch logged-in user profile details (name, email, phone, default delivery address).
  - [ ] Allow customers to update contact number and shipping address in `profile.html`.
  - [ ] Pre-fill checkout form with stored customer profile address and phone.

---

## 🚫 Out of Scope (Excluded Non-Essential Features)

The following items are intentionally excluded to keep the project robust, lightweight, and focused on core requirements:
- ❌ Third-party payment gateway APIs / automated payment verification (GCash webhook, PayPal/Stripe sandbox).
- ❌ External PDF invoice generator libraries (system uses clean HTML/print CSS instead).
- ❌ External transactional email services (SMTP/SendGrid).
- ❌ Social OAuth logins (Google/Facebook third-party auth).
