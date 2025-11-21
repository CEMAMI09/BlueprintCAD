-- Orders table for purchases
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  buyer_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  download_token TEXT UNIQUE,
  download_count INTEGER DEFAULT 0,
  download_limit INTEGER DEFAULT 3,
  refund_id TEXT,
  refund_amount REAL,
  refund_reason TEXT,
  refunded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_project ON orders(project_id);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(download_token);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE TABLE IF NOT EXISTS order_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
