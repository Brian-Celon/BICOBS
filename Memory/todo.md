# Admin Panel (TaurOS) Task Tracker

## Completed UI Work
- [x] Prevent HTML injection by rendering user-entered text safely in payment cards and support tickets.
- [x] Fix the password form UI: remove the prefilled password, add show/hide controls, and check that the new password and confirmation match.
- [x] Add client-side search, filters, and sorting for currently displayed products, orders, and other page content.
- [x] Make “Add to Cart” buttons work in the UI and show cart count and totals.
- [x] Improve empty, loading, and error states for products, cart, orders, payments, and support pages.
- [x] Fix placeholder links and buttons with appropriate navigation or clear disabled states.
- [x] Improve modal accessibility: keyboard focus, Escape handling, focus return, and clear labels.
- [x] Make all pages and modals responsive across phone, tablet, laptop, and large desktop widths; avoid unwanted horizontal overflow.
- [x] Improve form usability: validation messages, input types, labels, and clear success/error feedback.
- [x] Review visual consistency and accessibility: heading hierarchy, contrast, keyboard focus styles, and descriptive button labels.
- [x] Verify static asset paths and provide graceful fallbacks for missing images.
- [x] Scoped 10 admin page layouts (`dashboard.html`, `orders.html`, `inventory.html`, `products.html`, `billing.html`, `repairs.html`, `reports.html`, `users.html`, `settings.html`, `login.html`).

---

## Active Backend Integration Roadmap (See TO_DO_ADMIN.md)
- [x] **Phase 1: Backend Connection & Admin Authentication Guard**
  - [x] Connect `login.html` to `POST /api/auth/login` (admin & staff role check).
  - [x] Store admin token (`taurus_admin_token`) and guard all admin pages.
  - [x] Display dynamic admin user details in top navbar & wire logout.
- [x] **Phase 2: Live Orders Management (`orders.html`) — TOP PRIORITY**
  - [x] Fetch live customer orders from `GET /api/orders`.
  - [x] Render dynamic order rows, status pills, and filter counters.
  - [x] Populate `#order_detail_modal` with real customer data & itemized breakdown.
  - [x] Advance order status (`pending` ➔ `processing` ➔ `shipped` ➔ `completed`) via `PUT /api/orders/:id/status`.
  - [x] Stock auto-rollback in PostgreSQL when an order is cancelled.
- [x] **Phase 3: Inventory & Products Management (`products.html` & `inventory.html`)**
  - [x] Dynamic catalog from `GET /api/products` (150 Taurus items).
  - [x] Add New Product (`POST /api/products`).
  - [x] Edit Product (`PUT /api/products/:id`).
  - [x] Delete Product (`DELETE /api/products/:id`).
  - [x] Real-time stock adjustment (+1/-1, modal) and low-stock alert badges.
- [x] **Phase 4: Billing & Financial Auditing (`billing.html`)**
  - [x] Fetch invoices from `GET /api/billing` (`INV-...`).
  - [x] "Mark as Paid" action button (`PUT /api/billing/:id/payment`).
  - [x] Printable invoice preview modal (`window.print()`).
- [x] **Phase 5: Real Dashboard Analytics (`dashboard.html`)**
  - [x] Connect KPI metric cards to `GET /api/dashboard/summary`.
  - [x] Render recent transactions from live database.
  - [x] Dynamic system activity timeline.
- [ ] **Phase 6: Service & Repairs Tracking (`repairs.html`)**
- [x] **Phase 7: Users & Roles Administration (`users.html`)**
  - [x] Fetch registered users from `GET /api/users`.
  - [x] Create staff accounts (`POST /api/users`).
  - [x] Update user roles & permissions (`PUT /api/users/:id`).
  - [x] Delete user accounts (`DELETE /api/users/:id`).
