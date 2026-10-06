# BICOBS: Admin Panel Roadmap & Implementation Plan (TaurOS)

This roadmap outlines the complete status, backend integration requirements, and implementation tasks for the **Admin Side (TaurOS Admin Webpage)**.

> [!IMPORTANT]
> **Admin & Backend Integration Context:**
> - The Admin UI templates in `frontend/pages/Admin/` are already structured with premium UI styling conforming to TaurOS project rules (responsive tables, modals, badges, search, and navigation).
> - All backend REST APIs, PostgreSQL database schemas, and ACID transaction endpoints are already built on the `maula-backend` branch (`GET /api/orders`, `PUT /api/orders/:id/status`, `GET /api/billing`, `GET /api/dashboard/summary`, `POST/PUT/DELETE /api/products`).
> - This to-do details the step-by-step transition from **static mock HTML rows** to **dynamic, live database-driven administration**.

---

## 🎯 Current Status: What is Already Built

### 1. Admin Frontend Interface (`frontend/pages/Admin/`)
- [x] **Top Navbar & Brand Header (`admin_top_navbar`)**
  - [x] Responsive layout with mobile sidebar drawer toggle (`#sidebar_toggle_btn`).
  - [x] Top global search input (`#top_search_input`).
  - [x] Notifications dropdown with sample order/stock alerts (`#notification_menu`).
  - [x] Admin profile dropdown with direct links to Settings, Users, and Sign Out (`#admin_profile_menu`).
- [x] **Sidebar Navigation (`admin_sidebar`)**
  - [x] Consistent left sidebar across all 10 admin pages with active state indicators.
  - [x] Scoped admin navigation icons: Dashboard, Inventory, Products, Orders, Repairs, Billing, Reports, Users, and Settings.
  - [x] Secure sign-out modal trigger with session clearance (`executeAdminLogout`).
- [x] **Complete UI Template Suite**
  - [x] `dashboard.html` – Overview metric cards (Total Sales, Pending Orders, Low Stock, Open Repairs), Recent Transactions table, and Activity timeline.
  - [x] `orders.html` – Order queue table, tab filters (All, Online, Walk-in, Pending), search bar, and Order Details modal (`#order_detail_modal`).
  - [x] `inventory.html` – Stock levels table, category filtering, stock status pills (In Stock, Low Stock, Out of Stock), and quick adjustment controls.
  - [x] `products.html` – Catalog management table, "Add New Product" modal, and "Edit Product" modal.
  - [x] `billing.html` – Invoice history (`INV-...`), payment method tags, payment status pills, and invoice viewer modal.
  - [x] `repairs.html` – Bicycle repair ticketing, service type badges, mechanic assignment, and repair status modal.
  - [x] `reports.html` – Sales revenue charts, top-selling components, and date range filters.
  - [x] `users.html` – User account table with roles (`admin`, `staff`, `customer`) and status toggles.
  - [x] `settings.html` – Store profile form, business operating hours, receipt customization, and admin password form.
  - [x] `login.html` – Dedicated administrative sign-in portal.
- [x] **Core UI & UX Quality Standards**
  - [x] Prevent HTML injection by rendering user-entered text safely in tables, modals, and detail cards.
  - [x] Password form security: show/hide controls, no prefilled credentials, and matching confirmation validation.
  - [x] Client-side search, category filtering, and sorting across products, orders, users, and repairs.
  - [x] Polished empty, loading, and error states for all administrative tables, modals, and reports.
  - [x] Modal accessibility: keyboard navigation, Escape key dismiss, and focus restoration.
  - [x] Responsive layouts across mobile, tablet, laptop, and desktop viewports without unwanted horizontal overflow.

---

## 🚀 Admin Implementation Roadmap: From Mock UI to Live Operations

---

### Phase 1: Backend Connection & Admin Authentication Guard
- [x] **Backend Runtime Synchronization**
  - [x] Merge or sync backend server infrastructure from `maula-backend` (Express app, PostgreSQL connection, models, controllers, and routes).
  - [x] Ensure backend runs smoothly on port 5000 with CORS and JSON body parsers configured.
- [x] **Admin Login Authentication (`login.html`)**
  - [x] Connect admin login form to `POST /api/auth/login`.
  - [x] Verify user role: grant access only if `user.role === 'admin'` or `user.role === 'staff'`.
  - [x] Store admin token (`taurus_admin_token`) and user object (`taurus_admin_session`) in `localStorage`.
  - [x] Display clear inline error messages for invalid credentials or insufficient permissions.
- [x] **Global Route Guard (`admin.js`)**
  - [x] Add an authentication check at the top of all admin pages: redirect to `login.html` if `taurus_admin_token` is missing or expired.
  - [x] Display logged-in admin name and avatar initials dynamically in the top navigation bar.
  - [x] Wire the Sign Out button to purge session tokens and redirect to `login.html?logged_out=true`.

---

### Phase 2: Live Order Management (`orders.html`) — TOP PRIORITY
- [x] **Dynamic Order Queue Fetching**
  - [x] Fetch live customer orders from `GET /api/orders` (JWT Bearer token authenticated).
  - [x] Replace hardcoded mock table rows with dynamic rows generated from database records:
    - Order Number (`ORD-XXXX` or short ID)
    - Customer Name & Phone Number
    - Order Type (`Online Delivery` vs `In-Store Pickup`)
    - Payment Method (`Cash`, `GCash OTC`)
    - Order Status badge (`pending`, `processing`, `shipped`, `ready_for_pickup`, `completed`, `cancelled`)
    - Order Total (formatted in Philippine Peso: `₱XX,XXX`)
- [x] **Order Filter & Search Engine**
  - [x] Dynamic counter badges on tabs: `All Orders (X)`, `Online (Y)`, `In-Store (Z)`, `Pending Payment (W)`.
  - [x] Real-time client-side search filtering by customer name, order ID, or product name.
  - [x] Status dropdown filtering (`All`, `Pending`, `Processing`, `Completed`, `Cancelled`).
- [x] **Order Inspection & Fulfillment Modal (`#order_detail_modal`)**
  - [x] Click "View" to open modal populated with full order details:
    - Customer full name, verified email, and contact phone number.
    - Full shipping/delivery address (or pickup tag).
    - Itemized breakdown table: product images, names, quantities, unit prices, and line subtotals.
    - Associated invoice reference (`INV-...`).
- [x] **Live Status Advance & Stock Protection**
  - [x] Connect status selector to `PUT /api/orders/:id/status`.
  - [x] Allow admin to advance order: `Pending` ➔ `Processing` ➔ `Shipped / Ready for Pickup` ➔ `Completed`.
  - [x] Support `Cancelled` status with confirmation: backend automatically triggers database transaction rolling back deducted stock to product inventory.
  - [x] Show real-time toast notification on status update and re-render row status badge instantly.

---

### Phase 3: Inventory & Product Catalog Management (`products.html` & `inventory.html`)
- [x] **Live Product Catalog Rendering (`products.html`)**
  - [x] Fetch live products from `GET /api/products` (150 Taurus Bike Shop items).
  - [x] Render product cards/rows with real images, category slugs, pricing, and live warehouse stock counts.
  - [x] Dynamic category filter dropdown populated from `GET /api/categories`.
- [x] **Add New Product Workflow**
  - [x] Connect "Add Product" modal form to `POST /api/products`.
  - [x] Form validation: Name, Category, Price, Stock Quantity, Description, Image URL.
  - [x] Instant table refresh and success toast upon creation.
- [x] **Edit & Update Product**
  - [x] Click "Edit" to prefill modal with selected product's existing values.
  - [x] Send updates via `PUT /api/products/:id`.
- [x] **Delete Product Protection**
  - [x] Confirm before deleting with warning prompt.
  - [x] Send request to `DELETE /api/products/:id`.
- [x] **Live Inventory Tracking & Adjustments (`inventory.html`)**
  - [x] Highlight low stock items (stock <= 3) and out-of-stock items in real-time badges.
  - [x] Implement quick inline stock increment/decrement buttons (`+` / `-`) and manage modal to adjust live stock directly via `PUT /api/products/:id`.
  - [x] Live inventory KPI stat cards (Total Products, In Stock, Low Stock, Out of Stock).

---

### Phase 4: Billing & Financial Auditing (`billing.html`)
- [x] **Dynamic Invoice Records Fetching**
  - [x] Fetch real billing records from `GET /api/billing`.
  - [x] Display invoice number (`INV-YYYYMMDD-XXXX`), customer name, order reference, total amount, and payment status (`pending` vs `paid`).
- [x] **Confirm Payment Action**
  - [x] For orders paid via Cash on Delivery (COD) or Over-The-Counter GCash, provide a "Mark as Paid" action button.
  - [x] Wire to `PUT /api/billing/:id/payment` to update invoice and order payment status to `paid` and re-calculate gross revenue.
- [x] **Invoice Inspection & Print Modal**
  - [x] Open clean invoice preview with Taurus Bike Shop header, customer details, itemized breakdown, and print button (`window.print()`).

---

### Phase 5: Live Dashboard Overview & Analytics (`dashboard.html`)
- [x] **Connect Summary KPI Cards**
  - [x] Replace static numbers with live data from `GET /api/dashboard/summary`:
    - **Total Sales:** Live total gross revenue of all completed/paid orders.
    - **Pending Orders:** Live count of orders waiting for fulfillment.
    - **Low Stock Alerts:** Live count of products with stock <= 3.
    - **Active Customers:** Live total registered customer count.
- [x] **Recent Transactions Table**
  - [x] Populate table with the 5 most recent customer orders from `GET /api/orders`.
- [x] **Live Activity Timeline**
  - [x] Display real-time store events and order progress in system activity list.

---

### Phase 6: Service & Repairs Tracking (`repairs.html`)
- [x] **Repairs Ticket Management**
  - [x] Table of repair jobs (Customer, Bike Model, Service Type, Mechanic, Status, Estimated Cost).
  - [x] Modal to create new walk-in repair ticket.
  - [x] Update repair status: `Pending Inspection` ➔ `In Progress` ➔ `Waiting for Parts` ➔ `Completed / Ready for Pickup`.
  - [x] Delete repair ticket with confirmation.

---

### Phase 7: Users & Roles Administration (`users.html`)
- [x] **User List & Permissions**
  - [x] Fetch all users from `GET /api/users`.
  - [x] Display user roles (`customer`, `staff`, `admin`), email verification status, and registration date.
  - [x] Role management: promote/demote staff or admin members via `PUT /api/users/:id`.
  - [x] Staff account provisioning via `POST /api/users` and account removal via `DELETE /api/users/:id`.

---

### Phase 8: Reports & Business Analytics (`reports.html`)
- [x] **Performance Metrics & Reporting Engine**
  - [x] Connect KPI summary cards to live backend data (Total Revenue, Units Sold, Online Orders, Completed Repairs).
  - [x] Real-time warehouse inventory valuation and stock health audit.
  - [x] Multi-tab reporting suite (Sales Summary, Monthly Sales, Units Sold, Online Orders, Repairs, Inventory, Generator).
  - [x] Official management report generation with print/PDF preview and CSV spreadsheet exports.

---

### Phase 9: System Settings & Store Configuration (`settings.html`)
- [x] **Store Profile & Operations**
  - [x] Store profile, business registration, contact number, and email configuration.
  - [x] Operating hours schedule table and public holiday announcements.
  - [x] Payment channel toggles (GCash, Maya, BPI Bank Transfer, Cash on Delivery).
  - [x] Delivery fees, free delivery order thresholds, and serviceable coverage areas.
  - [x] Timestamped system audit log table and CSV export.

---

### Phase 10: Security Hardening & Environment Sanitization
- [x] **Secrets & Credentials Protection**
  - [x] Audit tracked files to ensure `.env` and sensitive environment configurations are never leaked.
  - [x] Remove hardcoded default admin credentials from `seed_default_admin.js`, `login.html`, and `HOW_TO_RUN.md`.
  - [x] Introduce `DEFAULT_ADMIN_PASSWORD` environment variable in `.env` and `.env.example`.
  - [x] Eliminate insecure `fallback_secret` fallbacks in JWT verification (`authMiddleware.js`) and generation (`authController.js`).
  - [x] Sanitize documentation (`HOW_TO_RUN.md`) to remove raw database connection strings and secrets.

---

## 🔌 API Endpoint Reference for Admin Integration

The following endpoints built in the backend are ready for the admin pages to consume:

| Resource | HTTP Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Admin & staff login (verifies role & issues JWT) |
| **Dashboard** | `GET` | `/api/dashboard/summary` | KPI metrics (Sales, Orders, Low Stock, Users) |
| **Dashboard** | `GET` | `/api/dashboard/low-stock` | List of items running out of inventory |
| **Orders** | `GET` | `/api/orders` | Full list of customer orders with filters |
| **Orders** | `GET` | `/api/orders/:id` | Detailed single order with item breakdown |
| **Orders** | `PUT` | `/api/orders/:id/status` | Update fulfillment status + auto stock rollback on cancel |
| **Billing** | `GET` | `/api/billing` | All invoices and payment statuses |
| **Billing** | `PUT` | `/api/billing/:id/payment` | Mark invoice/order as paid |
| **Products** | `GET` | `/api/products` | Fetch catalog (filter by category, search, stock) |
| **Products** | `POST` | `/api/products` | Create new product in catalog |
| **Products** | `PUT` | `/api/products/:id` | Update product details or stock |
| **Products** | `DELETE` | `/api/products/:id` | Remove product from catalog |
| **Repairs** | `GET/POST/PUT/DELETE` | `/api/repairs` | List, create, update status/mechanic, and remove repair tickets |
| **Users** | `GET/POST/PUT/DELETE` | `/api/users` | List, create staff, update roles, delete accounts |
| **Categories** | `GET` | `/api/categories` | Reference list of 16 bike shop categories |
