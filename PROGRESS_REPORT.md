# 📊 BICOBS: Simple Progress Report of All Pages

**Project:** Bike Shop Ordering and Billing System (BICOBS)  
**Client:** Taurus Bike Shop (Marilao, Bulacan)  
**Date:** October 10, 2026  
**Overall Completion:** **92%**

---

## 📈 System Summary

| Module | Pages | Status | Completion |
| :--- | :---: | :---: | :---: |
| 🌐 **1. Customer Storefront** | 6 | 🟢 Complete | **92%** |
| 👤 **2. Customer Member Portal** | 7 | 🟢 Complete | **90%** |
| 🛠️ **3. Admin Management Portal** | 10 | 🟢 Complete | **95%** |
| 📟 **4. POS Counter Terminal** | 5 | 🟢 Complete | **95%** |
| 🗄️ **5. Database & Backend APIs** | — | 🟢 Complete | **98%** |

---

## 🌐 1. Customer Storefront (Public Website)

*Directory:* `frontend/pages/`

| Page | Purpose | Status | Notes |
| :--- | :--- | :---: | :--- |
| `index.html` | Home / Landing Page | 🟢 **100%** | Hero banner, featured products, category shortcuts, service CTAs. |
| `shop.html` | Catalog Store | 🟢 **90%** | 16-category taxonomy, live products from PostgreSQL, instant search, price filters. |
| `cart.html` | Public Cart | 🟢 **95%** | Quantity steppers, order summary, store pickup (₱0) vs delivery selector. |
| `service.html` | Services & Diagnostics | 🟢 **100%** | Labor price guide, interactive bike symptom troubleshooter wizard. |
| `about.html` | About Taurus Bike Shop | 🟢 **100%** | Shop history (founded 1989 in Marilao), store location, customer mission. |
| `login.html` | Customer Sign-In & OTP | 🟢 **100%** | Login, registration, and live 6-digit email OTP verification via Gmail SMTP. |

---

## 👤 2. Customer Member Portal (Dashboard)

*Directory:* `frontend/pages/Dashboard/`

| Page | Purpose | Status | Notes |
| :--- | :--- | :---: | :--- |
| `dashboard.html` | Account Overview | 🟢 **100%** | Strict unauthenticated gate card, overview stats, recent purchases. |
| `myorders.html` | Order History & Tracking | 🟢 **90%** | 4-stage visual timeline (`Placed` ➔ `Processing` ➔ `Ready/Shipped` ➔ `Completed`). |
| `payments.html` | Saved Payments Wallet | 🟢 **100%** | Digital wallet vault for GCash, Maya, and credit/debit cards. |
| `profile.html` | Profile & Address | 🟢 **95%** | Edit customer name, phone, and delivery address (auto-fills to checkout). |
| `mycart.html` | Member Cart & Checkout | 🟢 **95%** | Cart inside dashboard with checkout modal, payment policy, and pickup date picker. |
| `products.html` | Recommendations | 🟢 **100%** | Recommended parts and accessories based on catalog. |
| `support.html` | Customer Support | 🟡 **75%** | Support inquiry form and warranty question interface. |

---

## 🛠️ 3. Admin Management Portal (Store Owner)

*Directory:* `frontend/pages/Admin/` (on `admin` branch)

| Page | Purpose | Status | Notes |
| :--- | :--- | :---: | :--- |
| `Admin/login.html` | Admin/Staff Login | 🟢 **100%** | Staff credential authentication and JWT role authorization (`admin`, `staff`). |
| `Admin/dashboard.html` | Analytics Dashboard | 🟢 **100%** | Gross revenue, pending order alerts, low-stock counters, recent sales. |
| `Admin/orders.html` | Order Management | 🟢 **100%** | Status lifecycle (`pending` ➔ `completed`), details modal, automatic stock rollback. |
| `Admin/inventory.html` | Warehouse Inventory | 🟢 **100%** | Live stock levels, low-stock warnings (<= 3), inline `+` / `-` stock adjusters. |
| `Admin/products.html` | Product Catalog CRUD | 🟢 **100%** | Add product modal, edit price/stock/details, delete product. |
| `Admin/billing.html` | Billing & Invoicing | 🟢 **100%** | Digital invoice log (`INV-...`), "Mark as Paid" action, printable invoices. |
| `Admin/repairs.html` | Bike Repair Tickets | 🟢 **100%** | Workshop repair tickets, mechanic assignments, problem notes, statuses. |
| `Admin/users.html` | User Accounts & Roles | 🟢 **100%** | List all users, provision staff accounts, update roles (`admin`, `staff`, `customer`). |
| `Admin/reports.html` | Sales Reports & Exports | 🟢 **100%** | Monthly revenue reports, inventory valuation breakdown, CSV spreadsheet exports. |
| `Admin/settings.html` | Store Configuration | 🟢 **100%** | Operating hours, delivery fee rules, store profile, audit logs. |

---

## 📟 4. POS (Point of Sale Counter Terminal)

*Directory:* `frontend/pages/POS/` (on `drafting-branch-niCap`)

| Page | Purpose | Status | Notes |
| :--- | :--- | :---: | :--- |
| `POS-login.html` | Cashier Shift Gate | 🟢 **100%** | Staff authentication, route protection, password reveal toggle, no exposed credentials. |
| `POS-home.html` | Terminal Home & Summary | 🟢 **100%** | Real-time clock, shift header, today's counter sales total (`/api/orders/pos/summary`). |
| `POS-main.html` | In-Store Counter Checkout | 🟢 **95%** | Live PostgreSQL catalog, 12 category pills, SKU search, cart side panel, custom discount (`%` / `₱`), Cash change calculator, OTC GCash ref, printable receipt. |
| `POS-repairs.html` | Workshop Service Intake | 🟢 **95%** | Tune-up package cards, customer bike model/phone intake, mechanic assignment, adds labor to cart, logs ticket to `repairs` table. |
| `POS-history.html` | Sales Ledger (BIR-Ready) | 🟢 **95%** | Filterable counter sales ledger (`ORD-POS-%`), filtered running total calculator, receipt reprint modal. |

---

## 🗄️ 5. Database & API Architecture

* **Database Engine:** PostgreSQL 15+ (Hosted on Supabase)
* **Tables Active (7):** `users`, `categories`, `products`, `orders`, `order_items`, `billings`, `repairs`
* **Security & Integrity:**
  * ACID transactions with automatic inventory reservation and cancellation rollback.
  * Role-based access control (`admin`, `staff`, `customer`) via JWT tokens.
  * Verified Gmail SMTP mailer for customer OTP codes.
