export interface Image {
  id: string;
  title: string | null;
  description: string | null;
  prompt: string | null;
  negative_prompt: string | null;
  model: string | null;
  source_url: string | null;
  source_site: string | null;
  image_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  tags: string[];
  category: string | null;
  upvotes: number;
  downloads: number;
  views: number;
  is_nsfw: boolean;
  uploaded_by: string | null;
  crawled_at: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  count: number;
}

export interface Vote {
  id: string;
  image_id: string;
  voter_ip: string;
  created_at: string;
}