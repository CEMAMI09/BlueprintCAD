-- Migration: Add thumbnail_path column to projects table
-- Run this SQL against your database

ALTER TABLE projects ADD COLUMN thumbnail_path TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_thumbnail ON projects(thumbnail_path);

-- Update existing 3D files to mark them for thumbnail generation
-- (Optional: you can run a batch job to generate thumbnails for existing files)
UPDATE projects 
SET thumbnail_path = NULL 
WHERE file_type IN ('stl', 'obj', 'fbx', 'step', 'stp') 
AND thumbnail_path IS NULL;
