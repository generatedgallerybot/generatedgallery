import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Client-side helper functions
export const getImages = async (limit = 20, offset = 0, showNsfw = false) => {
  let query = supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (!showNsfw) query = query.eq('is_nsfw', false);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getImagesByCategory = async (category: string, limit = 20, offset = 0, showNsfw = false) => {
  let query = supabase
    .from('images')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (!showNsfw) query = query.eq('is_nsfw', false);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const searchImages = async (searchQuery: string, limit = 20, offset = 0, showNsfw = false) => {
  let query = supabase
    .from('images')
    .select('*')
    .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,prompt.ilike.%${searchQuery}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (!showNsfw) query = query.eq('is_nsfw', false);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getTrendingImages = async (limit = 20, showNsfw = false) => {
  let query = supabase
    .from('images')
    .select('*')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (!showNsfw) query = query.eq('is_nsfw', false);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

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

export const upvoteImage = async (imageId: string, voterIp: string) => {
  // First try to insert the vote
  const { error: voteError } = await supabase
    .from('votes')
    .insert({ image_id: imageId, voter_ip: voterIp });
  
  if (voteError && !voteError.message.includes('duplicate')) {
    throw voteError;
  }
  
  // If vote was successful, increment the upvote count
  if (!voteError) {
    // Use manual update instead of RPC
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