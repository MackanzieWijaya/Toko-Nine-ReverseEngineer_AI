CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner','cashier')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('lokal','impor')),
  unit VARCHAR(12) NOT NULL CHECK (unit IN ('kg','pcs','pack')),
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  cost NUMERIC(14,2) NOT NULL CHECK (cost >= 0),
  stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  receipt_no VARCHAR(32) NOT NULL UNIQUE,
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  subtotal NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Tunai','QRIS','Transfer')),
  amount_received NUMERIC(14,2) NOT NULL,
  change_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','cancelled')),
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  idempotency_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(140) NOT NULL,
  unit VARCHAR(12) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER REFERENCES users(id),
  movement_type VARCHAR(40) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  reference_type VARCHAR(40),
  reference_id BIGINT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_product_time_idx ON stock_movements(product_id, created_at DESC);
CREATE TABLE IF NOT EXISTS stock_receipts (
  id BIGSERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_receipt_items (
  id BIGSERIAL PRIMARY KEY,
  receipt_id BIGINT NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
  line_total NUMERIC(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS spoilage_records (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  reason VARCHAR(40) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE spoilage_records ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0);
CREATE TABLE IF NOT EXISTS stock_opnames (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_opname_items (
  id BIGSERIAL PRIMARY KEY,
  opname_id BIGINT NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  system_stock NUMERIC(14,3) NOT NULL,
  physical_stock NUMERIC(14,3) NOT NULL,
  difference NUMERIC(14,3) NOT NULL
);
