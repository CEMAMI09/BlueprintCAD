-- BlueprintCAD PostgreSQL Schema
-- Run this SQL in your PostgreSQL database to create all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255), -- Nullable for OAuth users
  google_id VARCHAR(255) UNIQUE,
  github_id VARCHAR(255) UNIQUE,
  oauth_provider VARCHAR(50), -- 'google', 'github', or null for email/password
  tier VARCHAR(50) DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_current_period_end TIMESTAMP,
  profile_picture TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  banner TEXT,
  social_links JSONB DEFAULT '{}',
  visibility_options JSONB DEFAULT '{"showEmail":false,"showLocation":true,"showWebsite":true,"showSocial":true}',
  profile_private BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id INTEGER,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50),
  tags TEXT,
  is_public BOOLEAN DEFAULT true,
  for_sale BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  ai_estimate TEXT,
  thumbnail_path TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_folder_id ON projects(folder_id);

-- Project stars/likes (per-user)
CREATE TABLE IF NOT EXISTS project_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_likes_user ON project_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_likes_project ON project_likes (project_id);

-- CAD files table
CREATE TABLE IF NOT EXISTS cad_files (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  folder_id INTEGER,
  filename VARCHAR(255) NOT NULL,
  filepath TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  version INTEGER DEFAULT 1,
  thumbnail TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cad_files_user_id ON cad_files(user_id);
CREATE INDEX IF NOT EXISTS idx_cad_files_project_id ON cad_files(project_id);

