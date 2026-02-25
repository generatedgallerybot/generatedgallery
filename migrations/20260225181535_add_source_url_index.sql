-- Add index on source_url for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_images_source_url ON images (source_url);
