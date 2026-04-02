-- Optional storefront niche for discovery and About section
ALTER TABLE storefronts ADD COLUMN IF NOT EXISTS focused_industry TEXT;
