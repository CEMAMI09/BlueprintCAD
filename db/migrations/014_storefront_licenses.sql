-- Storefront and License System Migration

-- Storefronts table (enhanced)
CREATE TABLE IF NOT EXISTS storefronts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  banner_image TEXT,
  logo TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#8b5cf6',
  accent_color TEXT DEFAULT '#10b981',
  custom_domain TEXT,
  featured_projects TEXT, -- JSON array of project IDs
  pinned_products TEXT, -- JSON array of project IDs
  featured_bundles TEXT, -- JSON array of bundle IDs (future)
  seo_description TEXT,
  refund_policy TEXT,
  license_summary TEXT,
  bio TEXT,
  skills TEXT, -- JSON array
  social_links TEXT, -- JSON object with github, twitter, instagram, youtube, website
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- License types (static reference data)
CREATE TABLE IF NOT EXISTS license_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL, -- 'personal', 'commercial_print', 'commercial_dist', 'full_rights'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  allows_personal_print INTEGER DEFAULT 1,
  allows_personal_modify INTEGER DEFAULT 1,
  allows_sell_file INTEGER DEFAULT 0,
  allows_sell_physical INTEGER DEFAULT 0,
  allows_commercial_use INTEGER DEFAULT 0,
  allows_resell_file INTEGER DEFAULT 0,
  allows_bundle INTEGER DEFAULT 0,
  allows_mass_manufacturing INTEGER DEFAULT 0,
  no_restrictions INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert license types
INSERT OR IGNORE INTO license_types (code, name, description, allows_personal_print, allows_personal_modify, allows_sell_file, allows_sell_physical, allows_commercial_use, allows_resell_file, allows_bundle, allows_mass_manufacturing, no_restrictions) VALUES
('personal', 'Personal Use License', 'Allows print for personal use and modify for personal use. Forbids selling the file, selling the physical 3D print, and commercial use.', 1, 1, 0, 0, 0, 0, 0, 0, 0),
('commercial_print', 'Commercial Print License', 'Allows print and sell physical copies and use in small business. Forbids reselling digital file and mass manufacturing.', 1, 1, 0, 1, 1, 0, 0, 0, 0),
('commercial_dist', 'Commercial Distribution License', 'Allows resell the digital file and bundle in products.', 1, 1, 1, 1, 1, 1, 1, 0, 0),
('full_rights', 'Full Rights / Buyout License', 'Allows full ownership of file and no resale restrictions.', 1, 1, 1, 1, 1, 1, 1, 1, 1);

-- Product licenses (which licenses are available for each product and their prices)
CREATE TABLE IF NOT EXISTS product_licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  license_type_code TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, license_type_code),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (license_type_code) REFERENCES license_types(code)
);

-- Licenses (issued licenses to buyers)
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id TEXT UNIQUE NOT NULL, -- Unique license identifier
  order_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  license_type_code TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1, -- 0 if revoked (refunded)
  revoked_at DATETIME,
  revoked_reason TEXT,
  certificate_data TEXT, -- JSON with full certificate details
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (license_type_code) REFERENCES license_types(code)
);

-- Storefront reviews
CREATE TABLE IF NOT EXISTS storefront_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storefront_user_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_buyer INTEGER DEFAULT 0, -- 1 if buyer has 10+ complete sales with no refunds
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (storefront_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(order_id) -- One review per order
);

-- Storefront contact messages (separate from regular messages)
CREATE TABLE IF NOT EXISTS storefront_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storefront_user_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (storefront_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seller verification (for verified buyer badge)
CREATE TABLE IF NOT EXISTS seller_verification (
  user_id INTEGER PRIMARY KEY,
  total_sales INTEGER DEFAULT 0,
  total_refunds INTEGER DEFAULT 0,
  verified_buyer_count INTEGER DEFAULT 0, -- Count of buyers with 10+ sales, no refunds
  is_verified INTEGER DEFAULT 0, -- 1 if user has 10+ complete sales with no refunds
  verified_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storefronts_user ON storefronts(user_id);
CREATE INDEX IF NOT EXISTS idx_product_licenses_project ON product_licenses(project_id);
CREATE INDEX IF NOT EXISTS idx_product_licenses_type ON product_licenses(license_type_code);
CREATE INDEX IF NOT EXISTS idx_licenses_order ON licenses(order_id);
CREATE INDEX IF NOT EXISTS idx_licenses_buyer ON licenses(buyer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_seller ON licenses(seller_id);
CREATE INDEX IF NOT EXISTS idx_licenses_project ON licenses(project_id);
CREATE INDEX IF NOT EXISTS idx_licenses_license_id ON licenses(license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses(is_active);
CREATE INDEX IF NOT EXISTS idx_storefront_reviews_storefront ON storefront_reviews(storefront_user_id);
CREATE INDEX IF NOT EXISTS idx_storefront_reviews_reviewer ON storefront_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_storefront_messages_storefront ON storefront_messages(storefront_user_id);
CREATE INDEX IF NOT EXISTS idx_storefront_messages_sender ON storefront_messages(sender_id);

-- Add sales count to projects
ALTER TABLE projects ADD COLUMN sales_count INTEGER DEFAULT 0;

-- Add average rating to projects
ALTER TABLE projects ADD COLUMN average_rating REAL DEFAULT 0;

-- Add review count to projects
ALTER TABLE projects ADD COLUMN review_count INTEGER DEFAULT 0;

