-- Add feature tree storage table
CREATE TABLE IF NOT EXISTS cad_feature_trees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  tree_data TEXT NOT NULL, -- JSON serialized feature tree
  version INTEGER NOT NULL DEFAULT 1,
  branch_id TEXT NOT NULL DEFAULT 'main',
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES cad_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_trees_file ON cad_feature_trees(file_id);
CREATE INDEX IF NOT EXISTS idx_feature_trees_branch ON cad_feature_trees(branch_id);
CREATE INDEX IF NOT EXISTS idx_feature_trees_version ON cad_feature_trees(file_id, version);
