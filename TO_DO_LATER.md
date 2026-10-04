# BICOBS: Project Roadmap & To-Do List

This document tracks upcoming tasks, completed features, and backlog items for the **BICOBS (Bike Shop Ordering and Billing System)**.

---

## 🎯 Phase 1: Core Ordering & Cart Pipeline (✅ Completed)

- [x] **1. Shopping Cart State Management (`shop.html` & `mycart.html`)**
  - [x] Implement `Add to Cart` functionality in product cards with stock check.
  - [x] Store cart items in browser `localStorage` with quantity, product ID, unit price, and image.
  - [x] Update live cart badge counter in the navigation header across all pages.
  - [x] Render dynamic cart items inside [mycart.html](file:///d:/BICOBS/frontend/pages/Dashboard/mycart.html).
  - [x] Quantity controls (+ / -) with maximum stock limits and item removal.

- [x] **2. Checkout & Order Placement (`/api/orders`)**
  - [x] Order summary breakdown (Subtotal, Estimated Shipping/Delivery, Total).
  - [x] Customer checkout form (Name, Contact Number, Delivery Address / In-Store Pickup option).
  - [x] Payment method selection (*GCash, Cash on Delivery / Over-the-counter, Credit/Debit Card*).
  - [x] API endpoint `POST /api/orders` to save order in PostgreSQL (Supabase) with ACID transactions.
  - [x] Real-time stock deduction: Automatically decrement stock quantity in database upon order confirmation.
  - [x] Order confirmation modal / success page with order tracking number.

---

## 🧾 Phase 2: Digital Billing & Invoicing Engine

- [ ] **3. Automated Digital Invoicing (`/api/billing` & `payments.html`)**
  - [ ] Auto-generate a `Billing` record linked to each placed `Order` with a unique Invoice ID (e.g. `INV-2026-XXXX`).
  - [ ] Display digital receipts / transaction history in [payments.html](file:///d:/BICOBS/frontend/pages/Dashboard/payments.html).
  - [ ] Printable / Downloadable PDF-friendly Billing Slip for customer and store records.
  - [ ] Payment status management (*Unpaid, Paid, Refunded*).

---

## 📦 Phase 3: Order History & Customer Portal

- [ ] **4. Customer Order Tracking (`myorders.html`)**
  - [ ] Dynamic listing of past and active orders for the customer.
  - [ ] Status progression tracker (*Pending ➔ Confirmed / Processing ➔ Out for Delivery / Ready for Pickup ➔ Completed ➔ Cancelled*).
  - [ ] Order details view (ordered items, breakdown, delivery details).

---

## 📊 Phase 4: Admin Dashboard & Inventory Management

- [ ] **5. Admin Order Processing (`dashboard.html`)**
  - [ ] View incoming customer orders in real time.
  - [ ] Update order status (Approve, Process, Mark as Completed, Cancel).
  - [ ] Revenue and sales analytics summary (Daily, Weekly, Monthly sales metrics).

- [ ] **6. Product CRUD & Cloudinary Image Upload**
  - [ ] Add New Product modal with Cloudinary direct upload.
  - [ ] Edit existing product details (Price, Stock, Description, Category).
  - [ ] Delete / Archive product from catalog.
  - [ ] Low stock alert thresholds in dashboard.

---

## 🎨 Phase 5: Landing Page & Shop Enhancements

- [ ] **7. Dynamic Homepage Integration (`index.html`)**
  - [ ] Connect Featured Products section to live MongoDB product data.
  - [ ] Connect Categories and promo links to filtered shop views.
- [ ] **8. Advanced Shop Filtering & Search (`shop.html`)**
  - [ ] Live search bar by product title and brand.
  - [ ] Category filtering tabs (Bikes & Frames, Components, Gear, Accessories).
  - [ ] Price range filter slider and sort dropdown (*Price: Low to High, High to Low, Newest*).
  - [ ] Pagination controls for 150+ products catalog.

---

## 🔐 Phase 6: Authentication & Security

- [ ] **9. User Auth & Session Management (`login.html`)**
  - [ ] Customer registration and login with JWT tokens.
  - [ ] Role-based access control (Customer vs Admin/Staff).
  - [ ] Protected routes for Admin Dashboard.
  - [ ] Profile management in [profile.html](file:///d:/BICOBS/frontend/pages/Dashboard/profile.html).

---

## ✅ Completed Tasks

- [x] Backend Express Server setup on port 5000 with PostgreSQL (Supabase) connection.
- [x] Relational Database Schema definitions (`users`, `products`, `orders`, `order_items`, `billings`).
- [x] Cloudinary CDN integration to deliver all product images.
- [x] Automated matching of all 150 catalog products to exact Cloudinary URLs and 13 categories.
- [x] PostgreSQL database seeded with updated product catalog via `migrate.js`.
- [x] Product card layout and responsive image styling on [shop.html](file:///d:/BICOBS/frontend/pages/shop.html) and [dashboard.html](file:///d:/BICOBS/frontend/pages/Dashboard/dashboard.html).
- [x] Multi-select checkbox category filtering and price sorting.
