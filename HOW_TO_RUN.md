# 🚀 BICOBS: How to Run the System (Team Setup Guide)

> **For All Team Members:** Follow this guide step-by-step whenever you clone or pull the latest project updates from GitHub.

---

## ⚠️ Important: Why Product Images Didn't Appear Last Time

If you or a teammate ran the system before and products/images were missing, it was caused by one of these **three common mistakes**:

| Mistake | Why It Breaks Images | How to Fix It |
|---|---|---|
| **1. Double-clicking HTML files** (`file:///...`) or using VS Code **Live Server** (port 5500) | The browser cannot fetch `/api/products` from the backend without running the Node server. Fallback paths break under `file:///`. | **Always** open the site through `http://localhost:5000/` with the backend running. |
| **2. Missing `.env` file** | Git automatically ignores `.env` for security. When you pull the project, there is no `.env` in `back-end/`, so the server cannot connect to the database. | Create `back-end/.env` and paste the connection string (see Step 2 below). |
| **3. Not running `npm install`** | Missing required backend packages like Express and PostgreSQL driver (`pg`). | Run `npm install` inside the `back-end` folder. |

All 150 product images are hosted on a fast Cloudinary CDN. Once the backend server is running and connected, **every product image loads instantly!**

---

## ⚡ Quick Start (4 Easy Steps)

### Step 1: Open Terminal in the `back-end` Folder
Open your terminal (PowerShell, Command Prompt, or VS Code Terminal) and navigate to `back-end`:
```bash
cd back-end
```

Install the required dependencies:
```bash
npm install
```

---

### Step 2: Create Your Local `.env` File
In the `back-end` folder, create a file named `.env` (or copy `.env.example`):

```bash
# In Windows PowerShell:
Copy-Item .env.example .env
```

Open `back-end/.env` in your text editor and ensure it has the following configuration:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres.qhircluswzwtbfufmgsb:BICOBS_DB123@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
JWT_SECRET=taurus_bike_shop_secret_jwt_key_2026
JWT_EXPIRE=30d
CLOUDINARY_CLOUD_NAME=q3ywfemm
```

> [!NOTE]
> The database is hosted on Supabase (PostgreSQL). The connection string above connects directly to the shared cloud database, so all team members see the exact same 150 products, prices, and images!

---

### Step 3: Start the Backend Server
In the `back-end` folder, start the development server:
```bash
npm run dev
```
*(Alternatively, you can run `npm start`)*

You should see this in your terminal:
```text
[Server] Running in development mode on port 5000
[PostgreSQL] Connected to Supabase DB: postgres at ...
```

---

### Step 4: Open Your Browser
Do **NOT** open HTML files directly from your folder! Open your web browser (Chrome, Edge, Firefox, Brave) and go to:

👉 **[http://localhost:5000/](http://localhost:5000/)**

To browse the shop catalog directly with all images and multi-select category checkboxes:

👉 **[http://localhost:5000/frontend/pages/shop.html](http://localhost:5000/frontend/pages/shop.html)**

---

## 🧭 Direct URLs to System Pages

When the backend is running on port 5000, you can access every page through these URLs:

| Page | URL | Description |
|---|---|---|
| **Landing Page / Home** | `http://localhost:5000/` | Main Taurus Bike Shop homepage |
| **Shop Catalog** | `http://localhost:5000/frontend/pages/shop.html` | All 150 products with images & category filters |
| **Services & Maintenance** | `http://localhost:5000/frontend/pages/service.html` | Bike repair packages & troubleshooter |
| **About Us** | `http://localhost:5000/frontend/pages/about.html` | Shop story, vision, and team info |
| **Shopping Cart** | `http://localhost:5000/frontend/pages/Dashboard/mycart.html` | Live cart & checkout form |
| **My Orders** | `http://localhost:5000/frontend/pages/Dashboard/myorders.html` | Order tracking & order history |
| **Customer Dashboard** | `http://localhost:5000/frontend/pages/Dashboard/dashboard.html` | Account overview & recent orders |
| **Login / Sign Up** | `http://localhost:5000/frontend/pages/login.html` | Customer and staff authentication |
| **API Health Check** | `http://localhost:5000/api/health` | Confirms backend server is running |
| **Products API** | `http://localhost:5000/api/products` | JSON feed of all 150 catalog products |

---

## 🔄 Optional: Database Re-seeding / Migration

If you ever need to reset or re-seed the Supabase database with all 150 Taurus Bike Shop products:

```bash
cd back-end
npm run migrate
```
*(Or `npm run seed`)*

This applies [database/schema.sql](file:///d:/BICOBS/database/schema.sql) and seeds all products across the 13 categories into PostgreSQL.

---

## ❓ Troubleshooting FAQ

### Q: Why do I see a blank page or "Cannot GET /api/products"?
- **Answer:** Make sure your backend terminal says `[Server] Running ... on port 5000`. If you closed the terminal, restart it with `npm run dev`.

### Q: Why do product images show broken icons or placeholders?
- **Answer:** You opened the page using `file:///C:/...` or VS Code Live Server (`localhost:5500`). Close that tab and open **`http://localhost:5000/frontend/pages/shop.html`** instead.

### Q: Why does the terminal show `ECONNREFUSED` or connection error?
- **Answer:** Check your `back-end/.env` file. Ensure `DATABASE_URL` is set to the Supabase pooler connection string provided in Step 2.
