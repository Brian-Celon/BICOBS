# BICOBS: Roadmap & Customer-First Implementation Plan

This roadmap focuses primarily on the **Customer Journey (`Login ➔ Browse ➔ Cart ➔ Checkout ➔ Invoicing ➔ Order Tracking`)**. 

> [!NOTE]
> **Admin Webpage Architecture Note:**
> The Admin Web application is maintained separately and will be integrated soon. The backend APIs, relational database schema, ACID stock management, and auditing contracts are already built and fully prepared to plug directly into the admin side when ready.

---

## 🎯 Current Status (Completed Foundations)

- [x] **PostgreSQL Database & Schema (Supabase)**
  - [x] Relational tables: `users`, `products`, `categories`, `orders`, `order_items`, `billings`.
  - [x] ACID transaction support (`BEGIN`, `COMMIT`, `ROLLBACK`) for atomic order placement and stock deduction.
  - [x] Standardized 16-category reference table (`categories`) with slugs, item counts, and category group hierarchies.
  - [x] Seeded 150 Taurus Bike Shop products with high-resolution image alignments and category taxonomy.
- [x] **Catalog Browsing & Category Filtering**
  - [x] Dynamic category filtering sidebar with group expand/collapse, item count badges, and live search (`shop.html` & `shop.js`).
  - [x] Multi-category alias mapper in backend (`built_bikes`, `mountain_bikes`, `road_bikes`, `gravel_bikes`, `frame`, `fork`, `handle_bar`, `stem`, `chain`, `upgrade_kit`, `pedals`, `tires`, `rims`, `hubs`, `saddle`, `handle_grip`).
  - [x] Dynamic product loading via `GET /api/products`.
- [x] **Authentication & Security Core**
  - [x] Registration and login endpoints (`POST /api/auth/register`, `POST /api/auth/login`) with `bcryptjs` password hashing and JWT token issuance.
  - [x] Role-based authentication middleware (`authMiddleware.js`) supporting `customer`, `staff`, and `admin`.
  - [x] User profile endpoints (`GET /api/auth/me`, `PUT /api/auth/profile`).
- [x] **Billing & Invoicing Engine**
  - [x] Automatic invoice creation upon order placement (`INV-YYYYMMDD-XXXX`).
  - [x] Customer invoice endpoints (`GET /api/billing/mybilling`, `GET /api/billing/order/:orderId`).
- [x] **Backend Readiness for Future Admin Webpage**
  - [x] `GET /api/orders` & `GET /api/orders/:id` for full administrative order listing.
  - [x] `PUT /api/orders/:id/status` supporting status flow (`pending` ➔ `processing` ➔ `ready_for_pickup` / `shipped` ➔ `completed`) and automatic stock rollback on cancellation.
  - [x] `GET /api/dashboard/summary` (total sales revenue, order status counts, customer count, low-stock overview).
  - [x] `GET /api/dashboard/low-stock` query for threshold inventory alerts.
  - [x] Product CRUD endpoints (`POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`).

---

## 🚀 Customer-Side Priority Tasks: Login ➔ Order ➔ Checkout

### 1. Customer Authentication & Session Continuity
- [x] **Registration & Login UI**
  - [x] Standalone login/register page (`login.html` / `login.js`) and reusable modal overlay (`auth_modal.js`).
  - [x] Store customer JWT token and profile (`tb_user_name`, `tb_user_email`, `tb_user_phone`, `tb_user_shipping`) in client storage.
  - [x] Password confirmation validation, eye show/hide toggle buttons, and Philippine mobile number normalization (`09XXXXXXXXX`).
  - [x] Non-blocking inline alert banners (`auth_alert_banner`) replacing intrusive browser popups.
  - [x] URL deep-linking support (`?mode=signup` or `#signup`) to automatically flip directly to the registration form.
  - [x] Smooth redirect handling preserving target destinations (`?redirect=cart`, `orders`, `shop`).
- [x] **6-Digit Email OTP Verification Engine**
  - [x] Backend OTP generation and verification endpoints (`POST /api/auth/verify-otp`, `POST /api/auth/resend-otp`).
  - [x] Database columns: `is_verified`, `verification_otp`, and `otp_expires_at` (10-minute expiry).
  - [x] Production SMTP email dispatch via `nodemailer` with built-in development terminal simulator fallback.
  - [x] Interactive 6-digit OTP modal on `login.html` with auto-focus jumping, backspace navigation, paste handling, and 60-second resend timer.
  - [x] Unverified account login guard: rejects unverified logins with prompt to verify code immediately.
- [ ] **Auth Guard & Checkout Redirection**
  - [ ] When a guest user clicks "Proceed to Checkout" in `mycart.html`, trigger `auth_modal.js` without losing their cart items.
  - [ ] Automatically resume and reopen the checkout modal upon successful customer login.
  - [ ] Update navigation bar on all customer pages (`index.html`, `shop.html`, `service.html`) to dynamically display user avatar, full name, and "My Orders" link when signed in.
  - [ ] Handle expired session tokens gracefully with automatic re-login prompt instead of generic error alerts.

### 2. Catalog Discovery & Stock Availability Transparency
- [x] **Dynamic Catalog & Filtering**
  - [x] Multi-category selection and real-time product list rendering (`shop.js`).
- [ ] **Live Inventory Stock Badges**
  - [ ] Display real stock availability badges on each product card in `shop.html`:
    - `In Stock (X available)` when `stock_quantity > 3`
    - `Low Stock (Only X left!)` in amber when `stock_quantity <= 3`
    - `Out of Stock` in red when `stock_quantity = 0`
  - [ ] Disable the "Add to Cart" button when a product is out of stock.
  - [ ] Enforce stock limit on the client side so customers cannot add more units to the cart than the existing database stock.

### 3. Shopping Cart Management (`mycart.html` & `cart_view.js`)
- [x] **Persistent Cart Storage**
  - [x] Local storage cart persistence (`bicobs_cart`) across all shop and dashboard pages.
  - [x] Dynamic cart badge count in the header.
- [x] **Cart View & Calculation Engine**
  - [x] Render cart items with product thumbnails, category tags, unit prices, and line subtotals.
  - [x] Quantity steppers (+ / -) capped at product's maximum available stock.
  - [x] Item removal button and "Empty Cart" action.
  - [x] Empty cart placeholder state with quick action button directing back to `shop.html`.
- [ ] **Transparent Order Summary Calculation**
  - [ ] Real-time breakdown: `Subtotal`, `Fulfillment Fee` (Delivery: ₱150 / In-Store Pickup: ₱0), `Discount Amount`, and `Total Price`.

### 4. Customer Checkout Flow (`mycart.html` Modal)
- [ ] **Fulfillment Method Selector**
  - [ ] Provide clear toggle between:
    - 🚚 **Standard Delivery:** Fixed ₱150 delivery fee (Marilao & neighboring areas). Requires delivery address and contact phone.
    - 🏬 **Store Pickup:** ₱0 delivery fee (Pick up at Taurus Bike Shop, Marilao, Bulacan).
- [ ] **Customer Contact & Delivery Form**
  - [ ] Pre-fill fields with user's saved profile data:
    - Recipient Full Name (editable)
    - Mobile Phone Number (validated 11-digit PH mobile format, e.g., `09XXXXXXXXX`)
    - Complete Delivery Address (Street / Barangay / Municipality / Province)
    - Special Delivery / Pickup Notes (optional instructions)
- [ ] **Payment Method Selection**
  - [ ] Let customer select their intended payment method:
    - 💵 **Cash on Delivery (COD)** / **Cash on Pickup**
    - 📱 **GCash / E-Wallet Over-the-Counter** (with payment instructions)
- [ ] **Robust Pre-Submission Validation**
  - [ ] Prevent submission if cart is empty.
  - [ ] Validate phone number and shipping address before dispatching request.
  - [ ] Prevent multiple accidental submissions by disabling submit button and displaying a loading spinner during API dispatch.

### 5. Order Confirmation & Customer Order Tracking (`myorders.html`)
- [x] **Order Confirmation Modal**
  - [x] Display order success modal with real Order ID and Total Paid.
  - [x] Automatically empty the client shopping cart upon successful creation.
- [x] **Customer Order History Portal (`myorders.html` & `orders_view.js`)**
  - [x] Fetch customer orders from `GET /api/orders/myorders` using JWT authentication.
  - [x] 4-stage visual progress timeline: `Placed` ➔ `Processing` ➔ `Shipped / Ready for Pickup` ➔ `Completed` (or `Cancelled`).
  - [x] Itemized list breakdown for every order (products, quantities, unit prices, and line subtotals).
  - [x] Display associated invoice number (`INV-...`) and payment status badge (`Pending` / `Paid`).
- [ ] **Customer Order Self-Service Cancellation**
  - [ ] Allow customers to cancel orders that are still in `pending` status directly from `myorders.html`.
  - [ ] Trigger automatic stock restoration in PostgreSQL database upon cancellation.

### 6. Customer Profile & Default Address Management (`profile.html` / `dashboard.js`)
- [x] **Profile Integration**
  - [x] View customer account details (`GET /api/auth/me`).
  - [x] Update personal details (Name, Phone number, Shipping Address) via `PUT /api/auth/profile`.
- [ ] **Seamless Address Synchronization**
  - [ ] Automatically reflect updated profile address into future checkout forms without re-typing.

---

## 🔌 Admin Integration Readiness Checklist (Pre-Built for Admin Webpage)

The following backend endpoints and data structures are fully built and ready to connect to the separate admin application:

| Feature / Requirement | Backend Endpoint / Status | Admin Webpage Purpose |
| :--- | :--- | :--- |
| **Orders Queue** | `GET /api/orders` | Display incoming live customer orders with status filters |
| **Order Status Control** | `PUT /api/orders/:id/status` | Advance status (`processing`, `shipped`, `completed`, `cancelled`) |
| **Stock Auto-Rollback** | Embedded in status transition | Automatically restores inventory when an order is cancelled |
| **Billing Management** | `GET /api/billing` & `PUT /api/billing/:id/payment` | Audit invoices & mark cash/OTC orders as `paid` |
| **Sales Analytics** | `GET /api/dashboard/summary` | Real-time sales total, order breakdown, and user stats |
| **Inventory Alerts** | `GET /api/dashboard/low-stock` | Warn admin about products running out of stock (<= 5 units) |
| **Product CRUD** | `POST`, `PUT`, `DELETE /api/products` | Manage product catalog, prices, and warehouse stock levels |
| **Category Taxonomy** | `GET /api/categories` | Manage standardized shop category associations |

---

## 🚫 Out of Scope (Excluded Non-Essential Features)

- ❌ Automated third-party payment gateway webhooks (PayPal/Stripe/automated GCash API).
- ❌ External PDF invoice generator libraries (system uses clean HTML/print CSS).
- ❌ External transactional email services (SMTP/SendGrid).
- ❌ Social OAuth logins (Google/Facebook third-party auth).
