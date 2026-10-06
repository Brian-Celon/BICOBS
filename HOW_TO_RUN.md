# 🚴 How to Run BICOBS (Quick & Easy Guide)

Follow these 3 simple steps to run the website with all 150 products and images working properly.

---

## ⚠️ The Most Important Rule

> **Do NOT double-click the `.html` files in your folder!**  
> If you open files directly through your file explorer (`file:///...`), the database and product images will **NOT** appear.  
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
2. Paste the environment variables into it.

> 💬 **Note:** For security reasons, the active `.env` configuration can be found pinned in our **group chat**. You can also check [`back-end/.env.example`](back-end/.env.example) for the template.

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

Open your browser (Chrome, Edge, Firefox) and go to:

👉 **http://localhost:5000**

To go straight to the bike catalog:

👉 **http://localhost:5000/frontend/pages/shop.html**

---

## 🎉 That's It!
The system is now fully running on your computer with real database products and images.
