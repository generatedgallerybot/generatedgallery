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
// ---------------------------------------------------------------------------
export const getTrendingImages = async (
  limit = 20, showNsfw = false, mediaType = 'all'
) => {
  let query = supabase
    .from('images')
    .select('*')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  query = applyFilters(query, showNsfw, mediaType);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------------
// Shuffle: fetch random images for the shuffle page
// Strategy: get estimated count for the current filter combo, then pick
// 2 small batches at random offsets within that count.
// This avoids overshooting offsets (which causes full scans + timeouts).
// ---------------------------------------------------------------------------
export const getShuffleImages = async (
  showNsfw: boolean,
  mediaType: string,
  searchTerms?: string,
  preferredCategories?: string[],
  batchSize = 15
): Promise<any[]> => {
  // Step 1: get a realistic count for this filter combo (cached 30 min)
  let estimatedCount: number;
  if (searchTerms) {
    // For search, we can't cache easily — just use a conservative estimate
    estimatedCount = 2000;
  } else if (preferredCategories && preferredCategories.length > 0) {
    estimatedCount = 5000;
  } else {
    estimatedCount = await getCachedCount(showNsfw, mediaType);
  }

  if (estimatedCount === 0) return [];

  // Step 2: pick 2 random offsets WITHIN the estimated count
  const maxOffset = Math.max(0, estimatedCount - batchSize);
  const offsets = [
    Math.floor(Math.random() * Math.max(1, maxOffset)),
    Math.floor(Math.random() * Math.max(1, maxOffset)),
  ];
  const sorts: Array<{ column: string; ascending: boolean }> = [
    { column: 'created_at', ascending: false },
    { column: 'id', ascending: true },
  ];

  const promises = offsets.map(async (offset, i) => {
    let query = supabase
      .from('images')
      .select('*')
      .order(sorts[i].column, { ascending: sorts[i].ascending })
      .range(offset, offset + batchSize - 1);

    query = applyFilters(query, showNsfw, mediaType);

    if (searchTerms) {
      query = query.textSearch('prompt', `'${searchTerms.trim().split(/\s+/).join("' & '")}'`, { type: 'plain' });
    }
    if (preferredCategories && preferredCategories.length > 0) {
      query = query.in('category', preferredCategories);
    }

    const { data } = await query;
    return data || [];
  });

  const batches = await Promise.all(promises);
  let results = batches.flat();

  // If both queries returned nothing (count estimate was stale), grab from the top
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
