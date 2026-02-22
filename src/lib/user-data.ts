import { supabaseBrowser } from './supabase-browser';

// ---- User Likes ----

export async function getUserLikedImageIds(userId: string): Promise<Set<string>> {
  const { data } = await supabaseBrowser
    .from('user_likes')
    .select('image_id')
    .eq('user_id', userId);
  return new Set((data || []).map((r: any) => r.image_id));
}

export async function toggleUserLike(userId: string, imageId: string, isLiked: boolean) {
  if (isLiked) {
    await supabaseBrowser.from('user_likes').delete().eq('user_id', userId).eq('image_id', imageId);
  } else {
    await supabaseBrowser.from('user_likes').insert({ user_id: userId, image_id: imageId });
  }
}

export async function getUserLikedImages(userId: string, limit = 50, offset = 0) {
  const { data } = await supabaseBrowser
    .from('user_likes')
    .select('image_id, images(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return (data || []).map((r: any) => r.images).filter(Boolean);
}

// ---- Galleries ----

export interface Gallery {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  image_count?: number;
  cover_url?: string | null;
}

export async function getUserGalleries(userId: string): Promise<Gallery[]> {
  const { data } = await supabaseBrowser
    .from('galleries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createGallery(userId: string, name: string, description?: string) {
  const { data, error } = await supabaseBrowser
    .from('galleries')
    .insert({ user_id: userId, name, description: description || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGallery(galleryId: string, updates: { name?: string; description?: string; is_public?: boolean }) {
  const { error } = await supabaseBrowser
    .from('galleries')
    .update(updates)
    .eq('id', galleryId);
  if (error) throw error;
}

export async function deleteGallery(galleryId: string) {
  await supabaseBrowser.from('gallery_images').delete().eq('gallery_id', galleryId);
  await supabaseBrowser.from('galleries').delete().eq('id', galleryId);
}

export async function getGallery(galleryId: string): Promise<Gallery | null> {
  const { data } = await supabaseBrowser
    .from('galleries')
    .select('*')
    .eq('id', galleryId)
    .single();
  return data;
}

export async function getGalleryImages(galleryId: string) {
  const { data } = await supabaseBrowser
    .from('gallery_images')
    .select('image_id, images(*)')
    .eq('gallery_id', galleryId)
    .order('added_at', { ascending: false });
  return (data || []).map((r: any) => r.images).filter(Boolean);
}

export async function addToGallery(galleryId: string, imageId: string) {
  const { error } = await supabaseBrowser
    .from('gallery_images')
    .insert({ gallery_id: galleryId, image_id: imageId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function removeFromGallery(galleryId: string, imageId: string) {
  await supabaseBrowser.from('gallery_images').delete().eq('gallery_id', galleryId).eq('image_id', imageId);
}
