# 🚴 How to Run BICOBS (Quick & Easy Guide)

Follow these 3 simple steps to run the website with all 150 products, images, customer storefront, and administrative panel working properly.

---

## ⚠️ The Most Important Rule

> **Do NOT double-click the `.html` files in your folder!**  
> If you open files directly through your file explorer (`file:///...`), the backend API, database, and dynamic data will **NOT** load.  
> **Always start the server and view the site through `http://localhost:5000`**.

---

## 🛠️ 3 Simple Steps

### 1️⃣ Step 1: Install Dependencies
Open a terminal (VS Code Terminal, PowerShell, or Command Prompt) and type:

```bash
cd back-end
npm install
```

---

### 2️⃣ Step 2: Create the `.env` File
Inside the `back-end` folder:
1. Create a new file named **`.env`**
2. Copy and paste this exact text into it:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres.qhircluswzwtbfufmgsb:BICOBS_DB123@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
JWT_SECRET=taurus_bike_shop_secret_jwt_key_2026
JWT_EXPIRE=30d
CLOUDINARY_CLOUD_NAME=q3ywfemm
```

3. Save the file.

---

### 3️⃣ Step 3: Start the Server & Open the Site
In your `back-end` terminal, run:

```bash
npm run dev
```

Once the terminal shows:
```text
[Server] Running in development mode on port 5000
[PostgreSQL] Connected to Supabase DB: postgres
```

Your system is now online! 🚀

---

## 🌐 How to Access the Pages

### 🛒 Customer Storefront Side
Open your browser and navigate to:
* **Main Landing Page:** 👉 **http://localhost:5000**
* **Products & Bike Catalog:** 👉 **http://localhost:5000/frontend/pages/shop.html**
* **Services & Repairs:** 👉 **http://localhost:5000/frontend/pages/services.html**
* **Customer Login:** 👉 **http://localhost:5000/frontend/pages/login.html**

---

### 🛡️ Administrator Panel Side (TaurOS)
Open your browser and navigate to:
* **Admin Login Portal:** 👉 **http://localhost:5000/frontend/pages/Admin/login.html**
* **Admin Dashboard:** 👉 **http://localhost:5000/frontend/pages/Admin/dashboard.html**

#### 🔑 Default Admin Account Credentials
| Field | Value |
| :--- | :--- |
| **Email / Username** | `admin@taurusbike.ph` |
| **Password** | *(set via `DEFAULT_ADMIN_PASSWORD` in your `.env` file)* |
| **Role** | System Administrator |

*(Run `node scripts/seed_default_admin.js` after setting the env var to create/reset the admin account).*

---

## 🔧 Useful Helper Commands

### Re-seed Default Admin Account
If the admin account was accidentally removed or credentials were changed:
```bash
cd back-end
node scripts/seed_default_admin.js --only
```
*(This ensures `admin@taurusbike.ph` exists and resets any other test accounts).*

---

## 🎉 That's It!
The system is now fully running on your computer with real database products, live orders, repair ticketing, and complete administrative control.
