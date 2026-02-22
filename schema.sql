-- Images table
CREATE TABLE IF NOT EXISTS images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  prompt TEXT,
  negative_prompt TEXT,
  model TEXT,
  source_url TEXT,
  source_site TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INT,
  height INT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  upvotes INT DEFAULT 0,
  downloads INT DEFAULT 0,
  views INT DEFAULT 0,
  is_nsfw BOOLEAN DEFAULT FALSE,
  uploaded_by TEXT,
  crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_images_category ON images (category);
CREATE INDEX IF NOT EXISTS idx_images_upvotes ON images (upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_images_created ON images (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_source ON images (source_site);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Images are viewable by everyone" ON images;
CREATE POLICY "Images are viewable by everyone" ON images FOR SELECT USING (true);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  count INT DEFAULT 0
);

-- Insert categories only if table is empty
INSERT INTO categories (name, slug) 
SELECT * FROM (VALUES
  ('Product Photography', 'product-photography'),
  ('Portraits', 'portraits'),
  ('Landscapes', 'landscapes'),
  ('Architecture', 'architecture'),
  ('Abstract', 'abstract'),
  ('Animals', 'animals'),
  ('Food', 'food'),
  ('Fashion', 'fashion'),
  ('Interior Design', 'interior-design'),
  ('Vehicles', 'vehicles'),
  ('Fantasy', 'fantasy'),
  ('Sci-Fi', 'sci-fi'),
  ('Anime', 'anime'),
  ('Photorealistic', 'photorealistic'),
  ('Digital Art', 'digital-art'),
  ('3D Render', '3d-render')
) AS t(name, slug)
WHERE NOT EXISTS (SELECT 1 FROM categories);

-- Votes table (for tracking unique votes)
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  voter_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_id, voter_ip)
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Votes are insertable by everyone" ON votes;
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON votes;
CREATE POLICY "Votes are insertable by everyone" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Votes are viewable by everyone" ON votes FOR SELECT USING (true);