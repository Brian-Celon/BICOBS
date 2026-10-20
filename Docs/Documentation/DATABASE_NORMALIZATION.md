### 3.3.2 Database Normalization (1NF, 2NF, 3NF)

---

## Part 1: Consolidated 1NF, 2NF, and 3NF Comparison Table

| Module / Domain | First Normal Form (1NF)<br>*(Atomic values, repeating groups flattened, composite keys)* | Second Normal Form (2NF)<br>*(1NF + Partial dependencies removed)* | Third Normal Form (3NF)<br>*(2NF + Transitive dependencies removed)* |
| :--- | :--- | :--- | :--- |
| **Ordering, Products, Categories, Users & Billing** | **`1nf_order_transactions`**<br>• **PK:** `(order_id, product_id)`<br>• **Attributes:** `order_number`, `user_id`, `full_name`, `email`, `password_hash`, `role`, `phone_number`, `address`, `product_name`, `sku`, `price`, `stock_quantity`, `category_slug`, `category_name`, `category_group`, `quantity`, `unit_price`, `item_subtotal`, `delivery_type`, `delivery_address`, `shipping_fee`, `total_amount`, `order_status`, `invoice_number`, `payment_method`, `payment_status`, `payment_date` | **1. `2nf_orders`**<br>• **PK:** `order_id`<br>• **Attributes:** `order_number`, `user_id`, `full_name`, `email`, `password_hash`, `role`, `phone_number`, `address`, `delivery_type`, `delivery_address`, `subtotal`, `shipping_fee`, `total_amount`, `order_status`, `invoice_number`, `payment_method`, `payment_status`, `payment_date`<br><br>**2. `2nf_products`**<br>• **PK:** `product_id`<br>• **Attributes:** `name`, `description`, `sku`, `price`, `stock_quantity`, `category_slug`, `category_name`, `category_description`, `category_group`<br><br>**3. `2nf_order_items`**<br>• **PK:** `id` \| **FK:** `order_id`, `product_id`<br>• **Attributes:** `quantity`, `unit_price`, `subtotal` | **1. `users`**<br>• **PK:** `id` \| **UK:** `email`<br>• **Attributes:** `full_name`, `password_hash`, `role`, `phone_number`, `address`, `is_verified`, `created_at`<br><br>**2. `categories`**<br>• **PK:** `id` \| **UK:** `slug`<br>• **Attributes:** `name`, `description`, `group_name`, `item_count`<br><br>**3. `products`**<br>• **PK:** `id` \| **FK:** `category` $\rightarrow$ `categories(slug)`<br>• **Attributes:** `name`, `description`, `price`, `stock_quantity`, `sku`, `image_url`, `is_available`, `is_featured`, `is_archived`<br><br>**4. `orders`**<br>• **PK:** `id` \| **FK:** `user_id` $\rightarrow$ `users(id)`<br>• **Attributes:** `order_number`, `delivery_type`, `delivery_address`, `notes`, `payment_method`, `subtotal`, `shipping_fee`, `total_amount`, `order_status`, `payment_status`, `decline_reason`<br><br>**5. `order_items`**<br>• **PK:** `id` \| **FK:** `order_id`, `product_id`<br>• **Attributes:** `quantity`, `unit_price`, `subtotal`<br><br>**6. `billings`**<br>• **PK:** `id` \| **FK:** `order_id` $\rightarrow$ `orders(id)`<br>• **Attributes:** `invoice_number`, `subtotal`, `shipping_fee`, `total_amount`, `payment_method`, `payment_status`, `payment_date` |
| **Customer Support Tickets** | **`1nf_support_tickets`**<br>• **PK:** `(ticket_id, message_id)`<br>• **Attributes:** `ticket_number`, `user_id`, `customer_name`, `customer_email`, `category`, `subject`, `status`, `sender_type`, `sender_name`, `message`, `created_at` | **4. `2nf_support_tickets`**<br>• **PK:** `ticket_id`<br>• **Attributes:** `ticket_number`, `user_id`, `customer_name`, `customer_email`, `category`, `subject`, `status`, `created_at`<br><br>**5. `2nf_ticket_messages`**<br>• **PK:** `message_id` \| **FK:** `ticket_id`<br>• **Attributes:** `sender_type`, `sender_name`, `message`, `created_at` | **7. `support_tickets`**<br>• **PK:** `id` \| **FK:** `user_id` $\rightarrow$ `users(id)`<br>• **Attributes:** `ticket_number`, `category`, `subject`, `status`, `created_at`, `updated_at`<br><br>**8. `ticket_messages`**<br>• **PK:** `id` \| **FK:** `ticket_id` $\rightarrow$ `support_tickets(id)`<br>• **Attributes:** `sender_type`, `sender_name`, `message`, `created_at` |
| **Bicycle Repairs** | **`1nf_repairs`**<br>• **PK:** `repair_id`<br>• **Attributes:** `ticket_number`, `user_id`, `customer_name`, `customer_phone`, `bike_model`, `mechanic_name`, `service_type`, `problem_description`, `status`, `estimated_cost`, `estimated_finish`, `order_id` | **6. `2nf_repairs`**<br>• **PK:** `repair_id`<br>• **Attributes:** `ticket_number`, `user_id`, `customer_name`, `customer_phone`, `bike_model`, `mechanic_name`, `service_type`, `problem_description`, `status`, `estimated_cost`, `estimated_finish`, `order_id` | **9. `repairs`**<br>• **PK:** `id` \| **FK:** `user_id` $\rightarrow$ `users(id)`, `order_id` $\rightarrow$ `orders(id)`<br>• **Attributes:** `ticket_number`, `bike_model`, `mechanic_name`, `service_type`, `problem_description`, `status`, `estimated_cost`, `estimated_finish`, `created_at` |

---

## Part 2: Step-by-Step Normalization with Sample Database Records

### 0. Unnormalized Form (UNF) Table
*Contains multi-valued repeating groups (multiple items in one cell) and non-atomic customer/category strings.*

| order_number | customer_details | items_purchased *(Repeating Group)* | category_details | billing_details |
| :--- | :--- | :--- | :--- | :--- |
| `ORD-2026-0001` | Carlos Mendoza, `carlos@email.com`, `09171234567`, Marilao, Bulacan | • 1x Trek Domane AL 2 (₱38,500)<br>• 2x Maxxis Ikon Tire (₱1,200) | • Road Bikes (Complete Bicycles)<br>• Tires (Wheels & Tires) | `INV-2026-0001`, GCash, Paid, ₱41,050 |
| `ORD-2026-0002` | Maria Santos, `maria@email.com`, `09289876543`, Meycauayan, Bulacan | • 1x Shimano Deore Chain (₱1,450) | • Chains (Drivetrain & Components) | `INV-2026-0002`, BPI, Pending, ₱1,450 |

---

### 1. First Normal Form (1NF) Table
*All values are atomic and repeating groups are separated into individual rows with a composite primary key `(order_id, product_id)`.*

#### Table: `1nf_database_records`
| order_id (PK) | product_id (PK) | order_number | user_id | full_name | email | phone_number | address | product_name | sku | category_slug | category_name | group_name | quantity | unit_price | item_subtotal | shipping_fee | total_amount | order_status | invoice_number | payment_method | payment_status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **101** | **1** | `ORD-2026-0001` | 1 | Carlos Mendoza | `carlos@email.com` | `09171234567` | Marilao, Bulacan | Trek Domane AL 2 | `BIKE-001` | `road_bikes` | Road Bikes | Complete Bicycles | 1 | 38500.00 | 38500.00 | 150.00 | 41050.00 | `completed` | `INV-2026-0001` | `gcash` | `paid` |
| **101** | **12** | `ORD-2026-0001` | 1 | Carlos Mendoza | `carlos@email.com` | `09171234567` | Marilao, Bulacan | Maxxis Ikon Tire | `TIRE-012` | `tires` | Tires | Wheels & Tires | 2 | 1200.00 | 2400.00 | 150.00 | 41050.00 | `completed` | `INV-2026-0001` | `gcash` | `paid` |
| **102** | **25** | `ORD-2026-0002` | 2 | Maria Santos | `maria@email.com` | `09289876543` | Meycauayan, Bulacan | Shimano Deore Chain | `CHN-025` | `chain` | Chains | Drivetrain & Components | 1 | 1450.00 | 1450.00 | 0.00 | 1450.00 | `pending` | `INV-2026-0002` | `card` | `pending` |

---

### 2. Second Normal Form (2NF) Tables
*Eliminates **Partial Dependencies** by splitting attributes that depend only on `order_id` (`2nf_orders`) or only on `product_id` (`2nf_products`) away from the composite-key line items (`2nf_order_items`).*

#### Table 2A: `2nf_orders` (Depends only on `order_id`)
| order_id (PK) | order_number | user_id | full_name | email | phone_number | address | delivery_type | subtotal | shipping_fee | total_amount | order_status | invoice_number | payment_method | payment_status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **101** | `ORD-2026-0001` | 1 | Carlos Mendoza | `carlos@email.com` | `09171234567` | Marilao, Bulacan | `delivery` | 40900.00 | 150.00 | 41050.00 | `completed` | `INV-2026-0001` | `gcash` | `paid` |
| **102** | `ORD-2026-0002` | 2 | Maria Santos | `maria@email.com` | `09289876543` | Meycauayan, Bulacan | `pickup` | 1450.00 | 0.00 | 1450.00 | `pending` | `INV-2026-0002` | `card` | `pending` |

#### Table 2B: `2nf_products` (Depends only on `product_id`)
| product_id (PK) | name | sku | price | stock_quantity | category_slug | category_name | group_name |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Trek Domane AL 2 | `BIKE-001` | 38500.00 | 4 | `road_bikes` | Road Bikes | Complete Bicycles |
| **12** | Maxxis Ikon Tire | `TIRE-012` | 1200.00 | 20 | `tires` | Tires | Wheels & Tires |
| **25** | Shimano Deore Chain | `CHN-025` | 1450.00 | 15 | `chain` | Chains | Drivetrain & Components |

#### Table 2C: `2nf_order_items` (Depends on both `order_id` and `product_id`)
| id (PK) | order_id (FK) | product_id (FK) | quantity | unit_price | subtotal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | 101 | 1 | 1 | 38500.00 | 38500.00 |
| **2** | 101 | 12 | 2 | 1200.00 | 2400.00 |
| **3** | 102 | 25 | 1 | 1450.00 | 1450.00 |

---

### 3. Third Normal Form (3NF) Tables
*Eliminates **Transitive Dependencies** by separating `users` (determined by `user_id`), `categories` (determined by `category_slug`), and `billings` (determined by `invoice_number` / `order_id`), alongside `repairs`, `support_tickets`, and `ticket_messages`.*

#### Table 3A: `users`
| id (PK) | full_name | email (UK) | role | phone_number | address | is_verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Carlos Mendoza | `carlos@email.com` | `customer` | `09171234567` | Marilao, Bulacan | `true` |
| **2** | Maria Santos | `maria@email.com` | `customer` | `09289876543` | Meycauayan, Bulacan | `true` |

#### Table 3B: `categories`
| id (PK) | slug (UK) | name | description | group_name | item_count |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `road_bikes` | Road Bikes | Aerodynamic 700c performance drop-bar road bikes | Complete Bicycles | 1 |
| **2** | `tires` | Tires | Tubeless ready MTB, road, and gravel tires | Wheels & Tires | 15 |
| **3** | `chain` | Chains | Durable multi-speed bike chains (8-12 speed) | Drivetrain & Components | 16 |

#### Table 3C: `products`
| id (PK) | name | category (FK) | sku (UK) | price | stock_quantity | is_available |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Trek Domane AL 2 | `road_bikes` | `BIKE-001` | 38500.00 | 4 | `true` |
| **12** | Maxxis Ikon Tire | `tires` | `TIRE-012` | 1200.00 | 20 | `true` |
| **25** | Shimano Deore Chain | `chain` | `CHN-025` | 1450.00 | 15 | `true` |

#### Table 3D: `orders`
| id (PK) | order_number (UK) | user_id (FK) | delivery_type | delivery_address | payment_method | subtotal | shipping_fee | total_amount | order_status | payment_status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **101** | `ORD-2026-0001` | 1 | `delivery` | Marilao, Bulacan | `gcash` | 40900.00 | 150.00 | 41050.00 | `completed` | `paid` |
| **102** | `ORD-2026-0002` | 2 | `pickup` | — | `card` | 1450.00 | 0.00 | 1450.00 | `pending` | `pending` |

#### Table 3E: `order_items`
| id (PK) | order_id (FK) | product_id (FK) | quantity | unit_price | subtotal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | 101 | 1 | 1 | 38500.00 | 38500.00 |
| **2** | 101 | 12 | 2 | 1200.00 | 2400.00 |
| **3** | 102 | 25 | 1 | 1450.00 | 1450.00 |

#### Table 3F: `billings`
| id (PK) | order_id (FK, UK) | invoice_number (UK) | subtotal | shipping_fee | total_amount | payment_method | payment_status | payment_date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | 101 | `INV-2026-0001` | 40900.00 | 150.00 | 41050.00 | `gcash` | `paid` | `2026-10-20 09:00:00` |
| **2** | 102 | `INV-2026-0002` | 1450.00 | 0.00 | 1450.00 | `card` | `pending` | `NULL` |

#### Table 3G: `repairs`
| id (PK) | ticket_number (UK) | user_id (FK) | order_id (FK) | bike_model | mechanic_name | service_type | status | estimated_cost | estimated_finish |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `#R001` | 1 | 101 | Trek Domane AL 2 Disc | Reynaldo | Brake Bleed & Tuning | `in-progress` | 850.00 | `Today 3:00 PM` |
| **2** | `#R002` | 2 | `NULL` | Giant Talon 1 MTB | Mark | Drivetrain Overhaul | `waiting` | 1200.00 | `Tomorrow 11:00 AM` |

#### Table 3H: `support_tickets`
| id (PK) | ticket_number (UK) | user_id (FK) | category | subject | status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `TKT-0001` | 1 | `Order Inquiry` | Delivery schedule for ORD-2026-0001 | `Resolved` |

#### Table 3I: `ticket_messages`
| id (PK) | ticket_id (FK) | sender_type | sender_name | message |
| :--- | :--- | :--- | :--- | :--- |
| **1** | 1 | `user` | Carlos Mendoza | What time will my bike be delivered today? |
| **2** | 1 | `admin` | Taurus Admin | Your order is out for delivery and will arrive by 2:00 PM. |
