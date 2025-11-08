-- #################################################
-- # 1. TABEL DASAR (Tidak Merujuk Tabel Lain)
-- #################################################

-- Tabel Users (Wajib di atas karena dirujuk oleh Transactions & Movements)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABEL BARU: Categories (Dirujuk oleh Products)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- TABEL BARU: Stock Statuses (Dirujuk oleh Transaction Items)
CREATE TABLE IF NOT EXISTS stock_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Tabel Suppliers (Dirujuk oleh Transactions)
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Customers (Dirujuk oleh Transactions)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Locations (Dirujuk oleh Transactions & Movements)
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- #################################################
-- # 2. MASTER DATA (Yang Merujuk Tabel Dasar)
-- #################################################

-- UPGRADE Tabel Products (Merujuk Categories)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(20),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, 
    purchase_price NUMERIC(10, 2) DEFAULT 0.00,
    selling_price NUMERIC(10, 2) DEFAULT 0.00,
    main_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- #################################################
-- # 3. TRANSAKSI & PERGERAKAN
-- #################################################

-- Tabel Movements (Merujuk Products, Locations, Users)
CREATE TABLE IF NOT EXISTS movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
    from_location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    to_location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    reason VARCHAR(100),
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL, 
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Tabel Transactions (Merujuk Suppliers, Customers, Users)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) CHECK (type IN ('IN', 'OUT')) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    process_start TIMESTAMP, 
    process_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UPGRADE Tabel Transaction Items (Merujuk Transactions, Stock Statuses)
CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    stock_status_id INTEGER REFERENCES stock_statuses(id) ON DELETE RESTRICT 
);

-- Tabel Stock Levels (Merujuk Products, Locations)
CREATE TABLE IF NOT EXISTS stock_levels (
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, location_id)
);