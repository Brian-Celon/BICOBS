-- =============================================================================
-- BICOBS: Bike Shop Ordering and Billing System
-- PostgreSQL Database Schema (Supabase / Standard PostgreSQL)
-- =============================================================================

-- 1. EXTENSIONS (Optional, for UUID generation if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DROP TABLES IF THEY EXIST (In reverse dependency order)
DROP TABLE IF EXISTS billings CASCADE;
DROP TABLE IF EXISTS repairs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- 3. CATEGORIES TABLE
-- Stores standardized bike shop product categories
-- =============================================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    group_name VARCHAR(100) DEFAULT '',
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);

INSERT INTO categories (name, slug, description, group_name, item_count) VALUES
('Complete Bicycles', 'built_bikes', 'All complete prebuilt bicycles (MTB, Road, Gravel)', 'Complete Bicycles', 10),
('Mountain Bikes', 'mountain_bikes', 'Cross-country, trail, and hardtail mountain bikes', 'Complete Bicycles', 7),
('Road Bikes', 'road_bikes', 'Aerodynamic 700c performance drop-bar road bikes', 'Complete Bicycles', 1),
('Gravel Bikes', 'gravel_bikes', 'Versatile all-terrain gravel and cyclocross bikes', 'Complete Bicycles', 2),
('Framesets', 'frame', 'Carbon fiber and aluminum alloy bike frames', 'Frames & Steering', 12),
('Forks & Suspension', 'fork', 'Air suspension and rigid mountain/road bike forks', 'Frames & Steering', 12),
('Handlebars', 'handle_bar', 'Aero drop bars, flat handlebars, and risers', 'Frames & Steering', 10),
('Stems', 'stem', 'Precision alloy and CNC handlebar stems', 'Frames & Steering', 10),
('Chains', 'chain', 'Durable multi-speed bike chains (8-12 speed)', 'Drivetrain & Components', 16),
('Upgrade Kits & Groupsets', 'upgrade_kit', 'Full transmission upgrade groupsets and conversion kits', 'Drivetrain & Components', 5),
('Pedals & Cleats', 'pedals', 'Platform alloy pedals, sealed bearing pedals, and SPD cleats', 'Drivetrain & Components', 11),
('Tires', 'tires', 'Tubeless ready MTB, road, and gravel tires', 'Wheels & Tires', 15),
('Rims & Wheelsets', 'rims', 'Double-wall alloy rims and complete aero wheelsets', 'Wheels & Tires', 14),
('Sealed Hubs', 'hubs', 'High engagement sound sealed bearing front & rear hubs', 'Wheels & Tires', 10),
('Saddles', 'saddle', 'Ergonomic comfort saddles and racing bicycle seats', 'Saddles & Grips', 14),
('Grips & Bartapes', 'handle_grip', 'Silicone lock-on grips and shock-absorbing bartapes', 'Saddles & Grips', 11)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 3. USERS TABLE
-- Stores accounts for customers, staff, and admin
-- =============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    phone_number VARCHAR(30) DEFAULT '',
    address TEXT DEFAULT '',
    is_verified BOOLEAN DEFAULT false,
    verification_otp VARCHAR(10),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- =============================================================================
-- 4. PRODUCTS TABLE
-- Stores bike shop catalog (bikes, components, gear, accessories)
-- =============================================================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(100) NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    sku VARCHAR(100) UNIQUE,
    image_url TEXT DEFAULT '',
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);

-- =============================================================================
-- 5. ORDERS TABLE
-- Stores customer checkout orders
-- =============================================================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    delivery_type VARCHAR(50) DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup')),
    delivery_address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    payment_method VARCHAR(50) NOT NULL, -- 'gcash', 'cod', 'card'
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    order_status VARCHAR(50) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(order_status);

-- =============================================================================
-- 6. ORDER ITEMS TABLE
-- Stores individual line items for each order
-- =============================================================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- =============================================================================
-- 7. BILLINGS / INVOICES TABLE
-- Stores billing receipts generated for completed/placed orders
-- =============================================================================
CREATE TABLE billings (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(30) DEFAULT '',
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billings_invoice_number ON billings(invoice_number);
CREATE INDEX idx_billings_order_id ON billings(order_id);

-- =============================================================================
-- 8. REPAIRS & BIKE SERVICE TICKETS TABLE
-- Stores maintenance and service tickets linked to orders and customers
-- =============================================================================
CREATE TABLE repairs (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) DEFAULT '',
    bike_model VARCHAR(150) NOT NULL,
    mechanic_name VARCHAR(100) DEFAULT 'Reynaldo',
    service_type VARCHAR(100) DEFAULT 'General Tune-Up',
    problem_description TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'in-progress' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00 CHECK (estimated_cost >= 0),
    estimated_finish VARCHAR(100) DEFAULT 'Today',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_repairs_ticket_number ON repairs(ticket_number);
CREATE INDEX idx_repairs_order_id ON repairs(order_id);
CREATE INDEX idx_repairs_user_id ON repairs(user_id);

-- =============================================================================
-- 9. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER trigger_update_products_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER trigger_update_orders_timestamp
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER trigger_update_repairs_timestamp
    BEFORE UPDATE ON repairs
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
