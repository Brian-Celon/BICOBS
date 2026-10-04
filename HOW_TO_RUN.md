# 🚀 BICOBS: How to Run the System

A step-by-step guide for running the Taurus Bike Shop Ordering and Billing System (BICOBS) locally.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A modern web browser (Google Chrome, Microsoft Edge, Firefox, Brave)

---

## 🛠️ Step-by-Step Guide

### Step 1: Open Terminal in the `back-end` Directory
Open your terminal (PowerShell, Command Prompt, or VS Code Terminal) and navigate to the `back-end` folder:

```bash
cd back-end
```

Install all project dependencies:

```bash
npm install
```

---

### Step 2: Configure Environment Variables (`.env`)
Inside the `back-end` directory, create a `.env` file by copying the example template:

```bash
# In Windows PowerShell:
Copy-Item .env.example .env

# In Command Prompt:
copy .env.example .env

# In macOS / Linux:
cp .env.example .env
```

Open `back-end/.env` and ensure the values match the following configuration:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres.qhircluswzwtbfufmgsb:BICOBS_DB123@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
JWT_SECRET=taurus_bike_shop_secret_jwt_key_2026
JWT_EXPIRE=30d
CLOUDINARY_CLOUD_NAME=q3ywfemm
```

---

### Step 3: Start the Backend Server
Run the development server inside the `back-end` folder:

```bash
npm run dev
```

*(Or use `npm start` for standard mode)*

Verify that the terminal displays:
```text
[Server] Running in development mode on port 5000
[PostgreSQL] Connected to Supabase DB: postgres
```

---

### Step 4: Open the Website in Your Browser
Open your browser and navigate to:

👉 **[http://localhost:5000/](http://localhost:5000/)**

To go directly to the product catalog:

👉 **[http://localhost:5000/frontend/pages/shop.html](http://localhost:5000/frontend/pages/shop.html)**

---

## 🧭 Page Links Reference

| Page Name | Direct URL | Description |
|---|---|---|
| **Landing Page / Home** | `http://localhost:5000/` | Main Taurus Bike Shop homepage |
| **Shop Catalog** | `http://localhost:5000/frontend/pages/shop.html` | All 150 products with category filters and images |
| **Services & Maintenance** | `http://localhost:5000/frontend/pages/service.html` | Bike repair and tune-up services |
| **About Us** | `http://localhost:5000/frontend/pages/about.html` | Taurus Bike Shop history and team info |
| **Shopping Cart** | `http://localhost:5000/frontend/pages/Dashboard/mycart.html` | Active shopping cart and checkout |
| **My Orders** | `http://localhost:5000/frontend/pages/Dashboard/myorders.html` | Customer order history and tracking |
| **Customer Dashboard** | `http://localhost:5000/frontend/pages/Dashboard/dashboard.html` | Account overview |
| **Login / Sign Up** | `http://localhost:5000/frontend/pages/login.html` | Authentication portal |
| **API Health Check** | `http://localhost:5000/api/health` | Backend status verification |
| **Products API** | `http://localhost:5000/api/products` | Live products JSON endpoint |

---

## 🔄 Optional: Database Migration & Seeding

To initialize or re-sync all 150 Taurus Bike Shop products in the database:

```bash
cd back-end
npm run migrate
```
*(Or `npm run seed`)*
