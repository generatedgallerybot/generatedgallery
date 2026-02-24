import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Cached counts — one exact count is expensive at 276k+ rows.
// We cache the hero count (estimated) and per-filter counts for shuffle.
// ---------------------------------------------------------------------------
const countCache: Record<string, { value: number; time: number }> = {};
const COUNT_TTL = 1800000; // 30 min

function cacheKey(showNsfw: boolean, mediaType: string) {
  return `${showNsfw ? 'nsfw' : 'sfw'}_${mediaType}`;
}

async function getCachedCount(showNsfw: boolean, mediaType: string): Promise<number> {
  const key = cacheKey(showNsfw, mediaType);
  const cached = countCache[key];
  if (cached && Date.now() - cached.time < COUNT_TTL) return cached.value;

  let query = supabase.from('images').select('*', { count: 'estimated', head: true });
  if (!showNsfw) query = query.eq('is_nsfw', false);
  if (mediaType === 'video') query = query.eq('media_type', 'video');
  else if (mediaType === 'image') query = query.eq('media_type', 'image');

  const { count } = await query;
  const val = count || 0;
  countCache[key] = { value: val, time: Date.now() };
  return val;
}

export async function getImageCount(): Promise<number> {
  try {
    const { data } = await (supabase as any)
      .from('image_counts')
      .select('count')
      .eq('key', 'total')
      .single();
    if (data?.count) return Number(data.count);
  } catch {}
  // Fallback to estimated count
  return getCachedCount(false, 'all');
}

// ---------------------------------------------------------------------------
// Helper: apply common filters to a query
// ---------------------------------------------------------------------------
function applyFilters(
  query: any,
  showNsfw: boolean,
  mediaType: string
) {
  if (!showNsfw) query = query.eq('is_nsfw', false);
  if (mediaType === 'video') query = query.eq('media_type', 'video');
  else if (mediaType === 'image') query = query.eq('media_type', 'image');
  return query;
}

// ---------------------------------------------------------------------------
// Browse: paginated, ordered by created_at DESC
// Uses index: idx_images_nsfw_created (is_nsfw, created_at DESC)
// ---------------------------------------------------------------------------
export const getImages = async (
  limit = 20, offset = 0, showNsfw = false, mediaType = 'all'
) => {
  let query = supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  query = applyFilters(query, showNsfw, mediaType);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------------
// Category browse
// Uses index: idx_images_cat_nsfw_created (category, is_nsfw, created_at DESC)
// ---------------------------------------------------------------------------
export const getImagesByCategory = async (
  category: string, limit = 20, offset = 0, showNsfw = false, mediaType = 'all'
) => {
  let query = supabase
    .from('images')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  query = applyFilters(query, showNsfw, mediaType);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------------
// Search: full-text search on prompt, fallback to title ilike
// Full-text uses GIN index if available, otherwise sequential but on text field
// ---------------------------------------------------------------------------
export const searchImages = async (
  searchQuery: string, limit = 20, offset = 0, showNsfw = false, mediaType = 'all'
) => {
  // Try full-text search first (uses GIN index if exists)
  let query = supabase
    .from('images')
    .select('*')
    .textSearch('prompt', `'${searchQuery.trim().split(/\s+/).join("' & '")}'`, { type: 'plain' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  query = applyFilters(query, showNsfw, mediaType);
  const { data, error } = await query;

  // If FTS works and has results, return them
  if (!error && data && data.length > 0) return data;

  // Fallback: ilike on title only (shorter field, less scan)
  let fallback = supabase
    .from('images')
    .select('*')
    .ilike('title', `%${searchQuery}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  fallback = applyFilters(fallback, showNsfw, mediaType);
  const { data: fbData, error: fbError } = await fallback;
  if (fbError) throw fbError;
  return fbData;
};

// ---------------------------------------------------------------------------
// Trending
// Uses index: idx_images_nsfw_upvotes (is_nsfw, upvotes DESC, created_at DESC)
// Supports pagination via offset for infinite scroll
// ---------------------------------------------------------------------------
export const getTrendingImages = async (
  limit = 20, showNsfw = false, mediaType = 'all', offset = 0
) => {
  let query = supabase
    .from('images')
    .select('*')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  query = applyFilters(query, showNsfw, mediaType);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------------
// Shuffle: fetch random images for the shuffle page
// Strategy: use random UUID comparison on the `id` column (UUID v4).
// Generate a random UUID and fetch images with id > randomUUID, sorted by id.
// This gives true random sampling across the whole table without needing
// counts or large offsets. Fast because it uses the primary key index.
// ---------------------------------------------------------------------------
export const getShuffleImages = async (
  showNsfw: boolean,
  mediaType: string,
  searchTerms?: string,
  preferredCategories?: string[],
  batchSize = 20
): Promise<any[]> => {
  // Generate random UUID pivot points for 2 batches
  const randomUUID = () => {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    return `${Array(8).fill(0).map(hex).join('')}-${Array(4).fill(0).map(hex).join('')}-4${Array(3).fill(0).map(hex).join('')}-${['8','9','a','b'][Math.floor(Math.random()*4)]}${Array(3).fill(0).map(hex).join('')}-${Array(12).fill(0).map(hex).join('')}`;
  };

  const pivots = [randomUUID(), randomUUID()];
  const halfBatch = Math.ceil(batchSize / 2);

  const promises = pivots.map(async (pivot, i) => {
    // Alternate between gt and lt to cover different parts of UUID space
    let query = supabase
      .from('images')
      .select('*')
      .order('id', { ascending: i === 0 });

    if (i === 0) {
      query = query.gt('id', pivot);
    } else {
      query = query.lt('id', pivot);
    }

    query = applyFilters(query, showNsfw, mediaType);

    if (searchTerms) {
      query = query.textSearch('prompt', `'${searchTerms.trim().split(/\s+/).join("' & '")}'`, { type: 'plain' });
    }
    if (preferredCategories && preferredCategories.length > 0) {
      query = query.in('category', preferredCategories);
    }

    query = query.limit(halfBatch);
    const { data } = await query;
    return data || [];
  });

  const batches = await Promise.all(promises);
  let results = batches.flat();

  // Fallback if somehow empty
  if (results.length === 0) {
    let fallback = supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(batchSize);
    fallback = applyFilters(fallback, showNsfw, mediaType);
    const { data } = await fallback;
    results = data || [];
  }

  // Shuffle + dedupe
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }
  const seen = new Set<string>();
  return results.filter((img: any) => {
    if (seen.has(img.id)) return false;
    seen.add(img.id);
    return true;
  });
};

// ---------------------------------------------------------------------------
// Single image + related
// ---------------------------------------------------------------------------
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
};

export const getImage = async (id: string) => {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const getRelatedImages = async (
  image: { id: string; category?: string | null; model?: string | null },
  limit = 12
) => {
  let query = supabase
    .from('images')
    .select('*')
    .neq('id', image.id)
    .eq('is_nsfw', false)
    .limit(limit);

  if (image.category && image.category !== 'Uncategorized') {
    query = query.eq('category', image.category);
  } else if (image.model) {
    query = query.eq('model', image.model);
  }
  query = query.order('upvotes', { ascending: false });
  const { data, error } = await query;
  if (error) return [];
  return data || [];
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
export const upvoteImage = async (imageId: string, voterIp: string) => {
  const { error: voteError } = await supabase
    .from('votes')
    .insert({ image_id: imageId, voter_ip: voterIp });

  if (voteError && !voteError.message.includes('duplicate')) throw voteError;

  if (!voteError) {
    const { data: currentImage } = await supabase
      .from('images')
      .select('upvotes')
      .eq('id', imageId)
      .single();
    if (currentImage) {
      await supabase
        .from('images')
        .update({ upvotes: currentImage.upvotes + 1 })
        .eq('id', imageId);
    }
  }
  return !voteError;
};

export const incrementDownloads = async (imageId: string) => {
  const { data: currentImage } = await supabase
    .from('images')
    .select('downloads')
    .eq('id', imageId)
    .single();
  if (currentImage) {
    await supabase
      .from('images')
      .update({ downloads: currentImage.downloads + 1 })
      .eq('id', imageId);
  }
};

export const incrementViews = async (imageId: string) => {
  const { data: currentImage } = await supabase
    .from('images')
    .select('views')
    .eq('id', imageId)
    .single();
  if (currentImage) {
    await supabase
      .from('images')
      .update({ views: currentImage.views + 1 })
      .eq('id', imageId);
  }
};
