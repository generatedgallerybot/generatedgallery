-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User Likes
CREATE TABLE IF NOT EXISTS user_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, image_id)
);

ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own likes" ON user_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own likes" ON user_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON user_likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_likes_user ON user_likes(user_id);
CREATE INDEX idx_user_likes_image ON user_likes(image_id);

-- Galleries
CREATE TABLE IF NOT EXISTS galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own galleries" ON galleries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public galleries readable by all" ON galleries FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own galleries" ON galleries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own galleries" ON galleries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own galleries" ON galleries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_galleries_user ON galleries(user_id);

-- Gallery Images
CREATE TABLE IF NOT EXISTS gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(gallery_id, image_id)
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Users can manage images in their own galleries
CREATE POLICY "Users can read gallery images for own galleries" ON gallery_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM galleries WHERE galleries.id = gallery_id AND galleries.user_id = auth.uid())
  );

CREATE POLICY "Public gallery images readable by all" ON gallery_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM galleries WHERE galleries.id = gallery_id AND galleries.is_public = true)
  );

CREATE POLICY "Users can insert into own galleries" ON gallery_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM galleries WHERE galleries.id = gallery_id AND galleries.user_id = auth.uid())
  );

CREATE POLICY "Users can delete from own galleries" ON gallery_images
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM galleries WHERE galleries.id = gallery_id AND galleries.user_id = auth.uid())
  );

CREATE INDEX idx_gallery_images_gallery ON gallery_images(gallery_id);
CREATE INDEX idx_gallery_images_image ON gallery_images(image_id);
